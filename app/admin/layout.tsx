'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getUser } from '../../lib/auth-helpers';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const redirected = useRef(false);

  useEffect(() => {
    if (redirected.current) return;
    const user = getUser();
    if (!user || user.role !== 'admin') {
      redirected.current = true;
      router.replace('/login');
    } else {
      setAuthorized(true);
    }
  }, []); // ← empty deps: only run ONCE on mount

  const handleSignOut = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('snap_user');
    }
    router.replace('/login');
  };

  if (!authorized) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid rgba(212,175,55,0.2)', borderTopColor: '#D4AF37', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } }' }} />
      </div>
    );
  }

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: '⊞' },
    { name: 'Poses', path: '/admin/poses', icon: '📷' },
    { name: 'Categories & Tags', path: '/admin/categories', icon: '🏷️' },
    { name: 'Shot List', path: '/admin/shot-list', icon: '✓' },
    { name: 'Cinematic Shots', path: '/admin/cinematic', icon: '🎬' },
    { name: "Don't Miss This", path: '/admin/dont-miss', icon: '⭐' },
    { name: 'Users', path: '/admin/users', icon: '👥' },
  ];

  return (
    <div style={styles.container}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 768px) {
          .admin-sidebar { display: none !important; }
          .admin-mobile-nav { display: flex !important; }
          .admin-main { margin-left: 0 !important; padding-top: 68px !important; }
        }
        .admin-nav-item:hover { background: rgba(255,255,255,0.04) !important; color: #fff !important; }
      `}} />

      {/* Desktop Sidebar */}
      <aside className="admin-sidebar" style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <img 
            src="/logo.png" 
            alt="Snap Service Logo" 
            style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #D4AF37' }} 
          />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#D4AF37' }}>Snap Service</div>
            <div style={{ fontSize: 11, color: '#555' }}>Admin Panel</div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '8px 0' }}>
          {navItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== '/admin' && pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                href={item.path}
                className="admin-nav-item"
                style={{
                  ...styles.navItem,
                  background: isActive ? 'rgba(212,175,55,0.08)' : 'transparent',
                  color: isActive ? '#D4AF37' : '#888',
                  borderLeft: isActive ? '3px solid #D4AF37' : '3px solid transparent',
                }}
              >
                <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <button onClick={handleSignOut} style={styles.signOutBtn}>
          Sign Out
        </button>
      </aside>

      {/* Mobile Top Nav */}
      <div className="admin-mobile-nav" style={styles.mobileNav}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 16 }}>
          <img src="/logo.png" alt="Snap Service Logo" style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #D4AF37' }} />
          <span style={{ color: '#D4AF37', fontSize: 13, fontWeight: 700 }}>Admin</span>
        </div>
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', flex: 1 }}>
          {navItems.slice(0, 5).map((item) => {
            const isActive = pathname === item.path || (item.path !== '/admin' && pathname.startsWith(item.path));
            return (
              <Link key={item.name} href={item.path} style={{
                padding: '6px 10px',
                borderRadius: 8,
                fontSize: 12,
                whiteSpace: 'nowrap',
                textDecoration: 'none',
                color: isActive ? '#D4AF37' : '#666',
                background: isActive ? 'rgba(212,175,55,0.1)' : 'transparent',
              }}>
                {item.icon} {item.name.split(' ')[0]}
              </Link>
            );
          })}
        </div>
      </div>

      <main className="admin-main" style={styles.main}>
        {children}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#0a0a0f',
    color: '#fff',
  },
  sidebar: {
    width: '240px',
    backgroundColor: '#0d0d14',
    borderRight: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 100,
  },
  sidebarHeader: {
    padding: '20px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '11px 16px',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'background 0.15s, color 0.15s',
    borderLeft: '3px solid transparent',
  } as React.CSSProperties,
  signOutBtn: {
    margin: '12px',
    padding: '10px',
    background: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '8px',
    color: '#ef4444',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
  },
  main: {
    flex: 1,
    marginLeft: '240px',
    padding: '28px',
    minHeight: '100vh',
  },
  mobileNav: {
    display: 'none',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '56px',
    backgroundColor: '#0d0d14',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    alignItems: 'center',
    padding: '0 16px',
    zIndex: 100,
  },
};
