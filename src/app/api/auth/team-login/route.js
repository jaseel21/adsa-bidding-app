import { NextResponse } from 'next/server';
import dbConnect from '../../../../../utils/dbConnect';
import Team from '../../../../models/Team';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    console.log('POST /api/auth/team-login: Starting');
    await dbConnect();
    console.log('MongoDB connected');

    const { teamName, password } = await request.json();
    console.log('Received data:', { teamName, password: '[hidden]' });

    if (!teamName || !password) {
      console.warn('Missing teamName or password');
      return NextResponse.json({ message: 'Team name and password are required' }, { status: 400 });
    }

    const team = await Team.findOne({ teamName }).lean();
    if (!team) {
      console.warn('Team not found:', teamName);
      return NextResponse.json({ message: 'Team not found' }, { status: 404 });
    }

    if (!team.password) {
      console.error('Team has no password:', teamName);
      return NextResponse.json({ message: 'Team configuration error' }, { status: 500 });
    }

    const isMatch = await bcrypt.compare(password, team.password);
    if (!isMatch) {
      console.warn('Invalid password for team:', teamName);
      return NextResponse.json({ message: 'Invalid password' }, { status: 401 });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set');
      throw new Error('Server configuration error: JWT_SECRET missing');
    }

    const token = jwt.sign({ teamName }, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log('Login successful for team:', teamName);
    return NextResponse.json({ token, teamName }, { status: 200 });
  } catch (error) {
    console.error('POST /api/auth/team-login error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return NextResponse.json({ message: 'Login error', error: error.message }, { status: 500 });
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
    jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token verified');
    return NextResponse.json({ message: 'Authenticated' }, { status: 200 });
  } catch (error) {
    console.error('GET /api/auth/team-login error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return NextResponse.json({ message: 'Authentication error', error: error.message }, { status: 401 });
  }
}