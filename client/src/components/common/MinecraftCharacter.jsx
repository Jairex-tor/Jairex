import { useId, useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { isImageAvatar } from '../../utils/avatar';

const DEFAULT = {
  skin: '#C68E5B',
  hair: '#3A2A1A',
  shirt: '#3F6DB3',
  pants: '#2C3E70',
  shoes: '#4A3826',
};

const LINES = [
  'Keep those coins coming!',
  'Together we got this!',
  'Every block counts!',
  'Hi! Ready to save?',
  'Let us build it!',
  'One deposit at a time!',
];

export default function MinecraftCharacter({
  avatar,
  username,
  skin,
  hair,
  shirt,
  pants,
  shoes,
  size = 110,
  state = 'idle', // 'idle' | 'walk' | 'feeding' | 'wave'
  className = '',
  onReact,
}) {
  const clipId = useId().replace(/[:]/g, '');
  const faceId = `face-${clipId}`;
  const [bubble, setBubble] = useState(null);
  const timerRef = useRef(null);

  const react = useCallback(() => {
    const line = LINES[Math.floor(Math.random() * LINES.length)];
    setBubble(line);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setBubble(null), 2800);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const showWave = state === 'wave' || !!bubble;

  const c = {
    skin: skin || DEFAULT.skin,
    hair: hair || DEFAULT.hair,
    shirt: shirt || DEFAULT.shirt,
    pants: pants || DEFAULT.pants,
    shoes: shoes || DEFAULT.shoes,
  };

  const isImage = useMemo(() => isImageAvatar(avatar), [avatar]);

  return (
    <div
      className={`mc-char mc-char--${state} ${showWave ? 'mc-char--wave' : ''} ${className}`}
      style={{ width: size * (64 / 92), height: size, cursor: onReact ? 'pointer' : undefined }}
      title={username}
      onClick={onReact ? () => { react(); onReact(); } : undefined}
    >
      {bubble && (
        <div
          style={{
            position: 'absolute',
            top: -18,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#fff',
            border: '3px solid #1A1A1A',
            boxShadow: '2px 2px 0 rgba(0,0,0,0.35)',
            color: '#1A1A1A',
            fontFamily: "'VT323', monospace",
            fontSize: '15px',
            padding: '4px 10px',
            whiteSpace: 'nowrap',
            zIndex: 20,
            animation: 'mcBubblePop 0.2s ease-out',
          }}
        >
          {bubble}
        </div>
      )}
      <svg
        className="mc-char__svg"
        viewBox="0 0 64 92"
        width="100%"
        height="100%"
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* ground shadow */}
        <ellipse cx="32" cy="90.5" rx="26" ry="3.5" fill="rgba(0,0,0,0.28)" />

        {/* back hair (behind head) */}
        <rect x="10" y="2" width="44" height="16" fill={c.hair} />

        {/* legs */}
        <g className="mc-char__leg-left" style={{ transformBox: 'fill-box', transformOrigin: 'top center' }}>
          <rect x="19" y="72" width="12" height="14" fill={c.pants} />
          <rect x="19" y="72" width="12" height="3" fill="rgba(0,0,0,0.15)" />
          <rect x="19" y="84" width="13" height="7" fill={c.shoes} />
        </g>
        <g className="mc-char__leg-right" style={{ transformBox: 'fill-box', transformOrigin: 'top center' }}>
          <rect x="33" y="72" width="12" height="14" fill={c.pants} />
          <rect x="33" y="72" width="12" height="3" fill="rgba(0,0,0,0.15)" />
          <rect x="32" y="84" width="13" height="7" fill={c.shoes} />
        </g>

        {/* arms */}
        <g className="mc-char__arm-left" style={{ transformBox: 'fill-box', transformOrigin: 'top center' }}>
          <rect x="7" y="45" width="11" height="12" fill={c.shirt} />
          <rect x="7" y="57" width="11" height="15" fill={c.skin} />
          <rect x="7" y="45" width="11" height="2" fill="rgba(0,0,0,0.15)" />
        </g>
        <g className="mc-char__arm-right" style={{ transformBox: 'fill-box', transformOrigin: 'top center' }}>
          <rect x="46" y="45" width="11" height="12" fill={c.shirt} />
          <rect x="46" y="57" width="11" height="15" fill={c.skin} />
          <rect x="46" y="45" width="11" height="2" fill="rgba(0,0,0,0.15)" />
        </g>

        {/* torso */}
        <rect x="17" y="45" width="30" height="27" fill={c.shirt} />
        <rect x="17" y="45" width="30" height="2" fill="rgba(0,0,0,0.15)" />
        <rect x="41" y="47" width="6" height="25" fill="rgba(0,0,0,0.12)" />
        {/* belt */}
        <rect x="17" y="66" width="30" height="4" fill={c.pants} />
        <rect x="29" y="66" width="4" height="4" fill="#C9A227" />

        {/* head */}
        <g className="mc-char__head">
          <rect x="10" y="2" width="44" height="40" fill={c.skin} />
          {/* hair top + sides */}
          <rect x="10" y="2" width="44" height="12" fill={c.hair} />
          <rect x="10" y="12" width="5" height="26" fill={c.hair} />
          <rect x="49" y="12" width="5" height="26" fill={c.hair} />
          <rect x="10" y="2" width="44" height="2" fill="rgba(0,0,0,0.2)" />

          {/* face */}
          <clipPath id={faceId}>
            <rect x="15" y="14" width="34" height="24" />
          </clipPath>
          <g clipPath={`url(#${faceId})`}>
            {isImage ? (
              <image
                href={avatar}
                x="15"
                y="14"
                width="34"
                height="24"
                preserveAspectRatio="xMidYMid slice"
              />
            ) : (
              <text
                x="32"
                y="34"
                textAnchor="middle"
                fontSize="20"
              >
                {avatar}
              </text>
            )}
          </g>
        </g>
      </svg>

      <style>{`
        .mc-char__head { transform-box: fill-box; transform-origin: center bottom; }
        .mc-char--idle { animation: mcCharBob 3s ease-in-out infinite; }
        .mc-char--walk { animation: mcCharWalk 0.5s ease-in-out infinite; }
        .mc-char--walk .mc-char__leg-left { animation: mcCharLeg 0.5s ease-in-out infinite; }
        .mc-char--walk .mc-char__leg-right { animation: mcCharLeg 0.5s ease-in-out infinite reverse; }
        .mc-char--walk .mc-char__arm-left { animation: mcCharArm 0.5s ease-in-out infinite reverse; }
        .mc-char--walk .mc-char__arm-right { animation: mcCharArm 0.5s ease-in-out infinite; }
        .mc-char--feeding { animation: mcCharHop 0.9s ease-in-out; }
        .mc-char--feeding .mc-char__arm-right { animation: mcCharThrow 0.9s ease-in-out; }
        .mc-char--feeding .mc-char__arm-left { animation: mcCharArm 0.9s ease-in-out infinite; }
        .mc-char--wave { animation: mcCharWave 0.7s ease-in-out; }
        .mc-char--wave .mc-char__arm-right { animation: mcArmWave 0.7s ease-in-out; }
        @keyframes mcBubblePop {
          0% { transform: translateX(-50%) scale(0.6); opacity: 0; }
          100% { transform: translateX(-50%) scale(1); opacity: 1; }
        }
        @keyframes mcCharBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes mcCharWalk {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        @keyframes mcCharLeg {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(14deg); }
        }
        @keyframes mcCharArm {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(-12deg); }
        }
        @keyframes mcCharThrow {
          0% { transform: rotate(0deg); }
          30% { transform: rotate(-75deg); }
          60% { transform: rotate(-75deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes mcCharHop {
          0% { transform: translateY(0); }
          25% { transform: translateY(-16px); }
          50% { transform: translateY(0); }
          70% { transform: translateY(-8px); }
          100% { transform: translateY(0); }
        }
        @keyframes mcCharWave {
          0%, 100% { transform: translateY(0); }
          30% { transform: translateY(-12px); }
          60% { transform: translateY(0); }
        }
        @keyframes mcArmWave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-80deg); }
          50% { transform: rotate(-55deg); }
          75% { transform: rotate(-80deg); }
        }
      `}</style>
    </div>
  );
}