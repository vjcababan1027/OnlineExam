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
      // Debounce threshold (1.2 seconds) to avoid duplicate simultaneous events
      if (now - lastViolationTime.current > 1200) {
        lastViolationTime.current = now;
        onViolationRef.current(type, details);
      }
    };

    // 1. Visibility Change (Tab switch or window minimized)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation('TAB_SWITCH', 'Switched browser tab or minimized window');
      }
    };

    // 2. Window Blur (Lost focus / switched to another application)
    const handleWindowBlur = () => {
      triggerViolation('WINDOW_BLUR', 'Focus lost: clicked outside the browser window or switched apps');
    };

    // 3. Fullscreen Change
    const handleFullscreenChange = () => {
      if (requireFullscreen && !document.fullscreenElement) {
        triggerViolation('FULLSCREEN_EXIT', 'Exited fullscreen examination mode');
      }
    };

    // 4. Prevent Context Menu (right click inspect)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      triggerViolation('WINDOW_BLUR', 'Right-click context menu attempted');
    };

    // 5. Prevent shortcut keys like F12, Ctrl+Shift+I, Alt+Tab detection
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 or Ctrl+Shift+I (DevTools)
      if (
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
        ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U'))
      ) {
        e.preventDefault();
        triggerViolation('WINDOW_BLUR', 'Developer tools / inspect shortcut attempted');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    if (requireFullscreen) {
      document.addEventListener('fullscreenchange', handleFullscreenChange);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);

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
