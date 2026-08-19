import { useMemo } from 'react';

const VARIANT_CLASSES = {
  primary: 'mc-button mc-button--primary',
  secondary: 'mc-button',
  danger: 'mc-button mc-button--danger',
  gold: 'mc-button mc-button--gold',
};

const SIZE_CLASSES = {
  sm: 'mc-button--small',
  md: '',
  lg: 'mc-button--large',
};

export default function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  fullWidth = false,
  type = 'button',
  className = '',
  style: styleProp,
  ...rest
}) {
  const classes = useMemo(() => {
    const parts = [
      VARIANT_CLASSES[variant] || 'mc-button',
      SIZE_CLASSES[size] || '',
      fullWidth ? 'w-full' : '',
      className,
    ];
    return parts.filter(Boolean).join(' ');
  }, [variant, size, fullWidth, className]);

  const mergedStyle = fullWidth
    ? { ...styleProp, width: '100%', textAlign: 'center' }
    : styleProp;

  return (
    <button
      type={type}
      className={classes}
      style={mergedStyle}
      onClick={onClick}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
