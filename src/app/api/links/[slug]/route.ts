import { NextRequest, NextResponse } from 'next/server';
import { getLinkBySlug, updateLink, deleteLink } from '@/lib/db';
import type { LinkData } from '@/lib/types';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// GET /api/links/[slug] - Get a single link by slug
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    
    const link = await getLinkBySlug(slug);
    
    if (!link) {
      return NextResponse.json(
        { success: false, message: 'Link no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: link });
  } catch (error) {
    console.error('Error fetching link:', error);
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT /api/links/[slug] - Update a link
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const linkData: LinkData = body;
    
    const result = await updateLink(slug, linkData);
    
    if (!result.success) {
      return NextResponse.json(result, { status: 404 });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating link:', error);
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE /api/links/[slug] - Delete a link
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    
    const result = await deleteLink(slug);
    
    if (!result.success) {
      return NextResponse.json(result, { status: 404 });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error deleting link:', error);
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
