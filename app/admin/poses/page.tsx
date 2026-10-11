'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Pose } from '@/lib/types';
import { 
  getPosesDB, 
  savePosesDB, 
  fetchPosesCloud, 
  deletePoseDB, 
  deletePosesBulkDB, 
  DEMO_POSE_IDS 
} from '@/lib/poses-db-helpers';

// SVG Icons
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#aaa', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
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

export default function AdminPoses() {
  const [poses, setPoses] = useState<Pose[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'hidden'>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [selected, setSelected] = useState<string[]>([]);

  const [syncing, setSyncing] = useState(false);

  const handleManualSync = async () => {
    setSyncing(true);
    const cloudPoses = await fetchPosesCloud();
    if (cloudPoses) {
      setPoses(cloudPoses);
    }
    setTimeout(() => setSyncing(false), 500);
  };

  useEffect(() => {
    setPoses(getPosesDB());
    fetchPosesCloud().then(cloudPoses => {
      if (cloudPoses) {
        setPoses(cloudPoses);
      }
    }).catch(() => {});
  }, []);

  // Filtering
  const filteredPoses = poses.filter((pose) => {
    const matchesSearch = 
      pose.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pose.instructions.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pose.tags && pose.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())));
    
    const matchesStatus = statusFilter === 'all' || pose.status === statusFilter;
    const matchesSubject = subjectFilter === 'all' || (pose.subjects && pose.subjects.includes(subjectFilter));

    return matchesSearch && matchesStatus && matchesSubject;
  });

  // Extract unique subjects
  const allSubjects = Array.from(new Set(poses.flatMap(p => p.subjects || [])));

  const toggleStatus = (id: string) => {
    const updated = poses.map(p => p.id === id ? { ...p, status: (p.status === 'published' ? 'hidden' : 'published') as 'published' | 'hidden' } : p);
    setPoses(updated);
    savePosesDB(updated);
  };

  const deletePose = (id: string) => {
    if (confirm('Are you sure you want to delete this pose? It will be removed from Cloud & Local storage.')) {
      const updated = deletePoseDB(id);
      setPoses(updated);
      setSelected(selected.filter(s => s !== id));
    }
  };

  const deleteSelected = () => {
    if (selected.length === 0) return;
    if (confirm(`Are you sure you want to delete the ${selected.length} selected poses from Cloud & Local storage?`)) {
      const updated = deletePosesBulkDB(selected);
      setPoses(updated);
      setSelected([]);
    }
  };

  const hasDemoPoses = poses.some(p => DEMO_POSE_IDS.has(p.id) || p.id.startsWith('p'));
  const deleteAllDemoPoses = () => {
    const demoIds = poses.filter(p => DEMO_POSE_IDS.has(p.id) || p.id.startsWith('p')).map(p => p.id);
    if (demoIds.length === 0) {
      alert('No demo poses found to delete!');
      return;
    }
    if (confirm(`Are you sure you want to permanently delete all ${demoIds.length} demo poses from Cloud & Local storage?`)) {
      const updated = deletePosesBulkDB(demoIds);
      setPoses(updated);
      setSelected(selected.filter(s => !demoIds.includes(s)));
    }
  };

  const toggleSelect = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(s => s !== id));
    } else {
      setSelected([...selected, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selected.length === filteredPoses.length) {
      setSelected([]);
    } else {
      setSelected(filteredPoses.map(p => p.id));
    }
  };

  const duplicatePose = (pose: Pose) => {
    const duplicated: Pose = {
      ...pose,
      id: `p_${Date.now()}`,
      title: `${pose.title} (Copy)`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const updated = [duplicated, ...poses];
    setPoses(updated);
    savePosesDB(updated);
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Pose Management</h1>
          <p style={styles.subtitle}>Curate and organize photography poses for snap sessions</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={handleManualSync}
            disabled={syncing}
            style={{
              backgroundColor: 'rgba(212,175,55,0.12)',
              color: '#D4AF37',
              border: '1px solid rgba(212,175,55,0.3)',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🔄 {syncing ? 'Syncing...' : 'Sync Cloud'}
          </button>
          {hasDemoPoses && (
            <button 
              onClick={deleteAllDemoPoses}
              style={{
                backgroundColor: '#dc2626',
                color: '#fff',
                border: 'none',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 10px rgba(220,38,38,0.3)'
              }}
              title="Delete all demo poses permanently from Cloud and Local DB"
            >
              <TrashIcon /> Delete All Demo Poses
            </button>
          )}
          <Link href="/admin/assign-shoot" style={{ ...styles.addBtn, backgroundColor: '#1a1a26', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.4)' }}>
            🎯 Assign Today&apos;s Shoot
          </Link>
          <Link href="/admin/poses/new" style={styles.addBtn}>
            <PlusIcon /> Add New Pose
          </Link>
        </div>
      </div>

      {/* Control Panel (Filters & Search) */}
      <div style={styles.controlPanel}>
        <div style={styles.searchContainer}>
          <SearchIcon />
          <input
            type="text"
            placeholder="Search by title, instructions or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.filtersGroup}>
          <div style={styles.filterItem}>
            <label style={styles.label}>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              style={styles.select}
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>

          <div style={styles.filterItem}>
            <label style={styles.label}>Subject</label>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              style={styles.select}
            >
              <option value="all">All Subjects</option>
              {allSubjects.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          {selected.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button 
                onClick={() => setSelected([])} 
                style={{ ...styles.deleteBulkBtn, backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#aaa' }}
              >
                Clear Selection
              </button>
              <button onClick={deleteSelected} style={styles.deleteBulkBtn}>
                <TrashIcon /> Delete Selected ({selected.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Poses Table Card */}
      <div style={styles.card}>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={{ ...styles.th, width: '40px' }}>
                  <input 
                    type="checkbox" 
                    onChange={toggleSelectAll}
                    checked={filteredPoses.length > 0 && selected.length === filteredPoses.length}
                    style={styles.checkbox}
                  />
                </th>
                <th style={{ ...styles.th, width: '70px' }}>Preview</th>
                <th style={styles.th}>Pose Details</th>
                <th style={styles.th}>Subjects</th>
                <th style={styles.th}>Events</th>
                <th style={styles.th}>Status</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPoses.length === 0 ? (
                <tr>
                  <td colSpan={7} style={styles.noDataCell}>
                    No poses found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredPoses.map((pose) => (
                  <tr key={pose.id} style={styles.tbodyRow}>
                    <td style={styles.td}>
                      <input 
                        type="checkbox" 
                        checked={selected.includes(pose.id)}
                        onChange={() => toggleSelect(pose.id)}
                        style={styles.checkbox}
                      />
                    </td>
                    <td style={styles.td}>
                      {pose.image_url ? (
                        <img 
                          src={pose.image_url} 
                          alt={pose.title} 
                          style={styles.thumbnail}
                        />
                      ) : (
                        <div style={styles.thumbnailPlaceholder}>
                          📷
                        </div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.poseTitle}>{pose.title}</div>
                      <div style={styles.poseInstructions}>{pose.instructions}</div>
                      {pose.tags && pose.tags.length > 0 && (
                        <div style={styles.tagsContainer}>
                          {pose.tags.map(tag => (
                            <span key={tag} style={styles.tagBadge}>#{tag}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {pose.subjects.map(s => (
                          <span key={s} style={{ ...styles.badge, backgroundColor: 'rgba(59,130,246,0.08)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.15)' }}>{s}</span>
                        ))}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {pose.events.map(e => (
                          <span key={e} style={{ ...styles.badge, backgroundColor: 'rgba(124,58,237,0.08)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.15)' }}>{e}</span>
                        ))}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <button 
                        onClick={() => toggleStatus(pose.id)}
                        style={{
                          ...styles.statusBtn,
                          color: pose.status === 'published' ? '#10b981' : '#aaa',
                          background: pose.status === 'published' ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.04)',
                          borderColor: pose.status === 'published' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.08)',
                        }}
                      >
                        {pose.status.toUpperCase()}
                      </button>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      <div style={styles.actionGroup}>
                        <Link href={`/admin/poses/edit/${pose.id}`} style={styles.actionBtnBlue} title="Edit">
                          <EditIcon />
                        </Link>
                        <button onClick={() => duplicatePose(pose)} style={styles.actionBtnGray} title="Duplicate">
                          <CopyIcon />
                        </button>
                        <button onClick={() => deletePose(pose.id)} style={styles.actionBtnRed} title="Delete">
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
    backgroundColor: '#D4AF37',
    color: '#000',
    padding: '10px 16px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '13px',
    textDecoration: 'none',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  controlPanel: {
    backgroundColor: '#111118',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '24px',
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: '16px',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  searchContainer: {
    position: 'relative',
    flex: '1 1 300px',
  },
  searchInput: {
    width: '100%',
    backgroundColor: '#0a0a0f',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '10px 12px 10px 38px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  filtersGroup: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  filterItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '11px',
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  select: {
    backgroundColor: '#0a0a0f',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '8px 12px',
    color: '#fff',
    fontSize: '13px',
    minWidth: '130px',
    outline: 'none',
    height: '38px',
  },
  deleteBulkBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: '8px',
    padding: '0 16px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    height: '38px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
  card: {
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
  checkbox: {
    accentColor: '#D4AF37',
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  thumbnail: {
    width: '50px',
    height: '50px',
    borderRadius: '6px',
    objectFit: 'cover',
    backgroundColor: '#222',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  thumbnailPlaceholder: {
    width: '50px',
    height: '50px',
    borderRadius: '6px',
    backgroundColor: '#0d0d14',
    border: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#666',
    fontSize: '18px',
  },
  poseTitle: {
    fontWeight: '600',
    color: '#fff',
    fontSize: '14px',
    marginBottom: '2px',
  },
  poseInstructions: {
    color: '#aaa',
    fontSize: '12px',
    lineHeight: '1.4',
    maxWidth: '380px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  tagsContainer: {
    display: 'flex',
    gap: '6px',
    marginTop: '6px',
    flexWrap: 'wrap',
  },
  tagBadge: {
    fontSize: '10px',
    color: '#D4AF37',
    backgroundColor: 'rgba(212,175,55,0.06)',
    padding: '2px 6px',
    borderRadius: '4px',
    border: '1px solid rgba(212,175,55,0.12)',
  },
  badge: {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '6px',
    fontWeight: '500',
  },
  statusBtn: {
    border: '1px solid',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: '700',
    letterSpacing: '0.5px',
    cursor: 'pointer',
    outline: 'none',
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
  actionBtnGray: {
    backgroundColor: 'transparent',
    color: '#aaa',
    border: '1px solid rgba(255,255,255,0.08)',
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
