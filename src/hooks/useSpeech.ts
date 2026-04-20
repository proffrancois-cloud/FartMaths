import { useEffect, useMemo, useState } from "react";

const preferredVoiceNames = [
  "Samantha",
  "Karen",
  "Moira",
  "Daniel",
  "Tessa",
  "Nicky",
  "Rishi",
  "Ava"
];

export const useSpeech = (enabled: boolean, rate: number) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const loadVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  const selectedVoice = useMemo(() => {
    if (voices.length === 0) return undefined;

    const preferred = voices.find((voice) =>
      preferredVoiceNames.some((name) => voice.name.includes(name))
    );
    if (preferred) return preferred;

    const englishLocal = voices.find(
      (voice) => voice.lang.toLowerCase().startsWith("en") && voice.localService
    );
    if (englishLocal) return englishLocal;

    return voices[0];
  }, [voices]);

  const speak = (text: string) => {
    if (!enabled || typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.volume = 1;
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    }
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const stop = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  return {
    supported: typeof window !== "undefined" && "speechSynthesis" in window,
    voiceName: selectedVoice?.name,
    speak,
    stop
  };
};
