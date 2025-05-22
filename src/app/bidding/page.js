// 'use client';
// import { useState, useEffect, useRef } from 'react';
// import { useRouter } from 'next/navigation';

// import axios from 'axios';
// import { toast } from 'react-toastify';
// import { FaRegUserCircle } from 'react-icons/fa';
// import { FiLogOut } from 'react-icons/fi';
// import { motion } from 'framer-motion';

// export default function BiddingPage() {
//   const [students, setStudents] = useState([]);
//   const [teamStudents, setTeamStudents] = useState([]);
//   const [teamName, setTeamName] = useState('');
//   const [error, setError] = useState('');
//   const [isLoading, setIsLoading] = useState(true);
//   const [biddingStudentIds, setBiddingStudentIds] = useState(new Set());
//   const [activeCategory, setActiveCategory] = useState('all');
//   const router = useRouter();
//   const isMounted = useRef(true);

//   // Authentication and initial data loading
//   useEffect(() => {
//     if (!isMounted.current) return;

//     const token = localStorage.getItem('teamToken');
//     const name = localStorage.getItem('teamName');

//     console.log('Auth check - token:', !!token, 'teamName:', name);

//     if (!token || !name) {
//       console.log('Missing token or teamName, redirecting to team-login');
//       localStorage.removeItem('teamToken');
//       localStorage.removeItem('teamName');
//       setIsLoading(false);
//       router.push('/team-login');
//       return;
//     }

//     if (name && teamName !== name) {
//       console.log('Setting teamName:', name);
//       setTeamName(name);
//     }

//     const checkAuth = async () => {
//       try {
//         const response = await axios.get('/api/auth/team-login', {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         console.log('Auth successful:', response.data);
//         setIsLoading(false);
//       } catch (err) {
//         console.error('Auth error:', err);
//         localStorage.removeItem('teamToken');
//         localStorage.removeItem('teamName');
//         toast.error('Session expired or invalid. Please log in again.');
//         setIsLoading(false);
//         router.push('/team-login');
//       }
//     };
//     checkAuth();

//     return () => {
//       isMounted.current = false;
//     };
//   }, [router, teamName]);

//   // Fetch students and team roster
//   useEffect(() => {
//     if (!teamName || isLoading) return;

//     const token = localStorage.getItem('teamToken');
//     if (!token) {
//       console.log('No token, redirecting to team-login');
//       setIsLoading(false);
//       router.push('/team-login');
//       return;
//     }

//     const fetchStudents = async () => {
//       try {
//         const res = await axios.get('/api/students/list', {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         console.log('Fetched students:', res.data);
//         setStudents(res.data.filter((s) => !s.selected));
//         console.log('Available students:', res.data.filter((s) => !s.selected).length);
//       } catch (err) {
//         console.error('Fetch students error:', err);
//         if (err.response?.status === 401 || err.response?.status === 403) {
//           localStorage.removeItem('teamToken');
//           localStorage.removeItem('teamName');
//           toast.error('Session invalid. Please log in again.');
//           router.push('/team-login');
//         } else {
//           setError(err.response?.data?.message || 'Error fetching students');
//         }
//       }
//     };

//     const fetchRoster = async () => {
//       try {
//         const res = await axios.get('/api/students/roster', {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         console.log('Fetched roster:', res.data.length);
//         setTeamStudents(res.data);
//       } catch (err) {
//         console.error('Fetch roster error:', err);
//         if (err.response?.status === 401 || err.response?.status === 403) {
//           localStorage.removeItem('teamToken');
//           localStorage.removeItem('teamName');
//           toast.error('Session invalid. Please log in again.');
//           router.push('/team-login');
//         } else {
//           setError(err.response?.data?.message || 'Error fetching roster');
//         }
//       }
//     };

//     fetchStudents();
//     fetchRoster();
//     const interval = setInterval(fetchStudents, 10000);

//     return () => clearInterval(interval);
//   }, [teamName, isLoading, router]);

//   // Handle bidding logic
//   const handleBid = async (studentId, studentName) => {
//     if (!studentId || !teamName) {
//       console.error('Invalid bid data:', { studentId, teamName });
//       toast.error('Cannot place bid: Missing student or team information');
//       return;
//     }

//     if (biddingStudentIds.has(studentId)) {
//       console.log('Bid already in progress for student:', studentId);
//       return;
//     }

//     setBiddingStudentIds((prev) => new Set(prev).add(studentId));
//     try {
//       const token = localStorage.getItem('teamToken');
//       if (!token) {
//         console.error('No team token found');
//         throw new Error('No team token found');
//       }

//       setTeamStudents((prev) => {
//         if (prev.some((s) => s._id === studentId)) return prev;
//         const newRoster = [...prev, { _id: studentId, name: studentName }];
//         console.log('Local roster updated:', newRoster.map((s) => s._id));
//         return newRoster;
//       });
//       setStudents((prev) => {
//         console.log('Removing student locally:', studentId);
//         return prev.filter((s) => s._id !== studentId);
//       });

//       console.log('Sending bid:', { studentId, teamName });
//       const response = await axios.post(
//         '/api/students/bid',
//         { studentId, teamName },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       console.log('Bid response:', response.data);
//       toast.success(`Successfully bid on ${studentName}!`);
//     } catch (err) {
//       console.error('Raw bid error:', err);
//       console.error('Bid error:', {
//         message: err.message || 'Unknown error',
//         response: err.response?.data || null,
//         status: err.response?.status || null,
//         code: err.code || null,
//         stack: err.stack || null,
//       });
//       setTeamStudents((prev) => prev.filter((s) => s._id !== studentId));
//       setStudents((prev) => {
//         const student = { _id: studentId, name: studentName, selected: false, groupName: null };
//         return prev.some((s) => s._id === studentId) ? prev : [...prev, student];
//       });
//       if (err.response?.status === 401 || err.response?.status === 403) {
//         localStorage.removeItem('teamToken');
//         localStorage.removeItem('teamName');
//         toast.error('Session invalid. Please log in again.');
//         router.push('/team-login');
//       } else {
//         toast.error(err.response?.data?.message || 'Failed to place bid');
//       }
//     } finally {
//       setBiddingStudentIds((prev) => {
//         const newSet = new Set(prev);
//         newSet.delete(studentId);
//         return newSet;
//       });
//     }
//   };

//   // Get unique categories for filter
//   const categories = ['all', ...new Set(students.map(student => student.category))].filter(Boolean);

//   // Filter students by category
//   const filteredStudents = activeCategory === 'all'
//     ? students
//     : students.filter(student => student.category === activeCategory);

//   if (isLoading) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
//         <div className="bg-white p-8 rounded-xl shadow-lg text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-700 mx-auto mb-4"></div>
//           <p className="text-xl text-indigo-800 font-medium">Loading your bidding dashboard...</p>
//         </div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-center justify-center">
//         <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md">
//           <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
//             <p className="font-medium">{error}</p>
//           </div>
//           <button
//             onClick={() => router.push('/team-login')}
//             className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
//           >
//             Log In Again
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen flex flex-col justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 px-6 lg:px-16 py-12 relative overflow-hidden">

//       {/* Welcome Section */}
//       <motion.section
//         initial={{ opacity: 0, y: 20 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ duration: 0.6 }}
//         className="relative rounded-2xl p-6 text-left max-w-3xl ms-16"
//       >
//         <div className="absolute top-0 left-0 w-16 h-16 bg-green-100 rounded-full opacity-20 blur-xl" />
//         <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
//           Hello , <span className="text-green-500">{teamName}</span>
//           <motion.span
//             initial={{ rotate: 0 }}
//             animate={{ rotate: [0, 10, -10, 0] }}
//             transition={{ duration: 0.5, delay: 0.2 }}
//           >
//             👋
//           </motion.span>
//         </h2>
//       </motion.section>


//       <div className="container max-w-9xl mx-auto flex flex-col items-center justify-center px-4 pb-12 pt-6">
//         <div className="flex flex-col lg:flex-row gap-6">
//           {/* Main Content */}
//           <div className="flex-1">
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
//               {/* Card: Available Students */}
//               <div className="bg-gradient-to-br from-white to-blue-100 rounded-2xl shadow-lg px-6 py-6 flex items-center gap-6 hover:scale-[1.02] hover:shadow-xl transition duration-300 ease-in-out">
//                 <div className="bg-blue-200 text-blue-700 p-5 rounded-full shadow-inner">
//                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
//                       d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
//                   </svg>
//                 </div>
//                 <div>
//                   <p className="text-gray-600 text-sm uppercase tracking-wide font-semibold">Available Students</p>
//                   <h3 className="text-3xl font-bold text-gray-800">{students.length}</h3>
//                 </div>
//               </div>

//               {/* Card: Your Selections */}
//               <div className="bg-gradient-to-br from-white to-green-100 rounded-2xl shadow-lg px-6 py-6 flex items-center gap-6 hover:scale-[1.02] hover:shadow-xl transition duration-300 ease-in-out">
//                 <div className="bg-green-200 text-green-700 p-5 rounded-full shadow-inner">
//                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
//                       d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
//                   </svg>
//                 </div>
//                 <div>
//                   <p className="text-gray-600 text-sm uppercase tracking-wide font-semibold">Your Selections</p>
//                   <h3 className="text-3xl font-bold text-gray-800">{teamStudents.length}</h3>
//                 </div>
//               </div>

//               {/* Card: Categories */}
//               <div className="bg-gradient-to-br from-white to-purple-100 rounded-2xl shadow-lg px-6 py-6 flex items-center gap-6 hover:scale-[1.02] hover:shadow-xl transition duration-300 ease-in-out">
//                 <div className="bg-purple-200 text-purple-700 p-5 rounded-full shadow-inner">
//                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
//                       d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
//                   </svg>
//                 </div>
//                 <div>
//                   <p className="text-gray-600 text-sm uppercase tracking-wide font-semibold">Categories</p>
//                   <h3 className="text-3xl font-bold text-gray-800">{categories.length - 1}</h3>
//                 </div>
//               </div>
//             </div>


//             <div className="bg-white rounded-xl shadow-md p-6 lg:p-8 mb-8 border border-gray-100">
//               {/* Header */}
//               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
//                 <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Available Students</h2>
//                 {/* Filters */}
//                 <div className="flex flex-wrap gap-2">
//                   {categories.map((category) => (
//                     <button
//                       key={category}
//                       onClick={() => setActiveCategory(category)}
//                       className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${activeCategory === category
//                         ? 'bg-indigo-500 text-white shadow-sm scale-105'
//                         : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow'
//                         }`}
//                     >
//                       {category.charAt(0).toUpperCase() + category.slice(1)}
//                     </button>
//                   ))}
//                 </div>
//               </div>

//               {/* Students Grid */}
//               {filteredStudents.length > 0 ? (
//                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
//                   {filteredStudents.map((student) => (
//                     <div
//                       key={student._id}
//                       className="bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 group"
//                     >
//                       {/* Card Header */}
//                       <div className="flex items-center gap-4 p-4 border-b border-gray-100
//                       group-hover:bg-indigo-600
//                       transition-colors duration-300">
//                         <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center text-white font-semibold">
//                           {student.name.charAt(0).toUpperCase()}
//                         </div>
//                         <div>
//                           <h3 className="text-base font-semibold text-gray-800 group-hover:text-white transition-colors duration-300">
//                             {student.name}
//                           </h3>
//                           <p className="text-xs text-gray-500 group-hover:text-indigo-200 transition-colors duration-300">
//                             #{student.tokenNumber}
//                           </p>
//                         </div>
//                       </div>

//                       {/* Card Body */}
//                       <div className="p-4
//                       group-hover:bg-indigo-600
//                       transition-colors duration-300">
//                         <div className="flex justify-between items-center mb-3">
//                           <span className="text-xs bg-indigo-100 text-indigo-700 group-hover:bg-indigo-300 group-hover:text-white px-2 py-1 rounded-full font-medium transition-colors duration-300">
//                             {student.category || 'General'}
//                           </span>
//                           <span className="text-xs bg-gray-100 text-gray-600 group-hover:bg-indigo-300 group-hover:text-white px-2 py-1 rounded-full transition-colors duration-300">
//                             {student.batch || 'No Batch'}
//                           </span>
//                         </div>

//                         {/* Bid Button */}
//                         <button
//                           onClick={() => student._id && handleBid(student._id, student.name)}
//                           disabled={student.selected || biddingStudentIds.has(student._id)}
//                           className={`w-full py-2 text-sm font-medium rounded-3xl flex justify-center items-center gap-2 transition-all duration-200
//             ${biddingStudentIds.has(student._id)
//                               ? 'bg-indigo-100 text-indigo-600 cursor-wait border border-indigo-200'
//                               : student.selected
//                                 ? 'bg-green-100 text-green-700 cursor-not-allowed border border-green-200'
//                                 : 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-sm hover:shadow'
//                             }`}
//                         >
//                           {biddingStudentIds.has(student._id) ? (
//                             <>
//                               <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
//                                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
//                                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
//                               </svg>
//                               Bidding...
//                             </>
//                           ) : student.selected ? (
//                             <>
//                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
//                               </svg>
//                               Bidded
//                             </>
//                           ) : (
//                             <>
//                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v12m6-6H6" />
//                               </svg>
//                               Place Bid
//                             </>
//                           )}
//                         </button>
//                       </div>
//                     </div>
//                   ))}
//                 </div>

//               ) : (
//                 // No Students Message
//                 <div className="bg-gray-50 rounded-lg p-8 text-center border border-gray-100">
//                   <div className="bg-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-sm">
//                     <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" />
//                     </svg>
//                   </div>
//                   <h3 className="text-lg font-medium text-gray-700 mb-2">No Students Found</h3>
//                   <p className="text-gray-500 text-sm mb-4 max-w-sm mx-auto">
//                     No students are available for bidding in this category.
//                   </p>
//                   {activeCategory !== 'all' && (
//                     <button
//                       onClick={() => setActiveCategory('all')}
//                       className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-all duration-200 shadow-sm hover:shadow"
//                     >
//                       Show All Categories
//                     </button>
//                   )}
//                 </div>
//               )}
//             </div>



//             {/* Stats Overview */}

//           </div>

//           {/* Team Roster Sidebar */}
//           <div className="lg:w-80">
//             <div className="bg-gradient-to-b from-[#0a2540] to-[#102b5c] rounded-2xl shadow-2xl p-6 sticky top-6 border border-[#1e3350] ring-1 ring-indigo-500/20">

//               {/* Header */}
//               <div className="mb-6">
//                 <div className="flex items-center justify-between mb-3">
//                   <h2 className="text-xl font-semibold text-white tracking-tight">Team Overview</h2>
//                   <span className="bg-indigo-500/20 text-indigo-200 px-3 py-1 rounded-full text-xs font-medium">
//                     {teamStudents.length} Selected
//                   </span>
//                 </div>

//                 {/* Team Info */}
//                 <div className="bg-white/5 border border-white/10 rounded-xl p-4 shadow-inner">
//                   <div className="flex items-center gap-2 mb-1">
//                     <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-pulse"></div>
//                     <span className="text-xs font-medium text-indigo-200 uppercase tracking-wide">{teamName}</span>
//                   </div>
//                 </div>
//               </div>

//               {/* Talenters Section Title */}
//               <div className="mb-3">
//                 <h3 className="text-start text-sm font-semibold text-indigo-300 tracking-wide">Your Talenters</h3>
//               </div>

//               {/* Team Students */}
//               {teamStudents.length > 0 ? (
//                 <div className="space-y-3 max-h-96 overflow-y-auto pr-1.5 custom-scrollbar">
//                   {teamStudents.map((student, index) => (
//                     <div
//                       key={student._id}
//                       className="flex items-center justify-between bg-white/10 border border-white/10 backdrop-blur-sm rounded-3xl p-3 hover:bg-white/20 transition duration-150"
//                     >
//                       <div className="flex items-center">
//                         <FaRegUserCircle className="w-5 h-5 text-indigo-300 mr-2" />
//                         <span className="text-sm text-white truncate">{student.name}</span>
//                       </div>
//                       <div className="text-xs text-white bg-indigo-600 w-6 h-6 flex items-center justify-center rounded-full shadow-inner">
//                         {index + 1}
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               ) : (
//                 <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center shadow-inner">
//                   <svg className="w-10 h-10 text-indigo-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path
//                       strokeLinecap="round"
//                       strokeLinejoin="round"
//                       strokeWidth="2"
//                       d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197"
//                     />
//                   </svg>
//                   <p className="text-indigo-200 font-semibold">No students selected yet.</p>
//                   <p className="text-sm text-indigo-400 mt-1">Start bidding to build your team!</p>
//                 </div>
//               )}

//               {/* Logout Button */}
//               <div className="mt-6">
//                 <button
//                   onClick={() => {
//                     localStorage.removeItem('teamToken');
//                     localStorage.removeItem('teamName');
//                     router.push('/team-login');
//                   }}
//                   className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg"
//                 >
//                   <FiLogOut className="w-5 h-5" />
//                   <span>Log Out</span>
//                 </button>
//               </div>
//             </div>
//           </div>



//         </div>
//       </div>
//     </div>
//   );
// }


'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { FaRegUserCircle } from 'react-icons/fa';
import { FiLogOut, FiSearch } from 'react-icons/fi';
import { motion } from 'framer-motion';
import axios from 'axios';

export default function BiddingPage() {
  const [students, setStudents] = useState([]);
  const [teamStudents, setTeamStudents] = useState([]);
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [biddingStudentIds, setBiddingStudentIds] = useState(new Set());
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
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
  const categories = ['all', ...new Set(students.map((student) => student.category))].filter(Boolean);

  // Filter students by category and search query
  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let result = activeCategory === 'all'
      ? students
      : students.filter((student) => student.category === activeCategory);

    if (query) {
      result = result.filter(
        (student) =>
          student.name.toLowerCase().includes(query) ||
          student.tokenNumber.toLowerCase().includes(query)
      );
    }
    return result;
  }, [students, activeCategory, searchQuery]);

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
    <div className="min-h-screen flex flex-col justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 px-6 lg:px-16 py-12 relative overflow-hidden">
      {/* Welcome Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative rounded-2xl p-6 text-left max-w-3xl ms-16"
      >
        <div className="absolute top-0 left-0 w-16 h-16 bg-green-100 rounded-full opacity-20 blur-xl" />
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
          Hello, <span className="text-green-500">{teamName}</span>
          <motion.span
            initial={{ rotate: 0 }}
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            👋
          </motion.span>
        </h2>
      </motion.section>

      <div className="container max-w-9xl mx-auto flex flex-col items-center justify-center px-4 pb-12 pt-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content */}
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              {/* Card: Available Students */}
              <div className="bg-gradient-to-br from-white to-blue-100 rounded-2xl shadow-lg px-6 py-6 flex items-center gap-6 hover:scale-[1.02] hover:shadow-xl transition duration-300 ease-in-out">
                <div className="bg-blue-200 text-blue-700 p-5 rounded-full shadow-inner">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-600 text-sm uppercase tracking-wide font-semibold">Available Students</p>
                  <h3 className="text-3xl font-bold text-gray-800">{students.length}</h3>
                </div>
              </div>

              {/* Card: Your Selections */}
              <div className="bg-gradient-to-br from-white to-green-100 rounded-2xl shadow-lg px-6 py-6 flex items-center gap-6 hover:scale-[1.02] hover:shadow-xl transition duration-300 ease-in-out">
                <div className="bg-green-200 text-green-700 p-5 rounded-full shadow-inner">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-600 text-sm uppercase tracking-wide font-semibold">Your Selections</p>
                  <h3 className="text-3xl font-bold text-gray-800">{teamStudents.length}</h3>
                </div>
              </div>

              {/* Card: Categories */}
              <div className="bg-gradient-to-br from-white to-purple-100 rounded-2xl shadow-lg px-6 py-6 flex items-center gap-6 hover:scale-[1.02] hover:shadow-xl transition duration-300 ease-in-out">
                <div className="bg-purple-200 text-purple-700 p-5 rounded-full shadow-inner">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-600 text-sm uppercase tracking-wide font-semibold">Categories</p>
                  <h3 className="text-3xl font-bold text-gray-800">{categories.length - 1}</h3>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 lg:p-8 mb-8 border border-gray-100">
              {/* Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Available Students</h2>
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                  {/* Search Bar */}
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name or token number..."
                      className="w-full pl-10 pr-4 py-2 rounded-3xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-700 placeholder-gray-400"
                      aria-label="Search students by name or token number"
                    />
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  </div>
                  {/* Filters */}
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${activeCategory === category
                            ? 'bg-indigo-500 text-white shadow-sm scale-105'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow'
                          }`}
                      >
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Students Grid */}
              {filteredStudents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredStudents.map((student) => (
                    <div
                      key={student._id}
                      className="bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 group"
                    >
                      {/* Card Header */}
                      <div className="flex items-center gap-4 p-4 border-b border-gray-100 group-hover:bg-indigo-600 transition-colors duration-300">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center text-white font-semibold">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-gray-800 group-hover:text-white transition-colors duration-300">
                            {student.name}
                          </h3>
                          <p className="text-xs text-gray-500 group-hover:text-indigo-200 transition-colors duration-300">
                            #{student.tokenNumber}
                          </p>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 group-hover:bg-indigo-600 transition-colors duration-300">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs bg-indigo-100 text-indigo-700 group-hover:bg-indigo-300 group-hover:text-white px-2 py-1 rounded-full font-medium transition-colors duration-300">
                            {student.category || 'General'}
                          </span>
                          <span className="text-xs bg-gray-100 text-gray-600 group-hover:bg-indigo-300 group-hover:text-white px-2 py-1 rounded-full transition-colors duration-300">
                            batch : {student.batch || 'No Batch'}
                          </span>
                        </div>

                        {/* Bid Button */}
                        <button
                          onClick={() => student._id && handleBid(student._id, student.name)}
                          disabled={student.selected || biddingStudentIds.has(student._id)}
                          className={`w-full py-2 text-sm font-medium rounded-lg flex justify-center items-center gap-2 transition-all duration-200 ${biddingStudentIds.has(student._id)
                              ? 'bg-indigo-100 text-indigo-600 cursor-wait border border-indigo-200'
                              : student.selected
                                ? 'bg-green-100 text-green-700 cursor-not-allowed border border-green-200'
                                : 'bg-indigo-500 text-white hover:bg-green-600 shadow-sm hover:shadow'
                            }`}

                          aria-label={`Bid on ${student.name}`}
                        >
                          {biddingStudentIds.has(student._id) ? (
                            <>
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Bidding...
                            </>
                          ) : student.selected ? (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                              Bidded
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v12m6-6H6" />
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
                // No Students Message
                <div className="bg-gray-50 rounded-lg p-8 text-center border border-gray-100">
                  <div className="bg-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">No Students Found</h3>
                  <p className="text-gray-500 text-sm mb-4 max-w-sm mx-auto">
                    {searchQuery
                      ? 'No students match your search.'
                      : 'No students are available for bidding in this category.'}
                  </p>
                  {(activeCategory !== 'all' || searchQuery) && (
                    <div className="flex justify-center gap-4">
                      {activeCategory !== 'all' && (
                        <button
                          onClick={() => setActiveCategory('all')}
                          className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-all duration-200 shadow-sm hover:shadow"
                        >
                          Show All Categories
                        </button>
                      )}
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-all duration-200 shadow-sm hover:shadow"
                        >
                          Clear Search
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Team Roster Sidebar */}
          <div className="lg:w-80">
            <div className="bg-gradient-to-b from-[#0a2540] to-[#102b5c] rounded-2xl shadow-2xl p-6 sticky top-6 border border-[#1e3350] ring-1 ring-indigo-500/20">
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-semibold text-white tracking-tight">Team Overview</h2>
                  <span className="bg-indigo-500/20 text-indigo-200 px-3 py-1 rounded-full text-xs font-medium">
                    {teamStudents.length} Selected
                  </span>
                </div>
                {/* Team Info */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 shadow-inner">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-indigo-200 uppercase tracking-wide">{teamName}</span>
                  </div>
                </div>
              </div>

              {/* Talenters Section Title */}
              <div className="mb-3">
                <h3 className="text-start text-sm font-semibold text-indigo-300 tracking-wide">Your Talenters</h3>
              </div>

              {/* Team Students */}
              {teamStudents.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1.5 custom-scrollbar">
                  {teamStudents.map((student, index) => (
                    <div
                      key={student._id}
                      className="flex items-center justify-between bg-white/10 border border-white/10 backdrop-blur-sm rounded-3xl p-3 hover:bg-white/20 transition duration-150"
                    >
                      <div className="flex items-center">
                        <FaRegUserCircle className="w-5 h-5 text-indigo-300 mr-2" />
                        <span className="text-sm text-white break-words">{student.name}</span>
                      </div>
                      <div className="text-xs text-white bg-indigo-600 w-6 h-6 flex items-center justify-center rounded-full shadow-inner">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center shadow-inner">
                  <svg className="w-10 h-10 text-indigo-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197"
                    />
                  </svg>
                  <p className="text-indigo-200 font-semibold">No students selected yet.</p>
                  <p className="text-sm text-indigo-400 mt-1">Start bidding to build your team!</p>
                </div>
              )}

              {/* Logout Button */}
              <div className="mt-6">
                <button
                  onClick={() => {
                    localStorage.removeItem('teamToken');
                    localStorage.removeItem('teamName');
                    router.push('/team-login');
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg"
                >
                  <FiLogOut className="w-5 h-5" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}