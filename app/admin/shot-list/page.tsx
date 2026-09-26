'use client';

import { useState, useEffect } from 'react';
import { 
  getShotListDB, 
  addShotListDB, 
  updateShotListDB, 
  deleteShotListDB, 
  fetchShotListCloud 
} from '@/lib/poses-db-helpers';
import { ShotListItem } from '@/lib/types';

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

const CameraIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#D4AF37', marginBottom: '6px' }}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
    <circle cx="12" cy="13" r="4"></circle>
  </svg>
);

const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

export default function AdminShotList() {
  const [shots, setShots] = useState<ShotListItem[]>([]);
  const [showForm, setShowForm] = useState(false);

  // New Item State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [event, setEvent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [instructions, setInstructions] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setShots(getShotListDB());
    fetchShotListCloud().then(cloudShots => {
      if (cloudShots && cloudShots.length > 0) {
        setShots(cloudShots);
      }
    }).catch(() => {});
  }, []);

  const handleAddShot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return alert('Title is required');

    const newShot: ShotListItem = {
      id: `sl_${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      event: event || undefined,
      instructions: instructions.trim() || undefined,
      tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
      image_url: imageUrl || undefined,
      created_at: new Date().toISOString()
    };

    const updated = addShotListDB(newShot);
    setShots(updated);
    resetForm();
    setShowForm(false);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setEvent('');
    setTagsInput('');
    setInstructions('');
    setImageUrl('');
  };

  const deleteShot = (id: string) => {
    if (confirm('Are you sure you want to delete this shot list item?')) {
      const updated = deleteShotListDB(id);
      setShots(updated);
    }
  };

  const startEdit = (shot: ShotListItem) => {
    setEditingId(shot.id);
    setTitle(shot.title);
    setDescription(shot.description);
    setEvent(shot.event || '');
    setTagsInput(shot.tags.join(', '));
    setInstructions(shot.instructions || '');
    setImageUrl(shot.image_url || '');
    setShowForm(true);
    // Scroll to form or layout
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateShot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return alert('Title is required');
    if (!editingId) return;

    const updated = updateShotListDB(editingId, {
      title: title.trim(),
      description: description.trim(),
      event: event || undefined,
      instructions: instructions.trim() || undefined,
      tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
      image_url: imageUrl || undefined,
    });

    setShots(updated);
    setEditingId(null);
    resetForm();
    setShowForm(false);
  };

  const simulateMockUpload = () => {
    const images = [
      'https://images.unsplash.com/photo-1519741497674-4c8a2de4e5a9?w=400',
      'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=400',
      'https://images.unsplash.com/photo-1594938298739-39bd5a7de2b9?w=400',
      'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=400',
    ];
    setImageUrl(images[Math.floor(Math.random() * images.length)]);
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Shot List Management</h1>
          <p style={styles.subtitle}>Define key moments, angles, and detail shots that must be captured during weddings</p>
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
              <PlusIcon /> Add Shot Item
            </>
          )}
        </button>
      </div>

      {/* Form (Conditional rendering) */}
      {showForm && (
        <div style={styles.formCard}>
          <h2 style={styles.formHeader}>
            {editingId ? 'Edit Shot List Item' : 'New Shot List Item'}
          </h2>
          
          <form onSubmit={editingId ? handleUpdateShot : handleAddShot} style={styles.formBody}>
            <div style={styles.grid2}>
              {/* Photo Area */}
              <div 
                onClick={simulateMockUpload} 
                style={{
                  ...styles.uploadArea,
                  borderColor: imageUrl ? '#D4AF37' : 'rgba(255,255,255,0.12)',
                  backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
                }}
              >
                {!imageUrl && (
                  <div style={{ textAlign: 'center' }}>
                    <CameraIcon />
                    <p style={{ margin: 0, fontSize: '13px', color: '#aaa', fontWeight: '500' }}>Reference Image</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#666' }}>Click to simulate upload</p>
                  </div>
                )}
                {imageUrl && (
                  <div style={styles.imageOverlayBtn}>
                    Change Image
                  </div>
                )}
              </div>

              {/* Input Fields */}
              <div style={styles.inputsColumn}>
                <div>
                  <label style={styles.inputLabel}>Title <span style={{ color: '#ef4444' }}>*</span></label>
                  <input 
                    type="text" 
                    placeholder="e.g. Bridal Lehenga Detail" 
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
                    placeholder="e.g. Emphasize gold embroidery, fabric folds, and lighting" 
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    style={styles.input}
                    required
                  />
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
                      placeholder="e.g. Details, Macro" 
                      value={tagsInput}
                      onChange={e => setTagsInput(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '12px' }}>
              <label style={styles.inputLabel}>Instructions (Optional)</label>
              <textarea 
                placeholder="Specific posing or technical instructions..." 
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                style={styles.textarea}
              />
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
                {editingId ? 'Update Shot' : 'Save Shot Item'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Shots List Table */}
      <div style={styles.tableCard}>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={{ ...styles.th, width: '80px' }}>Reference</th>
                <th style={styles.th}>Title & Description</th>
                <th style={styles.th}>Event</th>
                <th style={styles.th}>Tags</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shots.length === 0 ? (
                <tr>
                  <td colSpan={5} style={styles.noDataCell}>No shot list items created yet.</td>
                </tr>
              ) : (
                shots.map((shot) => (
                  <tr key={shot.id} style={styles.tbodyRow}>
                    <td style={styles.td}>
                      {shot.image_url ? (
                        <img src={shot.image_url} alt={shot.title} style={styles.refThumbnail} />
                      ) : (
                        <div style={styles.refPlaceholder}>📷</div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.shotTitle}>{shot.title}</div>
                      <div style={styles.shotDesc}>{shot.description}</div>
                      {shot.instructions && (
                        <div style={styles.shotInst}>💡 {shot.instructions}</div>
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
    height: '190px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backgroundColor: '#0a0a0f',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    position: 'relative',
    transition: 'border-color 0.2s',
  },
  imageOverlayBtn: {
    position: 'absolute',
    bottom: '12px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(0,0,0,0.8)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#fff',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '11px',
    fontWeight: '600',
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
  textarea: {
    width: '100%',
    backgroundColor: '#0a0a0f',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '10px 12px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
    minHeight: '70px',
    fontFamily: 'inherit',
    resize: 'vertical',
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
  refThumbnail: {
    width: '56px',
    height: '56px',
    borderRadius: '6px',
    objectFit: 'cover',
    backgroundColor: '#222',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  refPlaceholder: {
    width: '56px',
    height: '56px',
    borderRadius: '6px',
    backgroundColor: '#0d0d14',
    border: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#666',
    fontSize: '20px',
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
  },
  shotInst: {
    color: '#D4AF37',
    fontSize: '11px',
    marginTop: '4px',
    fontStyle: 'italic',
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
