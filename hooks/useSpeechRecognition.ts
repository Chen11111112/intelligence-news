'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechRecognitionCtor = new () => SpeechRecognition;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ENGLISH_VOICE_HINTS = [
  'google us english',
  'microsoft zira',
  'microsoft aria',
  'samantha',
  'karen',
  'daniel',
  'alex',
  'en-us',
  'en_us',
];

let voicesReady = false;
let voicesCache: SpeechSynthesisVoice[] = [];

function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    voicesCache = voices;
    voicesReady = true;
  }
  return voices;
}

function pickEnglishVoice(): SpeechSynthesisVoice | null {
  const voices = voicesCache.length ? voicesCache : loadVoices();
  const enUs = voices.filter((v) => v.lang.toLowerCase().startsWith('en-us') || v.lang === 'en');
  if (enUs.length === 0) return voices.find((v) => v.lang.toLowerCase().startsWith('en')) ?? null;

  const ranked = [...enUs].sort((a, b) => scoreVoice(b) - scoreVoice(a));
  return ranked[0] ?? null;
}

function scoreVoice(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  let score = 0;
  if (voice.default) score += 1;
  if (voice.localService) score += 2;
  for (let i = 0; i < ENGLISH_VOICE_HINTS.length; i++) {
    if (name.includes(ENGLISH_VOICE_HINTS[i])) {
      score += 10 - i;
    }
  }
  return score;
}

/** 只保留以英文為主的段落，避免中文被英文語音念得很怪 */
export function textForSpeech(text: string): string {
  const paragraphs = text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const englishParts = paragraphs.filter((p) => {
    const latin = (p.match(/[a-zA-Z]/g) ?? []).length;
    const cjk = (p.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) ?? []).length;
    return latin >= 12 && latin >= cjk * 2;
  });

  const source = englishParts.length > 0 ? englishParts : paragraphs;
  return source
    .join(' ')
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stopSpeech() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

export function speakText(text: string, lang = 'en-US') {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  const spoken = textForSpeech(text);
  if (!spoken) return;

  stopSpeech();

  const utterance = new SpeechSynthesisUtterance(spoken);
  utterance.lang = lang;
  utterance.rate = 1;
  utterance.pitch = 1;

  const voice = pickEnglishVoice();
  if (voice) utterance.voice = voice;

  window.speechSynthesis.speak(utterance);
}

export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const refresh = () => {
      loadVoices();
    };

    refresh();
    window.speechSynthesis.addEventListener('voiceschanged', refresh);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', refresh);
      stopSpeech();
    };
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const spoken = textForSpeech(text);
    if (!spoken) return;

    stopSpeech();

    const utterance = new SpeechSynthesisUtterance(spoken);
    utterance.lang = 'en-US';
    utterance.rate = 1;
    utterance.pitch = 1;

    const voice = pickEnglishVoice();
    if (voice) utterance.voice = voice;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    stopSpeech();
    setSpeaking(false);
  }, []);

  return { speaking, speak, stop };
}

export function useSpeechRecognition(lang = 'en-US') {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    setSupported(Boolean(getRecognitionCtor()));
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const listen = useCallback(
    (onResult: (transcript: string) => void) => {
      const Ctor = getRecognitionCtor();
      if (!Ctor) {
        setError('SPEECH_NOT_SUPPORTED');
        return;
      }

      setError(null);
      const recognition = new Ctor();
      recognition.lang = lang;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognition.onstart = () => setListening(true);
      recognition.onend = () => setListening(false);
      recognition.onerror = (event) => {
        setListening(false);
        setError(event.error || 'speech_error');
      };
      recognition.onresult = (event) => {
        const text = event.results[0]?.[0]?.transcript?.trim() ?? '';
        if (text) onResult(text);
      };

      recognitionRef.current = recognition;
      recognition.start();
    },
    [lang],
  );

  return { supported, listening, error, listen, stop, clearError };
}

// 預先載入語音清單
if (typeof window !== 'undefined' && window.speechSynthesis) {
  loadVoices();
  window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
}
