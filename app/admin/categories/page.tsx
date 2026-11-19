'use client';

import { useState, useEffect, useRef } from 'react';
import { Category, Tag } from '@/lib/types';
import { 
  getCategoriesDB, 
  addCategoryDB, 
  updateCategoryDB, 
  deleteCategoryDB,
  getTagsDB,
  addTagDB,
  updateTagDB,
  deleteTagDB,
  fetchCategoriesCloud,
  fetchTagsCloud
} from '@/lib/categories-db-helpers';

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

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  // Form Inputs
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<Category['type']>('subject');
  const [newTagName, setNewTagName] = useState('');

  // Editing state
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [editingCatType, setEditingCatType] = useState<Category['type']>('subject');

  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState('');

  // UX Feedback
  const [toastMsg, setToastMsg] = useState('');
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState<string>('all');
  const [catSearch, setCatSearch] = useState('');
  const [tagSearch, setTagSearch] = useState('');

  const catListRef = useRef<HTMLDivElement>(null);
  const tagListRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  useEffect(() => {
    const localCats = getCategoriesDB();
    const localTags = getTagsDB();
    setCategories(localCats);
    setTags(localTags);

    fetchCategoriesCloud().then(c => {
      if (c && c.length > 0) setCategories(c);
    });
    fetchTagsCloud().then(t => {
      if (t && t.length > 0) setTags(t);
    });
  }, []);

  const addCategory = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newCatName.trim();
    if (!name) return;

    // Check duplicate
    const duplicate = categories.some(
      c => c.name.toLowerCase() === name.toLowerCase() && c.type === newCatType
    );
    if (duplicate) {
      alert(`Category "${name}" (${newCatType}) already exists.`);
      return;
    }

    const newCat: Category = {
      id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      type: newCatType,
      created_at: new Date().toISOString(),
    };

    const updated = addCategoryDB(newCat);
    setCategories(updated);
    setNewCatName('');
    setRecentlyAddedId(newCat.id);
    showToast(`✓ Category "${name}" added successfully!`);

    // Scroll to top so the newly added item is immediately visible
    setTimeout(() => {
      catListRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);

    setTimeout(() => {
      setRecentlyAddedId(null);
    }, 2500);
  };

  const addTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newTagName.trim().toLowerCase().replace(/^#/, '');
    if (!name) return;

    const duplicate = tags.some(t => t.name.toLowerCase() === name.toLowerCase());
    if (duplicate) {
      alert(`Tag "#${name}" already exists.`);
      return;
    }

    const newTag: Tag = {
      id: `tag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      created_at: new Date().toISOString(),
    };

    const updated = addTagDB(newTag);
    setTags(updated);
    setNewTagName('');
    showToast(`✓ Tag "#${name}" added successfully!`);

    setTimeout(() => {
      tagListRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  const deleteCategory = (id: string, name: string) => {
    if (confirm(`Delete category "${name}"?`)) {
      const updated = deleteCategoryDB(id);
      setCategories(updated);
      showToast(`Category "${name}" deleted.`);
    }
  };

  const deleteTag = (id: string, name: string) => {
    if (confirm(`Delete tag "#${name}"?`)) {
      const updated = deleteTagDB(id);
      setTags(updated);
      showToast(`Tag "#${name}" deleted.`);
    }
  };

  const startEditCategory = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditingCatName(cat.name);
    setEditingCatType(cat.type);
  };

  const saveCategoryEdit = () => {
    if (editingCatId && editingCatName.trim()) {
      const updated = updateCategoryDB(editingCatId, editingCatName, editingCatType);
      setCategories(updated);
      setEditingCatId(null);
      showToast('✓ Category updated successfully!');
    }
  };

  const startEditTag = (tag: Tag) => {
    setEditingTagId(tag.id);
    setEditingTagName(tag.name);
  };

  const saveTagEdit = () => {
    if (editingTagId && editingTagName.trim()) {
      const updated = updateTagDB(editingTagId, editingTagName);
      setTags(updated);
      setEditingTagId(null);
      showToast('✓ Tag updated successfully!');
    }
  };

  const getTypeStyle = (type: Category['type']): React.CSSProperties => {
    switch(type) {
      case 'subject': 
        return { backgroundColor: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' };
      case 'event': 
        return { backgroundColor: 'rgba(168,85,247,0.12)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.3)' };
      case 'shoot_type': 
        return { backgroundColor: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' };
      case 'style':
        return { backgroundColor: 'rgba(212,175,55,0.12)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' };
      default: 
        return { backgroundColor: 'rgba(255,255,255,0.06)', color: '#aaa', border: '1px solid rgba(255,255,255,0.12)' };
    }
  };

  // Filtered lists
  const filteredCategories = categories.filter(cat => {
    if (catFilter !== 'all' && cat.type !== catFilter) return false;
    if (catSearch && !cat.name.toLowerCase().includes(catSearch.toLowerCase())) return false;
    return true;
  });

  const filteredTags = tags.filter(tag => {
    if (tagSearch && !tag.name.toLowerCase().includes(tagSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={styles.page}>
      
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', backgroundColor: '#D4AF37', color: '#000', padding: '12px 20px', borderRadius: '10px', fontWeight: 'bold', fontSize: '13px', zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
          {toastMsg}
        </div>
      )}

      {/* Title */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={styles.title}>Categories & Tags</h1>
        <p style={styles.subtitle}>Manage categories, tag names, and content taxonomy used for poses and shot lists</p>
      </div>

      <div style={styles.columns}>
        
        {/* Categories Panel */}
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <h2 style={styles.cardHeader}>Categories ({filteredCategories.length})</h2>
          </div>
          <p style={styles.cardSubheader}>Group items by Event, Subject, style or Shoot Type</p>
          
          {/* Add Category Form (Enter Key Works) */}
          <form onSubmit={addCategory} style={styles.formRow}>
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
              placeholder="e.g. Pre-Wedding (Press Enter to Add)"
              style={styles.inputFlex}
            />
            <button type="submit" style={styles.plusBtn} title="Add Category">
              <PlusIcon />
            </button>
          </form>

          {/* Quick Filter Tabs */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', overflowX: 'auto', paddingBottom: '4px' }}>
            {['all', 'subject', 'event', 'shoot_type', 'style', 'custom'].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setCatFilter(type)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: catFilter === type ? '1px solid #D4AF37' : '1px solid rgba(255,255,255,0.08)',
                  backgroundColor: catFilter === type ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.03)',
                  color: catFilter === type ? '#D4AF37' : '#888',
                  fontSize: '11px',
                  fontWeight: '600',
                  textTransform: 'capitalize',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {type === 'all' ? 'All Types' : type.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Search within Categories */}
          <div style={{ marginBottom: '12px' }}>
            <input
              type="text"
              value={catSearch}
              onChange={e => setCatSearch(e.target.value)}
              placeholder="🔍 Search categories..."
              style={{
                width: '100%',
                backgroundColor: '#0a0a0f',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                padding: '7px 12px',
                color: '#fff',
                fontSize: '12px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* List Categories */}
          <div ref={catListRef} style={styles.listContainer}>
            {filteredCategories.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#666', fontSize: '13px' }}>
                No categories found. Use the box above to add one.
              </div>
            ) : (
              filteredCategories.map(cat => {
                const isRecentlyAdded = recentlyAddedId === cat.id;
                return (
                  <div 
                    key={cat.id} 
                    style={{
                      ...styles.listItem,
                      border: isRecentlyAdded ? '1px solid #D4AF37' : '1px solid rgba(255,255,255,0.06)',
                      backgroundColor: isRecentlyAdded ? 'rgba(212,175,55,0.1)' : '#0a0a0f',
                      transition: 'all 0.3s ease'
                    }}
                  >
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
                          onKeyDown={e => { if (e.key === 'Enter') saveCategoryEdit(); }}
                          style={styles.editInput}
                          autoFocus
                        />
                        <button type="button" onClick={saveCategoryEdit} style={styles.iconBtnGreen} title="Save">
                          <SaveIcon />
                        </button>
                        <button type="button" onClick={() => setEditingCatId(null)} style={styles.iconBtnGray} title="Cancel">
                          <CancelIcon />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={styles.itemName}>{cat.name}</span>
                          <span style={{ ...styles.typeBadge, ...getTypeStyle(cat.type) }}>
                            {cat.type.replace('_', ' ')}
                          </span>
                          {isRecentlyAdded && (
                            <span style={{ fontSize: '10px', color: '#D4AF37', fontWeight: 'bold' }}>✓ Just Added</span>
                          )}
                        </div>
                        <div style={styles.actions}>
                          <button type="button" onClick={() => startEditCategory(cat)} style={styles.iconBtnBlue} title="Edit">
                            <EditIcon />
                          </button>
                          <button type="button" onClick={() => deleteCategory(cat.id, cat.name)} style={styles.iconBtnRed} title="Delete">
                            <TrashIcon />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Tags Panel */}
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <h2 style={styles.cardHeader}>Tags ({filteredTags.length})</h2>
          </div>
          <p style={styles.cardSubheader}>Micro-details and keywords for precise pose searching</p>
          
          {/* Add Tag Form (Enter Key Works) */}
          <form onSubmit={addTag} style={styles.formRow}>
            <input 
              type="text" 
              value={newTagName} 
              onChange={e => setNewTagName(e.target.value)}
              placeholder="e.g. golden-hour (Press Enter to Add)"
              style={styles.inputFlex}
            />
            <button type="submit" style={styles.plusBtn} title="Add Tag">
              <PlusIcon />
            </button>
          </form>

          {/* Search within Tags */}
          <div style={{ marginBottom: '12px' }}>
            <input
              type="text"
              value={tagSearch}
              onChange={e => setTagSearch(e.target.value)}
              placeholder="🔍 Search tags..."
              style={{
                width: '100%',
                backgroundColor: '#0a0a0f',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                padding: '7px 12px',
                color: '#fff',
                fontSize: '12px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* List Tags */}
          <div ref={tagListRef} style={styles.listContainer}>
            {filteredTags.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#666', fontSize: '13px' }}>
                No tags found. Use the box above to add one.
              </div>
            ) : (
              filteredTags.map(tag => (
                <div key={tag.id} style={styles.tagItem}>
                  {editingTagId === tag.id ? (
                    <div style={styles.inlineEdit}>
                      <input 
                        type="text" 
                        value={editingTagName} 
                        onChange={e => setEditingTagName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveTagEdit(); }}
                        style={styles.editInput}
                        autoFocus
                      />
                      <button type="button" onClick={saveTagEdit} style={styles.iconBtnGreen} title="Save">
                        <SaveIcon />
                      </button>
                      <button type="button" onClick={() => setEditingTagId(null)} style={styles.iconBtnGray} title="Cancel">
                        <CancelIcon />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span style={styles.tagName}>#{tag.name}</span>
                      <div style={styles.tagActions}>
                        <button type="button" onClick={() => startEditTag(tag)} style={styles.tagActionBtnBlue} title="Edit">
                          ✏️
                        </button>
                        <button type="button" onClick={() => deleteTag(tag.id, tag.name)} style={styles.tagActionBtnRed} title="Delete">
                          ✕
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
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
    paddingBottom: '40px'
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
    gap: '24px',
  },
  card: {
    backgroundColor: '#111118',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '14px',
    padding: '22px',
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
    gap: '8px',
    marginBottom: '14px',
  },
  selectType: {
    backgroundColor: '#0a0a0f',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px',
    padding: '8px 10px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
    width: '120px',
  },
  inputFlex: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    border: '1px solid rgba(255,255,255,0.12)',
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
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(212,175,55,0.25)'
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '480px',
    overflowY: 'auto',
    paddingRight: '4px',
  },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: '8px',
    padding: '10px 12px',
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
    color: '#60a5fa',
    border: '1px solid rgba(96,165,250,0.2)',
    borderRadius: '6px',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  iconBtnRed: {
    backgroundColor: 'transparent',
    color: '#ef4444',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '6px',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  iconBtnGreen: {
    backgroundColor: '#10b981',
    color: '#000',
    border: 'none',
    borderRadius: '6px',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  iconBtnGray: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  inlineEdit: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    width: '100%',
  },
  editSelect: {
    backgroundColor: '#111118',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '6px',
    padding: '4px 6px',
    color: '#fff',
    fontSize: '12px',
    outline: 'none',
    width: '105px',
  },
  editInput: {
    flex: 1,
    backgroundColor: '#111118',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '6px',
    padding: '4px 8px',
    color: '#fff',
    fontSize: '12px',
    outline: 'none',
  },
  tagItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0a0a0f',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '8px',
    padding: '8px 12px',
  },
  tagName: {
    fontSize: '13px',
    color: '#D4AF37',
    fontWeight: '500',
  },
  tagActions: {
    display: 'flex',
    gap: '4px',
  },
  tagActionBtnBlue: {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '11px',
    padding: '2px 4px',
    opacity: 0.7,
  },
  tagActionBtnRed: {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '11px',
    padding: '2px 4px',
    opacity: 0.7,
    color: '#ef4444',
  },
};
