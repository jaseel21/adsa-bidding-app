import { NextResponse } from 'next/server';
import dbConnect from '../../../../../utils/dbConnect';
import Student from '../../../../models/Student';
import jwt from 'jsonwebtoken';
import { parse } from 'csv-parse';
import { Readable } from 'stream';

export async function POST(request) {
  try {
    console.log('POST /api/students/import: Starting');
    await dbConnect();
    console.log('MongoDB connected');

    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      console.warn('No token provided');
      return NextResponse.json({ message: 'No token provided', authenticated: false }, { status: 401 });
    }

    try {
      jwt.verify(token, process.env.JWT_SECRET);
      console.log('Admin token verified');
    } catch (err) {
      console.error('Token verification error:', err);
      return NextResponse.json({ message: 'Invalid token', authenticated: false }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) {
      console.warn('No file uploaded');
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }

    console.log('Processing CSV file:', file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = Readable.from(buffer);

    const students = [];
    const invalidRows = [];
    await new Promise((resolve, reject) => {
      stream
        .pipe(
          parse({
            columns: true,
            trim: true,
            skip_empty_lines: true,
            skip_lines_with_error: true,
          })
        )
        .on('data', (row) => {
          if (
            row.name &&
            row.batch &&
            row.category &&
            row.tokenNumber &&
            ['senior', 'junior', 'subjunior'].includes(row.category)
          ) {
            students.push({
              name: row.name.trim(),
              batch: row.batch.trim(),
              category: row.category.trim(),
              tokenNumber: row.tokenNumber.trim(),
              selected: false,
              groupName: '',
            });
          } else {
            console.warn('Skipping invalid row:', row);
            invalidRows.push(row);
          }
        })
        .on('end', () => {
          console.log('CSV parsing completed, rows parsed:', students.length, 'invalid rows:', invalidRows.length);
          resolve();
        })
        .on('error', (err) => {
          console.error('CSV parsing error:', err);
          reject(err);
        });
    });

    if (students.length === 0) {
      console.warn('No valid students found in CSV');
      return NextResponse.json(
        { message: 'No valid students found in CSV', invalidRows },
        { status: 400 }
      );
    }

    console.log('Inserting students:', students.length);
    const duplicateTokenNumbers = [];
    const result = await Student.insertMany(students, { ordered: false }).catch((err) => {
      if (err.code === 11000) {
        console.warn('Duplicate tokenNumber detected, partial insert');
        const failedDocs = err.writeErrors?.map((writeError) => writeError.getOperation()) || [];
        duplicateTokenNumbers.push(...failedDocs.map((doc) => doc.tokenNumber));
        return { insertedCount: err.result?.result?.nInserted || 0 };
      }
      throw err;
    });

    const insertedCount = result.insertedCount || 0;
    console.log('Imported students:', insertedCount, 'duplicates:', duplicateTokenNumbers.length);
    return NextResponse.json(
      {
        message:
          insertedCount > 0
            ? `Imported ${insertedCount} students successfully`
            : 'No new students imported due to duplicate token numbers',
        count: insertedCount,
        duplicates: duplicateTokenNumbers,
        invalidRows,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/students/import error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json({ message: 'Invalid token', authenticated: false }, { status: 401 });
    }
    return NextResponse.json(
      { message: 'Error importing students', error: error.message },
      { status: 500 }
    );
  }
}