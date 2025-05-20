import { NextResponse } from 'next/server';
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
    const { event, channel, data } = await request.json();
    await pusher.trigger(channel, event, data);
    return NextResponse.json({ message: 'Event triggered' }, { status: 200 });
  } catch (error) {
    console.error('Pusher trigger error:', error);
    return NextResponse.json({ message: 'Error triggering event', error: error.message }, { status: 500 });
  }
}