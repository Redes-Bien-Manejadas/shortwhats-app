import { NextRequest, NextResponse } from 'next/server';
import { getAdminCredentials } from '@/lib/db';
import bcrypt from 'bcryptjs';

// Default credentials (used when no credentials are set in DB)
const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = '123whats123';

// POST /api/admin/login - Verify login credentials
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
    
    const credentials = await getAdminCredentials();
    
    if (!credentials) {
      // Use default credentials
      if (username === DEFAULT_USERNAME && password === DEFAULT_PASSWORD) {
        return NextResponse.json({
          success: true,
          message: 'Inicio de sesión exitoso',
          user: { username },
        });
      }
      
      return NextResponse.json(
        { success: false, message: 'Usuario o contraseña incorrectos' },
        { status: 401 }
      );
    }
    
    // Verify username
    if (username !== credentials.username) {
      return NextResponse.json(
        { success: false, message: 'Usuario o contraseña incorrectos' },
        { status: 401 }
      );
    }
    
    // Verify password
    const passwordMatch = await bcrypt.compare(password, credentials.password);
    
    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, message: 'Usuario o contraseña incorrectos' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      user: { username },
    });
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
