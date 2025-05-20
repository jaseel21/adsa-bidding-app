import { NextResponse } from 'next/server';
import dbConnect from '../../../../../utils/dbConnect';
import Team from '../../../../models/Team';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    await dbConnect();
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }
    jwt.verify(token, process.env.JWT_SECRET);
    const { teamName, password } = await request.json();

    if (!teamName || !password) {
      return NextResponse.json({ message: 'Team name and password are required' }, { status: 400 });
    }

    const existingTeam = await Team.findOne({ teamName });
    if (existingTeam) {
      return NextResponse.json({ message: 'Team already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const team = new Team({ teamName, password: hashedPassword });
    await team.save();

    return NextResponse.json({ message: 'Team added successfully' }, { status: 201 });
  } catch (error) {
    console.error('POST /api/teams error:', error);
    if (error.code === 11000) {
      return NextResponse.json({ message: 'Team already exists' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error adding team', error: error.message }, { status: 500 });
  }
}