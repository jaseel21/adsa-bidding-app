import { NextResponse } from 'next/server';
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
    const { socket_id, channel_name } = await request.json();
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const auth = pusher.authenticate(socket_id, channel_name, {
      user_id: decoded.teamId || 'admin',
      user_info: { teamName: decoded.teamName || 'admin' },
    });
    return NextResponse.json(auth);
  } catch (error) {
    console.error('Pusher auth error:', error);
    return NextResponse.json({ message: 'Authentication failed', error: error.message }, { status: 401 });
  }
}