'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { mockPoses } from '@/lib/mock-data';
import Link from 'next/link';

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<string[]>([]);
  
  useEffect(() => {
    const favs = JSON.parse(localStorage.getItem('snap_favorites') || '[]');
    setFavorites(favs);
  }, []);

  const toggleFav = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    let newFavs = favorites.filter(fid => fid !== id);
    setFavorites(newFavs);
    localStorage.setItem('snap_favorites', JSON.stringify(newFavs));
  };

  const filtered = (mockPoses || []).filter((p: any) => favorites.includes(p.id));

  return (
    <div style={{ padding: '20px', paddingBottom: '80px', minHeight: '100vh', background: '#121212', color: 'white', display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' }}>←</button>
        <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>My Favorites</h1>
      </header>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#aaa', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '15px', color: '#ff4081' }}>♡</div>
          <p>No favorites yet.</p>
          <p style={{ fontSize: '0.9rem' }}>Tap the heart on any pose to save it.</p>
        </div>
      ) : (
        <div style={{ columnCount: 2, columnGap: '15px', marginTop: '10px' }}>
          {filtered.map((pose: any) => (
            <Link key={pose.id} href={`/poses/${pose.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#222', borderRadius: '12px', overflow: 'hidden', marginBottom: '15px', position: 'relative', display: 'inline-block', width: '100%' }}>
                <img src={pose.imageUrl || 'https://placehold.co/400x600/333/fff'} alt={pose.title} style={{ width: '100%', display: 'block', objectFit: 'cover' }} />
                <button onClick={(e) => toggleFav(e, pose.id)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ff4081' }}>
                  ♥
                </button>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '0.9rem', color: 'white' }}>{pose.title}</h3>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
