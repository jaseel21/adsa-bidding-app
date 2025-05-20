import { NextResponse } from 'next/server';
import dbConnect from '../../../../../utils/dbConnect';
import Student from '../../../../models/Student';
import jwt from 'jsonwebtoken';

export async function GET(request) {
  try {
    console.log('GET /api/students/roster: Starting');
    await dbConnect();
    console.log('MongoDB connected');

    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      console.warn('No token provided');
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }

    let decoded;
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    // try {
    //   if (decoded.role !== 'team') {
    //     console.warn('Unauthorized access attempt:', decoded);
    //     return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    //   }
    // } catch (err) {
    //   console.error('Token verification error:', err);
    //   return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    // }

    const teamName = decoded.teamName;
    console.log('Fetching roster for team:', teamName);

    const students = await Student.find({ groupName: teamName, selected: true })
      .select('name _id')
      .lean();
    console.log('Fetched roster students:', students.length);

    return NextResponse.json(students, { status: 200 });
  } catch (error) {
    console.error('GET /api/students/roster error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return NextResponse.json(
      { message: 'Error fetching roster', error: error.message },
      { status: 500 }
    );
  }
}