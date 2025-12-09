import { NextRequest, NextResponse } from 'next/server';
import { incrementClicks } from '@/lib/db';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// Simple in-memory debounce: ignore duplicate clicks within 5 seconds
const recentClicks = new Map<string, number>();
const DEBOUNCE_MS = 5000;

// POST /api/links/[slug]/clicks - Increment click count
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    
    // Debounce: skip if this slug was clicked in the last 5 seconds
    const now = Date.now();
    const lastClick = recentClicks.get(slug);
    if (lastClick && now - lastClick < DEBOUNCE_MS) {
      return NextResponse.json({ success: true, debounced: true });
    }
    recentClicks.set(slug, now);
    
    // Clean up old entries (prevent memory leak)
    if (recentClicks.size > 1000) {
      const cutoff = now - DEBOUNCE_MS;
      for (const [key, time] of recentClicks) {
        if (time < cutoff) recentClicks.delete(key);
      }
    }
    
    const result = await incrementClicks(slug);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: 'Link no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, clicks: result.clicks });
  } catch (error) {
    console.error('Error incrementing clicks:', error);
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
