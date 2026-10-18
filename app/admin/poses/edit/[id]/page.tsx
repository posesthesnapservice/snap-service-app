'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { SUBJECTS, EVENTS, SHOOT_TYPES, MOODS, getSubjectColor, getEventColor } from '@/lib/constants';
import { getPosesDB, updatePoseDB, uploadMediaToSupabase } from '@/lib/poses-db-helpers';
import { uploadMediaToCloudinary } from '@/lib/cloudinary';
import { Pose } from '@/lib/types';

// SVG Icons
const CameraIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px', color: '#D4AF37' }}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
    <circle cx="12" cy="13" r="4"></circle>
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

export default function EditPose() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [poseNotFound, setPoseNotFound] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [shootTypes, setShootTypes] = useState<string[]>([]);
  const [mood, setMood] = useState('');
  const [tags, setTags] = useState('');
  const [tagList, setTagList] = useState<string[]>([]);
  const [instructions, setInstructions] = useState('');
  const [camera, setCamera] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'published' | 'hidden'>('published');

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    const all = getPosesDB();
    const existing = all.find(p => p.id === id);
    if (!existing) {
      setPoseNotFound(true);
      setLoading(false);
      return;
    }

    setTitle(existing.title || '');
    setImageUrl(existing.image_url || '');
    setSubjects(existing.subjects || []);
    setEvents(existing.events || []);
    setShootTypes(existing.shoot_types || []);
    setMood(existing.mood || '');
    setInstructions(existing.instructions || '');
    setCamera(existing.camera_lens || '');
    setNotes(existing.notes || '');
    setStatus(existing.status || 'published');
    setTagList(existing.tags || []);
    setLoading(false);
  }, [id]);

  const handleTagInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTags(val);
    if (val.endsWith(',') || val.endsWith(' ')) {
      const cleanVal = val.slice(0, -1).trim();
      if (cleanVal && !tagList.includes(cleanVal)) {
        setTagList([...tagList, cleanVal]);
      }
      setTags('');
    }
  };

  const removeTag = (idx: number) => {
    setTagList(tagList.filter((_, i) => i !== idx));
  };

  const handleMultiSelect = (val: string, list: string[], setList: (l: string[]) => void) => {
    if (list.includes(val)) {
      setList(list.filter(item => item !== val));
    } else {
      setList([...list, val]);
    }
  };

  // Real Image Upload
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPEG, PNG, WEBP).');
      return;
    }

    setUploading(true);
    setUploadProgressText('Uploading image to Cloudinary...');

    try {
      let url = await uploadMediaToCloudinary(file);
      if (!url) {
        setUploadProgressText('Connecting to storage fallback...');
        url = await uploadMediaToSupabase(file, 'poses');
      }

      if (url) {
        setImageUrl(url);
      } else {
        alert('Image upload failed. Please try again.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload error occurred. Check network connection.');
    } finally {
      setUploading(false);
      setUploadProgressText('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return alert('Pose Title is required');
    if (!imageUrl) return alert('Pose Image is required');
    if (subjects.length === 0) return alert('Please select at least one Subject');

    setSaving(true);

    const finalTags = [...tagList];
    if (tags.trim() && !finalTags.includes(tags.trim())) {
      finalTags.push(tags.trim());
    }

    const updates: Partial<Pose> = {
      title: title.trim(),
      image_url: imageUrl,
      instructions: instructions.trim(),
      subjects,
      shoot_types: shootTypes,
      events,
      tags: finalTags,
      mood: mood || undefined,
      camera_lens: camera.trim() || undefined,
      notes: notes.trim() || undefined,
      status,
      updated_at: new Date().toISOString()
    };

    updatePoseDB(id, updates);

    setTimeout(() => {
      setSaving(false);
      router.push('/admin/poses');
    }, 400);
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', color: '#D4AF37', textAlign: 'center' }}>
        Loading pose details...
      </div>
    );
  }

  if (poseNotFound) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#aaa' }}>
        <h2>Pose not found</h2>
        <Link href="/admin/poses" style={{ color: '#D4AF37', textDecoration: 'none', marginTop: '10px', display: 'inline-block' }}>
          ← Back to Poses
        </Link>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Top Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Link href="/admin/poses" style={styles.backBtn}>
            <ArrowLeftIcon /> Back
          </Link>
          <div>
            <h1 style={styles.title}>Edit Pose</h1>
            <p style={styles.subtitle}>Update details, subjects, and event tags</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={styles.formContainer}>
        {/* Left Column: Media & Primary Details */}
        <div style={styles.column}>
          {/* Image Uploader */}
          <div style={styles.card}>
            <h3 style={styles.sectionTitle}>Pose Reference Image</h3>
            <div 
              style={{
                ...styles.dropZone,
                borderColor: imageUrl ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.15)',
              }}
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => handleFileSelect(e.target.files)}
              />

              {uploading ? (
                <div style={{ padding: '30px', textAlign: 'center' }}>
                  <div style={styles.spinner}></div>
                  <p style={{ marginTop: '12px', fontSize: '13px', color: '#D4AF37' }}>
                    {uploadProgressText}
                  </p>
                </div>
              ) : imageUrl ? (
                <div style={styles.imagePreviewContainer}>
                  <img src={imageUrl} alt="Pose preview" style={styles.imagePreview} />
                  <div style={styles.imageOverlay}>
                    <span>Click to change photo</span>
                  </div>
                </div>
              ) : (
                <div style={styles.uploadPlaceholder}>
                  <CameraIcon />
                  <div style={styles.uploadTextPrimary}>Click to select photo</div>
                  <div style={styles.uploadTextSecondary}>PNG, JPG, WEBP up to 25MB</div>
                </div>
              )}
            </div>
          </div>

          {/* Title & Instructions */}
          <div style={styles.card}>
            <h3 style={styles.sectionTitle}>Title & Instructions</h3>

            <div style={styles.formGroup}>
              <label style={styles.label}>Pose Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Bridal Royal Sitting - Dupatta Spread"
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={styles.label}>Photographer Instructions (Optional)</label>
                <span style={{ fontSize: '11px', color: '#666' }}>Optional</span>
              </div>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Provide clear steps for the photographer and subjects to recreate this pose (or leave blank)..."
                rows={4}
                style={styles.textarea}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Camera & Lens Tip (Optional)</label>
              <input
                type="text"
                value={camera}
                onChange={(e) => setCamera(e.target.value)}
                placeholder="e.g. 85mm f/1.4, eye-level, low backlight"
                style={styles.input}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Color-coded Classifications */}
        <div style={styles.column}>
          {/* Subjects (Color Coded) */}
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={styles.sectionTitle}>Subjects * (Color Coded)</h3>
              <span style={{ fontSize: '11px', color: subjects.length > 0 ? '#10b981' : '#f59e0b' }}>
                {subjects.length} selected
              </span>
            </div>
            <div style={styles.chipsContainer}>
              {SUBJECTS.map((sub) => {
                const isSelected = subjects.includes(sub);
                const col = getSubjectColor(sub);
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => handleMultiSelect(sub, subjects, setSubjects)}
                    style={{
                      ...styles.chipButton,
                      backgroundColor: isSelected ? col.bg : 'rgba(255,255,255,0.03)',
                      color: isSelected ? col.text : '#777',
                      borderColor: isSelected ? col.border : 'rgba(255,255,255,0.08)',
                      boxShadow: isSelected ? `0 0 12px ${col.bg}` : 'none',
                    }}
                  >
                    <span 
                      style={{
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        backgroundColor: col.text,
                        display: 'inline-block'
                      }} 
                    />
                    {sub}
                    {isSelected && <CheckIcon />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Events (Color Coded) */}
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={styles.sectionTitle}>Wedding Events (Color Coded)</h3>
              <span style={{ fontSize: '11px', color: events.length > 0 ? '#10b981' : '#888' }}>
                {events.length} selected
              </span>
            </div>
            <div style={styles.chipsContainer}>
              {EVENTS.map((ev) => {
                const isSelected = events.includes(ev);
                const col = getEventColor(ev);
                return (
                  <button
                    key={ev}
                    type="button"
                    onClick={() => handleMultiSelect(ev, events, setEvents)}
                    style={{
                      ...styles.chipButton,
                      backgroundColor: isSelected ? col.bg : 'rgba(255,255,255,0.03)',
                      color: isSelected ? col.text : '#777',
                      borderColor: isSelected ? col.border : 'rgba(255,255,255,0.08)',
                      boxShadow: isSelected ? `0 0 12px ${col.bg}` : 'none',
                    }}
                  >
                    <span 
                      style={{
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        backgroundColor: col.text,
                        display: 'inline-block'
                      }} 
                    />
                    {ev}
                    {isSelected && <CheckIcon />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Shoot Types & Mood */}
          <div style={styles.card}>
            <h3 style={styles.sectionTitle}>Shoot Types & Mood</h3>
            
            <label style={{ ...styles.label, marginBottom: '6px' }}>Shoot Types</label>
            <div style={{ ...styles.chipsContainer, marginBottom: '16px' }}>
              {SHOOT_TYPES.map((st) => {
                const isSelected = shootTypes.includes(st);
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleMultiSelect(st, shootTypes, setShootTypes)}
                    style={{
                      ...styles.chipButton,
                      backgroundColor: isSelected ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.03)',
                      color: isSelected ? '#D4AF37' : '#777',
                      borderColor: isSelected ? '#D4AF37' : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    {st}
                    {isSelected && <CheckIcon />}
                  </button>
                );
              })}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Mood / Vibe</label>
              <select
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                style={styles.select}
              >
                <option value="">Select Mood</option>
                {MOODS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags & Status */}
          <div style={styles.card}>
            <h3 style={styles.sectionTitle}>Tags & Status</h3>

            <div style={styles.formGroup}>
              <label style={styles.label}>Tags (Type & Press Comma)</label>
              <div style={styles.tagInputWrapper}>
                <div style={styles.tagList}>
                  {tagList.map((tag, idx) => (
                    <span key={idx} style={styles.tagBadge}>
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeTag(idx)}
                        style={styles.removeTagBtn}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  value={tags}
                  onChange={handleTagInput}
                  placeholder={tagList.length === 0 ? "Add tags..." : ""}
                  style={styles.tagInput}
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Publish Status</label>
              <div style={styles.statusToggleGroup}>
                <button
                  type="button"
                  onClick={() => setStatus('published')}
                  style={{
                    ...styles.statusToggleBtn,
                    backgroundColor: status === 'published' ? 'rgba(16,185,129,0.15)' : 'transparent',
                    color: status === 'published' ? '#10b981' : '#666',
                    borderColor: status === 'published' ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)',
                  }}
                >
                  🟢 Published
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('hidden')}
                  style={{
                    ...styles.statusToggleBtn,
                    backgroundColor: status === 'hidden' ? 'rgba(239,68,68,0.15)' : 'transparent',
                    color: status === 'hidden' ? '#ef4444' : '#666',
                    borderColor: status === 'hidden' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)',
                  }}
                >
                  🔴 Hidden
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={styles.actionsBar}>
            <button
              type="button"
              onClick={() => router.push('/admin/poses')}
              style={styles.cancelBtn}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              style={{
                ...styles.submitBtn,
                opacity: saving || uploading ? 0.6 : 1,
                cursor: saving || uploading ? 'not-allowed' : 'pointer'
              }}
            >
              {saving ? 'Updating Pose...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#fff',
    maxWidth: '1200px',
    margin: '0 auto',
    paddingBottom: '60px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    color: '#aaa',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: '600',
    marginRight: '16px',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid rgba(255,255,255,0.08)',
    backgroundColor: '#111118',
  },
  title: {
    fontSize: '22px',
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
  formContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: '20px',
    alignItems: 'start',
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  card: {
    backgroundColor: '#111118',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '20px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#fff',
    margin: '0 0 14px 0',
    letterSpacing: '-0.3px',
  },
  dropZone: {
    width: '100%',
    minHeight: '260px',
    border: '2px dashed rgba(255,255,255,0.15)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backgroundColor: '#0a0a0f',
    position: 'relative',
    overflow: 'hidden',
    transition: 'border-color 0.2s',
  },
  uploadPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  uploadTextPrimary: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#D4AF37',
    marginTop: '6px',
  },
  uploadTextSecondary: {
    fontSize: '11px',
    color: '#666',
    marginTop: '4px',
  },
  imagePreviewContainer: {
    width: '100%',
    height: '260px',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    backgroundColor: '#050508',
  },
  imageOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '12px',
    fontWeight: '600',
    opacity: 0,
    transition: 'opacity 0.2s',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#aaa',
    display: 'block',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  input: {
    width: '100%',
    backgroundColor: '#0a0a0f',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    backgroundColor: '#0a0a0f',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical',
    fontFamily: 'inherit',
    lineHeight: '1.4'
  },
  select: {
    width: '100%',
    backgroundColor: '#0a0a0f',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  chipsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  chipButton: {
    border: '1px solid',
    borderRadius: '20px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.15s ease',
  },
  tagInputWrapper: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    alignItems: 'center',
    backgroundColor: '#0a0a0f',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '6px 10px',
  },
  tagList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  tagBadge: {
    backgroundColor: 'rgba(212,175,55,0.12)',
    color: '#D4AF37',
    border: '1px solid rgba(212,175,55,0.3)',
    borderRadius: '6px',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  removeTagBtn: {
    background: 'none',
    border: 'none',
    color: '#D4AF37',
    cursor: 'pointer',
    fontSize: '10px',
    padding: 0,
  },
  tagInput: {
    flex: 1,
    minWidth: '100px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#fff',
    fontSize: '12px',
    outline: 'none',
    padding: '4px',
  },
  statusToggleGroup: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  statusToggleBtn: {
    border: '1px solid',
    borderRadius: '8px',
    padding: '10px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  actionsBar: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#aaa',
    padding: '12px 22px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  submitBtn: {
    backgroundColor: '#D4AF37',
    border: 'none',
    color: '#000',
    padding: '12px 28px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(212,175,55,0.25)',
  },
  spinner: {
    width: '28px',
    height: '28px',
    border: '3px solid rgba(212,175,55,0.2)',
    borderTopColor: '#D4AF37',
    borderRadius: '50%',
    margin: '0 auto',
    animation: 'spin 0.8s linear infinite',
  },
};
