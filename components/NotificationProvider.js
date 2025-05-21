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
      enabledTransports: ['ws', 'wss'],
    });

    const channel = pusher.subscribe('bids');
    console.log('Subscribing to bids');

    channel.bind('bid-placed', ({ studentId, studentName, teamName, batch, timestamp }) => {
      console.log('Bid received:', { studentId, studentName, teamName, batch, timestamp });

      toast.info(`${teamName} selected ${studentName} (${batch})`, {
        toastId: `bid-${studentId}-${timestamp}`,
        position: 'top-right',
        autoClose: 5000,
      });
      console.log('Toast triggered');

      if ('speechSynthesis' in window && isAudioUnlocked) {
        const utterance = new SpeechSynthesisUtterance(`${teamName} selected ${studentName} ${batch}`);
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

    channel.bind('pusher:subscription_succeeded', () => console.log('Subscribed to bids'));
    channel.bind('pusher:subscription_error', err => console.error('Subscription error:', err));
    pusher.connection.bind('connected', () => console.log('Pusher connected'));
    pusher.connection.bind('error', err => console.error('Pusher error:', err));

    return () => {
      pusher.unsubscribe('bids');
      pusher.disconnect();
    };
  }, [isAudioUnlocked]);

  return <>{children}</>;
}