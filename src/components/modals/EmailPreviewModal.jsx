import React, { useState, useEffect, useRef } from 'react';

export default function EmailPreviewModal({ isOpen, onClose, onSend, emailPreview, customerEmail }) {
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [isSending, setIsSending] = useState(false);
  const iframeRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setCc('');
      setBcc('');
      setSubject(emailPreview?.subject || '');
    }
  }, [isOpen, emailPreview]);

  useEffect(() => {
    if (iframeRef.current && emailPreview?.previewHtml) {
      const doc = iframeRef.current.contentWindow.document;
      doc.open();
      doc.write(emailPreview.previewHtml);
      doc.close();
    }
  }, [emailPreview, isOpen]);

  if (!isOpen || !emailPreview) return null;

  const handleSend = async () => {
    setIsSending(true);
    await onSend({ cc: cc.trim(), bcc: bcc.trim(), customSubject: subject.trim() });
    setIsSending(false);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Email Preview</h2>
          <button onClick={onClose} style={styles.closeBtn} disabled={isSending}>×</button>
        </div>
        
        <div style={styles.body}>
          <div style={styles.fieldGroup}>
            <span style={styles.label}>From:</span>
            <div style={styles.valueBox}>{emailPreview.from || 'NexGen Auto Transport'}</div>
          </div>
          
          <div style={styles.fieldGroup}>
            <span style={styles.label}>To:</span>
            <div style={styles.valueBox}>{customerEmail}</div>
          </div>

          <div style={styles.fieldGroup}>
            <span style={styles.label}>CC:</span>
            <input 
              style={styles.input} 
              type="text" 
              placeholder="e.g. spouse@email.com (optional)"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              disabled={isSending}
            />
          </div>

          <div style={styles.fieldGroup}>
            <span style={styles.label}>BCC:</span>
            <input 
              style={styles.input} 
              type="text" 
              placeholder="e.g. manager@email.com (optional)"
              value={bcc}
              onChange={(e) => setBcc(e.target.value)}
              disabled={isSending}
            />
          </div>

          <div style={styles.fieldGroup}>
            <span style={styles.label}>Subject:</span>
            <input 
              style={styles.input} 
              type="text" 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isSending}
            />
          </div>

          <div style={styles.previewContainer}>
            <span style={styles.previewLabel}>Message Preview:</span>
            <div style={styles.iframeWrapper}>
              <iframe 
                ref={iframeRef}
                title="Email Preview"
                style={styles.iframe}
              />
            </div>
          </div>
        </div>

        <div style={styles.footer}>
          <button onClick={onClose} style={styles.cancelBtn} disabled={isSending}>Cancel</button>
          <button onClick={handleSend} style={styles.sendBtn} disabled={isSending}>
            {isSending ? 'Sending...' : 'Send Email'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    backdropFilter: 'blur(4px)'
  },
  modal: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '800px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    border: '1px solid #334155',
    overflow: 'hidden'
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid #334155',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a'
  },
  title: {
    margin: 0,
    color: '#f8fafc',
    fontSize: '1.25rem',
    fontWeight: 600
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '1.75rem',
    cursor: 'pointer',
    padding: '0 8px',
    lineHeight: 1
  },
  body: {
    padding: '24px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  fieldGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  label: {
    width: '70px',
    color: '#94a3b8',
    fontSize: '0.9rem',
    fontWeight: 600,
    textAlign: 'right'
  },
  valueBox: {
    flex: 1,
    padding: '8px 12px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#e2e8f0',
    fontSize: '0.95rem'
  },
  input: {
    flex: 1,
    padding: '8px 12px',
    backgroundColor: '#0f172a',
    border: '1px solid #475569',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '0.95rem',
    outline: 'none'
  },
  previewContainer: {
    marginTop: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1
  },
  previewLabel: {
    color: '#94a3b8',
    fontSize: '0.9rem',
    fontWeight: 600,
  },
  iframeWrapper: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    overflow: 'hidden',
    height: '400px'
  },
  iframe: {
    width: '100%',
    height: '100%',
    border: 'none',
    display: 'block'
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid #334155',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    backgroundColor: '#0f172a'
  },
  cancelBtn: {
    padding: '10px 20px',
    backgroundColor: 'transparent',
    border: '1px solid #475569',
    color: '#cbd5e1',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'all 0.2s'
  },
  sendBtn: {
    padding: '10px 24px',
    backgroundColor: '#3b82f6',
    border: 'none',
    color: '#fff',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'all 0.2s',
    boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)'
  }
};
