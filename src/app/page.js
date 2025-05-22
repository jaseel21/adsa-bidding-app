'use client';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function Home() {
  const router = useRouter();

  const handleStartBidding = () => {
    const token = localStorage.getItem('teamToken');
    if (token) {
      router.push('/bidding');
    } else {
      router.push('/team-login');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-teal-100 via-cyan-100 to-blue-100 px-6 lg:px-16 py-12 relative overflow-hidden text-center">
      {/* Decorative Floating Shapes */}
      <div className="absolute top-12 left-12 w-24 h-24 bg-teal-300/30 rounded-full blur-xl animate-float" />
      <div className="absolute bottom-24 right-16 w-36 h-36 bg-cyan-300/25 rounded-full blur-xl animate-float delay-1000" />
      <div className="absolute top-1/3 right-1/4 w-20 h-20 bg-blue-300/25 rounded-full blur-xl animate-float delay-2000" />

      {/* Tagline */}
      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="text-3xl md:text-5xl font-light text-slate-700 mb-4"
      >
        Build Tomorrow’s <span className="text-teal-500">Winners</span>
      </motion.h2>

      {/* Main Heading */}
      <motion.h1
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-blue-500 mb-6"
      >
        ADSA Dars Fest Bidding
      </motion.h1>

      {/* Subtext */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.4 }}
        className="text-slate-600 text-base sm:text-lg mb-10 max-w-xl"
      >
        Get ready to <span className="font-semibold text-teal-600">bid smart</span> and win talented artists for your dream team!
      </motion.p>

      {/* Start Bidding Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleStartBidding}
        className="bg-gradient-to-r from-pink-500 to-blue-400 hover:from-pink-600 hover:to-blue-500 text-white font-semibold py-4 px-10 rounded-full shadow-md hover:shadow-lg transition-all duration-300 text-lg"
      >
        🚀 Start Bidding
      </motion.button>

      {/* Floating animation keyframes */}
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