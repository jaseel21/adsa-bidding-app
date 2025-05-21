import { MongoClient } from 'mongodb';
import Pusher from 'pusher';
import { NextResponse } from 'next/server';

const uri = process.env.MONGODB_URI;
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: false,
});

export async function POST(request) {
  const client = new MongoClient(uri);
  try {
    const { teamName, student } = await request.json();
    if (!teamName || !student || !student._id || !student.name) {
      return NextResponse.json({ message: 'Missing teamName or student data' }, { status: 400 });
    }

    const sanitizedTeamName = teamName.replace(/\s+/g, '-').toLowerCase();
    await client.connect();
    const db = client.db('adsa-bidding');
    const teamsCollection = db.collection('teams');
    const studentsCollection = db.collection('students');

    // Update team's students array
    const teamUpdate = await teamsCollection.updateOne(
      { teamName },
      { $addToSet: { students: student } }
    );
    if (teamUpdate.matchedCount === 0) {
      return NextResponse.json({ message: 'Team not found' }, { status: 404 });
    }

    // Mark student as selected
    const studentUpdate = await studentsCollection.updateOne(
      { _id: student._id },
      { $set: { selected: true, groupName: teamName } }
    );
    if (studentUpdate.matchedCount === 0) {
      return NextResponse.json({ message: 'Student not found' }, { status: 404 });
    }

    // Trigger Pusher event
    await pusher.trigger(`private-team-${sanitizedTeamName}`, 'roster-updated', {
      student,
      timestamp: Date.now(),
    });
    console.log(`Triggered roster-updated for team: ${teamName}, student: ${student.name}`);

    return NextResponse.json({ message: 'Roster updated successfully' }, { status: 200 });
  } catch (err) {
    console.error('Update roster error:', {
      message: err.message,
      stack: err.stack,
    });
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  } finally {
    await client.close();
  }
}