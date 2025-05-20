import { NextResponse } from 'next/server';
import dbConnect from '../../../../../utils/dbConnect';
import Student from '../../../../models/Student';
import jwt from 'jsonwebtoken';

export async function GET(request) {
  try {
    console.log('GET /api/students/list: Starting');
    await dbConnect();

    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      console.warn('No token provided');
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }

    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      console.error('Token verification error:', err.message);
      if (err.name === 'TokenExpiredError') {
        return NextResponse.json({ message: 'Token expired' }, { status: 401 });
      }
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const students = await Student.find({ selected: false }).lean();
    console.log('Fetched students:', students.length);
    return NextResponse.json(students);
  } catch (error) {
    console.error('GET /api/students/list error:', {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { message: 'Error fetching students', error: error.message },
      { status: 500 }
    );
  }
}