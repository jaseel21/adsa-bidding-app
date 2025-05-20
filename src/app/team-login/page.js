'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'react-toastify';

export default function TeamLogin() {
  const [formData, setFormData] = useState({ teamName: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      console.log('Submitting login:', formData);
      const response = await axios.post('/api/auth/team-login', formData, {
        headers: { 'Content-Type': 'application/json' },
      });
      const { token, teamName } = response.data;

      console.log('Login successful - token:', token, 'teamName:', teamName);
      localStorage.setItem('teamToken', token);
      localStorage.setItem('teamName', teamName);
      toast.success('Login successful');
      router.push('/bidding');
    } catch (err) {
      console.error('Login error:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        config: err.config,
      });
      toast.error(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">Team Login</h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700">Team Name</label>
            <input
              type="text"
              name="teamName"
              value={formData.teamName}
              onChange={handleChange}
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
              value={formData.password}
              onChange={handleChange}
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
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}