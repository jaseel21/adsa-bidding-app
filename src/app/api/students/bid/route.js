import { NextResponse } from 'next/server';
import dbConnect from '../../../../../utils/dbConnect';
import Student from '../../../../models/Student';
import jwt from 'jsonwebtoken';
import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

export async function POST(request) {
  try {
    console.log('POST /api/students/bid: Starting');
    await dbConnect();

    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      console.warn('No token provided');
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }

    let decoded;
    decoded = jwt.verify(token, process.env.JWT_SECRET);
    // try {
    //   console.log('JWT decoded:', { role: decoded.role, teamName: decoded.teamName });
    //   if (decoded.role !== 'team') {
    //     console.warn('Unauthorized access attempt:', decoded);
    //     return NextResponse.json({ message: 'Unauthorized: Team role required' }, { status: 403 });
    //   }
    // } catch (err) {
    //   console.error('Token verification error:', err.message);
    //   return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    // }

    const { studentId, teamName } = await request.json();
    console.log('Received bid:', { studentId, teamName });

    if (!studentId || !teamName || teamName !== decoded.teamName) {
      console.warn('Invalid bid data:', { studentId, teamName, expectedTeam: decoded.teamName });
      return NextResponse.json({ message: 'Invalid bid data or team mismatch' }, { status: 400 });
    }

    if (!studentId.match(/^[0-9a-fA-F]{24}$/)) {
      console.warn('Invalid studentId format:', studentId);
      return NextResponse.json({ message: 'Invalid student ID format' }, { status: 400 });
    }

    const student = await Student.findOneAndUpdate(
      { _id: studentId, selected: false },
      { selected: true, groupName: teamName },
      { new: true, lean: true, select: 'name _id' }
    );

    if (!student) {
      console.warn('Student not found or already selected:', studentId);
      return NextResponse.json({ message: 'Student not found or already selected' }, { status: 400 });
    }

    console.log('Student updated:', { id: student._id, name: student.name, groupName: teamName });

    // Trigger Pusher events
    await Promise.all([
      pusher.trigger('bids', 'bid-placed', {
        studentId,
        studentName: student.name,
        teamName,
      }),
      pusher.trigger(`private-team-${teamName}`, 'roster-updated', {
        student: { _id: student._id, name: student.name },
      }),
    ]);
    console.log('Pusher events triggered: bids:bid-placed, private-team-', teamName, ':roster-updated');

    return NextResponse.json(
      { message: 'Bid placed successfully', student },
      { status: 200 }
    );
  } catch (error) {
    console.error('POST /api/students/bid error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return NextResponse.json(
      { message: 'Error placing bid', error: error.message },
      { status: 500 }
    );
  }
}