'use client';

import { useState } from 'react';
import { Category, Tag } from '@/lib/types';

// SVG Icons
const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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

const SaveIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const CancelIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const initialCategories: Category[] = [
  { id: '1', name: 'Bride', type: 'subject', created_at: new Date().toISOString() },
  { id: '2', name: 'Groom', type: 'subject', created_at: new Date().toISOString() },
  { id: '3', name: 'Couple', type: 'subject', created_at: new Date().toISOString() },
  { id: '3a', name: 'Sisters', type: 'subject', created_at: new Date().toISOString() },
  { id: '3b', name: 'Brothers', type: 'subject', created_at: new Date().toISOString() },
  { id: '3c', name: 'Old Age', type: 'subject', created_at: new Date().toISOString() },
  { id: '3d', name: 'Family', type: 'subject', created_at: new Date().toISOString() },
  { id: '3e', name: 'Friends', type: 'subject', created_at: new Date().toISOString() },
  { id: '4', name: 'Mehndi', type: 'event', created_at: new Date().toISOString() },
  { id: '5', name: 'Nikah', type: 'event', created_at: new Date().toISOString() },
  { id: '6', name: 'Barat', type: 'event', created_at: new Date().toISOString() },
  { id: '7', name: 'Walima', type: 'event', created_at: new Date().toISOString() },
  { id: '8', name: 'Portraits', type: 'shoot_type', created_at: new Date().toISOString() },
  { id: '9', name: 'Candid', type: 'shoot_type', created_at: new Date().toISOString() },
  { id: '10', name: 'Detail Shot', type: 'custom', created_at: new Date().toISOString() },
];

const initialTags: Tag[] = [
  { id: '1', name: 'classic', created_at: new Date().toISOString() },
  { id: '2', name: 'modern', created_at: new Date().toISOString() },
  { id: '3', name: 'fun', created_at: new Date().toISOString() },
  { id: '4', name: 'dramatic', created_at: new Date().toISOString() },
  { id: '5', name: 'emotional', created_at: new Date().toISOString() },
  { id: '6', name: 'twirl', created_at: new Date().toISOString() },
];

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [tags, setTags] = useState<Tag[]>(initialTags);

  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<Category['type']>('subject');
  const [newTagName, setNewTagName] = useState('');

  // Editing state
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [editingCatType, setEditingCatType] = useState<Category['type']>('subject');

  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState('');

  const addCategory = () => {
    if (newCatName.trim()) {
      const newCat: Category = {
        id: `cat_${Date.now()}`,
        name: newCatName.trim(),
        type: newCatType,
        created_at: new Date().toISOString(),
      };
      setCategories([newCat, ...categories]);
      setNewCatName('');
    }
  };

  const addTag = () => {
    if (newTagName.trim()) {
      const newTag: Tag = {
        id: `tag_${Date.now()}`,
        name: newTagName.trim().toLowerCase(),
        created_at: new Date().toISOString(),
      };
      setTags([newTag, ...tags]);
      setNewTagName('');
    }
  };

  const deleteCategory = (id: string) => {
    if (confirm('Delete category? This might affect existing poses.')) {
      setCategories(categories.filter(c => c.id !== id));
    }
  };

  const deleteTag = (id: string) => {
    if (confirm('Delete tag? This might affect existing poses.')) {
      setTags(tags.filter(t => t.id !== id));
    }
  };

  const startEditCategory = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditingCatName(cat.name);
    setEditingCatType(cat.type);
  };

  const saveCategoryEdit = () => {
    if (editingCatName.trim()) {
      setCategories(categories.map(c => 
        c.id === editingCatId ? { ...c, name: editingCatName.trim(), type: editingCatType } : c
      ));
      setEditingCatId(null);
    }
  };

  const startEditTag = (tag: Tag) => {
    setEditingTagId(tag.id);
    setEditingTagName(tag.name);
  };

  const saveTagEdit = () => {
    if (editingTagName.trim()) {
      setTags(tags.map(t => 
        t.id === editingTagId ? { ...t, name: editingTagName.trim().toLowerCase() } : t
      ));
      setEditingTagId(null);
    }
  };

  const getTypeStyle = (type: Category['type']): React.CSSProperties => {
    switch(type) {
      case 'subject': 
        return { backgroundColor: 'rgba(59,130,246,0.08)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.18)' };
      case 'event': 
        return { backgroundColor: 'rgba(124,58,237,0.08)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.18)' };
      case 'shoot_type': 
        return { backgroundColor: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.18)' };
      case 'style':
        return { backgroundColor: 'rgba(212,175,55,0.08)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.18)' };
      default: 
        return { backgroundColor: 'rgba(255,255,255,0.04)', color: '#aaa', border: '1px solid rgba(255,255,255,0.08)' };
    }
  };

  return (
    <div style={styles.page}>
      {/* Title */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={styles.title}>Categories & Tags</h1>
        <p style={styles.subtitle}>Manage categories, tag names, and content taxonomy used for poses and shot lists</p>
      </div>

      <div style={styles.columns}>
        
        {/* Categories Panel */}
        <div style={styles.card}>
          <h2 style={styles.cardHeader}>Categories</h2>
          <p style={styles.cardSubheader}>Group items by Event, Subject, style or Shoot Type</p>
          
          {/* Add Category Form */}
          <div style={styles.formRow}>
            <select 
              value={newCatType} 
              onChange={e => setNewCatType(e.target.value as any)}
              style={styles.selectType}
            >
              <option value="subject">Subject</option>
              <option value="event">Event</option>
              <option value="shoot_type">Shoot Type</option>
              <option value="style">Style</option>
              <option value="location">Location</option>
              <option value="custom">Custom</option>
            </select>
            <input 
              type="text" 
              value={newCatName} 
              onChange={e => setNewCatName(e.target.value)}
              placeholder="e.g. Pre-Wedding"
              style={styles.inputFlex}
            />
            <button onClick={addCategory} style={styles.plusBtn}>
              <PlusIcon />
            </button>
          </div>

          {/* List Categories */}
          <div style={styles.listContainer}>
            {categories.map(cat => (
              <div key={cat.id} style={styles.listItem}>
                {editingCatId === cat.id ? (
                  <div style={styles.inlineEdit}>
                    <select 
                      value={editingCatType} 
                      onChange={e => setEditingCatType(e.target.value as any)}
                      style={styles.editSelect}
                    >
                      <option value="subject">Subject</option>
                      <option value="event">Event</option>
                      <option value="shoot_type">Shoot Type</option>
                      <option value="style">Style</option>
                      <option value="location">Location</option>
                      <option value="custom">Custom</option>
                    </select>
                    <input 
                      type="text" 
                      value={editingCatName} 
                      onChange={e => setEditingCatName(e.target.value)}
                      style={styles.editInput}
                    />
                    <button onClick={saveCategoryEdit} style={styles.iconBtnGreen} title="Save">
                      <SaveIcon />
                    </button>
                    <button onClick={() => setEditingCatId(null)} style={styles.iconBtnGray} title="Cancel">
                      <CancelIcon />
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={styles.itemName}>{cat.name}</span>
                      <span style={{ ...styles.typeBadge, ...getTypeStyle(cat.type) }}>
                        {cat.type}
                      </span>
                    </div>
                    <div style={styles.actions}>
                      <button onClick={() => startEditCategory(cat)} style={styles.iconBtnBlue} title="Edit">
                        <EditIcon />
                      </button>
                      <button onClick={() => deleteCategory(cat.id)} style={styles.iconBtnRed} title="Delete">
                        <TrashIcon />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tags Panel */}
        <div style={styles.card}>
          <h2 style={styles.cardHeader}>Tags</h2>
          <p style={styles.cardSubheader}>Micro-details and keywords for precise pose searching</p>
          
          {/* Add Tag Form */}
          <div style={styles.formRow}>
            <input 
              type="text" 
              value={newTagName} 
              onChange={e => setNewTagName(e.target.value)}
              placeholder="e.g. golden-hour (lowercase)"
              style={styles.inputFlex}
            />
            <button onClick={addTag} style={styles.plusBtn}>
              <PlusIcon />
            </button>
          </div>

          {/* List Tags */}
          <div style={styles.tagsContainer}>
            {tags.map(tag => (
              <div key={tag.id} style={styles.tagItem}>
                {editingTagId === tag.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input 
                      type="text" 
                      value={editingTagName} 
                      onChange={e => setEditingTagName(e.target.value)}
                      style={{ ...styles.editInput, width: '90px', padding: '2px 6px', fontSize: '12px' }}
                    />
                    <button onClick={saveTagEdit} style={{ ...styles.iconBtnGreen, width: '20px', height: '20px' }}>
                      <SaveIcon />
                    </button>
                    <button onClick={() => setEditingTagId(null)} style={{ ...styles.iconBtnGray, width: '20px', height: '20px' }}>
                      <CancelIcon />
                    </button>
                  </div>
                ) : (
                  <>
                    <span style={styles.tagName}>#{tag.name}</span>
                    <div style={styles.tagActions}>
                      <button onClick={() => startEditTag(tag)} style={styles.tagActionBtnBlue}>
                        ✏️
                      </button>
                      <button onClick={() => deleteTag(tag.id)} style={styles.tagActionBtnRed}>
                        ✕
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
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
  columns: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
    gap: '24px',
  },
  card: {
    backgroundColor: '#111118',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '24px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
  },
  cardHeader: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#fff',
    margin: 0,
  },
  cardSubheader: {
    fontSize: '12px',
    color: '#666',
    margin: '4px 0 16px 0',
  },
  formRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
  },
  selectType: {
    backgroundColor: '#0a0a0f',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '8px 10px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
    width: '110px',
  },
  inputFlex: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '8px 12px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  plusBtn: {
    backgroundColor: '#D4AF37',
    color: '#000',
    border: 'none',
    borderRadius: '8px',
    width: '38px',
    height: '38px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxHeight: '520px',
    overflowY: 'auto',
    paddingRight: '4px',
  },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0a0a0f',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '8px',
    padding: '10px 14px',
  },
  itemName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#fff',
  },
  typeBadge: {
    fontSize: '10px',
    textTransform: 'uppercase',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: '700',
  },
  actions: {
    display: 'flex',
    gap: '6px',
  },
  iconBtnBlue: {
    backgroundColor: 'transparent',
    color: '#3b82f6',
    border: '1px solid rgba(59,130,246,0.12)',
    borderRadius: '6px',
    width: '26px',
    height: '26px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  iconBtnRed: {
    backgroundColor: 'transparent',
    color: '#ef4444',
    border: '1px solid rgba(239,68,68,0.12)',
    borderRadius: '6px',
    width: '26px',
    height: '26px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  iconBtnGreen: {
    backgroundColor: 'transparent',
    color: '#10b981',
    border: '1px solid rgba(16,185,129,0.2)',
    borderRadius: '6px',
    width: '26px',
    height: '26px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  iconBtnGray: {
    backgroundColor: 'transparent',
    color: '#aaa',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    width: '26px',
    height: '26px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  inlineEdit: {
    display: 'flex',
    gap: '6px',
    width: '100%',
  },
  editSelect: {
    backgroundColor: '#111118',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '6px',
    padding: '4px 6px',
    color: '#fff',
    fontSize: '12px',
    outline: 'none',
    width: '90px',
  },
  editInput: {
    flex: 1,
    backgroundColor: '#111118',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '6px',
    padding: '4px 8px',
    color: '#fff',
    fontSize: '12px',
    outline: 'none',
  },
  tagsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    maxHeight: '520px',
    overflowY: 'auto',
  },
  tagItem: {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: '#0a0a0f',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '6px',
    padding: '6px 10px',
    gap: '8px',
  },
  tagName: {
    fontSize: '12px',
    color: '#fff',
  },
  tagActions: {
    display: 'flex',
    gap: '4px',
    borderLeft: '1px solid rgba(255,255,255,0.08)',
    paddingLeft: '6px',
  },
  tagActionBtnBlue: {
    background: 'none',
    border: 'none',
    color: '#3b82f6',
    cursor: 'pointer',
    padding: 0,
    fontSize: '10px',
  },
  tagActionBtnRed: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    cursor: 'pointer',
    padding: 0,
    fontSize: '10px',
  },
};
