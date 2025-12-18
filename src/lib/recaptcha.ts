// reCAPTCHA v3 configuration and verification

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

// Minimum score to consider a user as human (0.0 = bot, 1.0 = human)
// 0.5 is Google's recommended threshold, but you can adjust based on your needs
export const RECAPTCHA_SCORE_THRESHOLD = 0.5;

export interface RecaptchaVerifyResponse {
    success: boolean;
    score?: number;
    action?: string;
    challenge_ts?: string;
    hostname?: string;
    'error-codes'?: string[];
}

export interface RecaptchaResult {
    valid: boolean;
    score: number;
    action: string;
    error?: string;
}

/**
 * Verify a reCAPTCHA v3 token with Google's API
 * @param token - The reCAPTCHA token from the frontend
 * @param expectedAction - The expected action name (should match what frontend sent)
 * @returns RecaptchaResult with validation status and score
 */
export async function verifyRecaptcha(
    token: string,
    expectedAction: string = 'contact_whatsapp'
): Promise<RecaptchaResult> {
    // If no secret key configured, skip validation
    if (!RECAPTCHA_SECRET_KEY) {
        console.warn('⚠️ RECAPTCHA_SECRET_KEY not configured, skipping validation');
        return {
            valid: true,
            score: 1.0,
            action: expectedAction,
            error: 'RECAPTCHA_SECRET_KEY not configured'
        };
    }

    // In development, allow bypass if token is missing or has browser errors
    // This lets you test locally without proper reCAPTCHA domain setup
    if (IS_DEVELOPMENT && !token) {
        console.warn('⚠️ Development mode: skipping reCAPTCHA (no token)');
        return {
            valid: true,
            score: 1.0,
            action: expectedAction,
            error: 'Development mode bypass'
        };
    };

    if (!token) {
        return {
            valid: false,
            score: 0,
            action: '',
            error: 'No reCAPTCHA token provided'
        };
    }

    try {
        const response = await fetch(RECAPTCHA_VERIFY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                secret: RECAPTCHA_SECRET_KEY,
                response: token,
            }),
        });

        const data: RecaptchaVerifyResponse = await response.json();

        if (!data.success) {
            const errorCodes = data['error-codes'] || [];
            console.log('❌ reCAPTCHA verification failed:', errorCodes);

            // In development, bypass browser-error (happens when localhost isn't in allowed domains)
            if (IS_DEVELOPMENT && errorCodes.includes('browser-error')) {
                console.warn('⚠️ Development mode: bypassing browser-error');
                return {
                    valid: true,
                    score: 1.0,
                    action: expectedAction,
                    error: 'Development mode bypass (browser-error)'
                };
            }

            return {
                valid: false,
                score: 0,
                action: data.action || '',
                error: errorCodes.join(', ') || 'Verification failed'
            };
        }

        const score = data.score ?? 0;
        const action = data.action ?? '';

        // Check if action matches expected
        if (action !== expectedAction) {
            console.log(`⚠️ reCAPTCHA action mismatch: expected ${expectedAction}, got ${action}`);
            return {
                valid: false,
                score,
                action,
                error: 'Action mismatch'
            };
        }

        // Check score threshold
        const isValid = score >= RECAPTCHA_SCORE_THRESHOLD;

        console.log(`🤖 reCAPTCHA score: ${score} (threshold: ${RECAPTCHA_SCORE_THRESHOLD}) - ${isValid ? '✅ PASS' : '❌ FAIL'}`);

        return {
            valid: isValid,
            score,
            action
        };

    } catch (error) {
        console.error('Error verifying reCAPTCHA:', error);
        return {
            valid: false,
            score: 0,
            action: '',
            error: 'Network error during verification'
        };
    }
}
