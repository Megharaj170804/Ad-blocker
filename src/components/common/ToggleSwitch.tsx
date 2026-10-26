import React from 'react';

interface ToggleSwitchProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  id,
  checked,
  onChange,
  disabled = false,
  label,
  size = 'md',
}) => {
  const sizeStyles = {
    sm: { width: '32px', height: '18px', circle: '14px', translate: '14px' },
    md: { width: '42px', height: '24px', circle: '18px', translate: '18px' },
    lg: { width: '52px', height: '30px', circle: '22px', translate: '22px' },
  }[size];

  const handleToggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <label
      htmlFor={id}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        userSelect: 'none',
      }}
    >
      <div
        role="switch"
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        onClick={handleToggle}
        style={{
          position: 'relative',
          width: sizeStyles.width,
          height: sizeStyles.height,
          backgroundColor: checked ? 'var(--accent-emerald)' : 'var(--border-strong)',
          borderRadius: 'var(--radius-full)',
          transition: 'background-color var(--transition-smooth)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '50%',
            left: '3px',
            transform: checked
              ? `translate(${sizeStyles.translate}, -50%)`
              : 'translate(0, -50%)',
            width: sizeStyles.circle,
            height: sizeStyles.circle,
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-full)',
            transition: 'transform var(--transition-smooth)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
          }}
        />
      </div>
      {label && (
        <span
          style={{
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--text-primary)',
          }}
        >
          {label}
        </span>
      )}
    </label>
  );
};
