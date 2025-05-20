'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import io from 'socket.io-client';
import TeamCard from '../../../components/TeamCard';
import { verifyTeam } from '../../../utils/auth';

let socket;

export default function TeamPanel() {
  const [teamName, setTeamName] = useState('');
  const [students, setStudents] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const team = await verifyTeam();
      if (!team) {
        router.push('/team-login');
      } else {
        setTeamName(team.teamName);
      }
    };
    checkAuth();

    const fetchStudents = async () => {
      if (teamName) {
        try {
          const res = await axios.get(`/api/students/list?groupName=${teamName}`);
          setStudents(res.data);
        } catch (err) {
          console.error('Error fetching students:', err);
        }
      }
    };
    fetchStudents();

    socket = io();
    socket.on('studentSelected', ({ student, teamName: selectedTeam }) => {
      if (selectedTeam === teamName) {
        setStudents((prev) => [...prev, student]);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [teamName, router]);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">{teamName} Panel</h1>
      <TeamCard teamName={teamName} students={students} />
    </div>
  );
}