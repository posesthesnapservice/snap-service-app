'use client';

import { useState } from 'react';
import { mockChecklistEvents as initialEvents, mockChecklistItems as initialItems } from '@/lib/mock-data';
import { ChecklistEvent, ChecklistItem } from '@/lib/types';

// SVG Icons
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
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

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const SaveIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const GripIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: 'grab', marginRight: '10px' }}>
    <circle cx="9" cy="12" r="1"></circle>
    <circle cx="9" cy="5" r="1"></circle>
    <circle cx="9" cy="19" r="1"></circle>
    <circle cx="15" cy="12" r="1"></circle>
    <circle cx="15" cy="5" r="1"></circle>
    <circle cx="15" cy="19" r="1"></circle>
  </svg>
);

const ArrowUpIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5"></line>
    <polyline points="5 12 12 5 19 12"></polyline>
  </svg>
);

const ArrowDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <polyline points="19 12 12 19 5 12"></polyline>
  </svg>
);

const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

export default function AdminDontMiss() {
  const [events, setEvents] = useState<ChecklistEvent[]>(initialEvents);
  const [items, setItems] = useState<ChecklistItem[]>(initialItems);
  const [activeEventId, setActiveEventId] = useState<string>(initialEvents[0]?.id || '');

  // Controls Form States
  const [newItem, setNewItem] = useState('');
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEventName, setNewEventName] = useState('');

  // Editing state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemText, setEditingItemText] = useState('');

  // Current event items, ordered
  const currentItems = items
    .filter(item => item.event_id === activeEventId)
    .sort((a, b) => a.order_index - b.order_index);

  const addItem = () => {
    if (newItem.trim()) {
      const maxOrder = currentItems.reduce((max, item) => item.order_index > max ? item.order_index : max, 0);
      const created: ChecklistItem = {
        id: `ci_${Date.now()}`,
        event_id: activeEventId,
        title: newItem.trim(),
        order_index: maxOrder + 1,
        created_at: new Date().toISOString()
      };
      setItems([...items, created]);
      setNewItem('');
    }
  };

  const deleteItem = (id: string) => {
    if (confirm('Delete this checklist item?')) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const startEditItem = (item: ChecklistItem) => {
    setEditingItemId(item.id);
    setEditingItemText(item.title);
  };

  const saveEditItem = () => {
    if (editingItemText.trim()) {
      setItems(items.map(item => 
        item.id === editingItemId ? { ...item, title: editingItemText.trim() } : item
      ));
      setEditingItemId(null);
    }
  };

  const moveItem = (id: string, dir: 'up' | 'down') => {
    const idx = currentItems.findIndex(item => item.id === id);
    if (idx === -1) return;

    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= currentItems.length) return;

    const itemA = currentItems[idx];
    const itemB = currentItems[targetIdx];

    const orderA = itemA.order_index;
    const orderB = itemB.order_index;

    // Swap order_indexes in state
    setItems(items.map(item => {
      if (item.id === itemA.id) return { ...item, order_index: orderB };
      if (item.id === itemB.id) return { ...item, order_index: orderA };
      return item;
    }));
  };

  const createEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEventName.trim()) {
      const maxOrder = events.reduce((max, ev) => ev.order_index > max ? ev.order_index : max, 0);
      const newEv: ChecklistEvent = {
        id: `ce_${Date.now()}`,
        name: newEventName.trim(),
        order_index: maxOrder + 1
      };
      setEvents([...events, newEv]);
      setActiveEventId(newEv.id);
      setNewEventName('');
      setShowAddEvent(false);
    }
  };

  const deleteEvent = (eventId: string) => {
    if (confirm('Are you sure you want to delete this event category and ALL its checklist items?')) {
      setEvents(events.filter(e => e.id !== eventId));
      setItems(items.filter(item => item.event_id !== eventId));
      // Reset active tab to first remaining
      const remaining = events.filter(e => e.id !== eventId);
      if (remaining.length > 0) {
        setActiveEventId(remaining[0].id);
      } else {
        setActiveEventId('');
      }
    }
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Don't Miss This! Checklist</h1>
          <p style={styles.subtitle}>Curate the essential list of moments that photographers must capture for each event</p>
        </div>
        <button 
          onClick={() => setShowAddEvent(!showAddEvent)}
          style={{
            ...styles.addBtn,
            backgroundColor: showAddEvent ? '#ef4444' : '#111118',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {showAddEvent ? <><XIcon /> Cancel</> : <><PlusIcon /> Add Event Category</>}
        </button>
      </div>

      {/* Add Event Panel */}
      {showAddEvent && (
        <form onSubmit={createEvent} style={styles.formCard}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700' }}>Add Event Category</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              placeholder="e.g. Sangeet or Pre-wedding shoot" 
              value={newEventName}
              onChange={e => setNewEventName(e.target.value)}
              style={styles.inputFlex}
              required
            />
            <button type="submit" style={styles.saveBtn}>Create Event</button>
          </div>
        </form>
      )}

      {/* Event Tabs Navigation */}
      <div style={styles.tabBar}>
        <div style={styles.tabScroll}>
          {events.map(event => (
            <div key={event.id} style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <button
                onClick={() => setActiveEventId(event.id)}
                style={{
                  ...styles.tabBtn,
                  color: activeEventId === event.id ? '#D4AF37' : '#888',
                  backgroundColor: activeEventId === event.id ? 'rgba(212,175,55,0.08)' : 'transparent',
                  borderColor: activeEventId === event.id ? '#D4AF37' : 'transparent',
                }}
              >
                {event.name}
              </button>
              {activeEventId === event.id && events.length > 1 && (
                <button 
                  onClick={() => deleteEvent(event.id)}
                  style={styles.deleteTabIcon}
                  title={`Delete ${event.name}`}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Checklist Card */}
      <div style={styles.card}>
        {/* Add Checklist Item input */}
        <div style={styles.itemFormRow}>
          <input 
            type="text" 
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder="Add new required shot moment (e.g. Bride feeding groom sweets)" 
            style={styles.inputFlex} 
          />
          <button onClick={addItem} style={styles.addItemBtn}>
            Add Moment
          </button>
        </div>

        {/* List of items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {currentItems.length === 0 ? (
            <div style={styles.noDataBox}>
              No checklist items defined for this event yet. Add items above!
            </div>
          ) : (
            currentItems.map((item, index) => (
              <div key={item.id} style={styles.itemRow} className="item-row-group">
                <GripIcon />
                
                {editingItemId === item.id ? (
                  <div style={{ display: 'flex', flex: 1, gap: '8px' }}>
                    <input 
                      type="text" 
                      value={editingItemText}
                      onChange={e => setEditingItemText(e.target.value)}
                      style={styles.inlineEditInput}
                    />
                    <button onClick={saveEditItem} style={styles.iconBtnGreen} title="Save">
                      <SaveIcon />
                    </button>
                    <button onClick={() => setEditingItemId(null)} style={styles.iconBtnGray} title="Cancel">
                      <XIcon />
                    </button>
                  </div>
                ) : (
                  <>
                    <span style={styles.itemText}>
                      <span style={styles.indexLabel}>{index + 1}.</span> {item.title}
                    </span>

                    <div style={styles.actionControls}>
                      {/* Move Up */}
                      <button 
                        onClick={() => moveItem(item.id, 'up')} 
                        disabled={index === 0} 
                        style={{ ...styles.moveBtn, opacity: index === 0 ? 0.25 : 1 }}
                        title="Move Up"
                      >
                        <ArrowUpIcon />
                      </button>
                      
                      {/* Move Down */}
                      <button 
                        onClick={() => moveItem(item.id, 'down')} 
                        disabled={index === currentItems.length - 1} 
                        style={{ ...styles.moveBtn, opacity: index === currentItems.length - 1 ? 0.25 : 1 }}
                        title="Move Down"
                      >
                        <ArrowDownIcon />
                      </button>

                      <div style={styles.verticalDivider} />

                      {/* Edit */}
                      <button onClick={() => startEditItem(item)} style={styles.iconBtnBlue} title="Edit inline">
                        <EditIcon />
                      </button>

                      {/* Delete */}
                      <button onClick={() => deleteItem(item.id)} style={styles.iconBtnRed} title="Delete">
                        <TrashIcon />
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
    padding: '16px',
    marginBottom: '20px',
  },
  inputFlex: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '10px 12px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  saveBtn: {
    backgroundColor: '#D4AF37',
    color: '#000',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  tabBar: {
    marginBottom: '20px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  tabScroll: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    paddingBottom: '2px',
  },
  tabBtn: {
    padding: '10px 20px 14px 20px',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  },
  deleteTabIcon: {
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
    border: 'none',
    borderRadius: '50%',
    width: '14px',
    height: '14px',
    fontSize: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    position: 'absolute',
    right: '2px',
    top: '4px',
  },
  card: {
    backgroundColor: '#111118',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '24px',
  },
  itemFormRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
  },
  addItemBtn: {
    backgroundColor: '#D4AF37',
    color: '#000',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  noDataBox: {
    padding: '40px',
    textAlign: 'center',
    color: '#666',
    fontSize: '13px',
    border: '1px dashed rgba(255,255,255,0.08)',
    borderRadius: '8px',
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#0a0a0f',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '8px',
    padding: '12px 14px',
    transition: 'all 0.15s',
  },
  itemText: {
    flex: 1,
    color: '#fff',
    fontSize: '13px',
    fontWeight: '500',
  },
  indexLabel: {
    color: '#D4AF37',
    marginRight: '6px',
    fontWeight: '700',
  },
  actionControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  moveBtn: {
    backgroundColor: 'transparent',
    color: '#aaa',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '6px',
    width: '26px',
    height: '26px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  verticalDivider: {
    width: '1px',
    height: '18px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    margin: '0 4px',
  },
  iconBtnBlue: {
    backgroundColor: 'transparent',
    color: '#3b82f6',
    border: '1px solid rgba(59,130,246,0.15)',
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
    border: '1px solid rgba(239,68,68,0.15)',
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
  inlineEditInput: {
    flex: 1,
    backgroundColor: '#111118',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '6px',
    padding: '4px 8px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
  },
};
