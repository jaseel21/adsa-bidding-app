'use client';
export default function TeamCard({ teamName, students }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-bold mb-2">{teamName}</h3>
      <ul>
        {students.map((student) => (
          <li key={student._id} className="mb-1">
            {student.name} (Batch: {student.batch}, Category: {student.category})
          </li>
        ))}
      </ul>
    </div>
  );
}