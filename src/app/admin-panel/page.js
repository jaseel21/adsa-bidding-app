'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'react-toastify';

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
  const router = useRouter();

  // Check admin authentication
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
          config: err.config,
        });
        localStorage.removeItem('adminToken');
        toast.error('Authentication error. Please log in again.');
        router.push('/admin-login');
      }
    };
    checkAuth();
  }, [router]);

  // Handle student form input changes
  const handleStudentChange = (e) => {
    setStudentForm({ ...studentForm, [e.target.name]: e.target.value });
  };

  // Handle team form input changes
  const handleTeamChange = (e) => {
    setTeamForm({ ...teamForm, [e.target.name]: e.target.value });
  };

  // Handle student form submission
  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      console.log('Adding student:', studentForm);
      const response = await axios.post('/api/students/create', studentForm, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
      });
      console.log('Student added:', response.data);
      toast.success('Student added successfully');
      setStudentForm({ name: '', batch: '', category: '', tokenNumber: '' });
    } catch (err) {
      console.error('Add student error:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      toast.error(err.response?.data?.message || 'Failed to add student');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle CSV file selection
  const handleCsvChange = (e) => {
    setCsvFile(e.target.files[0]);
  };

  // Handle CSV import
  const handleCsvSubmit = async (e) => {
    e.preventDefault();
    if (!csvFile) {
      toast.error('Please select a CSV file');
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
      toast.success(`Imported ${response.data.count} students`);
      setCsvFile(null);
    } catch (err) {
      console.error('CSV import error:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      toast.error(err.response?.data?.message || 'Failed to import CSV');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle team form submission
  const handleTeamSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      console.log('Adding team:', teamForm);
      const response = await axios.post('/api/teams', teamForm, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
      });
      console.log('Team added:', response.data);
      toast.success('Team added successfully');
      setTeamForm({ teamName: '', password: '' });
    } catch (err) {
      console.error('Add team error:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      toast.error(err.response?.data?.message || 'Failed to add team');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state until auth is checked
  if (!isAuthChecked) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center">Checking authentication...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Add Student Form */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Add Student</h2>
          <form onSubmit={handleStudentSubmit}>
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

        {/* CSV Import Form */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Import Students (CSV)</h2>
          <form onSubmit={handleCsvSubmit}>
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

        {/* Add Team Form */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Add Team</h2>
          <form onSubmit={handleTeamSubmit}>
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
      </div>
    </div>
  );
}