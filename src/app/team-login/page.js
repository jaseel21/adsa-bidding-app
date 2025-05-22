'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-teal-100 via-cyan-100 to-blue-100 px-6 lg:px-16 py-12 relative overflow-hidden">

      {/* Floating Decor */}
      <div className="absolute top-10 left-10 w-24 h-24 bg-pink-300/30 rounded-full blur-xl animate-float" />
      <div className="absolute bottom-16 right-14 w-36 h-36 bg-yellow-300/25 rounded-full blur-xl animate-float delay-1000" />
      <div className="absolute top-1/4 right-1/3 w-20 h-20 bg-indigo-300/25 rounded-full blur-xl animate-float delay-2000" />

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="bg-white bg-opacity-90 backdrop-blur-xl rounded-3xl shadow-xl max-w-md w-full p-8"
      >

        {/* Main Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-2xl font-light text-gray-900 mb-8"
        >
          Team Login
        </motion.h1>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="teamName" className="block text-gray-800 font-medium mb-2">
              Team Name
            </label>
            <input
              id="teamName"
              type="text"
              name="teamName"
              value={formData.teamName}
              onChange={handleChange}
              className="w-full p-3 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
              placeholder="Enter your team name"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-gray-800 font-medium mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full p-3 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
              placeholder="Enter your password"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 text-lg font-medium text-white rounded-xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-indigo-500 via-sky-500 to-teal-400 hover:from-indigo-600 hover:via-sky-600 hover:to-teal-500 hover:shadow-lg"
          >
            {isLoading ? 'Logging in...' : '🚀 Login'}
          </button>
        </form>
      </motion.div>

      {/* Floating Animation */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-15px);
          }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .delay-1000 {
          animation-delay: 1s;
        }
        .delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}