'use client';

import React, { useState, useEffect } from 'react';
import { getUser } from '@/lib/auth-helpers';

export default function DynamicWatermark() {
  const [watermarkText, setWatermarkText] = useState('SNAP SERVICE • CONFIDENTIAL');

  useEffect(() => {
    const u = getUser();
    if (u) {
      const name = u.name || 'Team Member';
      const email = u.email || '';
      setWatermarkText(`SNAP SERVICE • ${name.toUpperCase()} • ${email} • CONFIDENTIAL`);
    }
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        pointerEvents: 'none',
        userSelect: 'none',
        overflow: 'hidden',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        alignContent: 'space-around',
        opacity: 0.04,
        transform: 'rotate(-24deg) scale(1.4)',
      }}
    >
      {Array.from({ length: 24 }).map((_, i) => (
        <div
          key={i}
          style={{
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '2.5px',
            color: '#ffffff',
            margin: '35px 25px',
            whiteSpace: 'nowrap',
            fontFamily: 'monospace',
          }}
        >
          {watermarkText}
        </div>
      ))}
    </div>
  );
}
