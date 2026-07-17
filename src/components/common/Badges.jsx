import React from 'react';

export const getStatusColors = (status) => {
  const colors = {
    'New': { hue: 217, sat: 90 }, // Blue
    'Quoted': { hue: 45, sat: 93 }, // Yellow
    'Follow Up': { hue: 271, sat: 91 }, // Purple
    'Booked': { hue: 160, sat: 84 }, // Emerald
    'Dispatched': { hue: 189, sat: 94 }, // Cyan
    'In Transit': { hue: 25, sat: 95 }, // Orange
    'Picked Up': { hue: 330, sat: 81 }, // Pink
    'Delivered': { hue: 232, sat: 89 }, // Indigo
    'Completed': { hue: 173, sat: 80 }, // Teal
    'Canceled': { hue: 0, sat: 84 }, // Red
  };
  const c = colors[status];
  if (!c) return { bg: 'rgba(255,255,255,0.1)', text: 'var(--text-muted)', border: 'rgba(255,255,255,0.2)' };
  
  return {
    bg: `hsla(${c.hue}, ${c.sat}%, 50%, 0.15)`,
    text: `hsl(${c.hue}, ${c.sat}%, var(--badge-text-l, 65%))`,
    border: `hsla(${c.hue}, ${c.sat}%, 50%, 0.3)`
  };
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
    text: `hsl(${hue}, 70%, var(--badge-text-l, 65%))`,
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
