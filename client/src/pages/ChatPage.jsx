import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import useSocket from '../hooks/useSocket';
import Button from '../components/common/Button';
import { playSend, playClick, playMessage } from '../utils/sounds';

const AI_RESPONSES = {
  goal: [
    "Setting goals is like building a diamond pickaxe - you need a clear plan! Break your big goal into smaller blocks. Each $5 saved is another block placed! 💎",
    "Great goals are like enchanting tables - they need the right ingredients. Try the SMART method: Specific, Measurable, Achievable, Relevant, Time-bound! 🧱",
    "Remember, every big castle started with placing one block. Your savings goal is the blueprint - now start building! 🏰",
  ],
  save: [
    "Pro tip: Try the 50/30/20 rule - 50% needs, 30% wants, 20% savings. It's like sorting your inventory into the right slots! 🎒",
    "Auto-saving is like a redstone contraption - set it up once and it works while you're mining! Set up recurring transfers! ⚙️",
    "The best savings trick? Pay yourself first. Transfer savings before you spend, just like hoarding diamonds before a creeper encounter! 💰",
  ],
  spend: [
    "Before buying, ask: do I need this, or do I want this? It's like choosing between iron armor and diamond - know when to invest! 🛡️",
    "Track every purchase for a week. You'll find 'leakage' like a potion brewing stand with a cracked block. Plug those leaks! 🧪",
    "Try the 24-hour rule - wait a day before non-essential purchases. If you still want it tomorrow, it might be worth the XP! ✨",
  ],
  motivation: [
    "You're doing amazing! Every coin saved is experience gained. Keep grinding and you'll reach that level-up! 🌟",
    "Remember why you started. Whether it's a dream home or a vacation, your future self will thank you for every block you place today! 💪",
    "Saving together with your partner is like having a teammate in a raid. You're unstoppable as a team! Keep going! ⚔️",
    "Small consistent deposits beat big occasional ones. It's like mining - one block at a time builds an empire! 👑",
  ],
  default: [
    "Here's a fun fact: if you save just $5 a day, you'll have $1,825 in a year! That's enough for a pretty nice diamond armor set! ⛏️",
    "The average couple spends 20% more when they don't track expenses together. Good thing you're using Jairex! 💑",
    "Emergency funds are like keeping a totem of undying in your inventory - you hope you never need it, but you'll be glad it's there! 🛡️",
    "Did you know? Couples who save together report higher relationship satisfaction. You're not just building wealth - you're building trust! 💕",
  ],
};

function getAIResponse(message, ctx = {}) {
  const lower = message.toLowerCase();
  const categories = ['goal', 'save', 'spend', 'motivation'];
  for (const cat of categories) {
    const keywords = {
      goal: ['goal', 'target', 'plan', 'objective', 'dream', 'afford'],
      save: ['save', 'saving', 'deposit', 'budget', 'invest', 'money'],
      spend: ['spend', 'bought', 'buy', 'purchase', 'expensive', 'cost', 'price'],
      motivation: ['motivat', 'give up', 'tired', 'hard', 'lazy', 'quit', 'stuck'],
    };
    if (keywords[cat].some((kw) => lower.includes(kw))) {
      const responses = AI_RESPONSES[cat];
      return responses[Math.floor(Math.random() * responses.length)];
    }
  }

  const { goals = [], profile = null, fmt } = ctx;
  const stats = profile?.stats || {};

  if (goals.length > 0) {
    const g = goals[0];
    const cur = g.currentAmount || 0;
    const target = g.targetAmount || 1;
    const pct = Math.min(100, Math.round((cur / target) * 100));
    const money = fmt ? fmt(cur) : String(cur);
    if (stats.streak > 0) {
      return `You're on a ${stats.streak}-day streak 🔥 Keep it going! Your "${g.goalName}" is ${pct}% full (${money} saved). Stay consistent and it's yours!`;
    }
    return `Looking at your goals, "${g.goalName}" is ${pct}% there — ${money} saved so far. Keep dropping those coins in the pig! 🐷`;
  }

  if (stats.totalSaved > 0) {
    return `You've saved ${fmt ? fmt(stats.totalSaved) : stats.totalSaved} in total so far. Nice work — every coin counts! 💰`;
  }

  if (stats.level > 1 || stats.xp > 0) {
    return `You're Level ${stats.level} with ${stats.xp} XP. The more you save together, the faster that level bar fills! ⭐`;
  }

  const defaults = AI_RESPONSES.default;
  return defaults[Math.floor(Math.random() * defaults.length)];
}

function formatTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  // Fetch couple + partner info
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
        // not in a couple
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchPartner();
    return () => { cancelled = true; };
  }, []);

  // Join socket room when couple is known
  useEffect(() => {
    if (socket && coupleId) {
      socket.emit('join-couple', coupleId);
    }
  }, [socket, coupleId]);

  // Fetch message history
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
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchMessages();
  }, [partnerId]);

  // Listen for realtime messages
  useEffect(() => {
    if (!socket) return;
    const handler = (payload) => {
      const msg = payload?.message || payload;
      setMessages((prev) => [...prev, msg]);
      const myId = user?._id || user?.id;
      const isMine =
        msg.self ||
        msg.sender === myId ||
        msg.sender?._id === myId ||
        msg.sender?.id === myId;
      if (!isMine) playMessage();
    };
    socket.on('new-message', handler);
    return () => socket.off('new-message', handler);
  }, [socket, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (type = 'text') => {
    if ((!newMessage.trim() && type === 'text') || !socket || !connected) return;
    const text = type === 'coin' ? '🪙' : newMessage.trim();
    const msg = {
      coupleId,
      recipientId: partnerId,
      text,
      type,
      sender: user?._id || user?.id,
      recipient: partnerId,
      createdAt: new Date().toISOString(),
    };
    socket.emit('chat-message', msg);
    setMessages((prev) => [...prev, { ...msg, self: true, _id: `local-${Date.now()}` }]);
    if (type === 'text') setNewMessage('');
    playSend();
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
        <div
          style={{
            fontFamily: 'var(--mc-font-pixel)',
            fontSize: '10px',
            color: '#888',
            lineHeight: '2',
          }}
        >
          Link with your partner to start chatting!
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Messages */}
      <div
        className="chat__messages"
        style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}
      >
        {!connected && (
          <div
            style={{
              textAlign: 'center',
              fontFamily: 'var(--mc-font-pixel)',
              fontSize: '8px',
              color: '#888',
              padding: '8px',
            }}
          >
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
        {messages.map((msg, i) => {
          const isCoin = msg.type === 'coin';
          const myId = user?._id || user?.id;
          const isSent =
            msg.self ||
            msg.sender === myId ||
            msg.sender?._id === myId ||
            msg.sender?.id === myId;

          if (isCoin) {
            return (
              <div key={i} className="chat__message chat__message--coin">
                <div className="chat__message-bubble">
                  <span className="chat__coin-icon">🪙</span>
                  <span className="chat__coin-text">Savings Milestone!</span>
                  <div className="chat__message-time">{formatTime(msg.createdAt)}</div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={i}
              className={`chat__message ${isSent ? 'chat__message--sent' : 'chat__message--received'}`}
            >
              {!isSent && (
                <div className="chat__message-avatar">
                  {AVATARS[(partnerInfo?.username?.charCodeAt(0) || 0) % AVATARS.length]}
                </div>
              )}
              <div className="chat__message-bubble">
                <div className="chat__message-text">{msg.text}</div>
                <div className="chat__message-time">{formatTime(msg.createdAt)}</div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat__input-area">
        <div className="chat__input-wrapper">
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="chat__input"
            disabled={!connected}
          />
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, isTyping]);

  // Load the user's real data so the coach can give personal advice
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
        // silent
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
      {/* AI messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {aiMessages.map((msg) => (
          <div
            key={msg.id}
            className={`chat__message ${msg.isAI ? 'chat__message--received' : 'chat__message--sent'}`}
          >
            {msg.isAI && (
              <div
                className="chat__message-avatar"
                style={{ backgroundColor: 'var(--mc-diamond)', color: 'var(--mc-obsidian)' }}
              >
                🧑‍🏫
              </div>
            )}
            <div
              className="chat__message-bubble"
              style={
                msg.isAI
                  ? {
                      borderLeft: '3px solid var(--mc-diamond)',
                    }
                  : undefined
              }
            >
              <div className="chat__message-text">{msg.text}</div>
              <div className="chat__message-time">{formatTime(msg.createdAt)}</div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="chat__message chat__message--received">
            <div
              className="chat__message-avatar"
              style={{ backgroundColor: 'var(--mc-diamond)', color: 'var(--mc-obsidian)' }}
            >
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

      {/* Input */}
      <div className="chat__input-area">
        <div className="chat__input-wrapper">
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your savings coach..."
            className="chat__input"
          />
        </div>
        <button
          onClick={handleSend}
          className="chat__send-btn"
          disabled={!newMessage.trim()}
        >
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

  const fetchChallenges = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/challenges');
      setChallenges(data.challenges || []);
    } catch {
      // silent
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
          c.key === key
            ? { ...c, joined: true, members: (c.members || 0) + (c.joined ? 0 : 1) }
            : c
        )
      );
    } catch {
      // silent
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
          c.key === key
            ? { ...c, joined: false, members: Math.max(0, (c.members || 0) - 1) }
            : c
        )
      );
    } catch {
      // silent
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div
        style={{
          fontFamily: 'var(--mc-font-pixel)',
          fontSize: '11px',
          color: 'var(--mc-gold)',
          textShadow: '1px 1px 0 var(--mc-text-shadow)',
        }}
      >
        Savings Challenges
      </div>
      <div
        style={{
          fontFamily: 'var(--mc-font-body)',
          fontSize: '18px',
          color: '#AAA',
          lineHeight: '1.3',
        }}
      >
        Join a challenge to earn +10 XP and keep each other motivated!
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: '120px' }} />
          ))}
        </div>
      )}

      {!loading && challenges.length === 0 && (
        <div
          style={{
            fontFamily: "'VT323', monospace",
            fontSize: '20px',
            color: '#888',
            textAlign: 'center',
            padding: '24px',
          }}
        >
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
            <div
              style={{
                width: '48px',
                height: '48px',
                backgroundColor: 'var(--mc-slot-bg)',
                boxShadow: 'var(--mc-shadow-3d-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                flexShrink: 0,
              }}
            >
              {group.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: 'var(--mc-font-pixel)',
                  fontSize: '10px',
                  color: 'var(--mc-text)',
                  textShadow: '1px 1px 0 var(--mc-text-shadow)',
                  marginBottom: '4px',
                }}
              >
                {group.name}
              </div>
              <div
                style={{
                  fontFamily: 'var(--mc-font-body)',
                  fontSize: '16px',
                  color: 'var(--mc-emerald)',
                }}
              >
                {group.members.toLocaleString()} players
              </div>
            </div>
          </div>
          <div
            style={{
              fontFamily: 'var(--mc-font-body)',
              fontSize: '20px',
              color: '#AAA',
              marginBottom: '12px',
              lineHeight: '1.3',
            }}
          >
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
      {/* Tab bar */}
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
            onClick={() => {
              playClick();
              setActiveTab(tab.key);
            }}
            style={{
              flex: 1,
              padding: '12px 8px',
              background: activeTab === tab.key ? 'var(--mc-stone-dark)' : 'transparent',
              border: 'none',
              borderBottom:
                activeTab === tab.key ? '3px solid var(--mc-diamond)' : '3px solid transparent',
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
                textShadow:
                  activeTab === tab.key ? '1px 1px 0 var(--mc-text-shadow)' : 'none',
              }}
            >
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
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
