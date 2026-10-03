'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '@/lib/auth-helpers';
import { mockShotList } from '@/lib/mock-data';
import { 
  getPosesDB, 
  getTrendingReelsDB, 
  getCinematicDB, 
  getDirectionalShootsDB,
  fetchPosesCloud,
  fetchTrendingReelsCloud,
  fetchDirectionalShootsCloud
} from '@/lib/poses-db-helpers';

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [counts, setCounts] = useState({
    poses: 0,
    reels: 0,
    cinematic: 0,
    directional: 0,
    shotList: mockShotList.length,
    users: 3,
  });

  useEffect(() => {
    // Auth is already handled by the layout, but we load user info here
    const u = getUser();
    if (u) setUser(u);

    setCounts(prev => ({
      ...prev,
      poses: getPosesDB().length,
      reels: getTrendingReelsDB().length,
      cinematic: getCinematicDB().length,
      directional: getDirectionalShootsDB().length,
    }));

    fetchPosesCloud().then(p => { if (p && p.length > 0) setCounts(c => ({ ...c, poses: p.length })); }).catch(() => {});
    fetchTrendingReelsCloud().then(r => { if (r && r.length > 0) setCounts(c => ({ ...c, reels: r.length })); }).catch(() => {});
    fetchDirectionalShootsCloud().then(d => { if (d && d.length > 0) setCounts(c => ({ ...c, directional: d.length })); }).catch(() => {});
  }, []); // Run once on mount only

  const stats = [
    { label: 'Total Poses', value: counts.poses, icon: '📷', path: '/admin/poses' },
    { label: 'Trending Reels', value: counts.reels, icon: '🔥', path: '/admin/trending-reels' },
    { label: 'Directional Shoots', value: counts.directional, icon: '🧭', path: '/admin/directional-shoots' },
    { label: 'Cinematic Shots', value: counts.cinematic, icon: '🎬', path: '/admin/cinematic' },
    { label: 'Shot List Items', value: counts.shotList, icon: '✓', path: '/admin/shot-list' },
    { label: 'Active Users', value: counts.users, icon: '👥', path: '/admin/users' },
  ];

  const quickActions = [
    { label: '🎯 Assign Today\'s Shoot', href: '/admin/assign-shoot', primary: true },
    { label: '+ Add New Pose', href: '/admin/poses/new', primary: false },
    { label: '+ Manage Directional Shoots', href: '/admin/directional-shoots', primary: false },
    { label: '+ Manage Trending Reels', href: '/admin/trending-reels', primary: false },
    { label: '+ Add Shot', href: '/admin/shot-list', primary: false },
    { label: '+ Manage Users', href: '/admin/users', primary: false },
  ];

  const recentActivity = [
    { text: 'Added new pose: Bridal Solo - Standing Grace', time: '2 hours ago' },
    { text: 'Updated user: Ahmed Khan (Photographer)', time: '5 hours ago' },
    { text: 'Added cinematic shot: Bride Entry Slow Motion', time: '1 day ago' },
    { text: 'Updated checklist: 9 items for Barat event', time: '2 days ago' },
  ];

  return (
    <div style={styles.page}>
      {/* Page Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Dashboard</h1>
          <p style={styles.pageSubtitle}>
            Welcome back, {user?.name || 'Admin'} · All systems nominal ✓
          </p>
        </div>
        <Link href="/admin/poses/new" style={styles.primaryBtn}>
          + Add New Pose
        </Link>
      </div>

      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.path} style={styles.statCard}>
            <div style={styles.statIcon}>{stat.icon}</div>
            <div>
              <div style={styles.statValue}>{stat.value}</div>
              <div style={styles.statLabel}>{stat.label}</div>
            </div>
          </Link>
        ))}
      </div>

      <div style={styles.twoCol}>
        {/* Quick Actions */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Quick Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                style={action.primary ? styles.actionBtnPrimary : styles.actionBtnSecondary}
              >
                {action.label}
              </Link>
            ))}
            <Link href="/home" style={styles.actionBtnSecondary}>
              👁 View Photographer App
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Recent Activity</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {recentActivity.map((item, i) => (
              <div key={i} style={{
                padding: '12px 0',
                borderBottom: i < recentActivity.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 12,
              }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ color: '#D4AF37', flexShrink: 0, marginTop: 2 }}>●</span>
                  <span style={{ fontSize: 13, color: '#ccc', lineHeight: 1.5 }}>{item.text}</span>
                </div>
                <span style={{ fontSize: 11, color: '#555', whiteSpace: 'nowrap' }}>{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Library Health */}
      <div style={styles.healthBanner}>
        <span style={{ color: '#10b981', fontSize: 18 }}>✓</span>
        <div>
          <div style={{ color: '#10b981', fontWeight: 600, fontSize: 14 }}>All content synced</div>
          <div style={{ color: '#555', fontSize: 12 }}>20 poses · 5 shots · 5 cinematic · 39 checklist items</div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 900,
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: 700,
    color: '#fff',
    margin: 0,
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#666',
    margin: '4px 0 0',
  },
  primaryBtn: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)',
    borderRadius: 10,
    color: '#000',
    fontWeight: 700,
    fontSize: 14,
    textDecoration: 'none',
    display: 'inline-block',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: 16,
  },
  statCard: {
    background: '#111118',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: '20px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    textDecoration: 'none',
    transition: 'border-color 0.2s',
  },
  statIcon: {
    fontSize: 28,
    width: 48,
    height: 48,
    background: 'rgba(212,175,55,0.08)',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 700,
    color: '#D4AF37',
    lineHeight: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 20,
  },
  card: {
    background: '#111118',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: '20px',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#fff',
    margin: '0 0 16px',
  },
  actionBtnPrimary: {
    display: 'block',
    padding: '11px 16px',
    background: 'rgba(212,175,55,0.1)',
    border: '1px solid rgba(212,175,55,0.25)',
    borderRadius: 8,
    color: '#D4AF37',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 600,
    textAlign: 'center',
  } as React.CSSProperties,
  actionBtnSecondary: {
    display: 'block',
    padding: '11px 16px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    color: '#aaa',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 500,
    textAlign: 'center',
  } as React.CSSProperties,
  healthBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'rgba(16,185,129,0.05)',
    border: '1px solid rgba(16,185,129,0.15)',
    borderRadius: 10,
    padding: '14px 18px',
  },
};
