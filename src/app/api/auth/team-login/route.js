import { NextResponse } from 'next/server';
import dbConnect from '../../../../../utils/dbConnect';
import Team from '../../../../models/Team';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    console.log('POST /api/auth/team-login: Starting');
    await dbConnect();

    const { teamName, password } = await request.json();
    if (!teamName || !password) {
      console.warn('Missing teamName or password');
      return NextResponse.json({ message: 'Team name and password required' }, { status: 400 });
    }

    const team = await Team.findOne({ teamName }).lean();
    if (!team) {
      console.warn('Team not found:', teamName);
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, team.password);
    if (!isMatch) {
      console.warn('Invalid password for team:', teamName);
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const token = jwt.sign(
      { teamName, role: 'team' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Team login successful:', teamName);
    return NextResponse.json({ message: 'Login successful', token, teamName }, { status: 200 });
  } catch (error) {
    console.error('POST /api/auth/team-login error:', {
      message: error.message || 'Unknown error',
      stack: error.stack,
      name: error.name,
    });
    return NextResponse.json(
      { message: 'Error logging in', error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    console.log('GET /api/auth/team-login: Starting');
    await dbConnect();

    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      console.warn('No token provided');
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token verified:', { teamName: decoded.teamName, role: decoded.role });
    } catch (err) {
      console.error('Token verification error:', {
        message: err.message || 'Unknown error',
        name: err.name,
      });
      if (err.name === 'TokenExpiredError') {
        return NextResponse.json({ message: 'Token expired' }, { status: 401 });
      }
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    if (decoded.role !== 'team') {
      console.warn('Unauthorized: Invalid role', decoded.role);
      return NextResponse.json({ message: 'Unauthorized: Team role required' }, { status: 403 });
    }

    const team = await Team.findOne({ teamName: decoded.teamName }).lean();
    if (!team) {
      console.warn('Team not found:', decoded.teamName);
      return NextResponse.json({ message: 'Team not found' }, { status: 404 });
    }

    console.log('Auth check successful:', decoded.teamName);
    return NextResponse.json({ message: 'Authenticated', teamName: decoded.teamName }, { status: 200 });
  } catch (error) {
    console.error('GET /api/auth/team-login error:', {
      message: error.message || 'Unknown error',
      stack: error.stack,
      name: error.name,
    });
    return NextResponse.json(
      { message: 'Error verifying auth', error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}