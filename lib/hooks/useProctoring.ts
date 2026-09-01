'use client';

import { useEffect, useRef } from 'react';
import { ViolationType } from '../types';

interface UseProctoringProps {
  enabled: boolean;
  onViolation: (type: ViolationType, details?: string) => void;
  requireFullscreen?: boolean;
}

export function useProctoring({
  enabled,
  onViolation,
  requireFullscreen = false,
}: UseProctoringProps) {
  const lastViolationTime = useRef<number>(0);
  const onViolationRef = useRef(onViolation);

  useEffect(() => {
    onViolationRef.current = onViolation;
  }, [onViolation]);

  useEffect(() => {
    if (!enabled) return;

    const triggerViolation = (type: ViolationType, details?: string) => {
      const now = Date.now();
      // Debounce threshold (1.5 seconds) to prevent multiple identical events triggering at once
      if (now - lastViolationTime.current > 1500) {
        lastViolationTime.current = now;
        onViolationRef.current(type, details);
      }
    };

    // 1. Visibility Change (Tab switch / minimized window)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation('TAB_SWITCH', 'Student switched tabs or minimized the browser window');
      }
    };

    // 2. Window Blur (Focus loss / other app clicked)
    const handleWindowBlur = () => {
      triggerViolation('WINDOW_BLUR', 'Student clicked outside the exam window or switched applications');
    };

    // 3. Fullscreen Change
    const handleFullscreenChange = () => {
      if (requireFullscreen && !document.fullscreenElement) {
        triggerViolation('FULLSCREEN_EXIT', 'Student exited fullscreen mode during the exam');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    if (requireFullscreen) {
      document.addEventListener('fullscreenchange', handleFullscreenChange);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      if (requireFullscreen) {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
      }
    };
  }, [enabled, requireFullscreen]);

  const requestFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen request rejected by browser:', e);
    }
  };

  return { requestFullscreen };
}
