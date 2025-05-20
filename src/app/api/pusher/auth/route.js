import { NextResponse } from 'next/server';
import Pusher from 'pusher';
import jwt from 'jsonwebtoken';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

export async function POST(request) {
  try {
    console.log('POST /api/pusher/auth: Starting');
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
        return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
      }
    } catch (err) {
      console.error('Token verification error:', err.message);
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const { channel_name, socket_id } = await request.json();
    console.log('Pusher auth request:', { channel_name, socket_id });

    if (!channel_name || !socket_id) {
      console.warn('Missing channel_name or socket_id');
      return NextResponse.json({ message: 'Missing channel or socket ID' }, { status: 400 });
    }

    const sanitizedTeamName = decoded.teamName.replace(/\s+/g, '-').toLowerCase();
    const expectedChannel = `private-team-${sanitizedTeamName}`;
    if (channel_name !== expectedChannel) {
      console.warn('Channel mismatch:', { requested: channel_name, expected: expectedChannel });
      return NextResponse.json({ message: 'Unauthorized channel' }, { status: 403 });
    }

    const authResponse = pusher.authenticate(socket_id, channel_name);
    console.log('Pusher auth successful:', { channel_name, socket_id });
    return NextResponse.json(authResponse, { status: 200 });
  } catch (error) {
    console.error('POST /api/pusher/auth error:', {
      message: error.message || 'Unknown error',
      stack: error.stack,
    });
    return NextResponse.json(
      { message: 'Error authenticating Pusher', error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}