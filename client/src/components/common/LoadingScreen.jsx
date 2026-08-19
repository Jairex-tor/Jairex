import { useState, useEffect, useCallback } from 'react';

const MESSAGES = [
  'Generating world...',
  'Placing blocks...',
  'Feeding the pigs...',
  'Counting diamonds...',
  'Building your bank...',
  'Almost ready...',
];

const TOTAL_DURATION = 4000;
const MESSAGE_INTERVAL = 700;

export default function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const start = performance.now();
    let msgTimer;
    let raf;

    function tick(now) {
      const elapsed = now - start;
      const pct = Math.min((elapsed / TOTAL_DURATION) * 100, 100);
      setProgress(pct);

      if (pct < 100) {
        raf = requestAnimationFrame(tick);
      } else {
        setDone(true);
      }
    }

    raf = requestAnimationFrame(tick);

    msgTimer = setInterval(() => {
      setMessageIndex((i) => (i + 1) % MESSAGES.length);
    }, MESSAGE_INTERVAL);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(msgTimer);
    };
  }, []);

  useEffect(() => {
    if (done && onComplete) {
      const t = setTimeout(onComplete, 400);
      return () => clearTimeout(t);
    }
  }, [done, onComplete]);

  const handleReveal = useCallback(() => {
    if (done && onComplete) onComplete();
  }, [done, onComplete]);

  return (
    <div style={styles.overlay} onClick={handleReveal}>
      {/* Dirt tile background */}
      <div style={styles.dirtBg} />

      {/* Content */}
      <div style={styles.content}>
        {/* Pig pixel art */}
        <div style={styles.pigContainer}>
          <svg
            width="64"
            height="56"
            viewBox="0 0 16 14"
            style={styles.pigSvg}
          >
            {/* Head */}
            <rect x="2" y="0" width="12" height="10" fill="#F0A0B0" />
            {/* Ears */}
            <rect x="1" y="0" width="2" height="2" fill="#D08090" />
            <rect x="13" y="0" width="2" height="2" fill="#D08090" />
            {/* Eyes */}
            <rect x="4" y="3" width="2" height="2" fill="#2A2A2A" />
            <rect x="10" y="3" width="2" height="2" fill="#2A2A2A" />
            <rect x="4" y="3" width="1" height="1" fill="#FFFFFF" />
            <rect x="10" y="3" width="1" height="1" fill="#FFFFFF" />
            {/* Snout */}
            <rect x="5" y="6" width="6" height="3" fill="#E8889A" />
            {/* Nostrils */}
            <rect x="6" y="7" width="1" height="1" fill="#C06878" />
            <rect x="9" y="7" width="1" height="1" fill="#C06878" />
            {/* Body */}
            <rect x="3" y="10" width="10" height="4" fill="#F0A0B0" />
            {/* Legs */}
            <rect x="3" y="12" width="2" height="2" fill="#E0909A" />
            <rect x="11" y="12" width="2" height="2" fill="#E0909A" />
            {/* Hooves */}
            <rect x="3" y="13" width="2" height="1" fill="#8B6914" />
            <rect x="11" y="13" width="2" height="1" fill="#8B6914" />
          </svg>
        </div>

        {/* Title */}
        <h1 style={styles.title}>Jairex</h1>
        <p style={styles.subtitle}>A Minecraft Savings Adventure</p>

        {/* Loading bar container */}
        <div style={styles.barOuter}>
          {/* Segmented fill */}
          <div style={styles.barTrack}>
            <div style={{ ...styles.barFill, width: `${progress}%` }} />
            {/* Segment lines */}
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                style={{
                  ...styles.segmentLine,
                  left: `${((i + 1) / 20) * 100}%`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Loading message */}
        <p style={styles.message}>{MESSAGES[messageIndex]}</p>

        {/* Hint */}
        {done && <p style={styles.hint}>Click anywhere to continue</p>}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  dirtBg: {
    position: 'absolute',
    inset: 0,
    backgroundColor: '#8B6914',
    backgroundImage: `
      repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(0,0,0,0.08) 4px, rgba(0,0,0,0.08) 5px),
      repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(0,0,0,0.06) 4px, rgba(0,0,0,0.06) 5px),
      repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(0,0,0,0.03) 8px, rgba(0,0,0,0.03) 12px)
    `,
  },
  content: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    padding: '40px',
  },
  pigContainer: {
    animation: 'pig-idle 2.5s ease-in-out infinite',
    marginBottom: '8px',
  },
  pigSvg: {
    imageRendering: 'pixelated',
  },
  title: {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: '32px',
    color: '#FCDB05',
    textShadow: '3px 3px 0 #3F3F3F, 6px 6px 0 rgba(0,0,0,0.3)',
    letterSpacing: '2px',
    margin: 0,
  },
  subtitle: {
    fontFamily: "'VT323', monospace",
    fontSize: '24px',
    color: '#4AEDD9',
    textShadow: '1px 1px 0 #3F3F3F',
    margin: 0,
  },
  barOuter: {
    width: '320px',
    maxWidth: '80vw',
    marginTop: '16px',
  },
  barTrack: {
    position: 'relative',
    height: '20px',
    backgroundColor: '#1A1A1A',
    border: '3px solid #373737',
    boxShadow: 'inset 1px 1px 0 #111',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#5D8C2E',
    backgroundImage: `
      repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(0,0,0,0.15) 8px, rgba(0,0,0,0.15) 10px)
    `,
    transition: 'width 0.1s linear',
    position: 'relative',
  },
  segmentLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '1px',
    backgroundColor: 'rgba(0,0,0,0.2)',
    pointerEvents: 'none',
  },
  message: {
    fontFamily: "'VT323', monospace",
    fontSize: '20px',
    color: '#FFFFFF',
    textShadow: '1px 1px 0 #3F3F3F',
    margin: 0,
    minHeight: '28px',
  },
  hint: {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: '8px',
    color: '#999',
    margin: 0,
    marginTop: '8px',
    animation: 'pulse 2s ease-in-out infinite',
  },
};
