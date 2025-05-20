'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'react-toastify';
import Pusher from 'pusher-js';

export default function BiddingPage() {
  const [students, setStudents] = useState([]);
  const [teamStudents, setTeamStudents] = useState([]);
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pusherRef = useRef(null);
  const isMounted = useRef(true);

  // Initialize Pusher singleton
  const initializePusher = useCallback(() => {
    if (pusherRef.current) return pusherRef.current;

    const token = localStorage.getItem('teamToken');
    if (!token) return null;

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      authEndpoint: '/api/pusher/auth',
      auth: {
        headers: { Authorization: `Bearer ${token}` },
      },
    });

    pusher.connection.bind('error', (err) => {
      console.error('Pusher connection error:', err);
      toast.error('Real-time updates failed');
    });

    pusherRef.current = pusher;
    return pusher;
  }, []);

  // Authentication
  useEffect(() => {
    if (!isMounted.current) return;

    const token = localStorage.getItem('teamToken');
    const name = localStorage.getItem('teamName');

    console.log('Auth check - token:', !!token, 'teamName:', name);

    if (!token || !name) {
      console.log('Missing token or teamName, redirecting to team-login');
      localStorage.removeItem('teamToken');
      localStorage.removeItem('teamName');
      router.push('/team-login');
      return;
    }

    if (name && teamName !== name) {
      console.log('Setting teamName:', name);
      setTeamName(name);
    }

    const checkAuth = async () => {
      try {
        await axios.get('/api/auth/team-login', {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Auth successful');
        setIsLoading(false);
      } catch (err) {
        console.error('Auth error:', err);
        localStorage.removeItem('teamToken');
        localStorage.removeItem('teamName');
        toast.error('Session expired. Please log in again.');
        router.push('/team-login');
      }
    };
    checkAuth();

    return () => {
      isMounted.current = false;
    };
  }, [router, teamName]);

  // Fetch students
  useEffect(() => {
    if (!teamName || isLoading) return;

    const token = localStorage.getItem('teamToken');
    if (!token) return;

    const fetchStudents = async () => {
      try {
        const res = await axios.get('/api/students/list', {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Fetched students:', res.data);
        setStudents(res.data.filter((s) => !s.selected));
      } catch (err) {
        console.error('Fetch students error:', err);
        setError(err.response?.data?.message || 'Error fetching students');
      }
    };

    fetchStudents();
    const interval = setInterval(fetchStudents, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [teamName, isLoading]);

  // Pusher subscriptions
  useEffect(() => {
    if (!teamName || !isMounted.current || isLoading) return;

    const pusher = initializePusher();
    if (!pusher) return;

    const bidChannel = pusher.subscribe('bids');
    const teamChannel = pusher.subscribe(`private-team-${teamName}`);

    const debounce = (fn, ms) => {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), ms);
      };
    };

    const handleBidPlaced = useCallback(
      debounce((data) => {
        if (!isMounted.current || data.teamName === teamName) return;

        setStudents((prev) => {
          const exists = prev.some((s) => s._id === data.studentId);
          if (!exists) return prev;
          console.log('Removing student:', data.studentId, 'by', data.teamName);
          return prev.filter((s) => s._id !== data.studentId);
        });
        toast.info(`${data.teamName} selected ${data.studentName}`);
        const utterance = new SpeechSynthesisUtterance(`${data.teamName} selected ${data.studentName}`);
        speechSynthesis.speak(utterance);
      }, 1000),
      [teamName]
    );

    const handleRosterUpdated = useCallback(
      debounce((data) => {
        if (!isMounted.current) return;

        setTeamStudents((prev) => {
          const newStudents = data.students || [];
          if (JSON.stringify(prev) === JSON.stringify(newStudents)) return prev;
          console.log('Updating roster:', newStudents);
          return newStudents;
        });
      }, 1000),
      []
    );

    bidChannel.bind('bid-placed', handleBidPlaced);
    teamChannel.bind('roster-updated', handleRosterUpdated);

    return () => {
      if (pusher) {
        pusher.unsubscribe('bids');
        pusher.unsubscribe(`private-team-${teamName}`);
      }
    };
  }, [teamName, initializePusher, isLoading]);

  const handleBid = async (studentId, studentName) => {
    if (!studentId || !teamName) {
      console.error('Invalid bid data:', { studentId, teamName });
      toast.error('Cannot place bid: Missing student or team information');
      return;
    }

    try {
      const token = localStorage.getItem('teamToken');
      if (!token) {
        throw new Error('No team token found');
      }

      console.log('Sending bid:', { studentId, teamName });
      const response = await axios.post(
        '/api/students/list',
        { studentId, teamName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Bid response:', response.data);

      toast.success(`You selected ${studentName}`);
      const utterance = new SpeechSynthesisUtterance(`You selected ${studentName}`);
      speechSynthesis.speak(utterance);

      // Update local state immediately
      setTeamStudents((prev) => {
        const newRoster = [...prev, { _id: studentId, name: studentName }];
        console.log('Local roster updated:', newRoster);
        return newRoster;
      });
      setStudents((prev) => {
        console.log('Removing student locally:', studentId);
        return prev.filter((s) => s._id !== studentId);
      });

      // Trigger Pusher events (handled server-side)
    } catch (err) {
      console.error('Bid error:', err.response?.data || err.message);
      toast.error(err.response?.data?.message || 'Failed to place bid');
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-gray-100 p-6">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex">
      <div className="flex-1">
        <h1 className="text-3xl font-bold mb-6">Bidding Dashboard - {teamName}</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {students.length > 0 ? (
            students.map((student) => (
              <div key={student._id} className="bg-white p-4 rounded-lg shadow-md">
                <h3 className="text-lg font-bold">{student.name}</h3>
                <p>Batch: {student.batch}</p>
                <p>Category: {student.category}</p>
                <p>Token: {student.tokenNumber}</p>
                <button
                  onClick={() => student._id && handleBid(student._id, student.name)}
                  className="mt-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                  disabled={student.selected}
                >
                  {student.selected ? 'Already Selected' : 'Place Bid'}
                </button>
              </div>
            ))
          ) : (
            <p>No students available for bidding.</p>
          )}
        </div>
      </div>
      <div className="w-64 bg-white p-4 rounded-lg shadow-md ml-6">
        <h2 className="text-xl font-bold mb-4">{teamName} Roster</h2>
        {teamStudents.length > 0 ? (
          <ul className="list-disc pl-5">
            {teamStudents.map((student) => (
              <li key={student._id}>{student.name}</li>
            ))}
          </ul>
        ) : (
          <p>No students selected yet.</p>
        )}
      </div>
    </div>
  );
}