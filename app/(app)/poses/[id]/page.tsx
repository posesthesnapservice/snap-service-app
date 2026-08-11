'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { getPosesDB } from '@/lib/poses-db-helpers';

export default function PoseDetails({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const poseId = resolvedParams.id;
  const router = useRouter();
  const [pose, setPose] = useState<any>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [allPoses, setAllPoses] = useState<any[]>([]);

  useEffect(() => {
    if (!poseId) return;
    const dbPoses = getPosesDB();
    setAllPoses(dbPoses);
    const p = (dbPoses || []).find((x: any) => x.id === poseId);
    setPose(p || null);
    const favs = JSON.parse(localStorage.getItem('snap_favorites') || '[]');
    setFavorites(favs);
  }, [poseId]);

  if (pose === undefined) return <div style={{ color: 'white', padding: '20px' }}>Loading...</div>;
  if (pose === null) return <div style={{ color: 'white', padding: '20px' }}>404 - Pose Not Found</div>;

  const isFav = favorites.includes(pose.id);

  const toggleFav = () => {
    let newFavs = [...favorites];
    if (isFav) {
      newFavs = newFavs.filter(fid => fid !== pose.id);
    } else {
      newFavs.push(pose.id);
    }
    setFavorites(newFavs);
    localStorage.setItem('snap_favorites', JSON.stringify(newFavs));
  };

  const idx = (allPoses || []).findIndex((x: any) => x.id === pose.id);
  const prevId = idx > 0 ? allPoses[idx - 1].id : null;
  const nextId = idx < (allPoses?.length || 0) - 1 ? allPoses[idx + 1].id : null;

  return (
    <div style={{ background: '#121212', color: 'white', minHeight: '100vh', paddingBottom: '80px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', height: '60vh', width: '100%' }}>
        <img src={pose.image_url || 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800'} alt={pose.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        
        <button onClick={() => router.back()} style={{ position: 'absolute', top: '20px', left: '20px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', color: 'white', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          ←
        </button>
        
        <button onClick={toggleFav} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', color: isFav ? '#ff4081' : 'white', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}>
          {isFav ? '♥' : '♡'}
        </button>
      </div>

      <div style={{ padding: '20px', flex: 1 }}>
        <h1 style={{ fontSize: '1.8rem', margin: '0 0 10px 0', fontWeight: 'bold' }}>{pose.title}</h1>
        
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {pose.events?.map((e: string) => <span key={e} style={{ ...tagStyle, background: '#4a2c00' }}>{e}</span>)}
          {pose.subjects?.map((s: string) => <span key={s} style={{ ...tagStyle, background: '#002a4a' }}>{s}</span>)}
          {pose.mood && <span style={{ ...tagStyle, background: '#2a4a00' }}>{pose.mood}</span>}
        </div>

        <section style={{ marginBottom: '20px' }}>
          <h2 style={sectionTitleStyle}>Instructions</h2>
          <p style={{ color: '#ccc', lineHeight: '1.5' }}>{pose.instructions || 'No specific instructions provided.'}</p>
        </section>

        {(pose.camera_lens || pose.camera) && (
          <section style={{ marginBottom: '20px' }}>
            <h2 style={sectionTitleStyle}>📷 Camera & Lens</h2>
            <p style={{ color: '#ccc' }}>{pose.camera_lens || pose.camera}</p>
          </section>
        )}

        {(pose.shoot_types || pose.shootTypes) && (
          <section style={{ marginBottom: '20px' }}>
            <h2 style={sectionTitleStyle}>Shoot Type</h2>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(pose.shoot_types || pose.shootTypes).map((st: string) => (
                <span key={st} style={{ background: '#333', padding: '4px 10px', borderRadius: '15px', fontSize: '0.85rem' }}>{st}</span>
              ))}
            </div>
          </section>
        )}

        {pose.notes && (
          <section style={{ marginBottom: '20px' }}>
            <h2 style={sectionTitleStyle}>Notes</h2>
            <p style={{ color: '#aaa', fontStyle: 'italic' }}>{pose.notes}</p>
          </section>
        )}
      </div>

      <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #333' }}>
        <button onClick={() => prevId && router.push(`/poses/${prevId}`)} disabled={!prevId} style={{ ...navButtonStyle, opacity: prevId ? 1 : 0.5 }}>← Previous</button>
        <button onClick={() => nextId && router.push(`/poses/${nextId}`)} disabled={!nextId} style={{ ...navButtonStyle, opacity: nextId ? 1 : 0.5 }}>Next →</button>
      </div>
    </div>
  );
}

const tagStyle = {
  padding: '4px 10px',
  borderRadius: '4px',
  fontSize: '0.8rem',
  color: 'white'
};

const sectionTitleStyle = {
  fontSize: '1.1rem',
  fontWeight: 'bold',
  color: '#D4AF37',
  marginBottom: '8px',
  marginTop: '0'
};

const navButtonStyle = {
  background: '#2a2a2a',
  border: 'none',
  padding: '10px 20px',
  borderRadius: '8px',
  color: 'white',
  cursor: 'pointer'
};
