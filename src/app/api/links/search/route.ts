import { NextRequest, NextResponse } from 'next/server';
import { searchLinks } from '@/lib/db';

// GET /api/links/search?term=xxx - Search links
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const term = searchParams.get('term');
    
    if (!term) {
      return NextResponse.json(
        { success: false, message: 'El término de búsqueda es requerido' },
        { status: 400 }
      );
    }
    
    const links = await searchLinks(term);
    
    return NextResponse.json({ success: true, data: links });
  } catch (error) {
    console.error('Error searching links:', error);
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
