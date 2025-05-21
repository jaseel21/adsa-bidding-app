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

    // Validate Pusher config
    if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_KEY || !process.env.PUSHER_SECRET || !process.env.PUSHER_CLUSTER) {
      console.error('Pusher configuration missing:', {
        appId: !!process.env.PUSHER_APP_ID,
        key: !!process.env.PUSHER_KEY,
        secret: !!process.env.PUSHER_SECRET,
        cluster: !!process.env.PUSHER_CLUSTER,
      });
      return NextResponse.json({ message: 'Server configuration error' }, { status: 500 });
    }
    console.log('Pusher config:', {
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      cluster: process.env.PUSHER_CLUSTER,
    });

    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      console.warn('No token provided');
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('JWT decoded:', { role: decoded.role, teamName: decoded.teamName });
      if (decoded.role !== 'team') {
        console.warn('Unauthorized access attempt:', decoded);
        return NextResponse.json({ message: 'Unauthorized: Team role required' }, { status: 403 });
      }
    } catch (err) {
      console.error('Token verification error:', err.message);
      return NextResponse.json(
        { message: err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token' },
        { status: 401 }
      );
    }

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
      { selected: true, biddedBy: teamName },
      { new: true, lean: true, select: 'name _id' }
    );

    if (!student) {
      console.warn('Student not found or already bidded:', studentId);
      return NextResponse.json({ message: 'Student not found or already bidded' }, { status: 400 });
    }

    console.log('Student updated:', { id: student._id, name: student.name, biddedBy: teamName });

    const sanitizedTeamName = teamName.replace(/\s+/g, '-').toLowerCase();
    console.log('Sanitized teamName for Pusher:', sanitizedTeamName);

    let pusherSuccess = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await Promise.all([
          pusher.trigger('bids', 'bid-placed', {
            studentId,
            studentName: student.name,
            teamName,
            timestamp: Date.now(),
          }),
          pusher.trigger(`private-team-${sanitizedTeamName}`, 'roster-updated', {
            student: { _id: student._id, name: student.name },
            timestamp: Date.now(),
          }),
        ]);
        console.log(`Pusher events triggered (attempt ${attempt}): bids:bid-placed, private-team-${sanitizedTeamName}:roster-updated`);
        pusherSuccess = true;
        break;
      } catch (pusherErr) {
        console.error(`Pusher trigger attempt ${attempt} failed:`, {
          message: pusherErr.message || 'Unknown Pusher error',
          name: pusherErr.name || 'Unknown',
          details: pusherErr.details || null,
          status: pusherErr.status || null,
          stack: pusherErr.stack || null,
        });
        if (attempt === 3) {
          console.warn('All Pusher trigger attempts failed');
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!pusherSuccess) {
      console.warn('Pusher events failed, but bid processed successfully');
      return NextResponse.json(
        { message: 'Bid placed successfully, but notifications may be delayed', student },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { message: 'Bid placed successfully', student },
      { status: 200 }
    );
  } catch (error) {
    console.error('POST /api/students/bid error:', {
      message: error.message || 'Unknown error',
      stack: error.stack,
      name: error.name || 'Unknown',
    });
    return NextResponse.json(
      { message: 'Error placing bid', error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}