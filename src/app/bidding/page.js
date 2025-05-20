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
  const [biddingStudentId, setBiddingStudentId] = useState(null);
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

  // Authentication and initial teamName setup
  useEffect(() => {
    if (!isMounted.current) return;

    const token = localStorage.getItem('teamToken');
    const name = localStorage.getItem('teamName');

    console.log('Auth check - token:', !!token, 'teamName:', name);

    if (!token || !name) {
      console.log('Missing token or teamName, redirecting to team-login');
      localStorage.removeItem('teamToken');
      localStorage.removeItem('teamName');
      setIsLoading(false);
      router.push('/team-login');
      return;
    }

    if (name && teamName !== name) {
      console.log('Setting teamName:', name);
      setTeamName(name);
    }

    const checkAuth = async () => {
      try {
        const response = await axios.get('/api/auth/team-login', {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Auth successful:', response.data);
        setIsLoading(false);
      } catch (err) {
        console.error('Auth error:', {
          message: err.message || 'Unknown error',
          response: err.response?.data || null,
          status: err.response?.status || null,
          code: err.code || null,
        });
        localStorage.removeItem('teamToken');
        localStorage.removeItem('teamName');
        toast.error('Session expired or invalid. Please log in again.');
        setIsLoading(false);
        router.push('/team-login');
      }
    };
    checkAuth();

    return () => {
      isMounted.current = false;
    };
  }, [router, teamName]);

  // Fetch students and roster on initial load
  useEffect(() => {
    if (!teamName || isLoading) return;

    const token = localStorage.getItem('teamToken');
    if (!token) {
      console.log('No token, redirecting to team-login');
      router.push('/team-login');
      return;
    }

    const fetchStudents = async () => {
      try {
        const res = await axios.get('/api/students/list', {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Fetched available students:', res.data.length);
        setStudents(res.data.filter((s) => !s.selected));
      } catch (err) {
        console.error('Fetch students error:', {
          message: err.message || 'Unknown error',
          response: err.response?.data || null,
          status: err.response?.status || null,
          code: err.code || null,
        });
        if (err.response?.status === 401) {
          localStorage.removeItem('teamToken');
          localStorage.removeItem('teamName');
          toast.error('Session expired. Please log in again.');
          router.push('/team-login');
        } else {
          setError(err.response?.data?.message || 'Error fetching students');
        }
      }
    };

    const fetchRoster = async () => {
      try {
        const res = await axios.get('/api/students/roster', {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Fetched roster:', res.data.length);
        setTeamStudents(res.data);
      } catch (err) {
        console.error('Fetch roster error:', {
          message: err.message || 'Unknown error',
          response: err.response?.data || null,
          status: err.response?.status || null,
          code: err.code || null,
        });
        if (err.response?.status === 401) {
          localStorage.removeItem('teamToken');
          localStorage.removeItem('teamName');
          toast.error('Session expired. Please log in again.');
          router.push('/team-login');
        } else {
          setError(err.response?.data?.message || 'Error fetching roster');
        }
      }
    };

    fetchStudents();
    fetchRoster();

    return () => {
      // No periodic refresh
    };
  }, [teamName, isLoading, router]);

  // Pusher subscriptions
  useEffect(() => {
    if (!teamName || !isMounted.current || isLoading) return;

    const pusher = initializePusher();
    if (!pusher) return;

    const bidChannel = pusher.subscribe('bids');
    const sanitizedTeamName = teamName.replace(/\s+/g, '-').toLowerCase();
    const teamChannel = pusher.subscribe(`private-team-${sanitizedTeamName}`);

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
        utterance.volume = 1;
        utterance.rate = 1;
        speechSynthesis.speak(utterance);
      }, 500),
      [teamName]
    );

    const handleRosterUpdated = useCallback(
      debounce((data) => {
        if (!isMounted.current) return;

        const newStudent = data.student;
        console.log('Pusher roster update:', newStudent);
        setTeamStudents((prev) => {
          if (prev.some((s) => s._id === newStudent._id)) return prev;
          return [...prev, newStudent];
        });
      }, 500),
      []
    );

    bidChannel.bind('bid-placed', handleBidPlaced);
    teamChannel.bind('roster-updated', handleRosterUpdated);

    return () => {
      if (pusher) {
        pusher.unsubscribe('bids');
        pusher.unsubscribe(`private-team-${sanitizedTeamName}`);
      }
    };
  }, [teamName, initializePusher, isLoading]);

  const handleBid = async (studentId, studentName) => {
    if (!studentId || !teamName) {
      console.error('Invalid bid data:', { studentId, teamName });
      toast.error('Cannot place bid: Missing student or team information');
      return;
    }

    setBiddingStudentId(studentId); // Disable button
    try {
      const token = localStorage.getItem('teamToken');
      if (!token) {
        console.error('No team token found');
        throw new Error('No team token found');
      }

      // Optimistic updates
      setTeamStudents((prev) => {
        if (prev.some((s) => s._id === studentId)) return prev;
        const newRoster = [...prev, { _id: studentId, name: studentName }];
        console.log('Local roster updated:', newRoster);
        return newRoster;
      });
      setStudents((prev) => {
        console.log('Removing student locally:', studentId);
        return prev.filter((s) => s._id !== studentId);
      });

      console.log('Sending bid:', { studentId, teamName });
      const response = await axios.post(
        '/api/students/bid',
        { studentId, teamName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Bid response:', response.data);

      toast.success(`You selected ${studentName}`);
      const utterance = new SpeechSynthesisUtterance(`You selected ${studentName}`);
      utterance.volume = 1;
      utterance.rate = 1;
      utterance.onend = () => console.log('Speech finished:', studentName);
      speechSynthesis.cancel(); // Clear any queued utterances
      speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Bid error:', {
        message: err.message || 'Unknown error',
        response: err.response?.data || null,
        status: err.response?.status || null,
        code: err.code || null,
      });
      // Revert optimistic updates
      setTeamStudents((prev) => prev.filter((s) => s._id !== studentId));
      setStudents((prev) => {
        const student = { _id: studentId, name: studentName, selected: false };
        return prev.some((s) => s._id === studentId) ? prev : [...prev, student];
      });
      if (err.response?.status === 401) {
        localStorage.removeItem('teamToken');
        localStorage.removeItem('teamName');
        toast.error('Session expired. Please log in again.');
        router.push('/team-login');
      } else {
        toast.error(err.response?.data?.message || 'Failed to place bid');
      }
    } finally {
      setBiddingStudentId(null); // Re-enable button
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-gray-100 p-6">Loading...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => router.push('/team-login')}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg"
        >
          Log In Again
        </button>
      </div>
    );
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
                  className="mt-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={student.selected || biddingStudentId === student._id}
                >
                  {biddingStudentId === student._id ? 'Bidding...' : student.selected ? 'Already Selected' : 'Place Bid'}
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