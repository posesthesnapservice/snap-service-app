'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SUBJECTS, EVENTS, SHOOT_TYPES, MOODS, getSubjectColor, getEventColor } from '@/lib/constants';
import { addPoseDB, addPosesBulkDB, uploadMediaToSupabase } from '@/lib/poses-db-helpers';
import { uploadMediaToCloudinary } from '@/lib/cloudinary';
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

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

export default function NewPose() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  // Tab mode: 'single' | 'bulk'
  const [mode, setMode] = useState<'single' | 'bulk'>('single');

  // Single pose state
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
  
  // Upload states
  const [uploading, setUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [saved, setSaved] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Bulk pose state
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkPreviews, setBulkPreviews] = useState<string[]>([]);
  const [bulkBaseTitle, setBulkBaseTitle] = useState('');
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, text: '' });

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

  // Real Image Upload (Single)
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
      // 1. Try Cloudinary
      let url = await uploadMediaToCloudinary(file);
      // 2. Fallback to Supabase if needed
      if (!url) {
        setUploadProgressText('Connecting to storage fallback...');
        url = await uploadMediaToSupabase(file, 'poses');
      }

      if (url) {
        setImageUrl(url);
        // Pre-fill title if empty
        if (!title) {
          const autoName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
          setTitle(autoName.charAt(0).toUpperCase() + autoName.slice(1));
        }
      } else {
        alert('Upload failed. Please check internet connection or Cloudinary configuration.');
      }
    } catch (err: any) {
      console.error('File upload error:', err);
      alert('Upload failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setUploading(false);
      setUploadProgressText('');
    }
  };

  // Bulk Files Selection
  const handleBulkFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    Array.from(files).forEach(f => {
      if (f.type.startsWith('image/')) {
        newFiles.push(f);
        newPreviews.push(URL.createObjectURL(f));
      }
    });

    setBulkFiles(prev => [...prev, ...newFiles]);
    setBulkPreviews(prev => [...prev, ...newPreviews]);

    if (!bulkBaseTitle && newFiles.length > 0) {
      const sample = newFiles[0].name.replace(/\.[^/.]+$/, '').replace(/[-_0-9]/g, ' ').trim();
      if (sample) setBulkBaseTitle(sample.charAt(0).toUpperCase() + sample.slice(1));
    }
  };

  const removeBulkFile = (index: number) => {
    setBulkFiles(prev => prev.filter((_, i) => i !== index));
    setBulkPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Single Save
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return alert('Pose Title is required');
    if (subjects.length === 0) return alert('Please select at least one Subject');
    if (events.length === 0) return alert('Please select at least one Event');
    if (!imageUrl) return alert('Please upload an image for the pose');
    
    const newPose: Pose = {
      id: `p_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      title: title.trim(),
      image_url: imageUrl,
      instructions: instructions.trim(), // Optional!
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

  // Bulk Upload & Save
  const handleBulkSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkFiles.length === 0) return alert('Please select at least one image file to upload.');
    if (subjects.length === 0) return alert('Please select at least one Subject.');
    if (events.length === 0) return alert('Please select at least one Event.');

    setBulkUploading(true);
    const createdPoses: Pose[] = [];
    const total = bulkFiles.length;

    for (let i = 0; i < total; i++) {
      const file = bulkFiles[i];
      setBulkProgress({
        current: i + 1,
        total,
        text: `Uploading image ${i + 1} of ${total} to Cloud... (${Math.round(((i) / total) * 100)}%)`
      });

      try {
        let uploadedUrl = await uploadMediaToCloudinary(file);
        if (!uploadedUrl) {
          uploadedUrl = await uploadMediaToSupabase(file, 'poses');
        }

        if (uploadedUrl) {
          const autoTitle = bulkBaseTitle.trim() 
            ? `${bulkBaseTitle.trim()} ${i + 1}`
            : file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

          createdPoses.push({
            id: `p_${Date.now()}_${i}_${Math.random().toString(36).substring(5)}`,
            title: autoTitle.charAt(0).toUpperCase() + autoTitle.slice(1),
            image_url: uploadedUrl,
            instructions: instructions.trim(),
            status,
            subjects,
            shoot_types: shootTypes,
            events,
            tags: tagList,
            mood: mood || undefined,
            style: style || undefined,
            location: location || undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error(`Failed to upload file ${file.name}:`, err);
      }
    }

    if (createdPoses.length > 0) {
      addPosesBulkDB(createdPoses);
      setBulkProgress({
        current: total,
        total,
        text: `✅ Successfully created ${createdPoses.length} poses!`
      });
      setSaved(true);
      setTimeout(() => {
        router.push('/admin/poses');
      }, 1500);
    } else {
      alert('Upload failed for all selected images. Please verify your connection.');
      setBulkUploading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Hidden File Inputs */}
      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*" 
        style={{ display: 'none' }}
        onChange={(e) => handleFileSelect(e.target.files)} 
      />
      <input 
        type="file" 
        ref={bulkFileInputRef} 
        accept="image/*" 
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleBulkFileSelect(e.target.files)} 
      />

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <button onClick={() => router.back()} style={styles.backBtn}>
          <ArrowLeftIcon /> Back to Poses
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={styles.title}>Add New Pose</h1>
            <p style={styles.subtitle}>Upload photography reference poses, capture details, styles, and tags</p>
          </div>
          {/* Mode Switcher Tabs */}
          <div style={styles.modeTabs}>
            <button
              type="button"
              onClick={() => setMode('single')}
              style={{
                ...styles.modeTab,
                backgroundColor: mode === 'single' ? '#D4AF37' : 'transparent',
                color: mode === 'single' ? '#000' : '#aaa',
                fontWeight: mode === 'single' ? '700' : '500',
              }}
            >
              Single Pose Upload
            </button>
            <button
              type="button"
              onClick={() => setMode('bulk')}
              style={{
                ...styles.modeTab,
                backgroundColor: mode === 'bulk' ? '#D4AF37' : 'transparent',
                color: mode === 'bulk' ? '#000' : '#aaa',
                fontWeight: mode === 'bulk' ? '700' : '500',
              }}
            >
              ⚡ Bulk Upload Multiple Poses
            </button>
          </div>
        </div>
      </div>

      {saved && (
        <div style={styles.successBanner}>
          <span style={{ fontSize: '18px', marginRight: '8px' }}>✓</span>
          {mode === 'single' 
            ? 'Pose saved successfully! Redirecting back to management panel...' 
            : `All ${bulkFiles.length} poses saved successfully! Redirecting...`}
        </div>
      )}

      {/* SINGLE POSE FORM */}
      {mode === 'single' && (
        <form onSubmit={handleSave} style={styles.formCard}>
          {/* Real Image Upload Area */}
          <div>
            <label style={styles.fieldLabel}>Pose Reference Image <span style={{ color: '#ef4444' }}>*</span></label>
            <div 
              onClick={() => !uploading && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { 
                e.preventDefault(); 
                setIsDragging(false); 
                if (!uploading && e.dataTransfer.files) handleFileSelect(e.dataTransfer.files); 
              }}
              style={{
                ...styles.uploadArea,
                borderColor: isDragging || imageUrl ? '#D4AF37' : 'rgba(255,255,255,0.15)',
                backgroundColor: isDragging ? 'rgba(212,175,55,0.06)' : '#0a0a0f',
              }}
            >
              {uploading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <div style={styles.spinner}></div>
                  <p style={{ margin: '12px 0 0 0', fontSize: '13px', color: '#D4AF37', fontWeight: '600' }}>
                    {uploadProgressText || 'Uploading to Cloud...'}
                  </p>
                </div>
              ) : imageUrl ? (
                <div style={styles.previewContainer}>
                  <img src={imageUrl} alt="Pose preview" style={styles.uploadedPreview} />
                  <div style={styles.previewOverlay}>
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                      style={styles.changeImageBtn}
                    >
                      Change Photo
                    </button>
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); setImageUrl(''); }} 
                      style={styles.removeImageBtn}
                    >
                      <XIcon /> Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px' }}>
                  <CameraIcon />
                  <p style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#fff', fontWeight: '600' }}>
                    Click to browse or Drag & Drop photo
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>
                    Supports high-resolution JPEG, PNG, WEBP (Uploaded directly to Cloudinary)
                  </p>
                </div>
              )}
            </div>
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

          {/* SUBJECTS WITH VIBRANT COLORS */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={styles.fieldLabel}>Subjects <span style={{ color: '#ef4444' }}>*</span> (Color Badges)</label>
              <span style={{ fontSize: '11px', color: '#888' }}>Select all that apply</span>
            </div>
            <div style={styles.chipGrid}>
              {SUBJECTS.map(sub => {
                const isSelected = subjects.includes(sub);
                const color = getSubjectColor(sub);
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => handleMultiSelect(sub, subjects, setSubjects)}
                    style={{
                      ...styles.chipButton,
                      backgroundColor: isSelected ? color.bg : 'rgba(255,255,255,0.03)',
                      color: isSelected ? color.text : '#888',
                      borderColor: isSelected ? color.border : 'rgba(255,255,255,0.1)',
                      boxShadow: isSelected ? `0 0 10px ${color.bg}` : 'none',
                    }}
                  >
                    {isSelected && <CheckIcon />}
                    <span style={{ fontWeight: isSelected ? '700' : '500' }}>{sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* EVENTS WITH VIBRANT COLORS */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={styles.fieldLabel}>Events <span style={{ color: '#ef4444' }}>*</span> (Color Badges)</label>
              <span style={{ fontSize: '11px', color: '#888' }}>Select wedding events</span>
            </div>
            <div style={styles.chipGrid}>
              {EVENTS.map(ev => {
                const isSelected = events.includes(ev);
                const color = getEventColor(ev);
                return (
                  <button
                    key={ev}
                    type="button"
                    onClick={() => handleMultiSelect(ev, events, setEvents)}
                    style={{
                      ...styles.chipButton,
                      backgroundColor: isSelected ? color.bg : 'rgba(255,255,255,0.03)',
                      color: isSelected ? color.text : '#888',
                      borderColor: isSelected ? color.border : 'rgba(255,255,255,0.1)',
                      boxShadow: isSelected ? `0 0 10px ${color.bg}` : 'none',
                    }}
                  >
                    {isSelected && <CheckIcon />}
                    <span style={{ fontWeight: isSelected ? '700' : '500' }}>{ev}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Shoot Types */}
          <div>
            <label style={styles.fieldLabel}>Shoot Types (Framing & Posing Type)</label>
            <div style={styles.chipGrid}>
              {SHOOT_TYPES.map(type => {
                const isSelected = shootTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleMultiSelect(type, shootTypes, setShootTypes)}
                    style={{
                      ...styles.chipButton,
                      backgroundColor: isSelected ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.03)',
                      color: isSelected ? '#D4AF37' : '#888',
                      borderColor: isSelected ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    {isSelected && <CheckIcon />}
                    <span>{type}</span>
                  </button>
                );
              })}
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
              placeholder="e.g. dupatta, jewelry, candid, royal"
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

          {/* Instructions (NOW OPTIONAL!) */}
          <div>
            <label style={styles.fieldLabel}>
              Instructions / Posing Directives <span style={{ color: '#888', fontWeight: 'normal' }}>(Optional)</span>
            </label>
            <textarea 
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              style={styles.textarea}
              placeholder="Provide clear steps for the photographer and subjects to recreate this pose (or leave blank)..."
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
              disabled={uploading}
              style={{
                ...styles.submitBtn,
                opacity: uploading ? 0.6 : 1,
                cursor: uploading ? 'not-allowed' : 'pointer'
              }}
            >
              {uploading ? 'Uploading Photo...' : 'Save Pose'}
            </button>
          </div>
        </form>
      )}

      {/* ⚡ BULK UPLOAD MULTIPLE POSES FORM */}
      {mode === 'bulk' && (
        <form onSubmit={handleBulkSave} style={styles.formCard}>
          <div style={styles.bulkNotice}>
            <div style={{ fontSize: '20px', marginRight: '10px' }}>⚡</div>
            <div>
              <div style={{ fontWeight: '700', color: '#D4AF37', fontSize: '14px' }}>
                Bulk Pose Creator
              </div>
              <div style={{ color: '#aaa', fontSize: '12px', marginTop: '2px' }}>
                Select multiple wedding photos at once. They will all be uploaded to Cloudinary, and separate poses will be created for each photo automatically!
              </div>
            </div>
          </div>

          {/* Multiple File Picker Area */}
          <div>
            <label style={styles.fieldLabel}>
              Select Multiple Pose Photos <span style={{ color: '#ef4444' }}>*</span> ({bulkFiles.length} selected)
            </label>
            <div 
              onClick={() => !bulkUploading && bulkFileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { 
                e.preventDefault(); 
                setIsDragging(false); 
                if (!bulkUploading && e.dataTransfer.files) handleBulkFileSelect(e.dataTransfer.files); 
              }}
              style={{
                ...styles.uploadArea,
                borderColor: isDragging || bulkFiles.length > 0 ? '#D4AF37' : 'rgba(255,255,255,0.15)',
                backgroundColor: isDragging ? 'rgba(212,175,55,0.06)' : '#0a0a0f',
                minHeight: '140px',
              }}
            >
              <div style={{ textAlign: 'center', padding: '16px' }}>
                <CameraIcon />
                <p style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#fff', fontWeight: '700' }}>
                  Click to Choose Multiple Photos (or Drag & Drop Folder)
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>
                  Select 5, 10, 20 or more images at once (JPEG, PNG, WEBP)
                </p>
              </div>
            </div>
          </div>

          {/* Selected Photos Thumbnails Grid */}
          {bulkPreviews.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={styles.fieldLabel}>Selected Images ({bulkPreviews.length})</label>
                <button 
                  type="button" 
                  onClick={() => { setBulkFiles([]); setBulkPreviews([]); }}
                  style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Clear All
                </button>
              </div>
              <div style={styles.bulkThumbnailsGrid}>
                {bulkPreviews.map((previewUrl, idx) => (
                  <div key={idx} style={styles.bulkThumbContainer}>
                    <img src={previewUrl} alt={`Selected ${idx}`} style={styles.bulkThumbImage} />
                    <button 
                      type="button" 
                      onClick={() => removeBulkFile(idx)}
                      style={styles.bulkThumbRemove}
                      title="Remove image"
                    >
                      <XIcon />
                    </button>
                    <div style={styles.bulkThumbNumber}>#{idx + 1}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Common Base Title */}
          <div style={styles.grid2}>
            <div>
              <label style={styles.fieldLabel}>Base Title Prefix (Optional)</label>
              <input 
                type="text" 
                value={bulkBaseTitle}
                onChange={e => setBulkBaseTitle(e.target.value)}
                style={styles.input} 
                placeholder="e.g. Bridal Mehndi Poses (will auto-number 1, 2, 3...)"
              />
            </div>
            <div>
              <label style={styles.fieldLabel}>Status For All Poses</label>
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

          {/* SUBJECTS WITH VIBRANT COLORS (BULK) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={styles.fieldLabel}>Apply Subjects <span style={{ color: '#ef4444' }}>*</span> (Color Badges)</label>
              <span style={{ fontSize: '11px', color: '#888' }}>Will be assigned to all {bulkFiles.length || 0} poses</span>
            </div>
            <div style={styles.chipGrid}>
              {SUBJECTS.map(sub => {
                const isSelected = subjects.includes(sub);
                const color = getSubjectColor(sub);
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => handleMultiSelect(sub, subjects, setSubjects)}
                    style={{
                      ...styles.chipButton,
                      backgroundColor: isSelected ? color.bg : 'rgba(255,255,255,0.03)',
                      color: isSelected ? color.text : '#888',
                      borderColor: isSelected ? color.border : 'rgba(255,255,255,0.1)',
                      boxShadow: isSelected ? `0 0 10px ${color.bg}` : 'none',
                    }}
                  >
                    {isSelected && <CheckIcon />}
                    <span style={{ fontWeight: isSelected ? '700' : '500' }}>{sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* EVENTS WITH VIBRANT COLORS (BULK) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={styles.fieldLabel}>Apply Events <span style={{ color: '#ef4444' }}>*</span> (Color Badges)</label>
              <span style={{ fontSize: '11px', color: '#888' }}>Will be assigned to all {bulkFiles.length || 0} poses</span>
            </div>
            <div style={styles.chipGrid}>
              {EVENTS.map(ev => {
                const isSelected = events.includes(ev);
                const color = getEventColor(ev);
                return (
                  <button
                    key={ev}
                    type="button"
                    onClick={() => handleMultiSelect(ev, events, setEvents)}
                    style={{
                      ...styles.chipButton,
                      backgroundColor: isSelected ? color.bg : 'rgba(255,255,255,0.03)',
                      color: isSelected ? color.text : '#888',
                      borderColor: isSelected ? color.border : 'rgba(255,255,255,0.1)',
                      boxShadow: isSelected ? `0 0 10px ${color.bg}` : 'none',
                    }}
                  >
                    {isSelected && <CheckIcon />}
                    <span style={{ fontWeight: isSelected ? '700' : '500' }}>{ev}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Shoot Types (BULK) */}
          <div>
            <label style={styles.fieldLabel}>Shoot Types (Optional)</label>
            <div style={styles.chipGrid}>
              {SHOOT_TYPES.map(type => {
                const isSelected = shootTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleMultiSelect(type, shootTypes, setShootTypes)}
                    style={{
                      ...styles.chipButton,
                      backgroundColor: isSelected ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.03)',
                      color: isSelected ? '#D4AF37' : '#888',
                      borderColor: isSelected ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    {isSelected && <CheckIcon />}
                    <span>{type}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Instructions for Bulk */}
          <div>
            <label style={styles.fieldLabel}>
              Common Instructions / Notes <span style={{ color: '#888', fontWeight: 'normal' }}>(Optional)</span>
            </label>
            <textarea 
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              style={styles.textarea}
              placeholder="Provide common instructions for this set of poses (optional)..."
            />
          </div>

          {/* Bulk Upload Progress Box */}
          {bulkUploading && (
            <div style={styles.progressBox}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: '#D4AF37', fontWeight: '700' }}>{bulkProgress.text}</span>
                <span style={{ color: '#aaa' }}>{bulkProgress.current} / {bulkProgress.total}</span>
              </div>
              <div style={styles.progressBarTrack}>
                <div 
                  style={{
                    ...styles.progressBarFill,
                    width: `${bulkProgress.total > 0 ? (bulkProgress.current / bulkProgress.total) * 100 : 0}%`
                  }}
                />
              </div>
            </div>
          )}

          {/* Footer Submit Button */}
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
              disabled={bulkUploading || bulkFiles.length === 0}
              style={{
                ...styles.submitBtn,
                opacity: bulkUploading || bulkFiles.length === 0 ? 0.6 : 1,
                cursor: bulkUploading || bulkFiles.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              {bulkUploading 
                ? `Uploading ${bulkProgress.current}/${bulkProgress.total}...` 
                : `⚡ Upload & Create ${bulkFiles.length} Poses`}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#fff',
    maxWidth: '920px',
    margin: '0 auto',
    paddingBottom: '60px',
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
    fontSize: '26px',
    fontWeight: '800',
    color: '#fff',
    margin: 0,
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '13px',
    color: '#aaa',
    margin: '4px 0 0 0',
  },
  modeTabs: {
    display: 'flex',
    backgroundColor: '#0a0a0f',
    padding: '4px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.08)',
    gap: '4px',
  },
  modeTab: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  successBanner: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    color: '#34d399',
    border: '1px solid rgba(16,185,129,0.3)',
    borderRadius: '10px',
    padding: '14px 18px',
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
  },
  bulkNotice: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgba(212,175,55,0.06)',
    border: '1px solid rgba(212,175,55,0.25)',
    borderRadius: '10px',
    padding: '12px 16px',
  },
  formCard: {
    backgroundColor: '#111118',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px',
    padding: '28px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
  },
  uploadArea: {
    border: '2px dashed',
    borderRadius: '12px',
    padding: '24px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewContainer: {
    position: 'relative',
    width: '100%',
    maxHeight: '340px',
    overflow: 'hidden',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  uploadedPreview: {
    width: '100%',
    height: '320px',
    objectFit: 'cover',
    display: 'block',
  },
  previewOverlay: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    display: 'flex',
    gap: '8px',
  },
  changeImageBtn: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    color: '#D4AF37',
    border: '1px solid rgba(212,175,55,0.4)',
    padding: '7px 14px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    backdropFilter: 'blur(8px)',
  },
  removeImageBtn: {
    backgroundColor: 'rgba(239,68,68,0.9)',
    color: '#fff',
    border: 'none',
    padding: '7px 14px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid rgba(212,175,55,0.2)',
    borderTopColor: '#D4AF37',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto',
  },
  bulkThumbnailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
    gap: '12px',
    maxHeight: '280px',
    overflowY: 'auto',
    padding: '10px',
    backgroundColor: '#0a0a0f',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  bulkThumbContainer: {
    position: 'relative',
    height: '110px',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.12)',
  },
  bulkThumbImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  bulkThumbRemove: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    backgroundColor: 'rgba(239,68,68,0.9)',
    color: '#fff',
    border: 'none',
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
  },
  bulkThumbNumber: {
    position: 'absolute',
    bottom: '4px',
    left: '4px',
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#D4AF37',
    fontSize: '10px',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  chipGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  chipButton: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '8px 14px',
    borderRadius: '8px',
    border: '1px solid',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
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
    fontWeight: '700',
    color: '#aaa',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
  },
  input: {
    width: '100%',
    backgroundColor: '#0a0a0f',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px',
    padding: '11px 14px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  select: {
    width: '100%',
    backgroundColor: '#0a0a0f',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
    height: '42px',
  },
  textarea: {
    width: '100%',
    backgroundColor: '#0a0a0f',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px',
    padding: '12px 14px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
    minHeight: '85px',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  radioGroup: {
    display: 'flex',
    gap: '20px',
    alignItems: 'center',
    height: '42px',
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
  tagWrap: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '10px',
  },
  tagBadge: {
    fontSize: '12px',
    backgroundColor: 'rgba(212,175,55,0.1)',
    color: '#D4AF37',
    border: '1px solid rgba(212,175,55,0.25)',
    borderRadius: '6px',
    padding: '4px 10px',
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
  progressBox: {
    backgroundColor: '#0a0a0f',
    border: '1px solid rgba(212,175,55,0.3)',
    borderRadius: '10px',
    padding: '16px',
  },
  progressBarTrack: {
    width: '100%',
    height: '8px',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#D4AF37',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
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
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '11px 22px',
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
    padding: '11px 28px',
    color: '#000',
    fontSize: '13px',
    fontWeight: '800',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 14px rgba(212,175,55,0.25)',
  },
};
