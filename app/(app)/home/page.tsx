'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser } from '@/lib/auth-helpers';
import Link from 'next/link';
import { mockPoses } from '@/lib/mock-data';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace('/login');
    } else {
      setUser(u);
    }
    setLoading(false);
  }, []);

  if (loading) return <div style={{ padding: '20px', color: 'white' }}>Loading...</div>;

  return (
    <div style={{ padding: '20px', paddingBottom: '80px', minHeight: '100vh', background: 'linear-gradient(180deg, #121212 0%, #1a1a1a 100%)', color: 'white', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.png" alt="Snap Service Logo" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #D4AF37' }} />
          <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: '#D4AF37' }}>Snap Service</h1>
        </div>
        <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '12px' }}>Synced just now</span>
      </header>

      <div>
        <h2 style={{ fontSize: '1.8rem', margin: '10px 0 5px 0' }}>Ready to shoot, {user?.name || 'Ahmed'}!</h2>
        <input type="text" placeholder="Quick search poses, shots..." style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: '#2a2a2a', color: 'white', marginTop: '10px' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        <Link href="/today-shoot" style={{ textDecoration: 'none', gridColumn: '1 / -1' }}>
          <div className="home-card" style={{ ...cardStyle, background: 'linear-gradient(135deg, #1e1b10 0%, #2a2208 100%)', border: '1px solid rgba(212, 175, 55, 0.4)' }}>
            <div style={iconStyle}>⚡</div>
            <h3 style={{ ...titleStyle, color: '#D4AF37' }}>TODAY&apos;S SHOOT</h3>
            <p style={subtitleStyle}>Separate & track selected shots for today&apos;s wedding</p>
            <div style={arrowStyle}>→</div>
          </div>
        </Link>
        <Link href="/poses" style={{ textDecoration: 'none' }}>
          <div className="home-card" style={cardStyle}>
            <div style={iconStyle}>📷</div>
            <h3 style={titleStyle}>POSE LIBRARY</h3>
            <p style={subtitleStyle}>Browse {mockPoses?.length || 500}+ reference poses</p>
            <div style={arrowStyle}>→</div>
          </div>
        </Link>
        <Link href="/shot-list" style={{ textDecoration: 'none' }}>
          <div className="home-card" style={cardStyle}>
            <div style={iconStyle}>📋</div>
            <h3 style={titleStyle}>SHOT LIST</h3>
            <p style={subtitleStyle}>Important shots to capture</p>
            <div style={arrowStyle}>→</div>
          </div>
        </Link>
        <Link href="/cinematic" style={{ textDecoration: 'none' }}>
          <div className="home-card" style={cardStyle}>
            <div style={iconStyle}>🎞️</div>
            <h3 style={titleStyle}>CINEMATIC SHOTS</h3>
            <p style={subtitleStyle}>Video shot references</p>
            <div style={arrowStyle}>→</div>
          </div>
        </Link>
        <Link href="/dont-miss" style={{ textDecoration: 'none' }}>
          <div className="home-card" style={cardStyle}>
            <div style={iconStyle}>⭐</div>
            <h3 style={titleStyle}>DON&apos;T MISS THIS</h3>
            <p style={subtitleStyle}>Event-specific must-haves</p>
            <div style={arrowStyle}>→</div>
          </div>
        </Link>
        <Link href="/ai-assistant" style={{ textDecoration: 'none', gridColumn: '1 / -1' }}>
          <div className="home-card" style={{ ...cardStyle, background: 'linear-gradient(45deg, #2a2a2a, #3a2a2a)' }}>
            <div style={iconStyle}>✨</div>
            <h3 style={titleStyle}>AI ASSISTANT</h3>
            <p style={subtitleStyle}>Smart pose recommendations</p>
            <div style={arrowStyle}>→</div>
          </div>
        </Link>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .home-card {
          transition: transform 0.2s, box-shadow 0.2s;
          animation: fadeUp 0.5s ease-out forwards;
          opacity: 0;
          transform: translateY(20px);
        }
        .home-card:hover {
          transform: scale(1.02);
          box-shadow: 0 4px 15px rgba(212, 175, 55, 0.2);
        }
        .home-card:nth-child(1) { animation-delay: 0.1s; }
        .home-card:nth-child(2) { animation-delay: 0.2s; }
        .home-card:nth-child(3) { animation-delay: 0.3s; }
        .home-card:nth-child(4) { animation-delay: 0.4s; }
        .home-card:nth-child(5) { animation-delay: 0.5s; }
        .home-card:nth-child(6) { animation-delay: 0.6s; }
        @keyframes fadeUp {
          to { opacity: 1; transform: translateY(0); }
        }
      ` }} />
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#222',
  padding: '20px',
  borderRadius: '12px',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  minHeight: '140px',
  color: 'white',
  overflow: 'hidden'
};

const iconStyle = {
  color: '#D4AF37',
  fontSize: '24px',
  marginBottom: '10px'
};

const titleStyle = {
  margin: '0 0 5px 0',
  fontSize: '1rem',
  fontWeight: 'bold',
  color: '#fff'
};

const subtitleStyle = {
  margin: 0,
  fontSize: '0.8rem',
  color: '#aaa',
  paddingRight: '20px'
};

const arrowStyle = {
  position: 'absolute' as const,
  right: '15px',
  bottom: '15px',
  color: '#D4AF37',
  fontSize: '1.2rem'
};
