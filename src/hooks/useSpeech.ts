import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const preferredVoiceNames = [
  "Samantha",
  "Karen",
  "Moira",
  "Daniel",
  "Ava",
  "Nicky",
  "Rishi",
  "Aria",
  "Jenny",
  "Google US English"
];

type SpeakChannel = "instruction" | "choices" | "hint" | "explanation" | "feedback";

export interface SpeakRequest {
  channel: SpeakChannel;
  text: string;
  delayMs?: number;
}

const scoreVoice = (voice: SpeechSynthesisVoice) => {
  const name = `${voice.name} ${voice.lang}`.toLowerCase();
  let score = 0;

  if (voice.lang.toLowerCase().startsWith("en")) score += 200;
  if (voice.localService) score += 80;
  if (preferredVoiceNames.some((preferred) => name.includes(preferred.toLowerCase()))) {
    score += 240;
  }
  if (name.includes("enhanced") || name.includes("premium") || name.includes("natural")) {
    score += 40;
  }
  if (name.includes("compact") || name.includes("eelo")) {
    score -= 30;
  }

  return score;
};

export const useSpeech = ({
  enabled,
  rate,
  selectedVoiceURI
}: {
  enabled: boolean;
  rate: number;
  selectedVoiceURI?: string;
}) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const timeoutRef = useRef<number | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const synth = window.speechSynthesis;

    const loadVoices = () => {
      const loaded = synth.getVoices();
      if (loaded.length > 0) {
        setVoices(loaded);
      }
    };

    loadVoices();
    const timerA = window.setTimeout(loadVoices, 120);
    const timerB = window.setTimeout(loadVoices, 600);
    synth.addEventListener("voiceschanged", loadVoices);

    return () => {
      synth.removeEventListener("voiceschanged", loadVoices);
      window.clearTimeout(timerA);
      window.clearTimeout(timerB);
    };
  }, []);

  const selectedVoice = useMemo(() => {
    if (voices.length === 0) return undefined;

    if (selectedVoiceURI) {
      const exact = voices.find((voice) => voice.voiceURI === selectedVoiceURI);
      if (exact) return exact;
    }

    return [...voices].sort((left, right) => scoreVoice(right) - scoreVoice(left))[0];
  }, [selectedVoiceURI, voices]);

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    utteranceRef.current = null;
    window.speechSynthesis.cancel();
  }, []);

  const speak = useCallback(
    ({ text, delayMs = 0 }: SpeakRequest) => {
      if (!text || !enabled || typeof window === "undefined" || !("speechSynthesis" in window)) {
        return;
      }

      stop();

      timeoutRef.current = window.setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = rate;
        utterance.pitch = 1;
        utterance.volume = 1;
        if (selectedVoice) {
          utterance.voice = selectedVoice;
          utterance.lang = selectedVoice.lang;
        }
        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      }, delayMs);
    },
    [enabled, rate, selectedVoice, stop]
  );

  return {
    supported: typeof window !== "undefined" && "speechSynthesis" in window,
    voices,
    selectedVoice,
    resolvedVoiceURI: selectedVoice?.voiceURI,
    speak,
    stop
  };
};
