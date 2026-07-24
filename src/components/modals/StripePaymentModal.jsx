import React, { useState } from 'react';
import { X, Send, CheckCircle, Copy, ShieldCheck, DollarSign, CreditCard } from 'lucide-react';
import { toast } from 'react-hot-toast';
import styles from './StripePaymentModal.module.css';

const StripePaymentModal = ({ isOpen, onClose, lead, onPaymentComplete }) => {
  const [amount, setAmount] = useState(() => {
    if (!lead) return '100';
    const est = parseFloat(lead.tariff?.replace(/[^0-9.]/g, '') || lead.estimated_price || 0);
    const pay = parseFloat(lead.carrierPay?.replace(/[^0-9.]/g, '') || lead.carrier_pay || 0);
    const deposit = est > pay ? est - pay : 150;
    return deposit > 0 ? deposit.toString() : '150';
  });
  const [customerEmail, setCustomerEmail] = useState(lead?.customerEmail || lead?.customers?.email || '');
  const [loading, setLoading] = useState(false);
  const [createdInvoiceUrl, setCreatedInvoiceUrl] = useState('');

  if (!isOpen || !lead) return null;

  const leadNumberStr = lead.lead_number ? `NG-${lead.lead_number}` : lead.displayId || 'New Lead';

  // Handle generating Stripe Invoice Link
  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid deposit amount.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/stripe-create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          leadNumber: lead.lead_number || lead.id,
          amount: parseFloat(amount),
          customerEmail: customerEmail,
          customerName: lead.customer || 'Shipper',
          description: `Deposit for Order ${leadNumberStr}`
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create invoice');

      setCreatedInvoiceUrl(data.url);
      toast.success('Stripe Invoice Link Created Successfully!');
      if (onPaymentComplete) onPaymentComplete();
    } catch (err) {
      console.error('Invoice Creation Error:', err);
      toast.error(err.message || 'Error creating Stripe invoice.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Invoice URL copied to clipboard!');
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <CreditCard className={styles.icon} />
            <div>
              <h3>Send Stripe Credit Card Invoice</h3>
              <span className={styles.subtitle}>Lead {leadNumberStr} • {lead.customer || 'Shipper'}</span>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Sandbox Indicator */}
        <div className={styles.sandboxBadge}>
          <ShieldCheck size={16} />
          <span>Stripe Sandbox Mode Active — Secure Invoice Generator</span>
        </div>

        {/* Invoice Form */}
        <form onSubmit={handleCreateInvoice} className={styles.form}>
          <div className={styles.field}>
            <label>Deposit / Invoice Amount ($USD)</label>
            <div className={styles.inputGroup}>
              <DollarSign size={18} className={styles.inputIcon} />
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="150.00"
                required
              />
            </div>
          </div>

          <div className={styles.field}>
            <label>Customer Email Address</label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="customer@example.com"
              required
            />
          </div>

          {createdInvoiceUrl ? (
            <div className={styles.successBox}>
              <CheckCircle size={24} className={styles.successIcon} />
              <div>
                <h4>Invoice Link Created!</h4>
                <p>Send this secure Stripe payment link to the customer:</p>
                <div className={styles.urlBox}>
                  <input type="text" readOnly value={createdInvoiceUrl} />
                  <button type="button" onClick={() => copyToClipboard(createdInvoiceUrl)}>
                    <Copy size={16} /> Copy
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.actions}>
              <button type="button" className={styles.cancelBtn} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                <Send size={16} style={{ marginRight: '6px' }} />
                {loading ? 'Generating Link...' : 'Generate & Send Invoice Link'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default StripePaymentModal;
