import { NextResponse } from 'next/server';
import dbConnect from '../../../../../utils/dbConnect';
import Student from '../../../../models/Student';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
});

export async function GET(request) {
  try {
    await dbConnect();
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }
    jwt.verify(token, process.env.JWT_SECRET);
    const students = await Student.find({ selected: false }).lean();
    return NextResponse.json(students);
  } catch (error) {
    console.error('GET /api/students/list error:', error);
    return NextResponse.json({ message: 'Error fetching students', error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { studentId, teamName } = await request.json();
    console.log('POST /api/students/list data:', { studentId, teamName });

    if (!studentId || !teamName) {
      return NextResponse.json({ message: 'Missing studentId or teamName' }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      console.error('Invalid studentId:', studentId);
      return NextResponse.json({ message: 'Invalid studentId format' }, { status: 400 });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      console.error('Student not found:', studentId);
      return NextResponse.json({ message: 'Student not found' }, { status: 404 });
    }
    if (student.selected) {
      console.warn('Student already selected:', studentId, 'by', student.groupName);
      return NextResponse.json({ message: 'Student already selected' }, { status: 400 });
    }

    student.selected = true;
    student.groupName = teamName;
    await student.save();

    const teamStudents = await Student.find({ groupName: teamName, selected: true }).lean();
    const roster = teamStudents.map((s) => ({
      _id: s._id.toString(),
      name: s.name,
      batch: s.batch,
      category: s.category,
      tokenNumber: s.tokenNumber,
    }));

    try {
      await Promise.all([
        axiosInstance.post('/api/pusher/trigger', {
          event: 'bid-placed',
          channel: 'bids',
          data: { studentId, studentName: student.name, teamName },
        }),
        axiosInstance.post('/api/pusher/trigger', {
          event: 'roster-updated',
          channel: `private-team-${teamName}`,
          data: { students: roster },
        }),
      ]);
    } catch (pusherError) {
      console.error('Pusher trigger error:', pusherError);
    }

    return NextResponse.json({ message: 'Bid placed successfully' }, { status: 201 });
  } catch (error) {
    console.error('POST /api/students/list error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }
    return NextResponse.json({ message: 'Error placing bid', error: error.message }, { status: 500 });
  }
}