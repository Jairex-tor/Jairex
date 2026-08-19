import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useGamification } from '../context/GamificationContext';
import Button from '../components/common/Button';
import { playSend } from '../utils/sounds';
import { PixelAvatar } from '../utils/avatar';

const AVATARS = ['🧑‍🌾', '👷', '🧙', '🧝', '🦹', '👸', '🤴', '🦸'];

function formatRelativeTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function PostCard({ post, user, onReact, onComment, onDelete }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const isOwn = post.author?._id === user?._id || post.author?.id === user?.id;
  const authorAvatar = post.author?.avatar || AVATARS[(post.author?.username?.charCodeAt(0) || 0) % AVATARS.length];

  const handleReact = (type) => {
    onReact(post._id || post.id, type);
  };

  const handleComment = () => {
    if (!commentText.trim()) return;
    onComment(post._id || post.id, commentText.trim());
    setCommentText('');
  };

  const reactionCount = (type) => {
    return (post.reactions || []).filter((r) => r.type === type).length;
  };

  const hasReacted = (type) => {
    const myId = user?._id || user?.id;
    return (post.reactions || []).some(
      (r) =>
        r.type === type &&
        (r.user === myId || r.user?._id === myId || r.user?.id === myId)
    );
  };

  return (
    <div
      className="mc-block"
      style={{
        backgroundColor: 'var(--mc-stone-dark)',
        boxShadow: 'var(--mc-shadow-3d)',
        padding: '20px',
        width: '100%',
        animation: 'slide-up 0.3s ease-out',
      }}
    >
      {/* Post header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            backgroundColor: 'var(--mc-slot-bg)',
            boxShadow: 'var(--mc-shadow-3d-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          <PixelAvatar avatar={authorAvatar} username={post.author?.username} size={40} fontSize={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--mc-font-pixel)',
              fontSize: '10px',
              color: 'var(--mc-text)',
              textShadow: '1px 1px 0 var(--mc-text-shadow)',
            }}
          >
            {post.author?.username || 'Unknown'}
          </div>
          <div
            style={{
              fontFamily: 'var(--mc-font-body)',
              fontSize: '16px',
              color: '#888',
            }}
          >
            {formatRelativeTime(post.createdAt)}
          </div>
        </div>
        {isOwn && (
          <button
            onClick={() => onDelete(post._id || post.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              color: '#888',
              padding: '4px',
            }}
            title="Delete post"
          >
            🗑️
          </button>
        )}
      </div>

      {/* Post text */}
      {post.text && (
        <p
          style={{
            fontFamily: 'var(--mc-font-body)',
            fontSize: '24px',
            color: 'var(--mc-text)',
            lineHeight: '1.4',
            marginBottom: '12px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {post.text}
        </p>
      )}

      {/* Post media */}
      {post.mediaUrl && (
        <div style={{ marginBottom: '12px', borderRadius: '2px', overflow: 'hidden' }}>
          {post.mediaType === 'video' ? (
            <video
              src={post.mediaUrl}
              controls
              style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <img
              src={post.mediaUrl}
              alt="Post media"
              style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', display: 'block' }}
            />
          )}
        </div>
      )}

      {/* Reaction bar */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          padding: '10px 0',
          borderTop: '2px solid var(--mc-border-dark)',
          borderBottom: showComments ? '2px solid var(--mc-border-dark)' : 'none',
        }}
      >
        <button
          onClick={() => handleReact('like')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--mc-font-body)',
            fontSize: '20px',
            color: hasReacted('like') ? '#FF6B8A' : '#888',
            transition: 'color 0.15s',
          }}
        >
          <span style={{ fontSize: '18px' }}>❤️</span>
          <span>{reactionCount('like')}</span>
        </button>
        <button
          onClick={() => handleReact('diamond')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--mc-font-body)',
            fontSize: '20px',
            color: hasReacted('diamond') ? 'var(--mc-diamond)' : '#888',
            transition: 'color 0.15s',
          }}
        >
          <span style={{ fontSize: '18px' }}>💎</span>
          <span>{reactionCount('diamond')}</span>
        </button>
        <button
          onClick={() => handleReact('pig')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--mc-font-body)',
            fontSize: '20px',
            color: hasReacted('pig') ? '#FF9B50' : '#888',
            transition: 'color 0.15s',
          }}
        >
          <span style={{ fontSize: '18px' }}>🐷</span>
          <span>{reactionCount('pig')}</span>
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--mc-font-body)',
            fontSize: '20px',
            color: showComments ? 'var(--mc-emerald)' : '#888',
            transition: 'color 0.15s',
          }}
        >
          💬 <span>{(post.comments || []).length}</span>
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div style={{ paddingTop: '12px' }}>
          {(post.comments || []).map((comment, i) => {
            return (
              <div
                key={comment._id || i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  marginBottom: '10px',
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    backgroundColor: 'var(--mc-slot-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    flexShrink: 0,
                    overflow: 'hidden',
                  }}
                >
                  <PixelAvatar avatar={comment.author?.avatar} username={comment.author?.username} size={28} fontSize={14} />
                </div>
                <div>
                  <span
                    style={{
                      fontFamily: 'var(--mc-font-pixel)',
                      fontSize: '8px',
                      color: 'var(--mc-diamond)',
                      textShadow: '1px 1px 0 var(--mc-text-shadow)',
                      marginRight: '8px',
                    }}
                  >
                    {comment.author?.username || comment.username || 'Unknown'}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--mc-font-body)',
                      fontSize: '20px',
                      color: 'var(--mc-text)',
                    }}
                  >
                    {comment.text}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Comment input */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleComment()}
              placeholder="Add a comment..."
              className="mc-input"
              style={{
                flex: 1,
                fontSize: '20px',
                padding: '8px 12px',
              }}
            />
            <Button variant="primary" size="sm" onClick={handleComment}>
              Send
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FYPPage() {
  const { user } = useAuth();
  const { refresh } = useGamification();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [newPostText, setNewPostText] = useState('');
  const [loading, setLoading] = useState(true);
  const [notInCouple, setNotInCouple] = useState(false);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef(null);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/posts');
      setPosts(data.posts || data || []);
      setNotInCouple(false);
    } catch (err) {
      if (err.response?.status === 400) {
        setNotInCouple(true);
        setPosts([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleMediaSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const clearMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePost = async () => {
    if (!newPostText.trim() && !mediaFile) return;
    try {
      setPosting(true);
      const formData = new FormData();
      if (newPostText.trim()) formData.append('text', newPostText.trim());
      if (mediaFile) {
        formData.append('media', mediaFile);
        formData.append('mediaType', mediaFile.type.startsWith('video') ? 'video' : 'image');
      }
      const { data } = await api.post('/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPosts((prev) => [data.post || data, ...prev]);
      setNewPostText('');
      clearMedia();
      playSend();
      refresh();
    } catch {
      // handle silently
    } finally {
      setPosting(false);
    }
  };

  const handleReact = async (postId, type) => {
    try {
      const { data } = await api.post(`/posts/${postId}/react`, { type });
      setPosts((prev) =>
        prev.map((p) => {
          const id = p._id || p.id;
          if (id !== postId) return p;
          return {
            ...p,
            reactions: data.reactions || p.reactions,
          };
        })
      );
      refresh();
    } catch {
      // optimistic fallback
      setPosts((prev) =>
        prev.map((p) => {
          const id = p._id || p.id;
          if (id !== postId) return p;
          const reactions = [...(p.reactions || [])];
          const existingIdx = reactions.findIndex(
            (r) => r.type === type && (r.user === user?._id || r.user === user?.id)
          );
          if (existingIdx >= 0) {
            reactions.splice(existingIdx, 1);
          } else {
            reactions.push({ type, user: user?._id || user?.id });
          }
          return { ...p, reactions };
        })
      );
    }
  };

  const handleComment = async (postId, text) => {
    try {
      const { data } = await api.post(`/posts/${postId}/comment`, { text });
      setPosts((prev) =>
        prev.map((p) => {
          const id = p._id || p.id;
          if (id !== postId) return p;
          return {
            ...p,
            comments: data.comments || [...(p.comments || []), { text, author: user }],
          };
        })
      );
      refresh();
    } catch {
      setPosts((prev) =>
        prev.map((p) => {
          const id = p._id || p.id;
          if (id !== postId) return p;
          return {
            ...p,
            comments: [...(p.comments || []), { text, author: user }],
          };
        })
      );
    }
  };

  const handleDelete = async (postId) => {
    try {
      await api.delete(`/posts/${postId}`);
      setPosts((prev) => prev.filter((p) => (p._id || p.id) !== postId));
    } catch {
      // silent
    }
  };

  return (
    <div className="page">
      <div className="page__header">
        <div className="page__header-title">💚 Our Feed</div>
      </div>

      <div className="page__body">
        <div className="fyp" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
          {/* Post creation area */}
          <div
            className="mc-block"
            style={{
              backgroundColor: 'var(--mc-stone-dark)',
              boxShadow: 'var(--mc-shadow-3d)',
              padding: '20px',
              width: '100%',
              maxWidth: '600px',
            }}
          >
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  backgroundColor: 'var(--mc-slot-bg)',
                  boxShadow: 'var(--mc-shadow-3d-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  flexShrink: 0,
                }}
              >
                {AVATARS[(user?.username?.charCodeAt(0) || 0) % AVATARS.length]}
              </div>
              <div style={{ flex: 1 }}>
                <textarea
                  value={newPostText}
                  onChange={(e) => setNewPostText(e.target.value)}
                  placeholder="Share a savings milestone..."
                  className="mc-input"
                  style={{
                    minHeight: '60px',
                    maxHeight: '120px',
                    resize: 'vertical',
                    fontSize: '22px',
                  }}
                />

                {/* Media preview */}
                {mediaPreview && (
                  <div style={{ marginTop: '10px', position: 'relative' }}>
                    <button
                      onClick={clearMedia}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: 'rgba(0,0,0,0.7)',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '16px',
                        padding: '2px 8px',
                        zIndex: 1,
                      }}
                    >
                      ×
                    </button>
                    {mediaFile?.type?.startsWith('video') ? (
                      <video
                        src={mediaPreview}
                        style={{
                          width: '100%',
                          maxHeight: '200px',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    ) : (
                      <img
                        src={mediaPreview}
                        alt="Preview"
                        style={{
                          width: '100%',
                          maxHeight: '200px',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    )}
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '10px',
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleMediaSelect}
                    style={{ display: 'none' }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '22px',
                      padding: '4px',
                      color: '#888',
                    }}
                    title="Add photo"
                  >
                    📷
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '22px',
                      padding: '4px',
                      color: '#888',
                    }}
                    title="Add video"
                  >
                    🎥
                  </button>
                  <div style={{ flex: 1 }} />
                  <Button
                    variant="gold"
                    size="sm"
                    onClick={handlePost}
                    disabled={posting || (!newPostText.trim() && !mediaFile)}
                  >
                    {posting ? 'Posting...' : 'Post'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Not linked with partner */}
          {!loading && notInCouple && (
            <div
              className="mc-block"
              style={{
                width: '100%',
                maxWidth: '600px',
                padding: '24px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>💑</div>
              <div
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '10px',
                  color: 'var(--mc-text)',
                  textShadow: '1px 1px 0 var(--mc-text-shadow)',
                  lineHeight: '1.8',
                  marginBottom: '14px',
                }}
              >
                Link with your partner to share your savings milestones!
              </div>
              <Button variant="gold" size="sm" onClick={() => navigate('/profile')}>
                Find Your Partner
              </Button>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '600px' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton skeleton--card" style={{ height: '180px' }} />
              ))}
            </div>
          )}

          {/* Posts feed */}
          {!loading && posts.length === 0 && (
            <div className="fyp__empty">
              <div className="fyp__empty-icon">🎉</div>
              <div className="fyp__empty-text">
                No posts yet!<br />
                Share your first savings milestone
              </div>
            </div>
          )}

          {!loading && posts.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                width: '100%',
                maxWidth: '600px',
              }}
            >
              {posts.map((post) => (
                <PostCard
                  key={post._id || post.id}
                  post={post}
                  user={user}
                  onReact={handleReact}
                  onComment={handleComment}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
