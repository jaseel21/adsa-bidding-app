(function () {
  // Check if script is already loaded
  if (window.ADSA_Bidding_Notifications) return;
  window.ADSA_Bidding_Notifications = true;

  // Load Pusher SDK
  const script = document.createElement('script');
  script.src = 'https://js.pusher.com/8.2.0/pusher.min.js';
  script.async = true;
  document.head.appendChild(script);

  script.onload = () => {
    const audio = new Audio('http://localhost:3000/notification-tone.mp3');
    audio.preload = 'auto';

    const pusher = new Pusher('14f65d0a3eea9ae7752c', { cluster: 'ap2' });
    const channel = pusher.subscribe('bids');

    channel.bind('bid-placed', ({ studentName, teamName }) => {
      console.log('External notification:', { studentName, teamName });

      // Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New Student Selection', {
          body: `${teamName} selected ${studentName}`,
          icon: 'http://localhost:3000/favicon.ico',
        });
      } else if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('New Student Selection', {
              body: `${teamName} selected ${studentName}`,
              icon: 'http://localhost:3000/favicon.ico',
            });
          }
        });
      }

      // Play notification tone
      audio.currentTime = 0;
      audio.play().catch(err => console.error('Audio error:', err));

      // Voice announcement
      const utterance = new SpeechSynthesisUtterance(`${teamName} selected ${studentName}`);
      utterance.volume = 1;
      utterance.rate = 1;
      utterance.lang = 'en-US';
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    });

    channel.bind('pusher:subscription_error', err => {
      console.error('Pusher subscription error:', err);
    });
  };
})();