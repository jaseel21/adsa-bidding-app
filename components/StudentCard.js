'use client';
export default function StudentCard({ student, onSelect }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-bold">{student.name}</h3>
      <p>Batch: {student.batch}</p>
      <p>Category: {student.category}</p>
      <p>Token: {student.tokenNumber}</p>
      <button
        onClick={onSelect}
        className="mt-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
      >
        Select
      </button>
    </div>
  );
}