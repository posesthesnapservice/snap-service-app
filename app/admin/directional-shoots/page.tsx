'use client';

import React, { useState, useEffect } from 'react';
import { 
  getDirectionalShootsDB, 
  saveDirectionalShootsDB, 
  addDirectionalShootDB, 
  updateDirectionalShootDB, 
  deleteDirectionalShootDB, 
  deleteDirectionalShootsBulkDB, 
  fetchDirectionalShootsCloud,
  uploadMediaToSupabase 
} from '@/lib/poses-db-helpers';
import { DirectionalShoot, PoseStatus } from '@/lib/types';
import { REEL_EVENTS } from '@/lib/constants';

interface ShootFormState {
  id?: string;
  title: string;
  scene_number: string;
  folder_name: string;
  description: string;
  media_url: string;
  cover_image: string;
  director_notes: string;
  camera_angle: string;
  movement: string;
  events: string[];
  orientation: 'portrait' | 'landscape';
  status: PoseStatus;
  tags: string;
  reference_images: string[];
}

export default function AdminDirectionalShoots() {
  const [shoots, setShoots] = useState<DirectionalShoot[]>([]);
  const [filterEvent, setFilterEvent] = useState('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Folder Image Manager Modal
  const [managingFolder, setManagingFolder] = useState<DirectionalShoot | null>(null);
  const [newImageUrl, setNewImageUrl] = useState('');

  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [form, setForm] = useState<ShootFormState>({
    title: '',
    scene_number: 'Scene 01',
    folder_name: '',
    description: '',
    media_url: '',
    cover_image: '',
    director_notes: '',
    camera_angle: 'Low Angle 45°',
    movement: 'Slow Walking Track',
    events: ['Mehndi'],
    orientation: 'portrait',
    status: 'published',
    tags: '',
    reference_images: []
  });

  const handleManualSync = async () => {
    setSyncing(true);
    const cloud = await fetchDirectionalShootsCloud();
    if (cloud && cloud.length > 0) {
      setShoots(cloud);
    }
    setTimeout(() => setSyncing(false), 600);
  };

  useEffect(() => {
    setShoots(getDirectionalShootsDB());
    fetchDirectionalShootsCloud().then(cloud => {
      if (cloud && cloud.length > 0) setShoots(cloud);
    });
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    const nextNum = shoots.length + 1;
    const sceneStr = `Scene ${nextNum < 10 ? '0' + nextNum : nextNum}`;
    setForm({
      title: '',
      scene_number: sceneStr,
      folder_name: '',
      description: '',
      media_url: '',
      cover_image: '',
      director_notes: '',
      camera_angle: 'Low Angle 45°',
      movement: 'Slow Walking Track',
      events: ['Mehndi'],
      orientation: 'portrait',
      status: 'published',
      tags: '',
      reference_images: []
    });
    setShowModal(true);
  };

  const startEdit = (item: DirectionalShoot) => {
    setEditingId(item.id);
    setForm({
      id: item.id,
      title: item.title,
      scene_number: item.scene_number || 'Scene 01',
      folder_name: item.folder_name || item.title,
      description: item.description || '',
      media_url: item.media_url || '',
      cover_image: item.cover_image || '',
      director_notes: item.director_notes || '',
      camera_angle: item.camera_angle || '',
      movement: item.movement || '',
      events: item.events || (item.event ? [item.event] : ['General']),
      orientation: item.orientation || 'portrait',
      status: item.status || 'published',
      tags: item.tags?.join(', ') || '',
      reference_images: item.reference_images || (item.cover_image ? [item.cover_image] : [])
    });
    setShowModal(true);
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);

    const uploadedUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const publicUrl = await uploadMediaToSupabase(file, 'directional-shoots');
      if (publicUrl) {
        uploadedUrls.push(publicUrl);
      }
    }
    setUploading(false);

    if (uploadedUrls.length > 0) {
      setForm(prev => {
        const primary = prev.cover_image || uploadedUrls[0];
        const combined = Array.from(new Set([...prev.reference_images, ...uploadedUrls]));
        return {
          ...prev,
          cover_image: primary,
          media_url: prev.media_url || uploadedUrls[0],
          reference_images: combined
        };
      });
    }
  };

  const handleAddImageUrl = () => {
    if (!newImageUrl.trim()) return;
    setForm(prev => {
      const combined = Array.from(new Set([...prev.reference_images, newImageUrl.trim()]));
      return {
        ...prev,
        cover_image: prev.cover_image || newImageUrl.trim(),
        reference_images: combined
      };
    });
    setNewImageUrl('');
  };

  const removeReferenceImage = (idxToRemove: number) => {
    setForm(prev => {
      const updated = prev.reference_images.filter((_, idx) => idx !== idxToRemove);
      const newCover = updated.length > 0 ? updated[0] : '';
      return {
        ...prev,
        reference_images: updated,
        cover_image: prev.cover_image === prev.reference_images[idxToRemove] ? newCover : prev.cover_image
      };
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert('Please enter a Scene/Folder title');
      return;
    }

    const cover = form.cover_image || (form.reference_images.length > 0 ? form.reference_images[0] : '');
    const itemToSave: DirectionalShoot = {
      id: editingId || `ds_${Date.now()}`,
      title: form.title.trim(),
      scene_number: form.scene_number || 'Scene 01',
      folder_name: form.folder_name || form.title.trim(),
      description: form.description.trim(),
      media_url: form.media_url.trim() || undefined,
      cover_image: cover,
      director_notes: form.director_notes.trim(),
      camera_angle: form.camera_angle.trim(),
      movement: form.movement.trim(),
      event: form.events[0] || 'General',
      events: form.events,
      orientation: form.orientation,
      status: form.status,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      reference_images: form.reference_images.length > 0 ? form.reference_images : (cover ? [cover] : []),
      created_at: new Date().toISOString()
    };

    let updated: DirectionalShoot[];
    if (editingId) {
      updated = updateDirectionalShootDB(editingId, itemToSave);
    } else {
      updated = addDirectionalShootDB(itemToSave);
    }
    setShoots(updated);
    setShowModal(false);
  };

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete scene folder "${title}"?`)) {
      const updated = deleteDirectionalShootDB(id);
      setShoots(updated);
      setSelectedIds(prev => prev.filter(item => item !== id));
      if (managingFolder?.id === id) setManagingFolder(null);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Are you sure you want to permanently delete ${selectedIds.length} selected scene folders?`)) {
      const updated = deleteDirectionalShootsBulkDB(selectedIds);
      setShoots(updated);
      setSelectedIds([]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredShoots.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredShoots.map(s => s.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleStatus = (item: DirectionalShoot) => {
    const newStatus: PoseStatus = item.status === 'published' ? 'hidden' : 'published';
    const updated = updateDirectionalShootDB(item.id, { status: newStatus });
    setShoots(updated);
  };

  // Managing images inside an existing folder
  const handleRemoveImageFromManagingFolder = (imgUrl: string) => {
    if (!managingFolder) return;
    const currentImgs = managingFolder.reference_images || (managingFolder.cover_image ? [managingFolder.cover_image] : []);
    const updatedImgs = currentImgs.filter(u => u !== imgUrl);
    const newCover = updatedImgs.length > 0 ? updatedImgs[0] : '';
    const updated = updateDirectionalShootDB(managingFolder.id, {
      reference_images: updatedImgs,
      cover_image: managingFolder.cover_image === imgUrl ? newCover : managingFolder.cover_image
    });
    setShoots(updated);
    const fresh = updated.find(s => s.id === managingFolder.id) || null;
    setManagingFolder(fresh);
  };

  const handleAddImageToManagingFolder = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!managingFolder) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);

    const uploadedUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const publicUrl = await uploadMediaToSupabase(file, 'directional-shoots');
      if (publicUrl) uploadedUrls.push(publicUrl);
    }
    setUploading(false);

    if (uploadedUrls.length > 0) {
      const currentImgs = managingFolder.reference_images || (managingFolder.cover_image ? [managingFolder.cover_image] : []);
      const updatedImgs = Array.from(new Set([...currentImgs, ...uploadedUrls]));
      const updated = updateDirectionalShootDB(managingFolder.id, {
        reference_images: updatedImgs,
        cover_image: managingFolder.cover_image || updatedImgs[0]
      });
      setShoots(updated);
      const fresh = updated.find(s => s.id === managingFolder.id) || null;
      setManagingFolder(fresh);
    }
  };

  const filteredShoots = shoots.filter(s => {
    if (filterEvent === 'All') return true;
    const events = s.events || (s.event ? [s.event] : []);
    return events.includes(filterEvent);
  });

  return (
    <div style={{ padding: '24px', color: '#fff', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🧭 Directional Shoots &amp; Scene Folders
          </h1>
          <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
            Manage wedding scene folders, director cues, camera angles &amp; reference galleries
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleManualSync}
            style={{
              backgroundColor: 'rgba(212,175,55,0.1)',
              border: '1px solid rgba(212,175,55,0.3)',
              color: '#D4AF37',
              padding: '10px 16px',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px'
            }}
          >
            <span>🔄</span>
            {syncing ? 'Syncing...' : 'Sync Cloud'}
          </button>

          <button
            onClick={openAddModal}
            style={{
              backgroundColor: '#D4AF37',
              color: '#000',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px'
            }}
          >
            <span>+ Add Scene Folder</span>
          </button>
        </div>
      </div>

      {/* Filter and Bulk Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        {/* Event Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {['All', ...REEL_EVENTS].map(ev => (
            <button
              key={ev}
              onClick={() => setFilterEvent(ev)}
              style={{
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                border: '1px solid',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                backgroundColor: filterEvent === ev ? '#D4AF37' : '#12121a',
                color: filterEvent === ev ? '#000' : '#888',
                borderColor: filterEvent === ev ? '#D4AF37' : 'rgba(255,255,255,0.1)'
              }}
            >
              {ev}
            </button>
          ))}
        </div>

        {/* Bulk Delete Button */}
        {selectedIds.length > 0 && (
          <button
            onClick={handleBulkDelete}
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#ef4444',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🗑️</span>
            Delete ({selectedIds.length}) Selected Folders
          </button>
        )}
      </div>

      {/* Folders Table/Cards */}
      <div style={{ backgroundColor: '#12121a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        {/* Table Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '40px 100px 1.5fr 1fr 100px 90px 140px', padding: '12px 16px', background: '#161622', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '11px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase' }}>
          <div>
            <input 
              type="checkbox" 
              checked={selectedIds.length === filteredShoots.length && filteredShoots.length > 0} 
              onChange={toggleSelectAll} 
              style={{ cursor: 'pointer' }}
            />
          </div>
          <div>Cover</div>
          <div>Scene Folder / Title</div>
          <div>Vocal Cue &amp; Angle</div>
          <div>Reference</div>
          <div>Status</div>
          <div style={{ textAlign: 'right' }}>Actions</div>
        </div>

        {/* Rows */}
        {filteredShoots.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            No directional scene folders in this category. Click &quot;+ Add Scene Folder&quot; to create one!
          </div>
        ) : (
          filteredShoots.map(item => {
            const isSelected = selectedIds.includes(item.id);
            const refCount = item.reference_images?.length || 1;
            const previewCover = item.cover_image || (item.reference_images && item.reference_images[0]) || 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800';

            return (
              <div 
                key={item.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 100px 1.5fr 1fr 100px 90px 140px',
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  alignItems: 'center',
                  backgroundColor: isSelected ? 'rgba(212,175,55,0.04)' : 'transparent',
                  fontSize: '12px'
                }}
              >
                {/* Select Checkbox */}
                <div>
                  <input 
                    type="checkbox" 
                    checked={isSelected} 
                    onChange={() => toggleSelectOne(item.id)} 
                    style={{ cursor: 'pointer' }}
                  />
                </div>

                {/* Cover Preview */}
                <div style={{ width: '80px', height: '60px', borderRadius: '6px', overflow: 'hidden', background: '#000', position: 'relative' }}>
                  <img 
                    src={previewCover} 
                    alt={item.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', bottom: 2, right: 2, background: 'rgba(0,0,0,0.7)', color: '#D4AF37', fontSize: '9px', fontWeight: 'bold', padding: '1px 3px', borderRadius: '2px' }}>
                    📁
                  </div>
                </div>

                {/* Scene Folder & Title */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span style={{ color: '#D4AF37', fontWeight: '800', fontSize: '11px' }}>
                      {item.scene_number || 'SCENE'}
                    </span>
                    <span style={{ background: 'rgba(255,255,255,0.08)', color: '#bbb', padding: '1px 5px', borderRadius: '3px', fontSize: '9px' }}>
                      {item.events ? item.events.join(', ') : item.event}
                    </span>
                  </div>
                  <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '13px' }}>
                    {item.title}
                  </div>
                  {item.description && (
                    <div style={{ color: '#888', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '280px' }}>
                      {item.description}
                    </div>
                  )}
                </div>

                {/* Vocal Cue & Angle */}
                <div>
                  {item.director_notes ? (
                    <div style={{ color: '#D4AF37', fontStyle: 'italic', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '220px' }}>
                      &ldquo;{item.director_notes}&rdquo;
                    </div>
                  ) : (
                    <div style={{ color: '#555', fontSize: '11px' }}>No vocal notes</div>
                  )}
                  <div style={{ display: 'flex', gap: '4px', marginTop: '3px' }}>
                    {item.camera_angle && (
                      <span style={{ fontSize: '9px', color: '#38bdf8', background: 'rgba(56,189,248,0.1)', padding: '1px 4px', borderRadius: '3px' }}>
                        📐 {item.camera_angle}
                      </span>
                    )}
                    {item.movement && (
                      <span style={{ fontSize: '9px', color: '#c084fc', background: 'rgba(192,132,252,0.1)', padding: '1px 4px', borderRadius: '3px' }}>
                        🎬 {item.movement}
                      </span>
                    )}
                  </div>
                </div>

                {/* Reference Count Button */}
                <div>
                  <button
                    onClick={() => setManagingFolder(item)}
                    style={{
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#10b981',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                    title="View & manage images in this folder"
                  >
                    🖼️ {refCount} Photos
                  </button>
                </div>

                {/* Status Toggle */}
                <div>
                  <button
                    onClick={() => toggleStatus(item)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: item.status === 'published' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(107, 114, 128, 0.2)',
                      color: item.status === 'published' ? '#10b981' : '#9ca3af'
                    }}
                  >
                    {item.status === 'published' ? '● Live' : '○ Hidden'}
                  </button>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setManagingFolder(item)}
                    style={{
                      background: 'rgba(56, 189, 248, 0.1)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: '#38bdf8',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}
                    title="Manage Folder Images"
                  >
                    Photos
                  </button>

                  <button
                    onClick={() => startEdit(item)}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '11px'
                    }}
                    title="Edit Folder"
                  >
                    ✏️
                  </button>

                  <button
                    onClick={() => handleDelete(item.id, item.title)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '11px'
                    }}
                    title="Delete Folder"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: ADD / EDIT SCENE FOLDER */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#161622', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '16px', maxWidth: '650px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                📁 {editingId ? 'Edit Scene Folder' : 'Create New Scene Folder'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: '#888', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Scene Number & Title */}
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '4px', fontWeight: '600' }}>
                    Scene #
                  </label>
                  <input
                    type="text"
                    value={form.scene_number}
                    onChange={e => setForm({ ...form, scene_number: e.target.value })}
                    placeholder="e.g. Scene 01"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0f0f17', border: '1px solid #333', color: '#D4AF37', fontWeight: 'bold', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '4px', fontWeight: '600' }}>
                    Scene / Folder Title *
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Couple Shoot Layout, Bridal Entry..."
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0f0f17', border: '1px solid #333', color: '#fff', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Event Select */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '4px', fontWeight: '600' }}>
                  Target Wedding Events
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {REEL_EVENTS.filter(e => e !== 'All').map(ev => {
                    const isSelected = form.events.includes(ev);
                    return (
                      <button
                        type="button"
                        key={ev}
                        onClick={() => {
                          if (isSelected) {
                            if (form.events.length > 1) {
                              setForm({ ...form, events: form.events.filter(e => e !== ev) });
                            }
                          } else {
                            setForm({ ...form, events: [...form.events, ev] });
                          }
                        }}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '16px',
                          fontSize: '11px',
                          fontWeight: '600',
                          border: isSelected ? '1px solid #D4AF37' : '1px solid rgba(255,255,255,0.1)',
                          background: isSelected ? '#D4AF37' : 'rgba(255,255,255,0.04)',
                          color: isSelected ? '#000' : '#888',
                          cursor: 'pointer'
                        }}
                      >
                        {ev}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Camera Angle & Movement */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '4px', fontWeight: '600' }}>
                    Camera Angle
                  </label>
                  <input
                    type="text"
                    value={form.camera_angle}
                    onChange={e => setForm({ ...form, camera_angle: e.target.value })}
                    placeholder="e.g. Low Angle 45°, Eye Level, Side Profile"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0f0f17', border: '1px solid #333', color: '#fff', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '4px', fontWeight: '600' }}>
                    Camera Movement / Pacing
                  </label>
                  <input
                    type="text"
                    value={form.movement}
                    onChange={e => setForm({ ...form, movement: e.target.value })}
                    placeholder="e.g. Slow Walking Track, 120fps Slow Mo, Orbit"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0f0f17', border: '1px solid #333', color: '#fff', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Director's Vocal Cue */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#D4AF37', marginBottom: '4px', fontWeight: 'bold' }}>
                  🗣️ Director&apos;s Vocal Notes / Exact Cue to Couple
                </label>
                <textarea
                  value={form.director_notes}
                  onChange={e => setForm({ ...form, director_notes: e.target.value })}
                  placeholder='e.g. Tell groom: "Whisper what you thought the very first second you saw her today."'
                  rows={2}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0f0f17', border: '1px solid rgba(212,175,55,0.3)', color: '#fff', fontStyle: 'italic', boxSizing: 'border-box' }}
                />
              </div>

              {/* Scene Description */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '4px', fontWeight: '600' }}>
                  Scene Description / Instructions
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Scene background, lighting tips, mood setup..."
                  rows={2}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0f0f17', border: '1px solid #333', color: '#fff', boxSizing: 'border-box' }}
                />
              </div>

              {/* Reference Images Multi-Upload Section */}
              <div style={{ background: '#0f0f17', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}>
                      🖼️ Reference Photos in this Folder ({form.reference_images.length})
                    </div>
                    <div style={{ fontSize: '10px', color: '#888' }}>
                      Upload multiple images or paste URLs to populate this scene folder
                    </div>
                  </div>

                  <label style={{
                    backgroundColor: 'rgba(212,175,55,0.15)',
                    border: '1px solid #D4AF37',
                    color: '#D4AF37',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: uploading ? 'wait' : 'pointer'
                  }}>
                    {uploading ? 'Uploading...' : '📁 Upload Images'}
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      onChange={handleMediaUpload} 
                      disabled={uploading}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>

                {/* Add Image by URL row */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={e => setNewImageUrl(e.target.value)}
                    placeholder="Or paste reference image URL (https://...)"
                    style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', background: '#161622', border: '1px solid #333', color: '#fff', fontSize: '11px' }}
                  />
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    style={{ background: '#161622', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}
                  >
                    + Add URL
                  </button>
                </div>

                {/* Thumbnails Grid */}
                {form.reference_images.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
                    {form.reference_images.map((imgUrl, idx) => (
                      <div key={idx} style={{ position: 'relative', width: '100%', paddingTop: '100%', borderRadius: '6px', overflow: 'hidden', border: form.cover_image === imgUrl ? '2px solid #D4AF37' : '1px solid #333' }}>
                        <img src={imgUrl} alt={`ref-${idx}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => removeReferenceImage(idx)}
                          style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(239,68,68,0.85)', color: '#fff', border: 'none', width: '18px', height: '18px', borderRadius: '50%', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          ✕
                        </button>
                        {form.cover_image === imgUrl && (
                          <div style={{ position: 'absolute', bottom: 2, left: 2, background: '#D4AF37', color: '#000', fontSize: '8px', fontWeight: 'bold', padding: '1px 3px', borderRadius: '2px' }}>
                            COVER
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Status and Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '12px', color: '#aaa', fontWeight: '600' }}>Visibility:</label>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value as PoseStatus })}
                    style={{ background: '#0f0f17', border: '1px solid #333', color: '#fff', padding: '6px 10px', borderRadius: '6px', fontSize: '12px' }}
                  >
                    <option value="published">Published (Live to Photographers)</option>
                    <option value="hidden">Hidden (Draft)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{ background: '#161622', border: '1px solid #333', color: '#aaa', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ background: '#D4AF37', color: '#000', border: 'none', padding: '10px 22px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
                  >
                    {editingId ? 'Save Changes' : 'Create Scene Folder'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: MANAGE FOLDER REFERENCE IMAGES */}
      {managingFolder && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
          <div style={{ backgroundColor: '#161622', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '16px', maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ background: '#D4AF37', color: '#000', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '800' }}>
                    {managingFolder.scene_number || 'SCENE'}
                  </span>
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>
                    {managingFolder.title}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#888' }}>
                  Reference Images Gallery ({(managingFolder.reference_images || []).length} photos in this folder)
                </div>
              </div>

              <button 
                onClick={() => setManagingFolder(null)}
                style={{ background: 'none', border: 'none', color: '#888', fontSize: '22px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Quick Upload Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f0f17', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '12px', color: '#ccc' }}>
                Add more photos to this Scene Folder:
              </div>

              <label style={{
                backgroundColor: '#D4AF37',
                color: '#000',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: uploading ? 'wait' : 'pointer'
              }}>
                {uploading ? 'Uploading...' : '+ Upload Photos to Folder'}
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleAddImageToManagingFolder}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {/* Images Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
              {(managingFolder.reference_images && managingFolder.reference_images.length > 0 
                ? managingFolder.reference_images 
                : [managingFolder.cover_image || 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800']).map((imgUrl, idx) => (
                <div key={idx} style={{ position: 'relative', width: '100%', paddingTop: '130%', borderRadius: '8px', overflow: 'hidden', border: managingFolder.cover_image === imgUrl ? '2px solid #D4AF37' : '1px solid rgba(255,255,255,0.1)', background: '#0a0a0f' }}>
                  <img src={imgUrl} alt={`ref-${idx}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  
                  {/* Image Index */}
                  <div style={{ position: 'absolute', top: 4, left: 4, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '9px', fontWeight: 'bold', padding: '1px 5px', borderRadius: '3px' }}>
                    #{idx + 1}
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemoveImageFromManagingFolder(imgUrl)}
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      background: 'rgba(239,68,68,0.9)',
                      color: '#fff',
                      border: 'none',
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Remove this photo from folder"
                  >
                    ✕
                  </button>

                  {/* Cover Indicator */}
                  {managingFolder.cover_image === imgUrl && (
                    <div style={{ position: 'absolute', bottom: 4, left: 4, background: '#D4AF37', color: '#000', fontSize: '8px', fontWeight: 'bold', padding: '1px 4px', borderRadius: '2px' }}>
                      COVER
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setManagingFolder(null)}
                style={{ backgroundColor: '#161622', border: '1px solid #333', color: '#fff', padding: '8px 18px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
