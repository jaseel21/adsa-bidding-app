import jwt from 'jsonwebtoken';
import axios from 'axios';

export const verifyTeam = async () => {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const res = await axios.get('/api/auth/team-login', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { teamName: decoded.teamName };
  } catch (error) {
    localStorage.removeItem('token');
    return null;
  }
};