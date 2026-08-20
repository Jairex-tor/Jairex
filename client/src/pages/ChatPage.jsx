import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import useSocket from '../hooks/useSocket';
import Button from '../components/common/Button';
import { playSend, playClick, playMessage } from '../utils/sounds';

function getAIResponse(message, ctx = {}) {
  const lower = message.toLowerCase().trim();
  const { goals = [], profile = null, fmt = (n) => String(n) } = ctx;
  const stats = profile?.stats || {};
  const totalSaved = stats.totalSaved || 0;
  const goal = goals[0] || null;
  const cur = goal ? goal.currentAmount || 0 : 0;
  const target = goal ? goal.targetAmount || 1 : 1;
  const perWeek = goal ? (goal.timesPerWeek || 0) * (goal.amountPerDeposit || 0) : 0;
  const remaining = target - cur;
  const weeks = perWeek > 0 ? Math.ceil(remaining / perWeek) : null;

  if (/^(hi|hello|hey|yo|sup|good (morning|afternoon|evening))/.test(lower)) {
    return `Hey ${profile?.username || 'there'}! Ready to build those savings blocks together? Ask me about your goals, budgets, or how to save faster! 🧱`;
  }
  if (/\b(thanks|thank you|thx|ty)\b/.test(lower)) {
    return "You're welcome! Happy to help you two reach your goal. Anything else you want to crunch? 💎";
  }

  let m = lower.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)\s*(?:of|off)\s*(\d+(?:\.\d+)?)/);
  if (m) {
    const result = (parseFloat(m[1]) / 100) * parseFloat(m[2]);
    const toward = goal ? cur + result : null;
    return `${m[1]}% of ${fmt(parseFloat(m[2]))} is ${fmt(result)}. ${goal ? `That brings "${goal.goalName}" to ${fmt(toward)} (${Math.round((toward / target) * 100)}% of target)!` : 'Save that and you are one block closer!'} 🧮`;
  }

  m = lower.match(/(\d+(?:\.\d+)?)\s*(plus|\+|minus|-|times|\*|multiplied by|divided by|over|\/)\s*(\d+(?:\.\d+)?)/);
  if (m) {
    const a = parseFloat(m[1]);
    const b = parseFloat(m[3]);
    let result;
    if (m[2] === 'plus' || m[2] === '+') result = a + b;
    else if (m[2] === 'minus' || m[2] === '-') result = a - b;
    else if (m[2] === 'times' || m[2] === '*' || m[2] === 'multiplied by') result = a * b;
    else result = a / b;
    if (isFinite(result)) {
      return `That's ${fmt(result)}. ${perWeek > 0 ? `At your pace of ${fmt(perWeek)}/week, that's about ${Math.round(result / perWeek)} week${Math.round(result / perWeek) !== 1 ? 's' : ''} of saving.` : 'Nice math for a savings quest!'} 🧮`;
    }
  }

  m = lower.match(/afford\s+(?:to\s+)?(?:buy\s+)?(?:an?\s+)?([$€£₱]?\s*[\d,]+(?:\.\d+)?)/);
  if (m) {
    const amt = parseFloat(m[1].replace(/[^0-9.]/g, ''));
    const saved = totalSaved || cur;
    if (saved >= amt) {
      return `You have ${fmt(saved)} saved — yes, you can afford ${fmt(amt)} with ${fmt(saved - amt)} to spare. Just don't let it stall your goal! 💪`;
    }
    return `Not yet — you have ${fmt(saved)} and need ${fmt(amt - saved)} more. ${weeks ? `At ${fmt(perWeek)}/week that's about ${weeks} week${weeks !== 1 ? 's' : ''} away.` : 'Set a deposit pace and I can tell you exactly when!'} 🕒`;
  }

  if (goal && /\bhow (long|soon)|when (will|do|does)|eta|reach.*goal|finish.*goal|complete.*goal/.test(lower)) {
    if (remaining <= 0) return `"${goal.goalName}" is already complete! 🎉 Time to celebrate with your partner!`;
    if (weeks) {
      const date = new Date();
      date.setDate(date.getDate() + weeks * 7);
      return `At your pace (${goal.timesPerWeek}× ${fmt(goal.amountPerDeposit)} = ${fmt(perWeek)}/week), "${goal.goalName}" finishes in ~${weeks} week${weeks !== 1 ? 's' : ''} (around ${date.toLocaleDateString()}). You still need ${fmt(remaining)}. ⏳`;
    }
    return `You need ${fmt(remaining)} more to finish "${goal.goalName}". Tell me a weekly amount and I'll estimate a date!`;
  }

  if (/\b(budget|monthly|plan)\b/.test(lower)) {
    return totalSaved > 0
      ? `You've saved ${fmt(totalSaved)} so far. A good split is 50/30/20 — needs, wants, savings. Even ${fmt(Math.max(10, totalSaved * 0.1))} more a week compounds fast! Want me to build a plan for a specific goal? 📊`
      : "Let's make a plan! Start with a goal in the Piggy Bank, then I can break it into a weekly budget you both can stick to. 📊";
  }

  if (goal) {
    return `Good question! Based on your savings: "${goal.goalName}" is ${Math.round((cur / target) * 100)}% full (${fmt(cur)} of ${fmt(target)}). ${weeks ? `At your pace that's ~${weeks} week${weeks !== 1 ? 's' : ''} to go. ` : ''}Want me to help with a budget or a faster savings pace? 📊`;
  }
  if (totalSaved > 0) {
    return `You've saved ${fmt(totalSaved)} in total — nice work! Set a goal in the Piggy Bank and I'll give exact numbers, budgets, and timelines. 💰`;
  }
  return "Great question! Once you and your partner create a savings goal, I can give exact numbers, budgets, and paces. What are you saving for? 🎯";
}

function formatTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function isMine(msg, myId) {
  const sid = msg.sender?._id || msg.sender;
  return String(sid) === String(myId);
}

const EMOJI_LIST = [
  '😀','😂','🥹','😍','🥰','😘','😎','🤩','🥳','😇',
  '🤗','😏','🤔','😤','😢','😭','🫡','🤝','💪','👍',
  '👎','❤️','🔥','✨','🎉','🥳','💎','🪙','💰','🐷',
  '⛏️','🗡️','🛡️','🧱','🏡','🌾','🍎','🍖','🧃','🍫',
  '🌈','☀️','🌙','⭐','🏆','🎯','📊','📅','🗓️','✅',
  '❌','⚠️','💡','🎁','🛒','💊','🏠','✈️','🚗','🐾',
];

function EmojiPicker({ onSelect, onClose }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '100%',
        left: '0',
        marginBottom: '8px',
        background: 'var(--mc-stone-dark)',
        border: '2px solid var(--mc-border-dark)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        padding: '8px',
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gap: '4px',
        zIndex: 100,
        width: '280px',
        maxHeight: '200px',
        overflowY: 'auto',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {EMOJI_LIST.map((em) => (
        <button
          key={em}
          onClick={() => { onSelect(em); onClose(); }}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            lineHeight: 1,
          }}
          onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.target.style.background = 'none'}
        >
          {em}
        </button>
      ))}
    </div>
  );
}

const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '👍', '🔥'];

function MessageReactions({ reactions, messageId, myId, onReact }) {
  if (!reactions || reactions.length === 0) return null;

  const grouped = {};
  reactions.forEach((r) => {
    if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, mine: false };
    grouped[r.emoji].count++;
    if (String(r.userId?._id || r.userId) === String(myId)) grouped[r.emoji].mine = true;
  });

  return (
    <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
      {Object.entries(grouped).map(([emoji, { count, mine }]) => (
        <button
          key={emoji}
          onClick={() => onReact(messageId, emoji)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            padding: '2px 6px',
            background: mine ? 'rgba(85,255,255,0.15)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${mine ? 'rgba(85,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '12px',
            color: '#ccc',
            fontFamily: 'var(--mc-font-body)',
          }}
        >
          <span>{emoji}</span>
          {count > 1 && <span>{count}</span>}
        </button>
      ))}
    </div>
  );
}

function PartnerChat({ user }) {
  const { socket, connected } = useSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [partnerInfo, setPartnerInfo] = useState(null);
  const [partnerId, setPartnerId] = useState(user?.partnerId || null);
  const [coupleId, setCoupleId] = useState(user?.coupleId?._id || user?.coupleId || null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [showReactions, setShowReactions] = useState(null);
  const emojiRef = useRef(null);

  useEffect(() => {
    function handleClick() { setShowReactions(null); }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchPartner() {
      try {
        const { data } = await api.get('/auth/couple');
        const couple = data.couple || data;
        if (cancelled) return;
        const partner = couple?.partner || (couple?.partner2 || couple?.partner1);
        if (partner) {
          setPartnerId(partner._id || partner.id);
          setPartnerInfo(partner);
        }
        setCoupleId(couple?._id || couple?.id || null);
      } catch {
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchPartner();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (socket && coupleId) {
      socket.emit('join-couple', coupleId);
    }
  }, [socket, coupleId]);

  useEffect(() => {
    if (!partnerId) {
      setLoading(false);
      return;
    }
    async function fetchMessages() {
      try {
        const { data } = await api.get(`/chat/messages/${partnerId}`);
        setMessages(data.messages || data || []);
        setPartnerInfo((prev) => data.partner || prev);
      } catch {
      } finally {
        setLoading(false);
      }
    }
    fetchMessages();
  }, [partnerId]);

  useEffect(() => {
    if (!socket) return;
    const onNew = (payload) => {
      const msg = payload?.message || payload;
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      if (!isMine(msg, user?._id || user?.id)) playMessage();
    };
    const onReaction = (payload) => {
      const msg = payload?.message || payload;
      setMessages((prev) => prev.map((m) => (m._id === msg._id ? msg : m)));
    };
    socket.on('new-message', onNew);
    socket.on('message-reaction', onReaction);
    return () => {
      socket.off('new-message', onNew);
      socket.off('message-reaction', onReaction);
    };
  }, [socket, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (type = 'text', extra = {}) => {
    if ((!newMessage.trim() && type === 'text') || !socket || !connected) return;
    const text = type === 'coin' ? '🪙' : newMessage.trim();
    socket.emit('chat-message', {
      coupleId,
      recipientId: partnerId,
      text,
      type,
      ...extra,
    });
    if (type === 'text') setNewMessage('');
    playSend();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !partnerId) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('recipient', partnerId);
      const { data } = await api.post('/chat/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const msg = data.message;
      if (socket && connected) {
        socket.emit('chat-message', {
          coupleId,
          recipientId: partnerId,
          text: '',
          type: msg.type,
          mediaUrl: msg.mediaUrl,
          fileName: msg.fileName,
        });
      }
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      playSend();
    } catch {
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleReact = async (messageId, emoji) => {
    try {
      await api.post(`/chat/${messageId}/react`, { emoji });
    } catch {
    }
    setShowReactions(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend('text');
    }
  };

  if (!partnerId) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 24px' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>💬</div>
        <div style={{ fontFamily: 'var(--mc-font-pixel)', fontSize: '10px', color: '#888', lineHeight: '2' }}>
          Link with your partner to start chatting!
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        className="chat__messages"
        style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}
      >
        {!connected && (
          <div style={{ textAlign: 'center', fontFamily: 'var(--mc-font-pixel)', fontSize: '8px', color: '#888', padding: '8px' }}>
            Reconnecting...
          </div>
        )}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: '40px', width: '60%' }} />
            ))}
          </div>
        )}
        {messages.map((msg) => {
          const myId = user?._id || user?.id;
          const sent = isMine(msg, myId);

          if (msg.type === 'coin') {
            return (
              <div key={msg._id} className="chat__message chat__message--coin">
                <div className="chat__message-bubble">
                  <span className="chat__coin-icon">🪙</span>
                  <span className="chat__coin-text">Savings Milestone!</span>
                  <div className="chat__message-time">{formatTime(msg.createdAt)}</div>
                </div>
              </div>
            );
          }

          if (msg.type === 'image') {
            return (
              <div
                key={msg._id}
                className={`chat__message ${sent ? 'chat__message--sent' : 'chat__message--received'}`}
                style={{ maxWidth: '70%' }}
              >
                {!sent && (
                  <div className="chat__message-avatar">
                    {AVATARS[(partnerInfo?.username?.charCodeAt(0) || 0) % AVATARS.length]}
                  </div>
                )}
                <div
                  className="chat__message-bubble"
                  style={{ padding: '4px', cursor: 'pointer', position: 'relative' }}
                  onClick={(e) => { e.stopPropagation(); setShowReactions(showReactions === msg._id ? null : msg._id); }}
                >
                  <img
                    src={msg.mediaUrl}
                    alt="shared"
                    style={{ maxWidth: '100%', maxHeight: '260px', display: 'block', imageRendering: 'auto', borderRadius: '2px' }}
                  />
                  <div className="chat__message-time">{formatTime(msg.createdAt)}</div>
                  <MessageReactions reactions={msg.reactions} messageId={msg._id} myId={myId} onReact={handleReact} />
                  {showReactions === msg._id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                        display: 'flex', gap: '2px', background: 'var(--mc-stone-dark)',
                        border: '2px solid var(--mc-border-dark)', padding: '4px 6px', zIndex: 50,
                      }}
                    >
                      {REACTION_EMOJIS.map((em) => (
                        <button key={em} onClick={() => handleReact(msg._id, em)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', padding: '2px' }}>
                          {em}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          if (msg.type === 'file') {
            return (
              <div
                key={msg._id}
                className={`chat__message ${sent ? 'chat__message--sent' : 'chat__message--received'}`}
              >
                {!sent && (
                  <div className="chat__message-avatar">
                    {AVATARS[(partnerInfo?.username?.charCodeAt(0) || 0) % AVATARS.length]}
                  </div>
                )}
                <div
                  className="chat__message-bubble"
                  style={{ cursor: 'pointer', position: 'relative' }}
                  onClick={(e) => { e.stopPropagation(); setShowReactions(showReactions === msg._id ? null : msg._id); }}
                >
                  <a
                    href={msg.mediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--mc-diamond)', textDecoration: 'none' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span style={{ fontSize: '24px' }}>📎</span>
                    <div>
                      <div style={{ fontFamily: 'var(--mc-font-body)', fontSize: '16px' }}>{msg.fileName || 'File'}</div>
                      <div style={{ fontFamily: 'var(--mc-font-body)', fontSize: '13px', color: '#888' }}>Tap to download</div>
                    </div>
                  </a>
                  <div className="chat__message-time">{formatTime(msg.createdAt)}</div>
                  <MessageReactions reactions={msg.reactions} messageId={msg._id} myId={myId} onReact={handleReact} />
                  {showReactions === msg._id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                        display: 'flex', gap: '2px', background: 'var(--mc-stone-dark)',
                        border: '2px solid var(--mc-border-dark)', padding: '4px 6px', zIndex: 50,
                      }}
                    >
                      {REACTION_EMOJIS.map((em) => (
                        <button key={em} onClick={() => handleReact(msg._id, em)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', padding: '2px' }}>
                          {em}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg._id}
              className={`chat__message ${sent ? 'chat__message--sent' : 'chat__message--received'}`}
              style={{ position: 'relative' }}
            >
              {!sent && (
                <div className="chat__message-avatar">
                  {AVATARS[(partnerInfo?.username?.charCodeAt(0) || 0) % AVATARS.length]}
                </div>
              )}
              <div
                className="chat__message-bubble"
                style={{ cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); setShowReactions(showReactions === msg._id ? null : msg._id); }}
              >
                <div className="chat__message-text">{msg.text}</div>
                <div className="chat__message-time">{formatTime(msg.createdAt)}</div>
                <MessageReactions reactions={msg.reactions} messageId={msg._id} myId={myId} onReact={handleReact} />
                {showReactions === msg._id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute', bottom: '100%', left: sent ? 'auto' : '0', right: sent ? '0' : 'auto',
                      display: 'flex', gap: '2px', background: 'var(--mc-stone-dark)',
                      border: '2px solid var(--mc-border-dark)', padding: '4px 6px', zIndex: 50,
                    }}
                  >
                    {REACTION_EMOJIS.map((em) => (
                      <button key={em} onClick={() => handleReact(msg._id, em)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', padding: '2px' }}>
                        {em}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="chat__input-area" style={{ position: 'relative' }}>
        {showEmoji && (
          <div ref={emojiRef}>
            <EmojiPicker
              onSelect={(em) => setNewMessage((prev) => prev + em)}
              onClose={() => setShowEmoji(false)}
            />
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*,.pdf,.doc,.docx,.txt,.zip"
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="chat__action-btn"
            disabled={uploading || !connected}
            title="Send file or photo"
            style={{
              background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer',
              padding: '6px', opacity: uploading ? 0.4 : 1,
            }}
          >
            {uploading ? '⏳' : '📎'}
          </button>
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            className="chat__action-btn"
            style={{
              background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '6px',
            }}
          >
            😊
          </button>
          <div className="chat__input-wrapper" style={{ flex: 1 }}>
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="chat__input"
              disabled={!connected}
            />
          </div>
        </div>
        <button
          onClick={() => handleSend('coin')}
          className="chat__coin-btn"
          disabled={!connected}
          title="Send coin celebration"
        >
          🪙
        </button>
        <button
          onClick={() => handleSend('text')}
          className="chat__send-btn"
          disabled={!newMessage.trim() || !connected}
        >
          ➤
        </button>
      </div>
    </div>
  );
}

function AICoachChat() {
  const { formatCurrency } = useSettings();
  const [aiMessages, setAiMessages] = useState([
    {
      id: 'intro',
      text: "Hi! I'm your Minecraft savings coach! 🧑‍🏫 Ask me anything about saving, budgeting, or reaching your goals!",
      isAI: true,
      createdAt: new Date().toISOString(),
    },
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [coachData, setCoachData] = useState({ goals: [], profile: null });
  const messagesEndRef = useRef(null);
  const [showEmoji, setShowEmoji] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, isTyping]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [goalsRes, profileRes] = await Promise.all([
          api.get('/savings/goals').catch(() => null),
          api.get('/users/profile').catch(() => null),
        ]);
        if (cancelled) return;
        setCoachData({
          goals: goalsRes?.data?.goals || [],
          profile: profileRes?.data?.user || profileRes?.data?.profile || null,
        });
      } catch {
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    const userMsg = {
      id: Date.now(),
      text: newMessage.trim(),
      isAI: false,
      createdAt: new Date().toISOString(),
    };
    setAiMessages((prev) => [...prev, userMsg]);
    setNewMessage('');
    setIsTyping(true);

    const delay = 800 + Math.random() * 1200;
    setTimeout(() => {
      const aiResponse = {
        id: Date.now() + 1,
        text: getAIResponse(userMsg.text, { ...coachData, fmt: formatCurrency }),
        isAI: true,
        createdAt: new Date().toISOString(),
      };
      setAiMessages((prev) => [...prev, aiResponse]);
      setIsTyping(false);
    }, delay);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {aiMessages.map((msg) => (
          <div key={msg.id} className={`chat__message ${msg.isAI ? 'chat__message--received' : 'chat__message--sent'}`}>
            {msg.isAI && (
              <div className="chat__message-avatar" style={{ backgroundColor: 'var(--mc-diamond)', color: 'var(--mc-obsidian)' }}>
                🧑‍🏫
              </div>
            )}
            <div className="chat__message-bubble" style={msg.isAI ? { borderLeft: '3px solid var(--mc-diamond)' } : undefined}>
              <div className="chat__message-text">{msg.text}</div>
              <div className="chat__message-time">{formatTime(msg.createdAt)}</div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="chat__message chat__message--received">
            <div className="chat__message-avatar" style={{ backgroundColor: 'var(--mc-diamond)', color: 'var(--mc-obsidian)' }}>
              🧑‍🏫
            </div>
            <div className="chat__message-bubble">
              <div className="chat__typing">
                <div className="chat__typing-dots">
                  <div className="chat__typing-dot" />
                  <div className="chat__typing-dot" />
                  <div className="chat__typing-dot" />
                </div>
                <span className="chat__typing-text">Coach is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat__input-area" style={{ position: 'relative' }}>
        {showEmoji && (
          <EmojiPicker
            onSelect={(em) => setNewMessage((prev) => prev + em)}
            onClose={() => setShowEmoji(false)}
          />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '6px' }}
          >
            😊
          </button>
          <div className="chat__input-wrapper" style={{ flex: 1 }}>
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask your savings coach..."
              className="chat__input"
            />
          </div>
        </div>
        <button onClick={handleSend} className="chat__send-btn" disabled={!newMessage.trim()}>
          ➤
        </button>
      </div>
    </div>
  );
}

function GroupsTab() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', icon: '🎯', description: '' });
  const [createError, setCreateError] = useState(null);

  const fetchChallenges = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/challenges');
      setChallenges(data.challenges || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const handleJoin = async (challenge) => {
    const key = challenge.key;
    setBusyKey(key);
    try {
      await api.post(`/challenges/${key}/join`);
      playClick();
      setChallenges((prev) =>
        prev.map((c) =>
          c.key === key ? { ...c, joined: true, members: (c.members || 0) + (c.joined ? 0 : 1) } : c
        )
      );
    } catch {
    } finally {
      setBusyKey(null);
    }
  };

  const handleLeave = async (challenge) => {
    const key = challenge.key;
    setBusyKey(key);
    try {
      await api.post(`/challenges/${key}/leave`);
      playClick();
      setChallenges((prev) =>
        prev.map((c) =>
          c.key === key ? { ...c, joined: false, members: Math.max(0, (c.members || 0) - 1) } : c
        )
      );
    } catch {
    } finally {
      setBusyKey(null);
    }
  };

  const handleCreate = async () => {
    if (!createForm.name.trim()) {
      setCreateError('Enter a challenge name');
      return;
    }
    try {
      setCreating(true);
      setCreateError(null);
      const { data } = await api.post('/challenges', {
        name: createForm.name.trim(),
        icon: createForm.icon || '🎯',
        description: createForm.description.trim(),
      });
      playClick();
      setChallenges((prev) => [data.challenge, ...prev]);
      setShowCreate(false);
      setCreateForm({ name: '', icon: '🎯', description: '' });
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create challenge');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ fontFamily: 'var(--mc-font-pixel)', fontSize: '11px', color: 'var(--mc-gold)', textShadow: '1px 1px 0 var(--mc-text-shadow)' }}>
        Savings Challenges
      </div>
      <div style={{ fontFamily: 'var(--mc-font-body)', fontSize: '18px', color: '#AAA', lineHeight: '1.3' }}>
        Join a challenge to earn +10 XP and keep each other motivated!
      </div>

      <div>
        <Button variant="gold" size="sm" onClick={() => setShowCreate(true)}>＋ Create Challenge</Button>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: '120px' }} />)}
        </div>
      )}

      {!loading && challenges.length === 0 && (
        <div style={{ fontFamily: "'VT323', monospace", fontSize: '20px', color: '#888', textAlign: 'center', padding: '24px' }}>
          No challenges available right now.
        </div>
      )}

      {challenges.map((group) => (
        <div
          key={group.key}
          className="mc-block"
          style={{
            backgroundColor: 'var(--mc-stone-dark)',
            boxShadow: 'var(--mc-shadow-3d)',
            padding: '16px',
            animation: 'slide-up 0.3s ease-out',
            borderLeft: group.joined ? '4px solid var(--mc-emerald)' : undefined,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            <div style={{
              width: '48px', height: '48px', backgroundColor: 'var(--mc-slot-bg)',
              boxShadow: 'var(--mc-shadow-3d-sm)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '24px', flexShrink: 0,
            }}>
              {group.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--mc-font-pixel)', fontSize: '10px', color: 'var(--mc-text)', textShadow: '1px 1px 0 var(--mc-text-shadow)', marginBottom: '4px' }}>
                {group.name}
              </div>
              <div style={{ fontFamily: 'var(--mc-font-body)', fontSize: '16px', color: 'var(--mc-emerald)' }}>
                {group.members.toLocaleString()} players
              </div>
            </div>
          </div>
          <div style={{ fontFamily: 'var(--mc-font-body)', fontSize: '20px', color: '#AAA', marginBottom: '12px', lineHeight: '1.3' }}>
            {group.description}
          </div>
          <Button
            variant={group.joined ? 'secondary' : 'primary'}
            size="sm"
            fullWidth
            disabled={busyKey === group.key}
            onClick={() => (group.joined ? handleLeave(group) : handleJoin(group))}
          >
            {busyKey === group.key ? '...' : group.joined ? '✓ Joined' : 'Join Challenge'}
          </Button>
        </div>
      ))}

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div className="modal__header">
              <div className="modal__title">New Challenge</div>
              <button className="modal__close" onClick={() => setShowCreate(false)}>×</button>
            </div>
            <div className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#999', marginBottom: '6px' }}>NAME</div>
                <input className="mc-input" value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value.slice(0, 60) }))} placeholder="e.g., No Junk Food August" style={{ width: '100%' }} />
              </div>
              <div>
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#999', marginBottom: '6px' }}>ICON (any emoji)</div>
                <input className="mc-input" value={createForm.icon} onChange={(e) => setCreateForm((f) => ({ ...f, icon: e.target.value.slice(0, 4) }))} placeholder="🎯" style={{ width: '80px', textAlign: 'center', fontSize: '22px' }} />
              </div>
              <div>
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#999', marginBottom: '6px' }}>DESCRIPTION</div>
                <textarea className="mc-input" value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value.slice(0, 200) }))} placeholder="What's the challenge?" rows={3} style={{ width: '100%', resize: 'vertical' }} />
              </div>
              {createError && (
                <div style={{ fontFamily: "'VT323', monospace", fontSize: '18px', color: 'var(--mc-redstone)' }}>{createError}</div>
              )}
            </div>
            <div className="modal__footer">
              <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleCreate} disabled={creating}>{creating ? 'Creating...' : 'Create Challenge'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const AVATARS = ['🧑‍🌾', '👷', '🧙', '🧝', '🦹', '👸', '🤴', '🦸'];
const TABS = [
  { key: 'partner', label: 'Partner', icon: '💑' },
  { key: 'ai', label: 'AI Coach', icon: '🧑‍🏫' },
  { key: 'groups', label: 'Groups', icon: '👥' },
];

export default function ChatPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('partner');

  return (
    <div className="chat">
      <div
        style={{
          display: 'flex',
          borderBottom: '3px solid var(--mc-border-dark)',
          backgroundColor: 'rgba(27, 16, 41, 0.9)',
          backdropFilter: 'blur(4px)',
          flexShrink: 0,
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { playClick(); setActiveTab(tab.key); }}
            style={{
              flex: 1,
              padding: '12px 8px',
              background: activeTab === tab.key ? 'var(--mc-stone-dark)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.key ? '3px solid var(--mc-diamond)' : '3px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              transition: 'background-color 0.15s',
            }}
          >
            <span style={{ fontSize: '18px' }}>{tab.icon}</span>
            <span
              style={{
                fontFamily: 'var(--mc-font-pixel)',
                fontSize: '8px',
                color: activeTab === tab.key ? 'var(--mc-diamond)' : '#888',
                textShadow: activeTab === tab.key ? '1px 1px 0 var(--mc-text-shadow)' : 'none',
              }}
            >
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'partner' && <PartnerChat user={user} />}
        {activeTab === 'ai' && <AICoachChat />}
        {activeTab === 'groups' && (
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <GroupsTab />
          </div>
        )}
      </div>
    </div>
  );
}
