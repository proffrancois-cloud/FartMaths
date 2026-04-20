import { useCallback, useRef } from "react";

export const useFartAudio = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastPlayedRef = useRef(0);

  const play = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const now = window.performance.now();
    if (now - lastPlayedRef.current < 120) {
      return;
    }
    lastPlayedRef.current = now;

    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) {
      return;
    }

    const context =
      audioContextRef.current ?? new AudioContextCtor();
    audioContextRef.current = context;
    void context.resume();

    const duration = 0.28;
    const bufferSize = Math.floor(context.sampleRate * duration);
    const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < bufferSize; index += 1) {
      const envelope = 1 - index / bufferSize;
      data[index] = (Math.random() * 2 - 1) * envelope * 0.4;
    }

    const noise = context.createBufferSource();
    noise.buffer = buffer;

    const lowpass = context.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.setValueAtTime(320, context.currentTime);
    lowpass.frequency.exponentialRampToValueAtTime(90, context.currentTime + duration);

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.35, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);

    noise.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(context.destination);

    noise.start();
    noise.stop(context.currentTime + duration);
  }, []);

  return { play };
};
