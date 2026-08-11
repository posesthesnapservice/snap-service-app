'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SUBJECTS, EVENTS, SHOOT_TYPES, MOODS } from '@/lib/constants';
import { addPoseDB } from '@/lib/poses-db-helpers';
import { Pose } from '@/lib/types';

// SVG Icons
const CameraIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px', color: '#D4AF37' }}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
    <circle cx="12" cy="13" r="4"></circle>
  </svg>
);

const XIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

export default function NewPose() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [shootTypes, setShootTypes] = useState<string[]>([]);
  const [mood, setMood] = useState('');
  const [style, setStyle] = useState('');
  const [location, setLocation] = useState('');
  const [tags, setTags] = useState('');
  const [tagList, setTagList] = useState<string[]>([]);
  const [instructions, setInstructions] = useState('');
  const [camera, setCamera] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'published' | 'hidden'>('published');
  const [saved, setSaved] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return alert('Title is required');
    if (subjects.length === 0) return alert('Please select at least one subject');
    if (events.length === 0) return alert('Please select at least one event');
    
    const newPose: Pose = {
      id: `p_${Date.now()}`,
      title,
      image_url: imageUrl || 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800',
      instructions: instructions || 'Follow photographer guide.',
      status,
      subjects,
      shoot_types: shootTypes,
      events,
      tags: tagList,
      mood: mood || undefined,
      style: style || undefined,
      location: location || undefined,
      camera_lens: camera || undefined,
      notes: notes || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    addPoseDB(newPose);

    setSaved(true);
    setTimeout(() => {
      router.push('/admin/poses');
    }, 1200);
  };

  const triggerMockUpload = () => {
    // Generate a beautiful mock Unsplash photo url
    const randoms = ['1583939003579-730e3918a45a', '1594938298739-39bd5a7de2b9', '1515934751635-c81c6bc9a2d8', '1519741497674-4c8a2de4e5a9', '1525610079773-0ff89f657fd9'];
    const selectedPhoto = randoms[Math.floor(Math.random() * randoms.length)];
    setImageUrl(`https://images.unsplash.com/photo-${selectedPhoto}?w=800`);
  };

  return (
    <div style={styles.page}>
      {/* Back to list & Title */}
      <div style={{ marginBottom: '24px' }}>
        <button onClick={() => router.back()} style={styles.backBtn}>
          <ArrowLeftIcon /> Back to Poses
        </button>
        <h1 style={styles.title}>Add New Pose</h1>
        <p style={styles.subtitle}>Define poses, capture details, styles, and tags for photoshoots</p>
      </div>

      {saved && (
        <div style={styles.successBanner}>
          <span style={{ fontSize: '18px', marginRight: '8px' }}>✓</span>
          Pose saved successfully! Redirecting back to management panel...
        </div>
      )}

      <form onSubmit={handleSave} style={styles.formCard}>
        {/* Image Upload Area */}
        <div 
          onClick={triggerMockUpload}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); triggerMockUpload(); }}
          style={{
            ...styles.uploadArea,
            borderColor: isDragging || imageUrl ? '#D4AF37' : 'rgba(255,255,255,0.12)',
            backgroundColor: isDragging ? 'rgba(212,175,55,0.04)' : '#0a0a0f',
          }}
        >
          {imageUrl ? (
            <div style={styles.previewContainer}>
              <img src={imageUrl} alt="Pose preview" style={styles.uploadedPreview} />
              <button 
                type="button" 
                onClick={(e) => { e.stopPropagation(); setImageUrl(''); }} 
                style={styles.removeImageBtn}
              >
                <XIcon /> Remove
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <CameraIcon />
              <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#fff', fontWeight: '500' }}>
                Upload Pose Reference Image
              </p>
              <p style={{ margin: 0, fontSize: '11px', color: '#666' }}>
                Drag and drop, or click to browse (Simulated upload)
              </p>
            </div>
          )}
        </div>

        {/* Basic Information */}
        <div style={styles.grid2}>
          <div>
            <label style={styles.fieldLabel}>Pose Title <span style={{ color: '#ef4444' }}>*</span></label>
            <input 
              type="text" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              style={styles.input} 
              placeholder="e.g. Bridal Twirl - Elegant Motion"
              required
            />
          </div>
          <div>
            <label style={styles.fieldLabel}>Status</label>
            <div style={styles.radioGroup}>
              <label style={styles.radioLabel}>
                <input 
                  type="radio" 
                  checked={status === 'published'} 
                  onChange={() => setStatus('published')} 
                  style={styles.radio} 
                />
                Published
              </label>
              <label style={styles.radioLabel}>
                <input 
                  type="radio" 
                  checked={status === 'hidden'} 
                  onChange={() => setStatus('hidden')} 
                  style={styles.radio} 
                />
                Hidden
              </label>
            </div>
          </div>
        </div>

        {/* Multi-Select Category Fields */}
        <div style={styles.grid3}>
          <div>
            <label style={styles.fieldLabel}>Subjects <span style={{ color: '#ef4444' }}>*</span></label>
            <div style={styles.checkboxList}>
              {SUBJECTS.map(sub => (
                <label key={sub} style={styles.checkboxLabel}>
                  <input 
                    type="checkbox" 
                    checked={subjects.includes(sub)} 
                    onChange={() => handleMultiSelect(sub, subjects, setSubjects)} 
                    style={styles.checkbox} 
                  />
                  {sub}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label style={styles.fieldLabel}>Shoot Types</label>
            <div style={styles.checkboxList}>
              {SHOOT_TYPES.map(type => (
                <label key={type} style={styles.checkboxLabel}>
                  <input 
                    type="checkbox" 
                    checked={shootTypes.includes(type)} 
                    onChange={() => handleMultiSelect(type, shootTypes, setShootTypes)} 
                    style={styles.checkbox} 
                  />
                  {type}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label style={styles.fieldLabel}>Events <span style={{ color: '#ef4444' }}>*</span></label>
            <div style={styles.checkboxList}>
              {EVENTS.map(ev => (
                <label key={ev} style={styles.checkboxLabel}>
                  <input 
                    type="checkbox" 
                    checked={events.includes(ev)} 
                    onChange={() => handleMultiSelect(ev, events, setEvents)} 
                    style={styles.checkbox} 
                  />
                  {ev}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Details & Tags */}
        <div style={styles.grid3}>
          <div>
            <label style={styles.fieldLabel}>Mood</label>
            <select 
              value={mood} 
              onChange={e => setMood(e.target.value)} 
              style={styles.select}
            >
              <option value="">Select Mood</option>
              {MOODS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={styles.fieldLabel}>Style (Optional)</label>
            <input 
              type="text" 
              value={style} 
              onChange={e => setStyle(e.target.value)} 
              placeholder="e.g. Royal / Vintage"
              style={styles.input} 
            />
          </div>
          <div>
            <label style={styles.fieldLabel}>Location (Optional)</label>
            <input 
              type="text" 
              value={location} 
              onChange={e => setLocation(e.target.value)} 
              placeholder="e.g. Indoor / Garden"
              style={styles.input} 
            />
          </div>
        </div>

        {/* Comma Separated Tags */}
        <div>
          <label style={styles.fieldLabel}>Tags (type words, press comma or space to add)</label>
          <input 
            type="text" 
            value={tags}
            onChange={handleTagInput}
            style={styles.input} 
            placeholder="e.g. dupatta, jewelry, regal"
          />
          {tagList.length > 0 && (
            <div style={styles.tagWrap}>
              {tagList.map((tag, idx) => (
                <span key={tag} style={styles.tagBadge}>
                  #{tag}
                  <button type="button" onClick={() => removeTag(idx)} style={styles.removeTagBtn}>
                    <XIcon />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div>
          <label style={styles.fieldLabel}>Instructions / Posing Directives <span style={{ color: '#ef4444' }}>*</span></label>
          <textarea 
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            style={styles.textarea}
            placeholder="Provide clear steps for the photographer and subjects to recreate this pose..."
            required
          />
        </div>

        {/* Tech Details & Notes */}
        <div style={styles.grid2}>
          <div>
            <label style={styles.fieldLabel}>Camera / Lens Recommendation (Optional)</label>
            <input 
              type="text" 
              value={camera} 
              onChange={e => setCamera(e.target.value)} 
              placeholder="e.g. 85mm f/1.4 prime lens"
              style={styles.input} 
            />
          </div>
          <div>
            <label style={styles.fieldLabel}>Internal Admin Notes (Optional)</label>
            <input 
              type="text"
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
              placeholder="e.g. Ideal for outdoor bright sunlight"
              style={styles.input}
            />
          </div>
        </div>

        {/* Buttons */}
        <div style={styles.actionsFooter}>
          <button 
            type="button" 
            onClick={() => router.back()} 
            style={styles.cancelBtn}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            style={styles.submitBtn}
          >
            Save Pose
          </button>
        </div>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#fff',
    maxWidth: '850px',
    margin: '0 auto',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#aaa',
    fontSize: '13px',
    cursor: 'pointer',
    padding: 0,
    display: 'inline-flex',
    alignItems: 'center',
    marginBottom: '12px',
    transition: 'color 0.2s',
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
  successBanner: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    color: '#10b981',
    border: '1px solid rgba(16,185,129,0.25)',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
  },
  formCard: {
    backgroundColor: '#111118',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  uploadArea: {
    border: '2px dashed',
    borderRadius: '8px',
    padding: '28px 16px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewContainer: {
    position: 'relative',
    width: '100%',
    maxHeight: '260px',
    overflow: 'hidden',
    borderRadius: '6px',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  uploadedPreview: {
    width: '100%',
    height: '240px',
    objectFit: 'cover',
    display: 'block',
  },
  removeImageBtn: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    backgroundColor: 'rgba(239,68,68,0.9)',
    color: '#fff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
  },
  fieldLabel: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    color: '#aaa',
    marginBottom: '8px',
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
    padding: '10px 12px',
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
    minHeight: '100px',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  radioGroup: {
    display: 'flex',
    gap: '20px',
    alignItems: 'center',
    height: '38px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#fff',
    fontSize: '13px',
    cursor: 'pointer',
  },
  radio: {
    accentColor: '#D4AF37',
    cursor: 'pointer',
  },
  checkboxList: {
    backgroundColor: '#0a0a0f',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '8px',
    padding: '12px',
    height: '140px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#aaa',
    fontSize: '13px',
    cursor: 'pointer',
  },
  checkbox: {
    accentColor: '#D4AF37',
    cursor: 'pointer',
  },
  tagWrap: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '10px',
  },
  tagBadge: {
    fontSize: '11px',
    backgroundColor: 'rgba(212,175,55,0.08)',
    color: '#D4AF37',
    border: '1px solid rgba(212,175,55,0.18)',
    borderRadius: '4px',
    padding: '3px 8px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
  removeTagBtn: {
    background: 'none',
    border: 'none',
    color: '#D4AF37',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
  },
  actionsFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '12px',
    paddingTop: '20px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
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
    transition: 'all 0.2s',
  },
  submitBtn: {
    backgroundColor: '#D4AF37',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 24px',
    color: '#000',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
};
