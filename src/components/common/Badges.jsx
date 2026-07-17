import React from 'react';

export const getStatusColors = (status) => {
  const colors = {
    'New': { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' }, // Blue
    'Quoted': { bg: 'rgba(234, 179, 8, 0.15)', text: '#facc15', border: 'rgba(234, 179, 8, 0.3)' }, // Yellow
    'Follow Up': { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' }, // Purple
    'Booked': { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' }, // Emerald Green
    'Dispatched': { bg: 'rgba(6, 182, 212, 0.15)', text: '#22d3ee', border: 'rgba(6, 182, 212, 0.3)' }, // Cyan
    'In Transit': { bg: 'rgba(249, 115, 22, 0.15)', text: '#fb923c', border: 'rgba(249, 115, 22, 0.3)' }, // Orange
    'Picked Up': { bg: 'rgba(236, 72, 153, 0.15)', text: '#f472b6', border: 'rgba(236, 72, 153, 0.3)' }, // Pink
    'Delivered': { bg: 'rgba(99, 102, 241, 0.15)', text: '#818cf8', border: 'rgba(99, 102, 241, 0.3)' }, // Indigo (distinct from Booked)
    'Completed': { bg: 'rgba(20, 184, 166, 0.15)', text: '#2dd4bf', border: 'rgba(20, 184, 166, 0.3)' }, // Teal
    'Canceled': { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' }, // Red
  };
  return colors[status] || { bg: 'rgba(255,255,255,0.1)', text: '#a1a1aa', border: 'rgba(255,255,255,0.2)' };
};

export const StatusBadge = ({ status }) => {
  const style = getStatusColors(status);

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
  // Multiply by a large prime to distribute close strings (like "Dealer" / "Repeat") far apart on the color wheel
  const hue = Math.abs((hash * 137) % 360);
  
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

export const getAgentColors = (name) => {
  const n = name || 'Unassigned';
  if (n === 'Unassigned') {
    return { bg: 'transparent', text: 'var(--text-muted)', border: 'transparent', hue: 0 };
  }
  let hash = 0;
  for (let i = 0; i < n.length; i++) {
    hash = n.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs((hash * 137) % 360);
  return {
    bg: `hsla(${hue}, 70%, 50%, 0.15)`,
    text: `hsl(${hue}, 70%, 65%)`,
    border: `hsla(${hue}, 70%, 50%, 0.3)`,
    hue
  };
};

export const AgentBadge = ({ name }) => {
  const n = name || 'Unassigned';
  if (n === 'Unassigned') {
    return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Unassigned</span>;
  }

  const { bg, text, border, hue } = getAgentColors(n);
  const initials = n.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{
        width: '26px', height: '26px', borderRadius: '50%',
        backgroundColor: bg,
        color: text,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.75rem', fontWeight: 'bold', border: `1px solid ${border}`
      }}>
        {initials}
      </div>
      <span style={{ fontWeight: '500', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{n}</span>
    </div>
  );
};
