'use client';
   import { useEffect } from 'react';
   import Pusher from 'pusher-js';

   export default function TestPusher() {
     useEffect(() => {
       const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
         cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
       });
       const channel = pusher.subscribe('test-channel');
       channel.bind('test-event', (data) => {
         console.log('Received:', data);
         alert(`Received: ${data.message}`);
       });
       pusher.connection.bind('error', (err) => {
         console.error('Pusher error:', err);
       });
       return () => {
         pusher.unsubscribe('test-channel');
         pusher.disconnect();
       };
     }, []);

     return <div>Testing Pusher...</div>;
   }