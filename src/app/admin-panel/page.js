'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'react-toastify';
import Pusher from 'pusher-js';

export default function AdminPanel() {
  const [studentForm, setStudentForm] = useState({
    name: '',
    batch: '',
    category: '',
    tokenNumber: '',
  });
  const [teamForm, setTeamForm] = useState({ teamName: '', password: '' });
  const [csvFile, setCsvFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [activeSection, setActiveSection] = useState('teams');
  const [teams, setTeams] = useState([]);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('adminToken');
      console.log('Checking admin auth, token:', token ? 'present' : 'missing');

      if (!token) {
        console.warn('No adminToken found in localStorage');
        router.push('/admin-login');
        return;
      }

      try {
        const response = await axios.get('/api/auth/admin-login', {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Auth check response:', response.data);

        if (!response.data.authenticated) {
          console.warn('Authentication failed:', response.data.message);
          localStorage.removeItem('adminToken');
          toast.error('Session invalid. Please log in again.');
          router.push('/admin-login');
          return;
        }

        console.log('Admin authenticated successfully');
        setIsAuthChecked(true);
      } catch (err) {
        console.error('Admin auth error:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
        });
        localStorage.removeItem('adminToken');
        toast.error('Authentication error. Please log in again.');
        router.push('/admin-login');
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    const unlockAudio = () => {
      if (!isAudioUnlocked) {
        console.log('Audio unlock attempt');
        setIsAudioUnlocked(true);
        if ('speechSynthesis' in window) {
          speechSynthesis.speak(new SpeechSynthesisUtterance(''));
          console.log('SpeechSynthesis initialized');
        } else {
          console.error('SpeechSynthesis not supported');
          toast.error('Voice not supported', { position: 'top-right' });
        }
      }
    };
    document.addEventListener('click', unlockAudio);
    return () => document.removeEventListener('click', unlockAudio);
  }, [isAudioUnlocked]);

  useEffect(() => {
    if (!isAuthChecked) return;

    const fetchTeams = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const response = await axios.get('/api/teams/list', {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Fetched teams:', response.data);
        setTeams(response.data.map(team => ({
          ...team,
          students: team.students || [],
        })));
      } catch (err) {
        console.error('Fetch teams error:', err);
        toast.error('Failed to fetch teams', { position: 'top-right' });
      }
    };

    fetchTeams();

    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    if (!pusherKey) {
      console.error('Pusher key missing');
      toast.error('Pusher configuration error', { position: 'top-right' });
      return;
    }

    const pusher = new Pusher(pusherKey, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap2',
      forceTLS: true,
      enabledTransports: ['ws', 'wss'],
    });

    const bidsChannel = pusher.subscribe('bids');
    bidsChannel.bind('bid-placed', ({ studentId, studentName, teamName, batch, timestamp }) => {
      console.log('Bid received:', { studentId, studentName, teamName, batch, timestamp });
      toast.info(`${teamName} selected ${studentName} (${batch})`, {
        toastId: `bid-${studentId}-${timestamp}`,
        position: 'top-right',
        autoClose: 5000,
      });
      console.log('Toast triggered');

      if ('speechSynthesis' in window && isAudioUnlocked) {
        const utterance = new SpeechSynthesisUtterance(`${teamName} selected ${studentName}`);
        utterance.lang = 'en-US';
        utterance.volume = 0.8;
        const voices = speechSynthesis.getVoices();
        console.log('Voices:', voices.map(v => v.name));
        const enUSVoice = voices.find(v => v.lang === 'en-US');
        if (enUSVoice) {
          utterance.voice = enUSVoice;
          console.log('Voice selected:', enUSVoice.name);
        }
        speechSynthesis.speak(utterance);
        console.log('Voice triggered');
      } else {
        console.warn('SpeechSynthesis blocked:', {
          supported: 'speechSynthesis' in window,
          unlocked: isAudioUnlocked,
        });
        toast.warn('Click anywhere to enable audio', {
          toastId: 'audio-warning',
          position: 'top-right',
          autoClose: 5000,
        });
      }
    });

    teams.forEach(team => {
      const sanitizedTeamName = team.teamName.replace(/\s+/g, '-').toLowerCase();
      const teamChannel = pusher.subscribe(`private-team-${sanitizedTeamName}`);
      teamChannel.bind('roster-updated', ({ student, timestamp }) => {
        console.log('Roster update:', { team: team.teamName, student, timestamp });
        setTeams(prev => prev.map(t => 
          t.teamName === team.teamName 
            ? { ...t, students: [...(t.students || []), student] } 
            : t
        ));
      });
    });

    bidsChannel.bind('pusher:subscription_succeeded', () => console.log('Subscribed to bids'));
    pusher.connection.bind('connected', () => console.log('Pusher connected'));
    pusher.connection.bind('error', err => console.error('Pusher error:', err));

    return () => {
      pusher.unsubscribe('bids');
      teams.forEach(team => {
        const sanitizedTeamName = team.teamName.replace(/\s+/g, '-').toLowerCase();
        pusher.unsubscribe(`private-team-${sanitizedTeamName}`);
      });
      pusher.disconnect();
    };
  }, [isAuthChecked, teams]);

  const handleStudentChange = (e) => {
    setStudentForm({ ...studentForm, [e.target.name]: e.target.value });
  };

  const handleTeamChange = (e) => {
    setTeamForm({ ...teamForm, [e.target.name]: e.target.value });
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      console.log('Adding student:', studentForm);
      const response = await axios.post('/api/students/create', studentForm, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
      });
      console.log('Student added:', response.data);
      toast.success('Student added successfully', { position: 'top-right' });
      setStudentForm({ name: '', batch: '', category: '', tokenNumber: '' });
    } catch (err) {
      console.error('Add student error:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      toast.error(err.response?.data?.message || 'Failed to add student', { position: 'top-right' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCsvChange = (e) => {
    setCsvFile(e.target.files[0]);
  };

  const handleCsvSubmit = async (e) => {
    e.preventDefault();
    if (!csvFile) {
      toast.error('Please select a CSV file', { position: 'top-right' });
      return;
    }
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', csvFile);
      console.log('Uploading CSV:', csvFile.name);
      const response = await axios.post('/api/students/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });
      console.log('CSV import response:', response.data);
      toast.success(`Imported ${response.data.count} students`, { position: 'top-right' });
      setCsvFile(null);
    } catch (err) {
      console.error('CSV import error:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      toast.error(err.response?.data?.message || 'Failed to import CSV', { position: 'top-right' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTeamSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      console.log('Adding team:', teamForm);
      const response = await axios.post('/api/teams/create', teamForm, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
      });
      console.log('Team added:', response.data);
      setTeams(prev => [...prev, { teamName: teamForm.teamName, students: [] }]);
      toast.success('Team added successfully', { position: 'top-right' });
      setTeamForm({ teamName: '', password: '' });
    } catch (err) {
      console.error('Add team error:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      toast.error(err.response?.data?.message || 'Failed to add team', { position: 'top-right' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthChecked) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        Checking authentication...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <div className="w-64 bg-white shadow-md">
        <div className="p-4">
          <h2 className="text-xl font-bold">Admin Panel</h2>
        </div>
        <nav className="mt-4">
          <button
            onClick={() => setActiveSection('teams')}
            className={`w-full text-left p-4 hover:bg-gray-100 ${activeSection === 'teams' ? 'bg-gray-100 font-bold' : ''}`}
          >
            Teams & Students
          </button>
          <button
            onClick={() => setActiveSection('add-student')}
            className={`w-full text-left p-4 hover:bg-gray-100 ${activeSection === 'add-student' ? 'bg-gray-100 font-bold' : ''}`}
          >
            Add Student
          </button>
          <button
            onClick={() => setActiveSection('import-csv')}
            className={`w-full text-left p-4 hover:bg-gray-100 ${activeSection === 'import-csv' ? 'bg-gray-100 font-bold' : ''}`}
          >
            Import CSV
          </button>
          <button
            onClick={() => setActiveSection('add-team')}
            className={`w-full text-left p-4 hover:bg-gray-100 ${activeSection === 'add-team' ? 'bg-gray-100 font-bold' : ''}`}
          >
            Add Team
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('adminToken');
              router.push('/admin-login');
            }}
            className="w-full text-left p-4 hover:bg-gray-100 text-red-600"
          >
            Logout
          </button>
        </nav>
      </div>

      <div className="flex-1 p-6">
        {activeSection === 'teams' && (
          <div>
            <h1 className="text-3xl font-bold mb-6">Teams & Students</h1>
            {teams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {['team 1', 'team 2', 'team 3'].map(teamName => {
                  const team = teams.find(t => t.teamName === teamName) || { teamName, students: [] };
                  return (
                    <div key={team.teamName} className="bg-white p-6 rounded-lg shadow-md">
                      <h2 className="text-2xl font-semibold mb-4 text-indigo-900">{team.teamName}</h2>
                      {team.students.length > 0 ? (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {team.students.map(student => (
                            <div key={student._id} className="bg-indigo-50 p-3 rounded-lg">
                              <p className="font-medium">{student.name}</p>
                              <p className="text-sm text-gray-600">Batch: {student.batch}</p>
                              <p className="text-sm text-gray-600">Category: {student.category}</p>
                              <p className="text-sm text-gray-600">Token: {student.tokenNumber}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-600">No students selected by {team.teamName} yet.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-600">No teams available.</p>
            )}
          </div>
        )}

        {activeSection === 'add-student' && (
          <div className="max-w-md">
            <h1 className="text-3xl font-bold mb-6">Add Student</h1>
            <form onSubmit={handleStudentSubmit} className="bg-white p-6 rounded-lg shadow-md">
              <div className="mb-4">
                <label className="block text-gray-700">Name</label>
                <input
                  type="text"
                  name="name"
                  value={studentForm.name}
                  onChange={handleStudentChange}
                  className="w-full p-2 border rounded"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700">Batch</label>
                <input
                  type="text"
                  name="batch"
                  value={studentForm.batch}
                  onChange={handleStudentChange}
                  className="w-full p-2 border rounded"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700">Category</label>
                <select
                  name="category"
                  value={studentForm.category}
                  onChange={handleStudentChange}
                  className="w-full p-2 border rounded"
                  required
                  disabled={isLoading}
                >
                  <option value="">Select Category</option>
                  <option value="senior">Senior</option>
                  <option value="junior">Junior</option>
                  <option value="subjunior">Subjunior</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700">Token Number</label>
                <input
                  type="text"
                  name="tokenNumber"
                  value={studentForm.tokenNumber}
                  onChange={handleStudentChange}
                  className="w-full p-2 border rounded"
                  required
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
                disabled={isLoading}
              >
                {isLoading ? 'Adding...' : 'Add Student'}
              </button>
            </form>
          </div>
        )}

        {activeSection === 'import-csv' && (
          <div className="max-w-md">
            <h1 className="text-3xl font-bold mb-6">Import Students (CSV)</h1>
            <form onSubmit={handleCsvSubmit} className="bg-white p-6 rounded-lg shadow-md">
              <div className="mb-4">
                <label className="block text-gray-700">CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvChange}
                  className="w-full p-2 border rounded"
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
                disabled={isLoading || !csvFile}
              >
                {isLoading ? 'Importing...' : 'Import CSV'}
              </button>
            </form>
          </div>
        )}

        {activeSection === 'add-team' && (
          <div className="max-w-md">
            <h1 className="text-3xl font-bold mb-6">Add Team</h1>
            <form onSubmit={handleTeamSubmit} className="bg-white p-6 rounded-lg shadow-md">
              <div className="mb-4">
                <label className="block text-gray-700">Team Name</label>
                <input
                  type="text"
                  name="teamName"
                  value={teamForm.teamName}
                  onChange={handleTeamChange}
                  className="w-full p-2 border rounded"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700">Password</label>
                <input
                  type="password"
                  name="password"
                  value={teamForm.password}
                  onChange={handleTeamChange}
                  className="w-full p-2 border rounded"
                  required
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
                disabled={isLoading}
              >
                {isLoading ? 'Adding...' : 'Add Team'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}