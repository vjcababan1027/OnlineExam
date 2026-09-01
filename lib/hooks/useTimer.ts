'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTimerProps {
  initialSeconds: number;
  onExpire?: () => void;
  autoStart?: boolean;
}

export function useTimer({ initialSeconds, onExpire, autoStart = true }: UseTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(autoStart);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // Reset when initialSeconds changes (e.g. Next Question in per_question timer)
  const resetTimer = useCallback((newSeconds: number = initialSeconds) => {
    setSecondsLeft(newSeconds);
    setIsActive(true);
  }, [initialSeconds]);

  const pauseTimer = useCallback(() => setIsActive(false), []);
  const resumeTimer = useCallback(() => setIsActive(true), []);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsActive(false);
          if (onExpireRef.current) {
            onExpireRef.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const progressPercent = initialSeconds > 0 ? (secondsLeft / initialSeconds) * 100 : 0;
  const isUrgent = secondsLeft <= 10 && secondsLeft > 0;

  return {
    secondsLeft,
    formattedTime,
    minutes,
    seconds,
    progressPercent,
    isUrgent,
    isActive,
    resetTimer,
    pauseTimer,
    resumeTimer,
  };
}
