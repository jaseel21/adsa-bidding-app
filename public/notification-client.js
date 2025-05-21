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

    const pusher = new Pusher('14f65d0a3eea9ae7752c', {
      cluster: 'ap2',
      forceTLS: true,
      enabledTransports: ['ws', 'wss'],
    });
    console.log('Pusher initialized');

    const bidsChannel = pusher.subscribe('bids');
    console.log('Subscribing to bids');

    bidsChannel.bind('bid-placed', ({ studentName, teamName, batch, studentId, timestamp }) => {
      console.log('Bid received:', { studentName, teamName, batch, studentId, timestamp });
      const toast = document.createElement('div');
      toast.className = 'custom-toast';
      toast.textContent = `${teamName} selected ${studentName} (${batch})`;
      document.body.appendChild(toast);
      setTimeout(() => toast.classList.add('show'), 100);
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 5000);
      console.log('Toast displayed (bid-placed)');
    });

    ['team-1', 'team-2', 'team-3'].forEach(sanitizedTeamName => {
      const teamChannel = pusher.subscribe(`private-team-${sanitizedTeamName}`);
      teamChannel.bind('roster-updated', ({ student, timestamp }) => {
        console.log('Roster update:', { team: sanitizedTeamName, student, timestamp });
        const teamName = sanitizedTeamName.replace(/-/g, ' ');
        const toast = document.createElement('div');
        toast.className = 'custom-toast';
        toast.textContent = `${teamName} selected ${student.name}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
          toast.classList.remove('show');
          setTimeout(() => toast.remove(), 300);
        }, 5000);
        console.log('Toast displayed (roster-updated)');

        if ('speechSynthesis' in window && isAudioUnlocked) {
          const utterance = new SpeechSynthesisUtterance(`${teamName} selected ${student.name}`);
          utterance.lang = 'en-US';
          utterance.volume = 0.8;
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          const setVoice = () => {
            const voices = speechSynthesis.getVoices();
            console.log('Voices:', voices.map(v => v.name));
            const enUSVoice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google US English')) ||
                             voices.find(v => v.lang === 'en-US');
            if (enUSVoice) {
              utterance.voice = enUSVoice;
              console.log('Voice selected:', enUSVoice.name);
            }
            speechSynthesis.speak(utterance);
            console.log('Voice triggered');
          };
          if (speechSynthesis.getVoices().length) {
            setVoice();
          } else {
            speechSynthesis.onvoiceschanged = setVoice;
          }
        }
      });
    });

    bidsChannel.bind('pusher:subscription_succeeded', () => console.log('Subscribed to bids'));
    bidsChannel.bind('pusher:subscription_error', err => console.error('Subscription error:', err));
    pusher.connection.bind('connected', () => console.log('Pusher connected'));
    pusher.connection.bind('error', err => console.error('Pusher error:', err));
  };
})();