'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUser, logout } from '../../lib/auth-helpers';

interface AppHeaderProps {
  title?: string;
  showSearch?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  onSearch?: () => void;
}

export default function AppHeader({ title = 'Snap Service', showSearch, showBack, onBack, onSearch }: AppHeaderProps) {
  const router = useRouter();
  const [onlineStatus, setOnlineStatus] = useState<'online' | 'offline' | 'syncing'>('online');

  useEffect(() => {
    const handleOnline = () => setOnlineStatus('online');
    const handleOffline = () => setOnlineStatus('offline');
    
    if (typeof navigator !== 'undefined') {
      setOnlineStatus(navigator.onLine ? 'online' : 'offline');
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getStatusColor = () => {
    switch(onlineStatus) {
      case 'online': return '#4CAF50';
      case 'syncing': return '#FFA000';
      case 'offline': return '#F44336';
      default: return '#4CAF50';
    }
  };

  const handleAdminClick = (e: React.MouseEvent) => {
    const u = getUser();
    if (!u || u.role !== 'admin') {
      e.preventDefault();
      if (confirm('Admin Panel requires Admin credentials (admin@snapservice.com / admin123).\n\nSwitch to Admin Login now?')) {
        logout();
        router.push('/login');
      }
    }
  };

  return (
    <header style={styles.header}>
      <div style={styles.left}>
        {showBack ? (
          <button onClick={onBack} style={styles.iconButton}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
        ) : (
          <div style={styles.logo}>
            <img 
              src="/logo.png" 
              alt="Snap Service Logo" 
              style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #D4AF37' }} 
            />
          </div>
        )}
      </div>
      
      <h1 style={styles.title}>{title}</h1>
      
      <div style={styles.right}>
        <Link href="/admin" onClick={handleAdminClick} style={styles.adminBadge} title="Go to Admin Dashboard">
          👑 Admin
        </Link>
        {showSearch && (
          <button onClick={onSearch} style={styles.iconButton}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>
        )}
        <div style={styles.statusDotWrapper} title={onlineStatus.charAt(0).toUpperCase() + onlineStatus.slice(1)}>
          <div style={{...styles.statusDot, background: getStatusColor()}}></div>
        </div>
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '60px',
    background: 'rgba(15, 15, 20, 0.85)',
    backdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(212, 175, 55, 0.2)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 16px',
    paddingTop: 'env(safe-area-inset-top)',
    zIndex: 1000,
  },
  left: { width: '40px', display: 'flex', alignItems: 'center' },
  right: { width: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' },
  title: {
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    margin: 0,
  },
  adminBadge: {
    background: 'rgba(212, 175, 55, 0.15)',
    border: '1px solid rgba(212, 175, 55, 0.4)',
    color: '#D4AF37',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 'bold',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
  },
  iconButton: {
    background: 'transparent',
    border: 'none',
    padding: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
  },
  statusDotWrapper: {
    padding: '4px',
    display: 'flex',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    transition: 'background-color 0.3s',
  }
};
