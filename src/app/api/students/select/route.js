import { NextResponse } from 'next/server';
import dbConnect from '../../../../../utils/dbConnect';
import Student from '../../../../models/Student';

export async function POST(request) {
  try {
    await dbConnect();
    const { studentId, teamName } = await request.json();

    const student = await Student.findByIdAndUpdate(
      studentId,
      { selected: true, groupName: teamName },
      { new: true }
    );

    if (!student) {
      return NextResponse.json({ message: 'Student not found' }, { status: 404 });
    }

    // Emit Socket.IO event (handled via global io instance)
    global.io?.emit('studentSelected', { student, teamName });

    return NextResponse.json(student);
  } catch (error) {
    console.error('Error selecting student:', error);
    return NextResponse.json(
      { message: 'Error selecting student', error: error.message },
      { status: 500 }
    );
  }
}