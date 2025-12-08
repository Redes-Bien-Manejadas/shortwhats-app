import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

// Allowed file types
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// POST /api/upload - Upload a file to Vercel Blob
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No se ha enviado ningún archivo' },
        { status: 400 }
      );
    }
    
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: 'Tipo de archivo no permitido' },
        { status: 400 }
      );
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: 'El archivo excede el tamaño máximo de 10MB' },
        { status: 400 }
      );
    }
    
    // Generate a unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `uploads/${timestamp}-${sanitizedName}`;
    
    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: 'public',
    });
    
    return NextResponse.json({
      success: true,
      message: 'Archivo subido correctamente',
      file: {
        name: file.name,
        path: blob.url,
        size: file.size,
        type: file.type,
      },
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
