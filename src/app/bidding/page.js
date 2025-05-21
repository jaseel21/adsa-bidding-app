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
  const [activeCategory, setActiveCategory] = useState('all');
  const router = useRouter();
  const isMounted = useRef(true);

  // Authentication and initial data loading
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

  // Fetch students and team roster
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

  // Handle bidding logic
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
      toast.success(`Successfully bid on ${studentName}!`);
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
        const student = { _id: studentId, name: studentName, selected: false, groupName: null };
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

  // Get unique categories for filter
  const categories = ['all', ...new Set(students.map(student => student.category))].filter(Boolean);

  // Filter students by category
  const filteredStudents = activeCategory === 'all' 
    ? students 
    : students.filter(student => student.category === activeCategory);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-700 mx-auto mb-4"></div>
          <p className="text-xl text-indigo-800 font-medium">Loading your bidding dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md">
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
            <p className="font-medium">{error}</p>
          </div>
          <button
            onClick={() => router.push('/team-login')}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Log In Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-indigo-800 text-white shadow-lg mb-6">
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <h1 className="text-2xl font-bold">ADSA Art Competition</h1>
          </div>
          <div className="flex items-center">
            <button
              onClick={() => router.push('/')}
              className="bg-indigo-700 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 mr-4 text-sm"
            >
              Home
            </button>
            <div className="bg-indigo-700 px-4 py-2 rounded-lg text-sm">
              Team: <span className="font-bold">{teamName}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 pb-12">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content */}
          <div className="flex-1">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-md p-4 flex items-center">
                <div className="bg-blue-100 text-blue-600 p-3 rounded-lg mr-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                  </svg>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Available Students</p>
                  <p className="text-xl font-bold">{students.length}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-md p-4 flex items-center">
                <div className="bg-green-100 text-green-600 p-3 rounded-lg mr-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Your Selections</p>
                  <p className="text-xl font-bold">{teamStudents.length}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-md p-4 flex items-center">
                <div className="bg-purple-100 text-purple-600 p-3 rounded-lg mr-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path>
                  </svg>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Categories</p>
                  <p className="text-xl font-bold">{categories.length - 1}</p>
                </div>
              </div>
            </div>

            
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-indigo-900 mb-4 md:mb-0">Available Students</h2>
                
                {/* Category Filter */}
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setActiveCategory(category)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeCategory === category
                          ? 'bg-indigo-600 text-white'
                          : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                      }`}
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Students Grid */}
              {filteredStudents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredStudents.map((student) => (
                    <div key={student._id} className="bg-gradient-to-br from-white to-indigo-50 rounded-lg shadow-md overflow-hidden border border-indigo-100">
                      <div className="bg-indigo-600 text-white px-4 py-1 text-xs flex justify-between items-center">
                        <span>Token #{student.tokenNumber}</span>
                        <span className="bg-indigo-500 px-2 py-0.5 rounded">{student.batch || 'No Batch'}</span>
                      </div>
                      <div className="p-4">
                        <h3 className="text-lg font-bold text-indigo-900 mb-2">{student.name}</h3>
                        <div className="mb-4">
                          <div className="inline-block bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-xs font-medium">
                            {student.category || 'General'}
                          </div>
                        </div>
                        <button
                          onClick={() => student._id && handleBid(student._id, student.name)}
                          className={`w-full py-2 rounded-lg text-sm font-medium flex justify-center items-center ${
                            biddingStudentIds.has(student._id)
                              ? 'bg-indigo-200 text-indigo-700 cursor-wait'
                              : student.selected
                              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                          disabled={student.selected || biddingStudentIds.has(student._id)}
                        >
                          {biddingStudentIds.has(student._id) ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Bidding...
                            </>
                          ) : student.selected ? (
                            'Already Bidded'
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                              </svg>
                              Place Bid
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-indigo-50 rounded-lg p-8 text-center">
                  <svg className="w-16 h-16 text-indigo-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <p className="text-indigo-700 text-xl font-medium">No students available for bidding in this category.</p>
                  {activeCategory !== 'all' && (
                    <button
                      onClick={() => setActiveCategory('all')}
                      className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                    >
                      Show All Categories
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Stats Overview */}
            
          </div>

          {/* Team Roster Sidebar */}
          <div className="lg:w-80">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-indigo-900">Team Roster</h2>
                <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg text-sm font-medium">
                  {teamStudents.length} Selected
                </div>
              </div>
              
              <div className="bg-indigo-50 p-4 rounded-lg mb-4">
                <div className="font-medium text-indigo-700 mb-1">Team Name</div>
                <div className="text-2xl font-bold text-indigo-900">{teamName}</div>
              </div>
              
              {teamStudents.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {teamStudents.map((student, index) => (
                    <div key={student._id} className="bg-gradient-to-r from-indigo-50 to-white p-3 rounded-lg border border-indigo-100 flex items-center">
                      <div className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                        {index + 1}
                      </div>
                      <div className="font-medium text-indigo-900">{student.name}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-indigo-50 rounded-lg p-6 text-center">
                  <svg className="w-12 h-12 text-indigo-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                  </svg>
                  <p className="text-indigo-700">No students selected yet.</p>
                  <p className="text-indigo-600 text-sm mt-2">Place bids to build your team!</p>
                </div>
              )}
              
              <div className="mt-6">
                <button
                  onClick={() => {
                    localStorage.removeItem('teamToken');
                    localStorage.removeItem('teamName');
                    router.push('/team-login');
                  }}
                  className="w-full bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors text-sm flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                  </svg>
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}