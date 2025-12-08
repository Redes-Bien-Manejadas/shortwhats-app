import { NextRequest, NextResponse } from 'next/server';
import { getAdminCredentials, saveAdminCredentials } from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET /api/admin/credentials - Get admin credentials (for login verification)
export async function GET() {
  try {
    const credentials = await getAdminCredentials();
    
    if (!credentials) {
      // Return default credentials if none exist
      return NextResponse.json({
        success: true,
        data: {
          username: 'admin',
          // Note: In production, you'd never return the password
          // This is for backward compatibility with the current system
          password: '123whats123',
        },
      });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        username: credentials.username,
        // For security, we return a masked password indicator
        password: '********',
      },
    });
  } catch (error) {
    console.error('Error fetching admin credentials:', error);
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/admin/credentials - Save/update admin credentials
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;
    
    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Usuario y contraseña son requeridos' },
        { status: 400 }
      );
    }
    
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }
    
    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    const result = await saveAdminCredentials(username, passwordHash);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error saving admin credentials:', error);
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
