'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getUser } from '../../lib/auth-helpers';
import BottomNav from '../../components/layout/BottomNav';
import OfflineBanner from '../../components/layout/OfflineBanner';
import AppHeader from '../../components/layout/AppHeader';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const redirected = useRef(false);

  useEffect(() => {
    if (redirected.current) return;
    const user = getUser();
    if (!user) {
      redirected.current = true;
      router.replace('/login');
    } else {
      setAuthorized(true);
    }
  }, []);

  // Save last visited screen so closing and reopening app restores it
  useEffect(() => {
    if (pathname && pathname !== '/login') {
      try {
        localStorage.setItem('snap_last_route', pathname);
      } catch (e) {}
    }
  }, [pathname]);

  if (!authorized) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid rgba(212,175,55,0.2)', borderTopColor: '#D4AF37', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } }' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0f', color: '#fff', paddingBottom: '80px', paddingTop: '60px' }}>
      <AppHeader />
      <OfflineBanner />
      <main>
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
