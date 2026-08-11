'use client';

import { useState } from 'react';
import { mockCinematicShots as initialShots } from '@/lib/mock-data';
import { CinematicShot } from '@/lib/types';

// SVG Icons
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

const VideoIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#D4AF37', marginBottom: '6px' }}>
    <path d="M23 7l-7 5 7 5V7z"></path>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
  </svg>
);

const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

export default function AdminCinematic() {
  const [shots, setShots] = useState<CinematicShot[]>(initialShots);
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cameraMovement, setCameraMovement] = useState('');
  const [framing, setFraming] = useState('');
  const [event, setEvent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCameraMovement('');
    setFraming('');
    setEvent('');
    setTagsInput('');
    setMediaUrl('');
  };

  const handleAddShot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return alert('Title is required');

    const newShot: CinematicShot = {
      id: `cs_${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      camera_movement: cameraMovement.trim() || undefined,
      framing: framing.trim() || undefined,
      event: event || undefined,
      tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
      media_url: mediaUrl || undefined,
      created_at: new Date().toISOString()
    };

    setShots([newShot, ...shots]);
    resetForm();
    setShowForm(false);
  };

  const handleUpdateShot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return alert('Title is required');

    setShots(shots.map(s => s.id === editingId ? {
      ...s,
      title: title.trim(),
      description: description.trim(),
      camera_movement: cameraMovement.trim() || undefined,
      framing: framing.trim() || undefined,
      event: event || undefined,
      tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
      media_url: mediaUrl || undefined,
    } : s));

    setEditingId(null);
    resetForm();
    setShowForm(false);
  };

  const startEdit = (shot: CinematicShot) => {
    setEditingId(shot.id);
    setTitle(shot.title);
    setDescription(shot.description);
    setCameraMovement(shot.camera_movement || '');
    setFraming(shot.framing || '');
    setEvent(shot.event || '');
    setTagsInput(shot.tags.join(', '));
    setMediaUrl(shot.media_url || '');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteShot = (id: string) => {
    if (confirm('Are you sure you want to delete this cinematic shot list item?')) {
      setShots(shots.filter(s => s.id !== id));
    }
  };

  const simulateMockVideoUpload = () => {
    // Simulate setting a video URL path
    setMediaUrl('/videos/sample-ref.mp4');
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Cinematic Shots Management</h1>
          <p style={styles.subtitle}>Curate videography directives, gimbal motions, framing, and drone cues for weddings</p>
        </div>
        <button 
          onClick={() => {
            if (editingId) {
              setEditingId(null);
              resetForm();
            }
            setShowForm(!showForm);
          }}
          style={{
            ...styles.addBtn,
            backgroundColor: showForm && !editingId ? '#ef4444' : '#D4AF37',
            color: showForm && !editingId ? '#fff' : '#000',
          }}
        >
          {showForm && !editingId ? (
            <>
              <XIcon /> Cancel
            </>
          ) : (
            <>
              <PlusIcon /> Add Cinematic Shot
            </>
          )}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div style={styles.formCard}>
          <h2 style={styles.formHeader}>
            {editingId ? 'Edit Cinematic Shot' : 'New Cinematic Shot'}
          </h2>

          <form onSubmit={editingId ? handleUpdateShot : handleAddShot} style={styles.formBody}>
            <div style={styles.grid2}>
              {/* Media Upload Simulation Area */}
              <div 
                onClick={simulateMockVideoUpload}
                style={{
                  ...styles.uploadArea,
                  borderColor: mediaUrl ? '#D4AF37' : 'rgba(255,255,255,0.12)',
                  backgroundColor: mediaUrl ? 'rgba(212,175,55,0.03)' : '#0a0a0f',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <VideoIcon />
                  <p style={{ margin: 0, fontSize: '13px', color: '#aaa', fontWeight: '500' }}>
                    {mediaUrl ? 'Reference Video Linked' : 'Upload Video Reference'}
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#666' }}>
                    {mediaUrl ? 'Click to re-select reference' : 'Click to simulate video attachment'}
                  </p>
                </div>
              </div>

              {/* Form Input Fields */}
              <div style={styles.inputsColumn}>
                <div>
                  <label style={styles.inputLabel}>Title <span style={{ color: '#ef4444' }}>*</span></label>
                  <input 
                    type="text" 
                    placeholder="e.g. Grand Entrance Dolly Shot" 
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>
                <div>
                  <label style={styles.inputLabel}>Description <span style={{ color: '#ef4444' }}>*</span></label>
                  <input 
                    type="text" 
                    placeholder="e.g. Track groom's steps from lower angle, capturing crowd expressions in background" 
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.grid2}>
                  <div>
                    <label style={styles.inputLabel}>Camera Movement</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Gimbal Walk / Pan / Drone Sweep" 
                      value={cameraMovement}
                      onChange={e => setCameraMovement(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                  <div>
                    <label style={styles.inputLabel}>Framing</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Medium Wide / Close-up" 
                      value={framing}
                      onChange={e => setFraming(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                </div>

                <div style={styles.grid2}>
                  <div>
                    <label style={styles.inputLabel}>Event</label>
                    <select 
                      value={event}
                      onChange={e => setEvent(e.target.value)}
                      style={styles.select}
                    >
                      <option value="">Select Event</option>
                      <option value="Mehndi">Mehndi</option>
                      <option value="Nikah">Nikah</option>
                      <option value="Barat">Barat</option>
                      <option value="Walima">Walima</option>
                      <option value="Reception">Reception</option>
                      <option value="General">General</option>
                    </select>
                  </div>
                  <div>
                    <label style={styles.inputLabel}>Tags (comma separated)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Slow Motion, Entry" 
                      value={tagsInput}
                      onChange={e => setTagsInput(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                </div>

              </div>
            </div>

            <div style={styles.formFooter}>
              <button 
                type="button" 
                onClick={() => {
                  resetForm();
                  setEditingId(null);
                  setShowForm(false);
                }} 
                style={styles.cancelBtn}
              >
                Cancel
              </button>
              <button type="submit" style={styles.saveBtn}>
                {editingId ? 'Update Cinematic Shot' : 'Save Cinematic Shot'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table List of Cinematic Shots */}
      <div style={styles.tableCard}>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={{ ...styles.th, width: '90px' }}>Reference</th>
                <th style={styles.th}>Cinematic Details</th>
                <th style={styles.th}>Movement</th>
                <th style={styles.th}>Framing</th>
                <th style={styles.th}>Event</th>
                <th style={styles.th}>Tags</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shots.length === 0 ? (
                <tr>
                  <td colSpan={7} style={styles.noDataCell}>No cinematic shots configured.</td>
                </tr>
              ) : (
                shots.map((shot) => (
                  <tr key={shot.id} style={styles.tbodyRow}>
                    <td style={styles.td}>
                      <div style={styles.videoBadge}>
                        <span style={{ fontSize: '18px' }}>🎬</span>
                        <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#D4AF37', marginTop: '2px' }}>
                          {shot.media_url ? 'VIDEO' : 'MOCK'}
                        </span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.shotTitle}>{shot.title}</div>
                      <div style={styles.shotDesc}>{shot.description}</div>
                    </td>
                    <td style={styles.td}>
                      {shot.camera_movement ? (
                        <span style={styles.techText}>{shot.camera_movement}</span>
                      ) : (
                        <span style={{ color: '#555', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      {shot.framing ? (
                        <span style={styles.techText}>{shot.framing}</span>
                      ) : (
                        <span style={{ color: '#555', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      {shot.event ? (
                        <span style={styles.eventBadge}>{shot.event}</span>
                      ) : (
                        <span style={{ color: '#666', fontSize: '12px' }}>General</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {shot.tags.map(t => (
                          <span key={t} style={styles.tagBadge}>#{t}</span>
                        ))}
                      </div>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      <div style={styles.actionGroup}>
                        <button onClick={() => startEdit(shot)} style={styles.actionBtnBlue} title="Edit">
                          <EditIcon />
                        </button>
                        <button onClick={() => deleteShot(shot.id)} style={styles.actionBtnRed} title="Delete">
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#fff',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '28px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#fff',
    margin: 0,
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '13px',
    color: '#aaa',
    margin: '4px 0 0 0',
  },
  addBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  formCard: {
    backgroundColor: '#111118',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '28px',
  },
  formHeader: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#fff',
    margin: '0 0 16px 0',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: '12px',
  },
  formBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
  },
  uploadArea: {
    border: '2px dashed',
    borderRadius: '8px',
    height: '100%',
    minHeight: '180px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backgroundColor: '#0a0a0f',
    transition: 'border-color 0.2s',
  },
  inputsColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    justifyContent: 'center',
  },
  inputLabel: {
    display: 'block',
    fontSize: '11px',
    fontWeight: '600',
    color: '#aaa',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  input: {
    width: '100%',
    backgroundColor: '#0a0a0f',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '10px 12px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    backgroundColor: '#0a0a0f',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '9px 12px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
    height: '38px',
  },
  formFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingTop: '16px',
    marginTop: '8px',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    padding: '10px 20px',
    color: '#aaa',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  saveBtn: {
    backgroundColor: '#D4AF37',
    color: '#000',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 24px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  tableCard: {
    backgroundColor: '#111118',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
    textAlign: 'left',
  },
  theadRow: {
    backgroundColor: '#0d0d14',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  th: {
    padding: '14px 16px',
    color: '#aaa',
    fontSize: '12px',
    fontWeight: '600',
    letterSpacing: '0.5px',
  },
  tbodyRow: {
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    transition: 'background-color 0.2s',
  },
  td: {
    padding: '14px 16px',
    verticalAlign: 'middle',
  },
  videoBadge: {
    width: '56px',
    height: '56px',
    borderRadius: '6px',
    backgroundColor: '#0d0d14',
    border: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shotTitle: {
    fontWeight: '600',
    color: '#fff',
    fontSize: '14px',
    marginBottom: '2px',
  },
  shotDesc: {
    color: '#aaa',
    fontSize: '12px',
    lineHeight: '1.4',
    maxWidth: '350px',
  },
  techText: {
    color: '#fff',
    fontSize: '13px',
    fontWeight: '500',
  },
  eventBadge: {
    fontSize: '11px',
    backgroundColor: 'rgba(124,58,237,0.08)',
    color: '#7c3aed',
    border: '1px solid rgba(124,58,237,0.15)',
    padding: '2px 8px',
    borderRadius: '6px',
    fontWeight: '500',
  },
  tagBadge: {
    fontSize: '10px',
    color: '#aaa',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: '2px 6px',
    borderRadius: '4px',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  actionGroup: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
  },
  actionBtnBlue: {
    backgroundColor: 'transparent',
    color: '#3b82f6',
    border: '1px solid rgba(59,130,246,0.15)',
    borderRadius: '6px',
    width: '28px',
    height: '28px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  actionBtnRed: {
    backgroundColor: 'transparent',
    color: '#ef4444',
    border: '1px solid rgba(239,68,68,0.15)',
    borderRadius: '6px',
    width: '28px',
    height: '28px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  noDataCell: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
    fontSize: '14px',
  },
};
