import { useState, useMemo, useEffect, useCallback } from 'react';
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

export default function PiggyBank({
  currentAmount = 0,
  targetAmount = 1,
  onFeed,
  me = {},
  partner = {},
  feedTrigger = 0,
}) {
  const { formatCurrency } = useSettings();
  const [isAnimating, setIsAnimating] = useState(false);
  const [coins, setCoins] = useState([]);
  const [activeFeeder, setActiveFeeder] = useState(null);

  const progress = useMemo(() => {
    if (!targetAmount || targetAmount <= 0) return 0;
    return Math.min(currentAmount / targetAmount, 1);
  }, [currentAmount, targetAmount]);

  const pigScale = useMemo(() => 0.9 + progress * 0.25, [progress]);

  const runFeedAnimation = useCallback((side) => {
    setIsAnimating(true);
    setActiveFeeder(side);

    playCoinDrop();

    const id = Date.now();
    setCoins((prev) => [...prev, { id, side }]);

    window.setTimeout(() => {
      setCoins((prev) => prev.filter((c) => c.id !== id));
    }, 1100);
    window.setTimeout(() => {
      setActiveFeeder(null);
      setIsAnimating(false);
    }, 900);
  }, []);

  const handleFeed = () => {
    playClick();
    if (isAnimating) return;
    runFeedAnimation('right');
    if (onFeed) onFeed();
  };

  // Trigger animation on real deposits (feedTrigger increments from the page)
  useEffect(() => {
    if (feedTrigger > 0) {
      runFeedAnimation('right');
    }
  }, [feedTrigger, runFeedAnimation]);

  const fillHeight = 68 * progress;
  const meName = me.username || 'You';
  const partnerName = partner.username || 'Partner';

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
              <text
                x="12"
                y="16"
                textAnchor="middle"
                fontSize="11"
                fontFamily="'Press Start 2P', monospace"
                fill={GOLD_DARK}
              >
                {formatCurrency(1, { showSymbol: true }).charAt(0)}
              </text>
            </svg>
          </div>
        ))}

        {/* Partner character (left) */}
        <div
          className={`pig-stage__char pig-stage__char--left${activeFeeder === 'left' ? ' pig-stage__char--feeding' : ''}`}
        >
          <MinecraftCharacter
            avatar={partner.avatar}
            username={partner.username}
            size={120}
            state={activeFeeder === 'left' ? 'feeding' : 'walk'}
            shirt="#3E8948"
            pants="#2C3E70"
          />
          <span className="pig-stage__char-name">{partnerName}</span>
        </div>

        {/* Me character (right) */}
        <div
          className={`pig-stage__char pig-stage__char--right${activeFeeder === 'right' ? ' pig-stage__char--feeding' : ''}`}
        >
          <MinecraftCharacter
            avatar={me.avatar}
            username={me.username}
            size={120}
            state={activeFeeder === 'right' ? 'feeding' : 'walk'}
            shirt="#3F6DB3"
            pants="#2C3E70"
          />
          <span className="pig-stage__char-name">{meName}</span>
        </div>

        {/* Pig */}
        <div className="pig-stage__pig" style={{ position: 'absolute', left: '50%', top: '8%', transform: 'translateX(-50%)', zIndex: 5 }}>
          <div
            onClick={handleFeed}
            title="Click the pig!"
            style={{
              cursor: 'pointer',
              userSelect: 'none',
              animation: !isAnimating ? 'pigIdle 3s ease-in-out infinite' : 'pigWiggle 0.5s ease-in-out',
              transform: `scale(${pigScale})`,
              transition: 'transform 0.4s ease',
            }}
          >
          <svg
            width="300"
            height="240"
            viewBox="0 0 200 160"
            style={{ display: 'block', overflow: 'visible', maxWidth: '100%', height: 'auto' }}
          >
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
              opacity="0.35"
              clipPath="url(#bellyClip)"
            />

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

            {/* Eyes */}
            <rect x="22" y="34" width="8" height="8" rx="1" fill={BLACK} />
            <rect x="40" y="34" width="8" height="8" rx="1" fill={BLACK} />

            {/* Eye shine */}
            <rect x="24" y="35" width="3" height="3" fill={WHITE} />
            <rect x="42" y="35" width="3" height="3" fill={WHITE} />

            {/* Coin slot on top */}
            <rect x="80" y="32" width="40" height="8" rx="2" fill={SLOT_COLOR} />
            <rect x="82" y="33" width="36" height="2" fill="rgba(255,255,255,0.08)" />
          </svg>
          </div>
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
      `}</style>
    </div>
  );
}