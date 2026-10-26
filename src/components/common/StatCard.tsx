import React from 'react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  subtitle?: string;
  highlight?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  subtitle,
  highlight = false,
}) => {
  return (
    <div
      style={{
        backgroundColor: highlight ? 'var(--accent-emerald-subtle)' : 'var(--bg-card)',
        border: `1px solid ${highlight ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)'}`,
        borderRadius: 'var(--radius-md)',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        boxShadow: 'var(--shadow-sm)',
        transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {title}
        </span>
        <span style={{ color: highlight ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
          {icon}
        </span>
      </div>

      <div
        style={{
          fontSize: '1.4rem',
          fontWeight: 700,
          color: highlight ? 'var(--accent-emerald)' : 'var(--text-primary)',
          letterSpacing: '-0.02em',
        }}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>

      {subtitle && (
        <span
          style={{
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
          }}
        >
          {subtitle}
        </span>
      )}
    </div>
  );
};
