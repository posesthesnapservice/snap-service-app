'use client';

import { useState, useEffect } from 'react';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    if (typeof navigator !== 'undefined') {
      setIsOffline(!navigator.onLine);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div style={styles.banner}>
      <span style={styles.text}>📡 Offline — Using cached content</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  banner: {
    backgroundColor: '#FF9800',
    color: '#000',
    padding: '8px 16px',
    textAlign: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
    position: 'fixed',
    top: '60px',
    left: 0,
    right: 0,
    zIndex: 999,
    animation: 'slideDown 0.3s ease-out',
  },
  text: {
    margin: 0,
  }
};
