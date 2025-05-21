(function () {
  if (window.ADSA_Bidding_Notifications) return;
  window.ADSA_Bidding_Notifications = true;

  const style = document.createElement('style');
  style.textContent = `
    .custom-toast { position: fixed; top: 10px; right: 10px; background: #333; color: #fff;
      padding: 10px 20px; border-radius: 5px; z-index: 1000; max-width: 300px;
      opacity: 0; transition: opacity 0.3s; }
    .custom-toast.show { opacity: 1; }
  `;
  document.head.appendChild(style);

  const script = document.createElement('script');
  script.src = 'https://js.pusher.com/8.2.0/pusher.min.js';
  script.async = true;
  document.head.appendChild(script);

  script.onload = () => {
    console.log('Pusher SDK loaded');
    let isAudioUnlocked = false;

    document.addEventListener('click', () => {
      if (!isAudioUnlocked) {
        console.log('Audio unlock attempt');
        isAudioUnlocked = true;
        if ('speechSynthesis' in window) {
          speechSynthesis.speak(new SpeechSynthesisUtterance(''));
          console.log('SpeechSynthesis initialized');
        } else {
          console.error('SpeechSynthesis not supported');
        }
      }
    });

    const pusher = new Pusher('14f65d0a3eea9ae7752c', { cluster: 'ap2', forceTLS: true });
    console.log('Pusher initialized');

    const channel = pusher.subscribe('bids');
    console.log('Subscribing to bids');

    channel.bind('bid-placed', ({ studentName, teamName, studentId, timestamp }) => {
      console.log('Bid received:', { studentName, teamName, studentId, timestamp });

      const toast = document.createElement('div');
      toast.className = 'custom-toast';
      toast.textContent = `${teamName} selected ${studentName}`;
      document.body.appendChild(toast);
      setTimeout(() => toast.classList.add('show'), 100);
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 5000);
      console.log('Toast displayed');

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
      }
    });

    channel.bind('pusher:subscription_succeeded', () => console.log('Subscribed to bids'));
    channel.bind('pusher:subscription_error', err => console.error('Subscription error:', err));
    pusher.connection.bind('connected', () => console.log('Pusher connected'));
    pusher.connection.bind('error', err => console.error('Pusher error:', err));
  };
})();