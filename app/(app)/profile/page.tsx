'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, logout } from '@/lib/auth-helpers';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.push('/login');
    } else {
      setUser(u);
    }
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleDownload = () => {
    setIsDownloading(true);
    setDownloadProgress(0);
    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsDownloading(false);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  if (!user) return <div style={{ background: '#121212', color: 'white', minHeight: '100vh', padding: '20px' }}>Loading...</div>;

  return (
    <div style={{ padding: '20px', paddingBottom: '80px', minHeight: '100vh', background: '#121212', color: 'white' }}>
      <header style={{ marginBottom: '30px' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>Profile</h1>
      </header>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold', color: 'black' }}>
          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>
        <div>
          <h2 style={{ margin: '0 0 5px 0', fontSize: '1.2rem' }}>{user.name}</h2>
          <p style={{ margin: '0 0 10px 0', color: '#aaa' }}>{user.email}</p>
          <span style={{ background: 'rgba(212, 175, 55, 0.2)', color: '#D4AF37', padding: '4px 10px', borderRadius: '15px', fontSize: '0.8rem', fontWeight: 'bold' }}>
            {user.role || 'USER'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={menuItemStyle} onClick={handleDownload}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>⬇️ Download All Content (Offline)</span>
            {isDownloading ? `${downloadProgress}%` : '→'}
          </div>
          {isDownloading && (
            <div style={{ height: '4px', background: '#333', marginTop: '10px', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${downloadProgress}%`, height: '100%', background: '#D4AF37', transition: 'width 0.2s' }} />
            </div>
          )}
        </div>

        <div style={menuItemStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <span>🔄 Sync Status</span>
            <span style={{ color: '#aaa', fontSize: '0.9rem' }}>Last synced: 2 mins ago</span>
          </div>
        </div>

        <div style={menuItemStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <span>📱 App Version</span>
            <span style={{ color: '#aaa', fontSize: '0.9rem' }}>v1.0.4</span>
          </div>
        </div>

        <div style={menuItemStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <span>💾 Offline Storage</span>
            <span style={{ color: '#aaa', fontSize: '0.9rem' }}>245 MB used</span>
          </div>
        </div>

        {(user.role?.toLowerCase() === 'admin') && (
          <Link href="/admin" style={{ textDecoration: 'none' }}>
            <div style={{ ...menuItemStyle, color: '#D4AF37' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span>⚙️ Admin Dashboard</span>
                <span>→</span>
              </div>
            </div>
          </Link>
        )}
      </div>

      <button onClick={handleLogout} style={{ width: '100%', padding: '15px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: 'bold', marginTop: '40px', cursor: 'pointer' }}>
        Sign Out
      </button>
    </div>
  );
}

const menuItemStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  justifyContent: 'center',
  padding: '15px 20px',
  background: '#222',
  borderRadius: '12px',
  cursor: 'pointer'
};
