'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'react-toastify';

export default function BiddingPage() {
  const [students, setStudents] = useState([]);
  const [teamStudents, setTeamStudents] = useState([]);
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [biddingStudentIds, setBiddingStudentIds] = useState(new Set());
  const router = useRouter();
  const isMounted = useRef(true);

  // Test toast button
  const handleTestToast = () => {
    console.log('Triggering test toast');
    toast.info('Test toast');
  };

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
        console.error('Auth error:', err);
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

  // Fetch students and roster
  useEffect(() => {
    if (!teamName || isLoading) return;

    const token = localStorage.getItem('teamToken');
    if (!token) {
      console.log('No token, redirecting to team-login');
      setIsLoading(false);
      router.push('/team-login');
      return;
    }

    const fetchStudents = async () => {
      try {
        const res = await axios.get('/api/students/list', {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Fetched students:', res.data);
        setStudents(res.data.filter((s) => !s.selected));
        console.log('Available students:', res.data.filter((s) => !s.selected).length);
      } catch (err) {
        console.error('Fetch students error:', err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('teamToken');
          localStorage.removeItem('teamName');
          toast.error('Session invalid. Please log in again.');
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
        console.error('Fetch roster error:', err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('teamToken');
          localStorage.removeItem('teamName');
          toast.error('Session invalid. Please log in again.');
          router.push('/team-login');
        } else {
          setError(err.response?.data?.message || 'Error fetching roster');
        }
      }
    };

    fetchStudents();
    fetchRoster();
    const interval = setInterval(fetchStudents, 10000);

    return () => clearInterval(interval);
  }, [teamName, isLoading, router]);

  const handleBid = async (studentId, studentName) => {
    if (!studentId || !teamName) {
      console.error('Invalid bid data:', { studentId, teamName });
      toast.error('Cannot place bid: Missing student or team information');
      return;
    }

    if (biddingStudentIds.has(studentId)) {
      console.log('Bid already in progress for student:', studentId);
      return;
    }

    setBiddingStudentIds((prev) => new Set(prev).add(studentId));
    try {
      const token = localStorage.getItem('teamToken');
      if (!token) {
        console.error('No team token found');
        throw new Error('No team token found');
      }

      setTeamStudents((prev) => {
        if (prev.some((s) => s._id === studentId)) return prev;
        const newRoster = [...prev, { _id: studentId, name: studentName }];
        console.log('Local roster updated:', newRoster.map((s) => s._id));
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
    } catch (err) {
      console.error('Raw bid error:', err);
      console.error('Bid error:', {
        message: err.message || 'Unknown error',
        response: err.response?.data || null,
        status: err.response?.status || null,
        code: err.code || null,
        stack: err.stack || null,
      });
      setTeamStudents((prev) => prev.filter((s) => s._id !== studentId));
      setStudents((prev) => {
        const student = { _id: studentId, name: studentName, selected: false };
        return prev.some((s) => s._id === studentId) ? prev : [...prev, student];
      });
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('teamToken');
        localStorage.removeItem('teamName');
        toast.error('Session invalid. Please log in again.');
        router.push('/team-login');
      } else {
        toast.error(err.response?.data?.message || 'Failed to place bid');
      }
    } finally {
      setBiddingStudentIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(studentId);
        return newSet;
      });
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
        {/* <button
          onClick={handleTestToast}
          className="mb-4 bg-green-500 text-white px-4 py-2 rounded-lg"
        >
          Test Toast
        </button> */}
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
                  disabled={student.selected || biddingStudentIds.has(student._id)}
                >
                  {biddingStudentIds.has(student._id)
                    ? 'Bidding...'
                    : student.selected
                    ? 'Already Bidded'
                    : 'Place Bid'}
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