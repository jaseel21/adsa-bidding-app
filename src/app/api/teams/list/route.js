import { NextResponse } from 'next/server';
import dbConnect from '../../../../../utils/dbConnect';
import Team from '../../../../models/Team';
import Student from '../../../../models/Student';
import jwt from 'jsonwebtoken';

export async function GET(request) {
  try {
    await dbConnect();
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }
    jwt.verify(token, process.env.JWT_SECRET);

    const teams = await Team.find({});
    const students = await Student.find({ selected: true });
    const teamsWithStudents = teams.map((team) => ({
      ...team._doc,
      students: students.filter((s) => s.groupName === team.teamName),
    }));

    return NextResponse.json(teamsWithStudents);
  } catch (error) {
    return NextResponse.json({ message: 'Error fetching teams', error: error.message }, { status: 500 });
  }
}