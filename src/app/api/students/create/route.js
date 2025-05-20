import { NextResponse } from 'next/server';
import dbConnect from '../../../../../utils/dbConnect';
import Student from '../../../../models/Student';
import jwt from 'jsonwebtoken';

export async function POST(request) {
  try {
    console.log('POST /api/students/create: Starting');
    await dbConnect();
    console.log('MongoDB connected');

    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      console.warn('No token provided');
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }

    // Verify admin token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.role !== 'admin') {
        console.warn('Unauthorized access attempt:', decoded);
        return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
      }
    } catch (err) {
      console.error('Token verification error:', err);
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const { name, batch, category, tokenNumber } = await request.json();
    console.log('Received student data:', { name, batch, category, tokenNumber });

    // Validate inputs
    if (!name || !batch || !category || !tokenNumber) {
      console.warn('Missing required fields:', { name, batch, category, tokenNumber });
      return NextResponse.json({ message: 'Name, batch, category, and token number are required' }, { status: 400 });
    }

    if (!['senior', 'junior', 'subjunior'].includes(category)) {
      console.warn('Invalid category:', category);
      return NextResponse.json({ message: 'Invalid category. Must be senior, junior, or subjunior' }, { status: 400 });
    }

    // Check for duplicate tokenNumber
    const existingStudent = await Student.findOne({ tokenNumber }).lean();
    if (existingStudent) {
      console.warn('Duplicate tokenNumber:', tokenNumber);
      return NextResponse.json({ message: 'Token number already exists' }, { status: 400 });
    }

    // Create and save student
    const student = new Student({
      name: name.trim(),
      batch: batch.trim(),
      category,
      tokenNumber: tokenNumber.trim(),
      selected: false,
      groupName: '',
    });

    await student.save();
    console.log('Student created:', student);

    return NextResponse.json(
      { message: 'Student created successfully', student: student.toObject() },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/students/create error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }
    if (error.code === 11000) {
      return NextResponse.json({ message: 'Token number already exists' }, { status: 400 });
    }
    return NextResponse.json(
      { message: 'Error creating student', error: error.message },
      { status: 500 }
    );
  }
}