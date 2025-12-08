import { NextRequest, NextResponse } from 'next/server';
import { getAllLinks, createLink } from '@/lib/db';
import type { LinkData } from '@/lib/types';

// GET /api/links - Get all links
export async function GET() {
  try {
    const links = await getAllLinks();
    return NextResponse.json({ success: true, data: links });
  } catch (error) {
    console.error('Error fetching links:', error);
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/links - Create a new link
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const linkData: LinkData = body;
    
    // Validate required fields
    if (!linkData.slug) {
      return NextResponse.json(
        { success: false, message: 'El slug es requerido' },
        { status: 400 }
      );
    }
    
    if (!linkData.phoneNumber) {
      return NextResponse.json(
        { success: false, message: 'El número de teléfono es requerido' },
        { status: 400 }
      );
    }
    
    const result = await createLink(linkData);
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating link:', error);
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
