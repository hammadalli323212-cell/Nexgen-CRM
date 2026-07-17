import React from 'react';

export const StatusBadge = ({ status }) => {
  const colors = {
    'New': { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
    'Quoted': { bg: 'rgba(234, 179, 8, 0.15)', text: '#facc15', border: 'rgba(234, 179, 8, 0.3)' },
    'Follow Up': { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' },
    'Booked': { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
    'Dispatched': { bg: 'rgba(6, 182, 212, 0.15)', text: '#22d3ee', border: 'rgba(6, 182, 212, 0.3)' },
    'In Transit': { bg: 'rgba(249, 115, 22, 0.15)', text: '#fb923c', border: 'rgba(249, 115, 22, 0.3)' },
    'Picked Up': { bg: 'rgba(249, 115, 22, 0.15)', text: '#fb923c', border: 'rgba(249, 115, 22, 0.3)' },
    'Delivered': { bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.3)' },
    'Completed': { bg: 'rgba(20, 184, 166, 0.15)', text: '#2dd4bf', border: 'rgba(20, 184, 166, 0.3)' },
    'Canceled': { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
  };

  const style = colors[status] || { bg: 'rgba(255,255,255,0.1)', text: '#a1a1aa', border: 'rgba(255,255,255,0.2)' };

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600',
      backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}`,
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)', letterSpacing: '0.5px', textTransform: 'uppercase',
      whiteSpace: 'nowrap'
    }}>
      {status || 'Unknown'}
    </span>
  );
};

export const SourceBadge = ({ source }) => {
  const s = source || 'Unknown';
  
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ 
        width: '8px', height: '8px', borderRadius: '50%', 
        backgroundColor: `hsl(${hue}, 70%, 50%)`, 
        boxShadow: `0 0 8px hsl(${hue}, 70%, 50%)` 
      }}></div>
      <span style={{ fontWeight: '500', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{s}</span>
    </div>
  );
};

export const AgentBadge = ({ name }) => {
  const n = name || 'Unassigned';
  if (n === 'Unassigned') {
    return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Unassigned</span>;
  }

  let hash = 0;
  for (let i = 0; i < n.length; i++) {
    hash = n.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  const initials = n.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{
        width: '26px', height: '26px', borderRadius: '50%',
        backgroundColor: `hsla(${hue}, 70%, 50%, 0.15)`,
        color: `hsl(${hue}, 70%, 65%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.75rem', fontWeight: 'bold', border: `1px solid hsla(${hue}, 70%, 50%, 0.3)`
      }}>
        {initials}
      </div>
      <span style={{ fontWeight: '500', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{n}</span>
    </div>
  );
};
