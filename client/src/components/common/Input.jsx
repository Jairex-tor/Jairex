import { useMemo } from 'react';

export default function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  name,
  error,
  icon,
  disabled = false,
  className = '',
  style: styleProp,
  ...rest
}) {
  const wrapperStyle = useMemo(() => ({
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    width: '100%',
    ...styleProp,
  }), [styleProp]);

  const labelStyle = {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: '9px',
    color: 'var(--mc-text)',
    textShadow: '1px 1px 0 var(--mc-text-shadow)',
    letterSpacing: '0.5px',
  };

  const inputWrapperStyle = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  };

  const iconStyle = {
    position: 'absolute',
    left: '12px',
    display: 'flex',
    alignItems: 'center',
    color: '#666',
    pointerEvents: 'none',
    zIndex: 1,
  };

  const inputStyle = {
    width: '100%',
    ...(icon ? { paddingLeft: '40px' } : {}),
  };

  const errorStyle = {
    fontFamily: "'VT323', monospace",
    fontSize: '16px',
    color: 'var(--mc-redstone)',
    textShadow: '1px 1px 0 rgba(0,0,0,0.5)',
    marginTop: '2px',
  };

  return (
    <div style={wrapperStyle} className={className}>
      {label && <label style={labelStyle} htmlFor={name}>{label}</label>}
      <div style={inputWrapperStyle}>
        {icon && <span style={iconStyle}>{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          name={name}
          id={name}
          disabled={disabled}
          className="mc-input"
          style={inputStyle}
          {...rest}
        />
      </div>
      {error && <span style={errorStyle}>{error}</span>}
    </div>
  );
}
