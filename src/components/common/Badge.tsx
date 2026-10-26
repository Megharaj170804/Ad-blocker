import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
}) => {
  const variantStyles: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
    success: {
      bg: 'var(--accent-emerald-subtle)',
      text: 'var(--accent-emerald)',
      border: 'rgba(16, 185, 129, 0.25)',
    },
    warning: {
      bg: 'var(--accent-warning-subtle)',
      text: 'var(--accent-warning)',
      border: 'rgba(245, 158, 11, 0.25)',
    },
    danger: {
      bg: 'var(--accent-danger-subtle)',
      text: 'var(--accent-danger)',
      border: 'rgba(239, 68, 68, 0.25)',
    },
    info: {
      bg: 'var(--accent-indigo-subtle)',
      text: 'var(--accent-indigo)',
      border: 'rgba(99, 102, 241, 0.25)',
    },
    neutral: {
      bg: 'var(--bg-tertiary)',
      text: 'var(--text-secondary)',
      border: 'var(--border-subtle)',
    },
  };

  const style = variantStyles[variant];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: size === 'sm' ? '2px 6px' : '4px 10px',
        fontSize: size === 'sm' ? '0.675rem' : '0.75rem',
        fontWeight: 600,
        borderRadius: 'var(--radius-full)',
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </span>
  );
};
