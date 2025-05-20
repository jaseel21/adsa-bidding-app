'use client';
import { useEffect, useRef } from 'react';
import Pusher from 'pusher-js';
import { toast } from 'react-toastify';

export default function NotificationProvider({ children }) {
  const pusherRef = useRef(null);
  const audioRef = useRef(null);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('Notification permission granted');
        } else {
          console.warn('Notification permission denied');
          toast.warn('Notifications disabled. Please enable in browser settings.');
        }
      });
    }
  }, []);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio('/notification-tone.mp3');
    audioRef.current.preload = 'auto';
    audioRef.current.volume = 0.7; // Slightly lower volume
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Initialize Pusher
  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      forceTLS: true,
    });

    pusherRef.current = pusher;

    const bidChannel = pusher.subscribe('bids');
    bidChannel.bind('bid-placed', ({ studentId, studentName, teamName, timestamp }) => {
      console.log('Received bid notification:', { studentId, studentName, teamName, timestamp });

      // Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('New Student Selection', {
            body: `${teamName} selected ${studentName}`,
            icon: '/favicon.ico',
            tag: `bid-${studentId}-${timestamp}`, // Prevent duplicates
          });
        } catch (err) {
          console.error('Notification error:', err.message);
        }
      }

      // Play notification tone
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(err => {
          console.error('Audio playback error:', err.message);
          toast.warn('Notification tone blocked. Please interact with the page.');
        });
      }

      // Voice announcement
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(`${teamName} selected ${studentName}`);
        utterance.volume = 1;
        utterance.rate = 1;
        utterance.lang = 'en-US';
        speechSynthesis.cancel();
        speechSynthesis.speak(utterance);
      } else {
        console.warn('SpeechSynthesis not supported');
        toast.warn('Voice announcements not supported in this browser.');
      }

      // In-app toast
      toast.info(`${teamName} selected ${studentName}`, { toastId: `bid-${studentId}-${timestamp}` });
    });

    bidChannel.bind('pusher:subscription_error', (err) => {
      console.error('Pusher subscription error:', err);
      toast.error('Failed to connect to real-time notifications');
    });

    pusher.connection.bind('error', (err) => {
      console.error('Pusher connection error:', err);
    });

    return () => {
      if (pusherRef.current) {
        pusherRef.current.unsubscribe('bids');
        pusherRef.current.disconnect();
        pusherRef.current = null;
      }
    };
  }, []);

  return <>{children}</>;
}