import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth = false,
  disabled,
  style,
  ...props
}) => {
  const sizeStyles = {
    sm: { padding: '6px 10px', fontSize: '0.8rem', gap: '6px' },
    md: { padding: '8px 14px', fontSize: '0.875rem', gap: '8px' },
    lg: { padding: '12px 18px', fontSize: '1rem', gap: '10px' },
  }[size];

  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: 'var(--accent-emerald)',
          color: '#ffffff',
          border: '1px solid var(--accent-emerald)',
          boxShadow: 'var(--shadow-sm)',
        };
      case 'secondary':
        return {
          backgroundColor: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-subtle)',
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-strong)',
        };
      case 'danger':
        return {
          backgroundColor: 'var(--accent-danger)',
          color: '#ffffff',
          border: '1px solid var(--accent-danger)',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: 'var(--text-secondary)',
          border: '1px solid transparent',
        };
    }
  };

  return (
    <button
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--radius-md)',
        fontWeight: 500,
        width: fullWidth ? '100%' : 'auto',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all var(--transition-fast)',
        ...sizeStyles,
        ...getVariantStyles(),
        ...style,
      }}
      {...props}
    >
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </button>
  );
};
