import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dbConnect from '../../../../../utils/dbConnect';
import Admin from '../../../../models/Admin';

export async function POST(request) {
  try {
    // Verify admin authentication
    // const token = request.headers.get('authorization')?.split(' ')[1];
    // if (!token) {
    //   return NextResponse.json({ message: 'Unauthorized: No token provided' }, { status: 401 });
    // }

    let decoded;
    // try {
    //   decoded = jwt.verify(token, process.env.JWT_SECRET);
    //   if (!decoded.adminId) {
    //     return NextResponse.json({ message: 'Unauthorized: Invalid token' }, { status: 401 });
    //   }
    // } catch (error) {
    //   return NextResponse.json({ message: 'Unauthorized: Invalid token' }, { status: 401 });
    // }

    // Connect to MongoDB
    await dbConnect();

    // Define admin credentials (hardcoded as in the script)
    const username = 'admin';
    const password = 'admin123';

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
      return NextResponse.json(
        { message: `Admin account already exists: ${username}` },
        { status: 400 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new admin
    const admin = await Admin.create({
      username,
      password: hashedPassword,
    });

    return NextResponse.json(
      { message: `Admin account created successfully: ${admin.username}` },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating admin account:', error);
    return NextResponse.json(
      { message: 'Error creating admin account', error: error.message },
      { status: 500 }
    );
  }
}