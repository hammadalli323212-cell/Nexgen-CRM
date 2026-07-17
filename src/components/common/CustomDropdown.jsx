import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export const CustomDropdown = ({ value, options, onChange, renderButton, renderOption, buttonStyle, dropdownStyle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ cursor: 'pointer', ...buttonStyle }}
      >
        {renderButton ? renderButton(selectedOption, isOpen) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{selectedOption?.label || 'Select...'}</span>
            <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
          </div>
        )}
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: '8px',
          backgroundColor: '#1e293b', // Tailwind slate-800
          border: '1px solid #334155', // Tailwind slate-700
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          zIndex: 50,
          minWidth: '200px',
          maxHeight: '300px',
          overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
          padding: '6px',
          ...dropdownStyle
        }}>
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                borderRadius: '8px',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: value === opt.value ? 'rgba(255,255,255,0.05)' : 'transparent',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = value === opt.value ? 'rgba(255,255,255,0.05)' : 'transparent' }}
            >
              <div style={{ flex: 1 }}>
                {renderOption ? renderOption(opt) : <span style={{ color: '#f8fafc', fontSize: '0.9rem', fontWeight: '500' }}>{opt.label}</span>}
              </div>
              {value === opt.value && <Check size={14} color="#3b82f6" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
