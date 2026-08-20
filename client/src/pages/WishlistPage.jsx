import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useSettings } from '../context/SettingsContext';
import Button from '../components/common/Button';
import useSocket from '../hooks/useSocket';

const EMOJIS = ['🎁', '💎', '🎮', '📱', '✈️', '🏠', '👗', '🎮', '💻', '📷', '🎸', '🧸', '💍', '🏖️', '🚗', '👟'];

const PRIORITY_COLORS = {
  high: 'var(--mc-redstone)',
  medium: 'var(--mc-gold)',
  low: '#888',
};

function AddItemModal({ onClose, onAdd }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [link, setLink] = useState('');
  const [emoji, setEmoji] = useState('🎁');
  const [priority, setPriority] = useState('medium');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    await onAdd({ name: name.trim(), description: description.trim(), price: price ? parseFloat(price) : null, link: link.trim(), emoji, priority });
    setSubmitting(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div className="modal__title">Add to Wishlist</div>
          <button className="modal__close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#999', marginBottom: '6px' }}>NAME</div>
              <input className="mc-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="What do you want?" autoFocus />
            </div>
            <div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#999', marginBottom: '6px' }}>DESCRIPTION</div>
              <input className="mc-input" value={description} onChange={(e) => setDescription(e.target.value.slice(0, 300))} placeholder="Optional details..." />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#999', marginBottom: '6px' }}>PRICE</div>
                <input className="mc-input" type="text" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="$0.00" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#999', marginBottom: '6px' }}>LINK</div>
                <input className="mc-input" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#999', marginBottom: '6px' }}>ICON</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {EMOJIS.map((e) => (
                  <button key={e} type="button" onClick={() => setEmoji(e)} style={{ fontSize: '20px', padding: '4px', background: emoji === e ? 'rgba(0,200,83,0.15)' : 'transparent', border: emoji === e ? '2px solid var(--mc-emerald)' : '2px solid transparent', borderRadius: '4px', cursor: 'pointer' }}>{e}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#999', marginBottom: '6px' }}>PRIORITY</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['low', 'medium', 'high'].map((p) => (
                  <button key={p} type="button" onClick={() => setPriority(p)} style={{
                    fontFamily: "'VT323', monospace", fontSize: '16px', padding: '4px 14px', borderRadius: '4px', border: 'none', cursor: 'pointer', textTransform: 'capitalize',
                    background: priority === p ? PRIORITY_COLORS[p] : 'rgba(255,255,255,0.08)', color: priority === p ? '#FFF' : '#AAA',
                  }}>{p}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="modal__footer">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={submitting || !name.trim()}>{submitting ? 'Adding...' : 'Add Item'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function WishlistPage() {
  const { formatCurrency } = useSettings();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState(null);
  const { socket } = useSocket();

  const fetchItems = useCallback(async () => {
    try {
      const { data } = await api.get('/wishlist');
      setItems(data.items || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchItems();
    socket.on('wishlist-changed', refresh);
    return () => socket.off('wishlist-changed', refresh);
  }, [socket, fetchItems]);

  const handleAdd = async (itemData) => {
    try {
      await api.post('/wishlist', itemData);
      setShowAdd(false);
      fetchItems();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add item');
    }
  };

  const handleToggleSave = async (id) => {
    try {
      await api.post(`/wishlist/${id}/save`);
      fetchItems();
    } catch { /* silent */ }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/wishlist/${id}`);
      fetchItems();
    } catch { /* silent */ }
  };

  const totalPrice = items.filter((i) => !i.saved && i.price).reduce((s, i) => s + i.price, 0);
  const savedItems = items.filter((i) => i.saved);
  const pendingItems = items.filter((i) => !i.saved);

  if (loading) {
    return (
      <div className="page">
        <div className="page__header"><h1 className="page__title">Shared Wishlist</h1></div>
        <div className="page__body" style={{ textAlign: 'center', padding: '60px 24px', color: '#888', fontFamily: "'VT323', monospace", fontSize: '20px' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Shared Wishlist</h1>
        <Button variant="primary" onClick={() => setShowAdd(true)}>+ Add Item</Button>
      </div>

      {error && (
        <div style={{ fontFamily: "'VT323', monospace", fontSize: '18px', color: 'var(--mc-redstone)', padding: '8px 24px' }}>{error}</div>
      )}

      {/* Summary */}
      <div style={{ display: 'flex', gap: '16px', padding: '0 24px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div className="mc-block" style={{ flex: 1, minWidth: '120px', padding: '12px 16px', textAlign: 'center', background: 'var(--mc-stone-dark)' }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '10px', color: 'var(--mc-gold)' }}>{formatCurrency(totalPrice)}</div>
          <div style={{ fontFamily: "'VT323', monospace", fontSize: '16px', color: '#888' }}>Total Wishlist</div>
        </div>
        <div className="mc-block" style={{ flex: 1, minWidth: '120px', padding: '12px 16px', textAlign: 'center', background: 'var(--mc-stone-dark)' }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '10px', color: 'var(--mc-emerald)' }}>{savedItems.length}</div>
          <div style={{ fontFamily: "'VT323', monospace", fontSize: '16px', color: '#888' }}>Saved</div>
        </div>
        <div className="mc-block" style={{ flex: 1, minWidth: '120px', padding: '12px 16px', textAlign: 'center', background: 'var(--mc-stone-dark)' }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '10px', color: 'var(--mc-diamond)' }}>{pendingItems.length}</div>
          <div style={{ fontFamily: "'VT323', monospace", fontSize: '16px', color: '#888' }}>Pending</div>
        </div>
      </div>

      <div className="page__body" style={{ padding: '0 24px' }}>
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }}>🎁</div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '10px', color: '#888', lineHeight: '2' }}>
              No wishlist items yet!<br />Add something you both want.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pendingItems.map((item) => (
              <WishlistItemCard key={item._id} item={item} formatCurrency={formatCurrency} onToggleSave={handleToggleSave} onDelete={handleDelete} />
            ))}
            {savedItems.length > 0 && (
              <>
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px', color: '#666', textAlign: 'center', marginTop: '8px' }}>
                  — SAVED —
                </div>
                {savedItems.map((item) => (
                  <WishlistItemCard key={item._id} item={item} formatCurrency={formatCurrency} onToggleSave={handleToggleSave} onDelete={handleDelete} />
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {showAdd && <AddItemModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}
    </div>
  );
}

function WishlistItemCard({ item, formatCurrency, onToggleSave, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="mc-block" style={{
      padding: '12px 16px',
      background: 'var(--mc-stone-dark)',
      boxShadow: 'inset -2px -2px 0 var(--mc-border-dark), inset 2px 2px 0 var(--mc-border-light)',
      opacity: item.saved ? 0.6 : 1,
      borderLeft: `3px solid ${PRIORITY_COLORS[item.priority] || '#888'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ fontSize: '24px', flexShrink: 0 }}>{item.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '9px', color: item.saved ? '#666' : 'var(--mc-text)', textDecoration: item.saved ? 'line-through' : 'none' }}>
            {item.name}
          </div>
          {item.description && (
            <div style={{ fontFamily: "'VT323', monospace", fontSize: '15px', color: '#777', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.description}
            </div>
          )}
          <div style={{ fontFamily: "'VT323', monospace", fontSize: '15px', color: '#666', marginTop: '2px' }}>
            {item.price != null && <span style={{ color: 'var(--mc-gold)' }}>{formatCurrency(item.price)}</span>}
            {item.link && <span style={{ marginLeft: '8px' }}>🔗</span>}
            <span style={{ marginLeft: '8px', color: PRIORITY_COLORS[item.priority] }}>{item.priority}</span>
            {item.addedBy?.username && <span style={{ marginLeft: '8px' }}>by {item.addedBy.username}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
          <button className="mc-button mc-button--small" style={{ fontSize: '8px', padding: '4px 8px' }} onClick={() => onToggleSave(item._id)}>
            {item.saved ? '↩ Undo' : '✓ Got it!'}
          </button>
          {!confirmDelete ? (
            <button className="mc-button mc-button--danger mc-button--small" style={{ fontSize: '8px', padding: '4px 8px' }} onClick={() => setConfirmDelete(true)}>
              Remove
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '2px' }}>
              <button className="mc-button mc-button--danger mc-button--small" style={{ fontSize: '7px', padding: '3px 6px' }} onClick={() => { onDelete(item._id); setConfirmDelete(false); }}>Yes</button>
              <button className="mc-button mc-button--small" style={{ fontSize: '7px', padding: '3px 6px' }} onClick={() => setConfirmDelete(false)}>No</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
