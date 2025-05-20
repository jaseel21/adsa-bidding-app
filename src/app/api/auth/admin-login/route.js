import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function POST(request) {
  try {
    console.log('POST /api/auth/admin-login: Starting');
    const { username, password } = await request.json();
    console.log('Admin login attempt:', { username, password: '[hidden]' });

    // Hardcoded admin credentials (replace with MongoDB in production)
    const ADMIN_USERNAME = 'admin';
    const ADMIN_PASSWORD = 'admin123';

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set');
      throw new Error('Server configuration error: JWT_SECRET missing');
    }

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      console.warn('Invalid admin credentials:', username);
      return NextResponse.json({ message: 'Invalid username or password' }, { status: 401 });
    }

    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log('Admin login successful, token issued');
    return NextResponse.json({ token, authenticated: true }, { status: 200 });
  } catch (error) {
    console.error('POST /api/auth/admin-login error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return NextResponse.json({ message: 'Admin login error', error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    console.log('GET /api/auth/admin-login: Starting');
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      console.warn('No token provided for admin auth');
      return NextResponse.json({ message: 'No token provided', authenticated: false }, { status: 401 });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set');
      throw new Error('Server configuration error: JWT_SECRET missing');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Admin token verified:', decoded);
    return NextResponse.json({ authenticated: true, role: decoded.role }, { status: 200 });
  } catch (error) {
    console.error('GET /api/auth/admin-login error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return NextResponse.json(
      { message: 'Authentication error', error: error.message, authenticated: false },
      { status: 401 }
    );
  }
}