export function startCallTone(kind) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return () => {};

  let context;
  try {
    context = new AudioContextClass();
  } catch (error) {
    console.warn('Could not initialize voice-call sound:', error);
    return () => {};
  }

  let stopped = false;
  const interval = kind === 'incoming' ? 2200 : 5500;
  const playBurst = () => {
    if (stopped) return;
    if (context.state === 'suspended') {
      context.resume().catch((error) => console.warn('Could not play voice-call sound:', error));
    }

    const notes = kind === 'incoming'
      ? [{ offset: 0, duration: 0.28, frequency: 440 }, { offset: 0.48, duration: 0.28, frequency: 440 }]
      : [{ offset: 0, duration: 1.5, frequency: 440 }, { offset: 0, duration: 1.5, frequency: 480 }];
    const startAt = context.currentTime + 0.04;
    notes.forEach(({ offset, duration, frequency }) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const noteStart = startAt + offset;
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      gain.gain.setValueAtTime(0, noteStart);
      gain.gain.linearRampToValueAtTime(0.08, noteStart + 0.02);
      gain.gain.setValueAtTime(0.08, noteStart + duration - 0.02);
      gain.gain.linearRampToValueAtTime(0, noteStart + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + duration);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    });
  };

  playBurst();
  const timer = window.setInterval(playBurst, interval);
  return () => {
    stopped = true;
    window.clearInterval(timer);
    context.close().catch((error) => console.warn('Could not stop voice-call sound:', error));
  };
}
