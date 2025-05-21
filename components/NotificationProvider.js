'use client';
import { useEffect, useState } from 'react';
import Pusher from 'pusher-js';
import { toast } from 'react-toastify';

export default function NotificationProvider({ children }) {
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);

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
          toast.error('Voice not supported');
        }
      }
    };
    document.addEventListener('click', unlockAudio);
    return () => document.removeEventListener('click', unlockAudio);
  }, [isAudioUnlocked]);

  useEffect(() => {
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    console.log('Pusher setup:', { key: pusherKey });

    if (!pusherKey) {
      console.error('Pusher key missing');
      toast.error('Pusher configuration error');
      return;
    }

    const pusher = new Pusher(pusherKey, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap2',
      forceTLS: true,
    });

    const channel = pusher.subscribe('bids');
    console.log('Subscribing to bids');

    channel.bind('bid-placed', ({ studentId, studentName, teamName, timestamp }) => {
      console.log('Bid received:', { studentId, studentName, teamName, timestamp });

      toast.info(`${teamName} selected ${studentName}`, {
        toastId: `bid-${studentId}-${timestamp}`,
      });
      console.log('Toast triggered');

      if ('speechSynthesis' in window && isAudioUnlocked) {
        const utterance = new SpeechSynthesisUtterance(`${teamName} selected ${studentName}`);
        utterance.lang = 'en-US';
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
        toast.warn('Click "Enable Voice" for audio');
      }
    });

    channel.bind('pusher:subscription_succeeded', () => console.log('Subscribed to bids'));
    channel.bind('pusher:subscription_error', err => console.error('Subscription error:', err));
    pusher.connection.bind('connected', () => console.log('Pusher connected'));
    pusher.connection.bind('error', err => console.error('Pusher error:', err));

    return () => {
      pusher.unsubscribe('bids');
      pusher.disconnect();
    };
  }, [isAudioUnlocked]);

  return (
    <>
      {!isAudioUnlocked && (
        <button
          onClick={() => setIsAudioUnlocked(true)}
          style={{ position: 'fixed', top: 10, right: 10, padding: '10px', background: '#007bff', color: '#fff' }}
        >
          Enable Voice
        </button>
      )}
      {children}
    </>
  );
}