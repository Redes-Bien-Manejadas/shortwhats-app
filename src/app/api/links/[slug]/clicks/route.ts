import { NextRequest, NextResponse } from 'next/server';
import { incrementClicks } from '@/lib/db';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// POST /api/links/[slug]/clicks - Increment click count
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    
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
