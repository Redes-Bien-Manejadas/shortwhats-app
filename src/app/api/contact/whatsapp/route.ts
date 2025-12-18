import { NextRequest, NextResponse } from 'next/server';
import { getLinkBySlug, incrementClicks } from '@/lib/db';
import { verifyRecaptcha, RECAPTCHA_SCORE_THRESHOLD } from '@/lib/recaptcha';

// Rate limiting: max 5 requests per 10 minutes per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX_REQUESTS = 5;

function getRateLimitKey(request: NextRequest): string {
    // Get IP from various headers (Vercel, Cloudflare, etc.)
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfIp = request.headers.get('cf-connecting-ip');

    return cfIp || realIp || forwarded?.split(',')[0]?.trim() || 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const record = rateLimitMap.get(ip);

    // Clean up old entries periodically
    if (rateLimitMap.size > 10000) {
        for (const [key, value] of rateLimitMap) {
            if (now > value.resetTime) {
                rateLimitMap.delete(key);
            }
        }
    }

    if (!record || now > record.resetTime) {
        // New window
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
        return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetIn: RATE_LIMIT_WINDOW_MS };
    }

    if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
        return { allowed: false, remaining: 0, resetIn: record.resetTime - now };
    }

    record.count++;
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - record.count, resetIn: record.resetTime - now };
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { slug, recaptchaToken } = body;

        if (!slug || typeof slug !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Invalid slug' },
                { status: 400 }
            );
        }

        // Rate limiting check
        const ip = getRateLimitKey(request);
        const rateLimit = checkRateLimit(ip);

        if (!rateLimit.allowed) {
            console.log(`🚫 Rate limit exceeded for IP: ${ip}`);
            return NextResponse.json(
                {
                    success: false,
                    error: 'Too many requests. Please try again later.',
                    retryAfter: Math.ceil(rateLimit.resetIn / 1000)
                },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000)),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetIn / 1000))
                    }
                }
            );
        }

        // reCAPTCHA v3 verification
        const recaptchaResult = await verifyRecaptcha(recaptchaToken, 'contact_whatsapp');

        if (!recaptchaResult.valid) {
            console.log(`🤖 Bot detected for IP: ${ip}, score: ${recaptchaResult.score}, error: ${recaptchaResult.error}`);
            return NextResponse.json(
                {
                    success: false,
                    error: 'Verification failed. Please try again.',
                    isBot: true,
                    score: recaptchaResult.score
                },
                { status: 403 }
            );
        }

        // Get link data
        const link = await getLinkBySlug(slug);

        if (!link) {
            return NextResponse.json(
                { success: false, error: 'Link not found' },
                { status: 404 }
            );
        }

        // Increment click count
        await incrementClicks(slug);

        // Build WhatsApp URL
        const whatsappUrl = `https://wa.me/${link.phoneNumber}${link.message ? `?text=${encodeURIComponent(link.message)}` : ''}`;

        console.log(`✅ Validated contact request for slug: ${slug}, IP: ${ip}, reCAPTCHA score: ${recaptchaResult.score}`);

        // Return success with WhatsApp URL - Lead event should be fired AFTER this succeeds
        return NextResponse.json({
            success: true,
            validated: true,
            whatsappUrl,
            // Include pixel config so frontend knows if it should fire Lead
            shouldFireLead: link.facebookPixel?.leadEvent ?? false
        }, {
            headers: {
                'X-RateLimit-Remaining': String(rateLimit.remaining),
                'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetIn / 1000))
            }
        });

    } catch (error) {
        console.error('Error in contact/whatsapp API:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
