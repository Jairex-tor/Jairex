export function isImageAvatar(avatar) {
  return typeof avatar === 'string' && avatar.length > 0 && (avatar.startsWith('http') || avatar.startsWith('/uploads') || avatar.startsWith('data:'));
}

export function PixelAvatar({ avatar, username, fontSize = 18 }) {
  if (isImageAvatar(avatar)) {
    return (
      <img
        src={avatar}
        alt={username || 'avatar'}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          imageRendering: 'pixelated',
        }}
      />
    );
  }
  return (
    <span style={{ fontSize: `${fontSize}px`, lineHeight: 1 }}>{avatar || '🧑'}</span>
  );
}