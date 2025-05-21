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

let changeStream = null;

export async function GET() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('adsa-bidding');
    const studentsCollection = db.collection('students');

    // Watch for updates in the students collection
    changeStream = studentsCollection.watch(
      [
        {
          $match: {
            'operationType': 'update',
            'updateDescription.updatedFields.selected': true,
          },
        },
      ],
      { fullDocument: 'updateLookup' }
    );

    console.log('Change stream opened for students collection');

    changeStream.on('change', async (change) => {
      const student = change.fullDocument;
      if (student && student.selected && student.groupName) {
        console.log('Student selected:', {
          studentId: student._id,
          studentName: student.name,
          teamName: student.groupName,
        });

        // Trigger Pusher event
        await pusher.trigger('private-students', 'student-selected', {
          student: {
            _id: student._id,
            name: student.name,
            batch: student.batch,
            category: student.category,
            tokenNumber: student.tokenNumber,
          },
          teamName: student.groupName,
          timestamp: Date.now(),
        });
        console.log(`Triggered student-selected for ${student.name} by ${student.groupName}`);
      }
    });

    // Keep the connection alive
    return new NextResponse('Change stream started', { status: 200 });
  } catch (err) {
    console.error('Change stream error:', {
      message: err.message,
      stack: err.stack,
    });
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE() {
  if (changeStream) {
    await changeStream.close();
    console.log('Change stream closed');
  }
  return new NextResponse('Change stream stopped', { status: 200 });
}