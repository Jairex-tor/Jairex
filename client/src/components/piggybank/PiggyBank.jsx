import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Button from '../common/Button';
import MinecraftCharacter from '../common/MinecraftCharacter';
import { useSettings } from '../../context/SettingsContext';
import { playCoinDrop, playClick } from '../../utils/sounds';

const PINK = '#F4A6C0';
const PINK_DARK = '#E08DA0';
const PINK_SHADOW = '#C87A8E';
const BLACK = '#1A1A1A';
const WHITE = '#FFFFFF';
const GOLD = '#FCDB05';
const GOLD_DARK = '#B8860B';
const SLOT_COLOR = '#3A2A1A';

function SparkleParticles({ progress }) {
  const [sparkles, setSparkles] = useState([]);
  const counterRef = useRef(0);

  useEffect(() => {
    if (progress < 0.1) return;
    const count = Math.floor(progress * 6) + 1;
    const interval = setInterval(() => {
      const id = counterRef.current++;
      const x = 20 + Math.random() * 60;
      const delay = Math.random() * 0.5;
      const dur = 1.2 + Math.random() * 1.5;
      setSparkles((prev) => [...prev.slice(-12), { id, x, delay, dur }]);
    }, 800 / count);
    return () => clearInterval(interval);
  }, [progress]);

  useEffect(() => {
    if (sparkles.length === 0) return;
    const t = setTimeout(() => {
      setSparkles((prev) => prev.slice(1));
    }, 3000);
    return () => clearTimeout(t);
  }, [sparkles]);

  return (
    <>
      {sparkles.map((s) => (
        <div
          key={s.id}
          style={{
            position: 'absolute',
            left: `${s.x}%`,
            top: '30%',
            width: '6px',
            height: '6px',
            zIndex: 20,
            pointerEvents: 'none',
            animation: `sparkleFloat ${s.dur}s ease-out ${s.delay}s forwards`,
          }}
        >
          <svg width="6" height="6" viewBox="0 0 10 10">
            <polygon points="5,0 6,3 10,4 6,5 5,9 4,5 0,4 4,3" fill={GOLD} opacity="0.8" />
          </svg>
        </div>
      ))}
    </>
  );
}

export default function PiggyBank({
  currentAmount = 0,
  targetAmount = 1,
  onFeed,
  me = {},
  partner = {},
  feedTrigger = 0,
  members = null,
}) {
  const { formatCurrency } = useSettings();
  const [isAnimating, setIsAnimating] = useState(false);
  const [coins, setCoins] = useState([]);
  const [particles, setParticles] = useState([]);
  const [activeFeeder, setActiveFeeder] = useState(null);
  const [bounceKey, setBounceKey] = useState(0);
  const particleCounter = useRef(0);

  const chars = useMemo(() => {
    if (members && members.length > 0) return members;
    const list = [];
    if (partner && partner.username) list.push({ ...partner, side: 'left' });
    list.push({ ...me, side: 'right' });
    return list;
  }, [members, me, partner]);

  const progress = useMemo(() => {
    if (!targetAmount || targetAmount <= 0) return 0;
    return Math.min(currentAmount / targetAmount, 1);
  }, [currentAmount, targetAmount]);

  const pigScale = useMemo(() => 0.9 + progress * 0.25, [progress]);

  const milestone = useMemo(() => {
    if (progress >= 1) return { text: 'COMPLETE!', color: '#FFD700', glow: 'rgba(255,215,0,0.6)' };
    if (progress >= 0.75) return { text: '75%!', color: '#55FF55', glow: 'rgba(85,255,85,0.4)' };
    if (progress >= 0.5) return { text: '50%', color: '#55FFFF', glow: 'rgba(85,255,255,0.3)' };
    if (progress >= 0.25) return { text: '25%', color: '#FF9B50', glow: 'rgba(255,155,80,0.3)' };
    return null;
  }, [progress]);

  const spawnParticles = useCallback(() => {
    const count = 5 + Math.floor(Math.random() * 4);
    const newParticles = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: particleCounter.current++,
        x: 45 + Math.random() * 10,
        y: 25 + Math.random() * 10,
        vx: (Math.random() - 0.5) * 60,
        vy: -20 - Math.random() * 40,
        size: 3 + Math.random() * 4,
        color: [GOLD, '#FFD700', '#FFA500', '#FFE44D'][Math.floor(Math.random() * 4)],
      });
    }
    setParticles((prev) => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newParticles.includes(p)));
    }, 1200);
  }, []);

  const runFeedAnimation = useCallback((side) => {
    setIsAnimating(true);
    setActiveFeeder(side);
    setBounceKey((k) => k + 1);

    playCoinDrop();
    spawnParticles();

    const id = Date.now();
    setCoins((prev) => [...prev, { id, side }]);

    window.setTimeout(() => {
      setCoins((prev) => prev.filter((c) => c.id !== id));
    }, 1100);
    window.setTimeout(() => {
      setActiveFeeder(null);
      setIsAnimating(false);
    }, 900);
  }, [spawnParticles]);

  const handleFeed = () => {
    playClick();
    if (isAnimating) return;
    runFeedAnimation('right');
    if (onFeed) onFeed();
  };

  useEffect(() => {
    if (feedTrigger > 0) {
      runFeedAnimation('right');
    }
  }, [feedTrigger, runFeedAnimation]);

  const fillHeight = 68 * progress;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        width: '100%',
      }}
    >
      {/* Stage: characters + pig */}
      <div className="pig-stage" style={{ position: 'relative', width: '100%', minHeight: '340px' }}>
        {/* Background glow based on progress */}
        {progress > 0.05 && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '20%',
              transform: 'translate(-50%, -50%)',
              width: `${120 + progress * 80}px`,
              height: `${120 + progress * 80}px`,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${milestone?.glow || 'rgba(252,219,5,0.12)'} 0%, transparent 70%)`,
              pointerEvents: 'none',
              zIndex: 1,
              transition: 'all 0.6s ease',
              animation: progress >= 1 ? 'milestoneGlow 2s ease-in-out infinite' : undefined,
            }}
          />
        )}

        {/* Sparkle particles */}
        <SparkleParticles progress={progress} />

        {/* Burst particles on feed */}
        {particles.map((p) => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              borderRadius: '50%',
              backgroundColor: p.color,
              zIndex: 25,
              pointerEvents: 'none',
              animation: 'particleBurst 1.2s ease-out forwards',
              '--pvx': `${p.vx}px`,
              '--pvy': `${p.vy}px`,
            }}
          />
        ))}

        {/* Coin flights */}
        {coins.map((c) => (
          <div
            key={c.id}
            style={{
              position: 'absolute',
              left: c.side === 'left' ? '2%' : '88%',
              top: '58%',
              width: '26px',
              height: '26px',
              marginLeft: '-13px',
              marginTop: '-13px',
              zIndex: 30,
              animation: c.side === 'left' ? 'coinFlyLeft 0.9s ease-out forwards' : 'coinFlyRight 0.9s ease-out forwards',
              pointerEvents: 'none',
            }}
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              style={{ display: 'block', animation: 'coinSpin 0.9s linear forwards' }}
            >
              <circle cx="12" cy="12" r="10" fill={GOLD} stroke={GOLD_DARK} strokeWidth="2" />
              <text x="12" y="16" textAnchor="middle" fontSize="11" fontFamily="'Press Start 2P', monospace" fill={GOLD_DARK}>
                {formatCurrency(1, { showSymbol: true }).charAt(0)}
              </text>
            </svg>
          </div>
        ))}

        {/* Characters */}
        {chars.map((c, idx) => {
          const total = chars.length;
          const side = idx === 0 ? 'left' : idx === total - 1 ? 'right' : 'left';
          const cls = `pig-stage__char pig-stage__char--${side}${activeFeeder === side ? ' pig-stage__char--feeding' : ''}`;
          const shirtColors = ['#3E8948', '#3F6DB3', '#E85D75', '#9B59B6', '#E67E22', '#1ABC9C'];
          return (
            <div key={c._id || idx} className={cls}>
              <MinecraftCharacter
                avatar={c.avatar}
                username={c.username}
                size={120}
                state={activeFeeder === side ? 'feeding' : 'walk'}
                shirt={shirtColors[idx % shirtColors.length]}
                pants="#2C3E70"
                onReact={() => playClick()}
              />
              <span className="pig-stage__char-name">{c.username || 'You'}</span>
            </div>
          );
        })}

        {/* Pig */}
        <div className="pig-stage__pig" style={{ position: 'absolute', left: '50%', top: '8%', transform: 'translateX(-50%)', zIndex: 5 }}>
          <div
            onClick={handleFeed}
            title="Click the pig!"
            key={bounceKey}
            style={{
              cursor: 'pointer',
              userSelect: 'none',
              animation: bounceKey > 0
                ? 'pigBounce 0.6s ease-out'
                : 'pigIdle 3s ease-in-out infinite',
              transform: `scale(${pigScale})`,
              transition: 'transform 0.4s ease',
              filter: progress >= 1 ? 'drop-shadow(0 0 12px rgba(255,215,0,0.5))' : undefined,
            }}
          >
            <svg
              width="300"
              height="240"
              viewBox="0 0 200 160"
              style={{ display: 'block', overflow: 'visible', maxWidth: '100%', height: 'auto' }}
            >
              <defs>
                <linearGradient id="pigGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GOLD} stopOpacity={0.15 + progress * 0.25} />
                  <stop offset="100%" stopColor={PINK} stopOpacity={0} />
                </linearGradient>
              </defs>

              {/* Shadow on ground */}
              <ellipse cx="100" cy="148" rx="70" ry="6" fill="rgba(0,0,0,0.15)" />

              {/* Tail - curly */}
              <rect x="175" y="42" width="6" height="4" fill={PINK_DARK} />
              <rect x="181" y="38" width="6" height="4" fill={PINK_DARK} />
              <rect x="185" y="42" width="6" height="4" fill={PINK_DARK} />
              <rect x="181" y="46" width="6" height="4" fill={PINK_DARK} />

              {/* Back legs */}
              <rect x="135" y="118" width="14" height="22" fill={PINK_SHADOW} />
              <rect x="150" y="118" width="14" height="22" fill={PINK_SHADOW} />

              {/* Body */}
              <rect x="30" y="36" width="150" height="84" rx="8" fill={PINK} />

              {/* Gold glow overlay when filling */}
              <rect x="30" y="36" width="150" height="84" rx="8" fill="url(#pigGlow)" />

              {/* Belly fill (progress overlay) */}
              <clipPath id="bellyClip">
                <rect x="30" y="36" width="150" height="84" rx="8" />
              </clipPath>
              <rect
                x="30"
                y={36 + 84 - fillHeight}
                width="150"
                height={fillHeight}
                fill={GOLD}
                opacity={0.25 + progress * 0.2}
                clipPath="url(#bellyClip)"
              />
              {/* Bubbles inside the gold fill */}
              {progress > 0.15 && (
                <>
                  <circle cx="60" cy={36 + 84 - fillHeight * 0.3} r="3" fill={GOLD} opacity="0.15" clipPath="url(#bellyClip)" />
                  <circle cx="120" cy={36 + 84 - fillHeight * 0.6} r="2" fill={GOLD} opacity="0.12" clipPath="url(#bellyClip)" />
                  <circle cx="90" cy={36 + 84 - fillHeight * 0.45} r="4" fill={GOLD} opacity="0.1" clipPath="url(#bellyClip)" />
                </>
              )}

              {/* Body pixel texture lines */}
              <rect x="30" y="56" width="150" height="1" fill="rgba(0,0,0,0.06)" />
              <rect x="30" y="76" width="150" height="1" fill="rgba(0,0,0,0.06)" />
              <rect x="30" y="96" width="150" height="1" fill="rgba(0,0,0,0.06)" />

              {/* Front legs */}
              <rect x="38" y="118" width="14" height="22" fill={PINK_SHADOW} />
              <rect x="55" y="118" width="14" height="22" fill={PINK_SHADOW} />

              {/* Hooves */}
              <rect x="38" y="134" width="14" height="6" fill={PINK_DARK} />
              <rect x="55" y="134" width="14" height="6" fill={PINK_DARK} />
              <rect x="135" y="134" width="14" height="6" fill={PINK_DARK} />
              <rect x="150" y="134" width="14" height="6" fill={PINK_DARK} />

              {/* Head */}
              <rect x="10" y="24" width="50" height="60" rx="4" fill={PINK} />

              {/* Ears */}
              <rect x="12" y="12" width="14" height="16" fill={PINK_DARK} />
              <rect x="14" y="14" width="10" height="12" fill={PINK} />
              <rect x="42" y="12" width="14" height="16" fill={PINK_DARK} />
              <rect x="44" y="14" width="10" height="12" fill={PINK} />

              {/* Snout */}
              <rect x="16" y="46" width="30" height="22" rx="3" fill={PINK_DARK} />

              {/* Nostrils */}
              <rect x="22" y="52" width="7" height="7" rx="2" fill={PINK_SHADOW} />
              <rect x="33" y="52" width="7" height="7" rx="2" fill={PINK_SHADOW} />

              {/* Blush cheeks when progress is high */}
              {progress > 0.5 && (
                <>
                  <circle cx="14" cy="50" r="5" fill="#FF6B8A" opacity={0.15 + (progress - 0.5) * 0.4} />
                  <circle cx="54" cy="50" r="5" fill="#FF6B8A" opacity={0.15 + (progress - 0.5) * 0.4} />
                </>
              )}

              {/* Eyes */}
              <rect x="22" y="34" width="8" height="8" rx="1" fill={BLACK} />
              <rect x="40" y="34" width="8" height="8" rx="1" fill={BLACK} />

              {/* Eye shine */}
              <rect x="24" y="35" width="3" height="3" fill={WHITE} />
              <rect x="42" y="35" width="3" height="3" fill={WHITE} />

              {/* Coin slot on top */}
              <rect x="80" y="32" width="40" height="8" rx="2" fill={SLOT_COLOR} />
              <rect x="82" y="33" width="36" height="2" fill="rgba(255,255,255,0.08)" />
              {/* Slot glow at high progress */}
              {progress > 0.5 && (
                <rect x="82" y="33" width="36" height="2" fill={GOLD} opacity={0.1 + progress * 0.15} rx="1" />
              )}
            </svg>
          </div>
        </div>

        {/* Ground platform */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: '10%',
            width: '80%',
            height: '18px',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        >
          <svg width="100%" height="18" preserveAspectRatio="none" viewBox="0 0 200 18">
            <rect x="0" y="0" width="200" height="4" fill="#5C8A32" />
            <rect x="0" y="4" width="200" height="14" fill="#8B6C42" />
            <rect x="0" y="0" width="200" height="2" fill="#6FAA3E" opacity="0.5" />
            {/* Dirt pixel texture */}
            {[12, 35, 58, 82, 108, 138, 165].map((x) => (
              <rect key={x} x={x} y="7" width="3" height="3" fill="#7A5E38" opacity="0.4" />
            ))}
            {[22, 50, 90, 120, 155].map((x) => (
              <rect key={x} x={x} y="11" width="2" height="2" fill="#7A5E38" opacity="0.3" />
            ))}
          </svg>
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          height: '16px',
          background: 'var(--mc-stone-dark)',
          border: '2px solid var(--mc-border-dark)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.min(progress * 100, 100)}%`,
            background: progress >= 1
              ? 'linear-gradient(90deg, #FFD700, #FFA500, #FFD700)'
              : progress >= 0.5
                ? 'linear-gradient(90deg, var(--mc-emerald), #55FF55)'
                : 'linear-gradient(90deg, var(--mc-diamond), #55CCFF)',
            transition: 'width 0.6s ease',
            boxShadow: progress >= 1 ? '0 0 8px rgba(255,215,0,0.5)' : undefined,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '7px',
            color: 'white',
            textShadow: '1px 1px 0 rgba(0,0,0,0.6)',
          }}
        >
          {Math.round(progress * 100)}%
        </div>
      </div>

      {/* Balance display */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '10px',
            color: 'var(--mc-text)',
            textShadow: '1px 1px 0 var(--mc-text-shadow)',
            marginBottom: '6px',
          }}
        >
          Total Saved
        </div>
        <div
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '30px',
            color: 'var(--mc-gold)',
            textShadow: '2px 2px 0 var(--mc-text-shadow), 0 0 20px rgba(252, 219, 5, 0.3)',
          }}
        >
          {formatCurrency(currentAmount)}
        </div>
        {targetAmount > 0 && (
          <div
            style={{
              fontFamily: "'VT323', monospace",
              fontSize: '20px',
              color: '#AAA',
              marginTop: '4px',
            }}
          >
            of {formatCurrency(targetAmount)} goal
          </div>
        )}
        {milestone && (
          <div
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '10px',
              color: milestone.color,
              textShadow: `1px 1px 0 rgba(0,0,0,0.5), 0 0 10px ${milestone.glow}`,
              marginTop: '6px',
              animation: progress >= 1 ? 'milestonePulse 1.5s ease-in-out infinite' : undefined,
            }}
          >
            {progress >= 1 ? '🎉 ' + milestone.text + ' 🎉' : '⭐ ' + milestone.text}
          </div>
        )}
      </div>

      {/* Feed button */}
      <Button variant="gold" onClick={handleFeed} disabled={isAnimating}>
        🪙 Feed Coins
      </Button>

      <style>{`
        @keyframes pigIdle {
          0%, 100% { transform: translateY(0) rotate(0deg) scale(${pigScale}); }
          25% { transform: translateY(-4px) rotate(1deg) scale(${pigScale}); }
          50% { transform: translateY(-1px) rotate(0deg) scale(${pigScale}); }
          75% { transform: translateY(-4px) rotate(-1deg) scale(${pigScale}); }
        }
        @keyframes pigWiggle {
          0% { transform: scale(${pigScale}); }
          15% { transform: scale(${pigScale}) rotate(-5deg); }
          30% { transform: scale(${pigScale}) rotate(5deg); }
          45% { transform: scale(${pigScale}) rotate(-3deg); }
          60% { transform: scale(${pigScale}) rotate(3deg); }
          75% { transform: scale(${pigScale}) rotate(-1deg); }
          100% { transform: scale(${pigScale}); }
        }
        @keyframes pigBounce {
          0% { transform: scale(${pigScale}) translateY(0); }
          20% { transform: scale(${pigScale}) translateY(-12px); }
          40% { transform: scale(${pigScale * 1.05}) translateY(0); }
          55% { transform: scale(${pigScale}) translateY(-5px); }
          70% { transform: scale(${pigScale * 1.02}) translateY(0); }
          85% { transform: scale(${pigScale}) translateY(-2px); }
          100% { transform: scale(${pigScale}) translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes charHop {
          0% { transform: translateY(0); }
          20% { transform: translateY(-14px) rotate(-4deg); }
          40% { transform: translateY(0) rotate(2deg); }
          60% { transform: translateY(-10px) rotate(-2deg); }
          100% { transform: translateY(0) rotate(0); }
        }
        @keyframes coinFlyLeft {
          0% { left: 2%; top: 58%; opacity: 0; }
          12% { opacity: 1; }
          55% { left: 50%; top: 6%; opacity: 1; }
          78% { left: 53%; top: 20%; opacity: 1; }
          100% { left: 52%; top: 22%; opacity: 0; }
        }
        @keyframes coinFlyRight {
          0% { left: 88%; top: 58%; opacity: 0; }
          12% { opacity: 1; }
          55% { left: 50%; top: 6%; opacity: 1; }
          78% { left: 47%; top: 20%; opacity: 1; }
          100% { left: 48%; top: 22%; opacity: 0; }
        }
        @keyframes coinSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes particleBurst {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(var(--pvx), var(--pvy)) scale(0); opacity: 0; }
        }
        @keyframes sparkleFloat {
          0% { transform: translateY(0) scale(0); opacity: 0; }
          20% { transform: translateY(-5px) scale(1.2); opacity: 1; }
          100% { transform: translateY(-40px) scale(0.3); opacity: 0; }
        }
        @keyframes milestoneGlow {
          0%, 100% { filter: drop-shadow(0 0 12px rgba(255,215,0,0.4)); }
          50% { filter: drop-shadow(0 0 20px rgba(255,215,0,0.7)); }
        }
        @keyframes milestonePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
