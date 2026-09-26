'use client';

import React, { useState, useEffect, useRef } from 'react';

export default function ScreenshotProtector() {
  const [isBlackout, setIsBlackout] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const warningTimer = useRef<NodeJS.Timeout | null>(null);

  const triggerBlackout = (duration = 1800) => {
    setIsBlackout(true);
    setShowWarning(true);

    // Overwrite clipboard immediately if PrintScreen captured something
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText('').catch(() => {});
    }

    if (warningTimer.current) clearTimeout(warningTimer.current);
    warningTimer.current = setTimeout(() => {
      setIsBlackout(false);
      setShowWarning(false);
    }, duration);
  };

  useEffect(() => {
    // 1. Keyboard Shortcuts Listener
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        triggerBlackout(2500);
        return;
      }

      // Mac screenshot shortcuts: Cmd + Shift + 3, Cmd + Shift + 4, Cmd + Shift + 5, Cmd + Shift + 6
      const isMacScreenshot =
        e.metaKey &&
        e.shiftKey &&
        (
          ['Digit3', 'Digit4', 'Digit5', 'Digit6', 'KeyS'].includes(e.code) ||
          ['3', '4', '5', '6', '#', '$', '%', '^', 's', 'S'].includes(e.key) ||
          [51, 52, 53, 54, 83].includes(e.keyCode)
        );
      if (isMacScreenshot) {
        triggerBlackout(2800);
        return;
      }

      // Windows Snipping Tool shortcut: Win + Shift + S
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'S' || e.key === 's' || e.code === 'KeyS')) {
        triggerBlackout(2800);
        return;
      }

      // Prevent Print & PDF Save: Ctrl+P or Cmd+P
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P' || e.code === 'KeyP')) {
        e.preventDefault();
        triggerBlackout(2500);
        return;
      }

      // Prevent Save Page: Ctrl+S or Cmd+S
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        return;
      }

      // Prevent View Source: Ctrl+U or Cmd+Option+U
      if (
        (e.ctrlKey && (e.key === 'u' || e.key === 'U')) ||
        (e.metaKey && e.altKey && (e.key === 'u' || e.key === 'U'))
      ) {
        e.preventDefault();
        return;
      }

      // Prevent DevTools: F12, Ctrl+Shift+I, Cmd+Option+I, Ctrl+Shift+J, Cmd+Option+J, Ctrl+Shift+C, Cmd+Option+C
      if (
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key))
      ) {
        e.preventDefault();
        triggerBlackout(2000);
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        triggerBlackout(2500);
      }
    };

    // 2. Window Blur & Visibility (When Snipping Tool, Mac Screenshot selection, or Mobile Screenshot overlay activates)
    const handleBlur = () => {
      // Screen turns black whenever window loses focus (e.g. Snipping tool active, screen recording utility opened)
      setIsBlackout(true);
    };

    const handleFocus = () => {
      // Restore view once focus returns
      setTimeout(() => {
        setIsBlackout(false);
      }, 350);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsBlackout(true);
      } else {
        setTimeout(() => {
          setIsBlackout(false);
        }, 350);
      }
    };

    // 3. Right Click Context Menu Prevention
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Allow context menu only inside inputs or textareas for paste
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      e.preventDefault();
    };

    // 4. Drag prevention on images and media
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    // 5. Test Trigger Listener (For manual or in-app testing)
    const handleTestEvent = () => {
      triggerBlackout(2500);
    };
    (window as any).testScreenshotLock = () => triggerBlackout(2500);

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('snap-test-blackout', handleTestEvent);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('snap-test-blackout', handleTestEvent);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
      if (warningTimer.current) clearTimeout(warningTimer.current);
    };
  }, []);

  return (
    <>
      {/* PURE BLACK SHIELD OVERLAY (Activates on Screenshot shortcut, Blur, or Screen Capture) */}
      <div
        id="anti-screenshot-shield"
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: '#000000',
          zIndex: 2147483647, // Maximum 32-bit integer z-index
          pointerEvents: isBlackout ? 'all' : 'none',
          opacity: isBlackout ? 1 : 0,
          transition: isBlackout ? 'none' : 'opacity 0.25s ease-out',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
        }}
      >
        {/* Pitch black with minimal indicator */}
        <div
          style={{
            textAlign: 'center',
            color: '#262626', // Very dark/muted text so captured screenshot is virtually pure black
            fontFamily: 'monospace',
            letterSpacing: '3px',
            fontSize: '11px',
            textTransform: 'uppercase',
          }}
        >
          🔒 Protected Content
        </div>
      </div>

      {/* Sleek Floating Toast when screenshot or recording is attempted */}
      {showWarning && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(239, 68, 68, 0.95)',
            color: '#ffffff',
            padding: '10px 20px',
            borderRadius: '9999px',
            fontSize: '13px',
            fontWeight: '600',
            zIndex: 2147483648,
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            pointerEvents: 'none',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <span>🚫</span>
          <span>Screenshot & Screen Recording are Locked</span>
        </div>
      )}
    </>
  );
}
