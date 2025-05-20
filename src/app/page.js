'use client';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  const handleStartBidding = () => {
    const token = localStorage.getItem('teamToken');
    if (token) {
      router.push('/bidding');
    } else {
      router.push('/team-login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-6">Art Competition Bidding</h1>
        <button
          onClick={handleStartBidding}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600"
        >
          Start Bidding
        </button>
      </div>
    </div>
  );
}