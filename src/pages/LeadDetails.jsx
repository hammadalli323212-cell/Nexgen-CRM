import toast from 'react-hot-toast';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, MapPin, DollarSign, Truck, ArrowLeft, Upload, Paperclip, Trash2, Edit2, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateOrderPDF } from '../lib/pdfGenerator';
import { useAuth } from '../lib/AuthContext';
import { logActivity } from '../lib/activityLogger';
import styles from './LeadDetails.module.css';

const LeadDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user, isAdmin } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  // Tasks state
  const [tasks, setTasks] = useState([]);
  const [taskForm, setTaskForm] = useState({ title: 'Call', due_date: '', description: '' });
  const [isSavingTask, setIsSavingTask] = useState(false);

  // Change Logs state
  const [logs, setLogs] = useState([]);
  const [isLogsExpanded, setIsLogsExpanded] = useState(false);

  // Documents state
  const [documents, setDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  // Inline Editing State
  const [editingPanel, setEditingPanel] = useState(null);
  const [draftData, setDraftData] = useState(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingQuote, setIsSendingQuote] = useState(false);

  const STATUS_OPTIONS = [
    'New', 'Quoted', 'Follow Up', 'Booked', 'Dispatched', 'In Transit', 'Delivered', 'Cancelled'
  ];

  useEffect(() => {
    const fetchLeadDetails = async () => {
      try {
        const { data, error } = await supabase
          .from('leads')
          .select(`
            id, 
            lead_number, 
            is_archived,
            created_at, 
            origin_address,
            origin_city, 
            origin_state, 
            origin_zip,
            destination_address,
            destination_city, 
            destination_state, 
            destination_zip,
            estimated_price, 
            ship_date,
            source,
            status,
            order_id,
            notes,
            carrier_pay,
            carrier_pay_terms,
            carrier_payment_method,
            broker_fee_terms,
            broker_fee_paid_by,
            payment_method,
            price_expiration_date,
            electronic_signature,
            signed_ip,
            signed_date,
            assigned_to,
            assignee:profiles!assigned_to(first_name, last_name),
            creator:profiles!created_by(first_name, last_name),
            customers (id, first_name, last_name, email, phone),
            lead_vehicles (id, vehicle_year, vehicle_make, vehicle_model, vehicle_vin, condition, trailer_type)
          `)
          .eq('lead_number', id)
          .single();
          
        if (error) throw error;
        setLead(data);
        
        // Fetch tasks for this lead
        const fetchTasks = async (leadId) => {
          const { data: taskData } = await supabase.from('tasks').select('*').eq('lead_id', leadId).order('due_date', { ascending: true });
          if (taskData) setTasks(taskData);
        };
        if (data && data.id) {
          fetchTasks(data.id);
          fetchLogs(data.id);
          fetchDocuments(data.id);
        }

      } catch (err) {
        console.error('Error fetching lead details:', err);
      } finally {
        setLoading(false);
      }
    };
    
    const fetchLogs = async (leadId) => {
      const { data: logData } = await supabase
        .from('change_logs')
        .select(`
          id, created_at, operation, details, description,
          profiles:user_id (first_name, last_name)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      if (logData) setLogs(logData);
    };

    const fetchDocuments = async (leadId) => {
      const { data: docs } = await supabase.from('lead_documents').select('*').eq('lead_id', leadId).order('created_at', { ascending: false });
      if (docs) setDocuments(docs);
    };

    fetchLeadDetails();

    if (isAdmin) {
      const fetchTeam = async () => {
        const { data } = await supabase.from('profiles').select('id, first_name, last_name').eq('role', 'user');
        if (data) setTeamMembers(data);
      };
      fetchTeam();
    }
  }, [id, isAdmin]);

  if (loading) {
    return <div className={styles.loading}>Loading lead details...</div>;
  }

  if (!lead) {
    return <div className={styles.loading}>Lead not found.</div>;
  }

  const handleSendOrderForm = async () => {
    const baseUrl = (import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, '');
    const link = `${baseUrl}/booking/${lead.lead_number}`;
    
    // Find the best email and name to use
    const emailToUse = lead.customers?.email || lead.email || draftData.email;
    const nameToUse = lead.customers?.first_name || lead.first_name || draftData.first_name || 'Customer';

    if (!emailToUse) {
      toast.error("No email address found for this lead. Please add an email address first.");
      // fallback to clipboard
      navigator.clipboard.writeText(link);
      return;
    }

    setIsSendingEmail(true);
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: emailToUse,
          customerName: nameToUse,
          bookingLink: link
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }
      
      toast.success(`Order form emailed to ${emailToUse} successfully!`);
    } catch (err) {
      console.error("Failed to send email:", err);
      toast.error(`Failed to send email: ${err.message}\n\nOrder form link copied to clipboard instead.`);
      navigator.clipboard.writeText(link);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendQuoteEmail = async () => {
    const emailToUse = lead.customers?.email || lead.email;
    const nameToUse = lead.customers?.first_name || lead.first_name || 'Customer';

    if (!emailToUse) {
      toast.error("No email address found for this lead. Please add an email address first.");
      return;
    }

    setIsSendingQuote(true);
    try {
      const response = await fetch('/api/send-quote-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: emailToUse,
          customerName: nameToUse,
          bookingLink: `${(import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, '')}/booking/${lead.lead_number}`,
          leadData: {
            origin_city: lead.origin_city,
            origin_state: lead.origin_state,
            origin_zip: lead.origin_zip,
            destination_city: lead.destination_city,
            destination_state: lead.destination_state,
            destination_zip: lead.destination_zip,
            estimated_price: lead.estimated_price,
            ship_date: lead.ship_date,
            vehicles: lead.lead_vehicles || []
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send quote email');
      }

      toast.success(`Quote emailed to ${emailToUse} successfully!`);
    } catch (err) {
      console.error("Failed to send quote email:", err);
      toast.error(`Failed to send quote email: ${err.message}`);
    } finally {
      setIsSendingQuote(false);
    }
  };

  const handleAssign = async (e) => {
    const newAssigneeId = e.target.value;
    setIsAssigning(true);
    try {
      const { error } = await supabase.from('leads').update({ assigned_to: newAssigneeId || null }).eq('lead_number', id);
      if (error) throw error;
      
      const newAssignee = teamMembers.find(m => m.id === newAssigneeId);
      setLead({ 
        ...lead, 
        assigned_to: newAssigneeId,
        assignee: newAssignee ? { first_name: newAssignee.first_name, last_name: newAssignee.last_name } : null
      });

      // Log activity
      const getFullName = (profile) => profile && (profile.first_name || profile.last_name) 
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() 
        : 'Unknown User';
        
      const assigneeName = newAssignee ? getFullName(newAssignee) : 'Unassigned';
      const oldAssigneeName = lead.assignee ? getFullName(lead.assignee) : 'Unassigned';
      await logActivity(lead.id, user.id, 'Entity Updated', 'Assigned User Changed', `Assigned User: ${oldAssigneeName} -> ${assigneeName}`);
      
      // Refresh logs
      const { data } = await supabase.from('change_logs').select('*, profiles:user_id(first_name, last_name)').eq('lead_id', lead.id).order('created_at', { ascending: false });
      if (data) setLogs(data);

    } catch (err) {
      toast.error("Error assigning lead: " + err.message);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setIsUpdatingStatus(true);
    try {
      const { error } = await supabase.from('leads').update({ status: newStatus }).eq('lead_number', id);
      if (error) throw error;
      
      setLead({ ...lead, status: newStatus });

      await logActivity(lead.id, user.id, 'Status Changed', 'Status Update', `Status: ${lead.status} -> ${newStatus}`);
      const { data } = await supabase.from('change_logs').select('*, profiles:user_id(first_name, last_name)').eq('lead_id', lead.id).order('created_at', { ascending: false });
      if (data) setLogs(data);

    } catch (err) {
      toast.error("Error updating status: " + err.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskForm.due_date || !taskForm.title) return toast.error("Action Type and Due Date are required.");
    
    setIsSavingTask(true);
    try {
      const { data, error } = await supabase.from('tasks').insert([{
         user_id: lead.assigned_to || user.id, // Assign to lead owner, fallback to creator
         lead_id: lead.id,
         title: taskForm.title,
         description: taskForm.description,
         due_date: taskForm.due_date,
         status: 'Pending'
      }]).select().single();
      
      if (error) throw error;
      setTasks([...tasks, data]);
      setTaskForm({ title: 'Call', due_date: '', description: '' });

      await logActivity(lead.id, user.id, 'Task Added', taskForm.title, `Due Date: ${taskForm.due_date} | ${taskForm.description}`);
      const { data: logsData } = await supabase.from('change_logs').select('*, profiles:user_id(first_name, last_name)').eq('lead_id', lead.id).order('created_at', { ascending: false });
      if (logsData) setLogs(logsData);

    } catch (err) {
      toast.error("Error adding task: " + err.message);
    } finally {
      setIsSavingTask(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      setTasks(tasks.filter(t => t.id !== taskId));

      const deletedTask = tasks.find(t => t.id === taskId);
      await logActivity(lead.id, user.id, 'Task Deleted', deletedTask?.title || 'Unknown', `Deleted task due ${deletedTask?.due_date}`);
      const { data: logsData } = await supabase.from('change_logs').select('*, profiles:user_id(first_name, last_name)').eq('lead_id', lead.id).order('created_at', { ascending: false });
      if (logsData) setLogs(logsData);

    } catch (err) {
      toast.error("Error deleting task: " + err.message);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${lead.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);

      const { data: docRecord, error: dbError } = await supabase.from('lead_documents').insert([{
        lead_id: lead.id,
        file_name: file.name,
        file_url: publicUrl,
        uploaded_by: user.id
      }]).select().single();

      if (dbError) throw dbError;

      setDocuments([docRecord, ...documents]);

      await logActivity(lead.id, user.id, 'Document Uploaded', file.name, `Uploaded file: ${file.name}`);
      const { data: logsData } = await supabase.from('change_logs').select('*, profiles:user_id(first_name, last_name)').eq('lead_id', lead.id).order('created_at', { ascending: false });
      if (logsData) setLogs(logsData);

    } catch (error) {
      toast.error('Error uploading file: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (docId, fileUrl, fileName) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    try {
      // Extract storage path from public URL
      const urlParts = fileUrl.split('documents/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('documents').remove([filePath]);
      }

      // Delete from DB
      const { error } = await supabase.from('lead_documents').delete().eq('id', docId);
      if (error) throw error;

      setDocuments(documents.filter(d => d.id !== docId));

      await logActivity(lead.id, user.id, 'Document Deleted', fileName, `Deleted file: ${fileName}`);
      const { data: logsData } = await supabase.from('change_logs').select('*, profiles:user_id(first_name, last_name)').eq('lead_id', lead.id).order('created_at', { ascending: false });
      if (logsData) setLogs(logsData);

    } catch (err) {
      toast.error("Error deleting document: " + err.message);
    }
  };

  const handleEditClick = (panel) => {
    setEditingPanel(panel);
    if (panel === 'customer') {
      setDraftData({
        first_name: lead.customers?.first_name || '',
        last_name: lead.customers?.last_name || '',
        email: lead.customers?.email || '',
        phone: lead.customers?.phone || ''
      });
    } else if (panel === 'logistics') {
      setDraftData({
        origin_address: lead.origin_address || '',
        origin_city: lead.origin_city || '',
        origin_state: lead.origin_state || '',
        origin_zip: lead.origin_zip || '',
        destination_address: lead.destination_address || '',
        destination_city: lead.destination_city || '',
        destination_state: lead.destination_state || '',
        destination_zip: lead.destination_zip || '',
        ship_date: lead.ship_date || ''
      });
    } else if (panel === 'price') {
      setDraftData({
        estimated_price: lead.estimated_price || '',
        carrier_pay: lead.carrier_pay || '',
        carrier_pay_terms: lead.carrier_pay_terms || '',
        carrier_payment_method: lead.carrier_payment_method || '',
        broker_fee_terms: lead.broker_fee_terms || '',
        broker_fee_paid_by: lead.broker_fee_paid_by || 'Customer',
        payment_method: lead.payment_method || ''
      });
    } else if (panel === 'vehicles') {
      setDraftData([...(lead.lead_vehicles || [])]);
    }
  };

  const handleCancelEdit = () => {
    setEditingPanel(null);
    setDraftData(null);
  };

  const handleInlineSave = async (panel) => {
    try {
      if (panel === 'customer') {
        if (lead.customers?.id) {
           const { error } = await supabase.from('customers').update(draftData).eq('id', lead.customers.id);
           if (error) throw error;
        }
        setLead({ ...lead, customers: { ...lead.customers, ...draftData } });
      } 
      else if (panel === 'logistics' || panel === 'price') {
        const payload = { ...draftData };
        if (payload.estimated_price !== undefined) payload.estimated_price = parseFloat(payload.estimated_price) || null;
        if (payload.carrier_pay !== undefined) payload.carrier_pay = parseFloat(payload.carrier_pay) || null;

        const { error } = await supabase.from('leads').update(payload).eq('lead_number', id);
        if (error) throw error;
        setLead({ ...lead, ...payload });
      }
      else if (panel === 'vehicles') {
        await supabase.from('lead_vehicles').delete().eq('lead_id', lead.id);
        const newVehicles = draftData.map(v => ({
           lead_id: lead.id,
           vehicle_year: v.vehicle_year,
           vehicle_make: v.vehicle_make,
           vehicle_model: v.vehicle_model,
           vehicle_vin: v.vehicle_vin || '',
           condition: v.condition || 'Operable',
           trailer_type: v.trailer_type || 'Open'
        }));
        if (newVehicles.length > 0) {
           const { data: inserted, error } = await supabase.from('lead_vehicles').insert(newVehicles).select();
           if (error) throw error;
           setLead({ ...lead, lead_vehicles: inserted });
        } else {
           setLead({ ...lead, lead_vehicles: [] });
        }
      }

      await logActivity(lead.id, user.id, 'Entity Updated', `${panel.charAt(0).toUpperCase() + panel.slice(1)} Panel Edited`, 'Details updated inline');
      const { data: logsData } = await supabase.from('change_logs').select('*, profiles:user_id(first_name, last_name)').eq('lead_id', lead.id).order('created_at', { ascending: false });
      if (logsData) setLogs(logsData);
      
      handleCancelEdit();
    } catch (err) {
      toast.error("Error saving: " + err.message);
    }
  };

  const handleGeneratePDF = (action) => {
    const formData = {
      firstName: lead.customers?.first_name || '',
      lastName: lead.customers?.last_name || '',
      email: lead.customers?.email || '',
      phone: lead.customers?.phone || '',
      pickupDate: lead.ship_date || 'TBD',
      originAddress: lead.origin_address || '',
      originCity: `${lead.origin_city}, ${lead.origin_state} ${lead.origin_zip}`,
      destAddress: lead.destination_address || '',
      destCity: `${lead.destination_city}, ${lead.destination_state} ${lead.destination_zip}`
    };

    const quoteNumber = lead.order_id || `NG${lead.lead_number}`;
    const transportType = lead.lead_vehicles?.[0]?.trailer_type === 'Enclosed' ? 'Enclosed' : 'Open';
    const cargoLabel = lead.lead_vehicles && lead.lead_vehicles.length > 0 
      ? lead.lead_vehicles.map(v => `${v.vehicle_year} ${v.vehicle_make} ${v.vehicle_model}`).join(', ')
      : 'Vehicle Details Not Provided';

    const tariff = Number(lead.estimated_price) || 0;
    
    let deposit = 0;
    if (lead.broker_fee_terms === 'Payment on Delivery') {
      deposit = 0;
    } else {
      deposit = lead.deposit_amount !== null && lead.deposit_amount !== undefined 
        ? Number(lead.deposit_amount) 
        : (Number(lead.estimated_price || 0) - Number(lead.carrier_pay || 0));
    }
    
    const nextPayment = tariff - deposit;
    
    const firstPaymentDue = lead.broker_fee_terms || 'Payment on Order';
    const firstPaymentMethod = lead.payment_method || 'Credit Card';
    const finalPaymentDue = lead.carrier_pay_terms || 'Payment on Delivery';
    const finalPaymentMethod = lead.carrier_payment_method || 'Cash / Certified Funds';
    
    const ipAddress = lead.signed_ip || '';

    generateOrderPDF(lead, formData, quoteNumber, transportType, cargoLabel, tariff, deposit, nextPayment, firstPaymentDue, firstPaymentMethod, finalPaymentDue, finalPaymentMethod, ipAddress, action);
  };

  const handleArchiveToggle = async () => {
    const isArchiving = !lead.is_archived;
    if (!window.confirm(`Are you sure you want to ${isArchiving ? 'archive' : 'restore'} this record?`)) return;
    
    try {
      const { error } = await supabase.from('leads').update({ is_archived: isArchiving }).eq('lead_number', id);
      if (error) throw error;
      setLead({ ...lead, is_archived: isArchiving });
      if (isArchiving) navigate('/archive');
    } catch (err) {
      toast.error(`Error ${isArchiving ? 'archiving' : 'restoring'}: ` + err.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('WARNING: Are you sure you want to PERMANENTLY delete this record? This action cannot be undone!')) return;
    
    try {
      const { error } = await supabase.from('leads').delete().eq('lead_number', id);
      if (error) throw error;
      navigate(lead.is_archived ? '/archive' : '/leads');
    } catch (err) {
      toast.error('Error deleting: ' + err.message);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <button 
        onClick={() => navigate('/leads')} 
        style={{ background: 'none', border: 'none', color: 'var(--brand-blue)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}
      >
        <ArrowLeft size={16} /> Back to Leads
      </button>

      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.leadTitle} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            Lead #L-{lead.lead_number}
            <select 
              value={lead.status} 
              onChange={handleStatusChange}
              disabled={isUpdatingStatus}
              style={{
                 fontSize: '0.9rem',
                 padding: '4px 8px',
                 borderRadius: '12px',
                 backgroundColor: 'rgba(59, 130, 246, 0.1)',
                 color: '#3b82f6',
                 border: '1px solid rgba(59, 130, 246, 0.3)',
                 outline: 'none',
                 cursor: 'pointer',
                 fontWeight: '600'
              }}
            >
              {STATUS_OPTIONS.map(status => (
                <option key={status} value={status} style={{ color: 'black' }}>{status}</option>
              ))}
            </select>
          </h1>
          <span className={styles.subTitle}>
            Created on {new Date(lead.created_at).toLocaleString()} • Source: {lead.source || 'Manual'}
          </span>
        </div>
        <div className={styles.actions}>
          {isAdmin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Assign to:</span>
              <select 
                value={lead.assigned_to || ''} 
                onChange={handleAssign}
                disabled={isAssigning}
                style={{ padding: '8px 12px', borderRadius: '8px', backgroundColor: 'var(--bg-dark)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', outline: 'none', cursor: 'pointer' }}
              >
                <option value="">Unassigned</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>{member.first_name} {member.last_name}</option>
                ))}
              </select>
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className={styles.btnPrimary} onClick={handleSendOrderForm} disabled={isSendingEmail}>
              {isSendingEmail ? 'Sending...' : 'Send Form'}
            </button>
            <button className={styles.btnPrimary} onClick={handleSendQuoteEmail} disabled={isSendingQuote} style={{ background: 'linear-gradient(135deg, #0ea5e9, #2563eb)' }}>
              {isSendingQuote ? 'Sending...' : 'Quote Email'}
            </button>
            <button className={styles.btnSecondary} onClick={handleArchiveToggle} style={{ borderColor: lead.is_archived ? '#10b981' : '#f59e0b', color: lead.is_archived ? '#10b981' : '#f59e0b' }}>
              {lead.is_archived ? 'Restore' : 'Archive'}
            </button>
            <button className={styles.btnSecondary} onClick={handleDelete} style={{ borderColor: '#ef4444', color: '#ef4444' }}>Delete</button>
          </div>
        </div>
      </div>

      <div className={styles.contentGrid}>
        
        {/* Main Column */}
        <div className={styles.mainColumn}>
          
          {/* Logistics Panel */}
          <div className={styles.panel}>
            <div className={styles.panelHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={18} /> Logistics & Routing</div>
              {editingPanel !== 'logistics' && (
                <button onClick={() => handleEditClick('logistics')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><Edit2 size={14} /></button>
              )}
            </div>
            <div className={styles.panelBody}>
              {editingPanel === 'logistics' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                     <div style={{ flex: 1 }}>
                       <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Origin Address</label>
                       <input type="text" value={draftData.origin_address} onChange={e => setDraftData({...draftData, origin_address: e.target.value})} style={{ width: '100%', padding: '6px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }} />
                     </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                     <div style={{ flex: 1 }}>
                       <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Origin City</label>
                       <input type="text" value={draftData.origin_city} onChange={e => setDraftData({...draftData, origin_city: e.target.value})} style={{ width: '100%', padding: '6px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }} />
                     </div>
                     <div style={{ width: '60px' }}>
                       <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>State</label>
                       <input type="text" value={draftData.origin_state} onChange={e => setDraftData({...draftData, origin_state: e.target.value})} style={{ width: '100%', padding: '6px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }} />
                     </div>
                     <div style={{ width: '80px' }}>
                       <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Zip</label>
                       <input type="text" value={draftData.origin_zip} onChange={e => setDraftData({...draftData, origin_zip: e.target.value})} style={{ width: '100%', padding: '6px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }} />
                     </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                     <div style={{ flex: 1 }}>
                       <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Destination Address</label>
                       <input type="text" value={draftData.destination_address} onChange={e => setDraftData({...draftData, destination_address: e.target.value})} style={{ width: '100%', padding: '6px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }} />
                     </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                     <div style={{ flex: 1 }}>
                       <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Dest City</label>
                       <input type="text" value={draftData.destination_city} onChange={e => setDraftData({...draftData, destination_city: e.target.value})} style={{ width: '100%', padding: '6px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }} />
                     </div>
                     <div style={{ width: '60px' }}>
                       <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>State</label>
                       <input type="text" value={draftData.destination_state} onChange={e => setDraftData({...draftData, destination_state: e.target.value})} style={{ width: '100%', padding: '6px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }} />
                     </div>
                     <div style={{ width: '80px' }}>
                       <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Zip</label>
                       <input type="text" value={draftData.destination_zip} onChange={e => setDraftData({...draftData, destination_zip: e.target.value})} style={{ width: '100%', padding: '6px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }} />
                     </div>
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Est. Ship Date</label>
                    <input type="date" value={draftData.ship_date} onChange={e => setDraftData({...draftData, ship_date: e.target.value})} style={{ width: '100%', padding: '6px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }} />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button onClick={handleCancelEdit} style={{ padding: '4px 8px', background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={() => handleInlineSave('logistics')} style={{ padding: '4px 8px', background: '#10b981', border: 'none', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={14}/> Save</button>
                  </div>
                </div>
              ) : (
                <div className={styles.infoGrid}>
                  <div className={styles.infoBlock}>
                    <span className={styles.infoLabel}>Origin</span>
                    <span className={styles.infoValue}>
                      {lead.origin_address ? <div>{lead.origin_address}</div> : null}
                      <div>{lead.origin_city}, {lead.origin_state} {lead.origin_zip}</div>
                    </span>
                  </div>
                  <div className={styles.infoBlock}>
                    <span className={styles.infoLabel}>Destination</span>
                    <span className={styles.infoValue}>
                      {lead.destination_address ? <div>{lead.destination_address}</div> : null}
                      <div>{lead.destination_city}, {lead.destination_state} {lead.destination_zip}</div>
                    </span>
                  </div>
                  <div className={styles.infoBlock}>
                    <span className={styles.infoLabel}>Estimated Ship Date</span>
                    <span className={styles.infoValue}>{lead.ship_date || 'TBD'}</span>
                  </div>
                  <div className={styles.infoBlock}>
                    <span className={styles.infoLabel}>Order ID (Reference)</span>
                    <span className={styles.infoValue}>{lead.order_id || 'N/A'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Vehicles Panel */}
          <div className={styles.panel}>
            <div className={styles.panelHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Truck size={18} /> Vehicles ({lead.lead_vehicles?.length || 0})</div>
              {editingPanel !== 'vehicles' && (
                <button onClick={() => handleEditClick('vehicles')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><Edit2 size={14} /></button>
              )}
            </div>
            <div className={styles.panelBody}>
              {editingPanel === 'vehicles' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {draftData.map((v, i) => (
                    <div key={i} style={{ padding: '12px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', position: 'relative' }}>
                      <button onClick={() => setDraftData(draftData.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><X size={16} /></button>
                      
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <div style={{ width: '80px' }}>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Year</label>
                          <input type="text" value={v.vehicle_year} onChange={e => { const newV = [...draftData]; newV[i].vehicle_year = e.target.value; setDraftData(newV); }} style={{ width: '100%', padding: '6px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Make</label>
                          <input type="text" value={v.vehicle_make} onChange={e => { const newV = [...draftData]; newV[i].vehicle_make = e.target.value; setDraftData(newV); }} style={{ width: '100%', padding: '6px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Model</label>
                          <input type="text" value={v.vehicle_model} onChange={e => { const newV = [...draftData]; newV[i].vehicle_model = e.target.value; setDraftData(newV); }} style={{ width: '100%', padding: '6px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }} />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Condition</label>
                          <select value={v.condition} onChange={e => { const newV = [...draftData]; newV[i].condition = e.target.value; setDraftData(newV); }} style={{ width: '100%', padding: '6px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }}>
                            <option value="Operable">Operable</option>
                            <option value="Inoperable">Inoperable</option>
                          </select>
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Trailer Type</label>
                          <select value={v.trailer_type} onChange={e => { const newV = [...draftData]; newV[i].trailer_type = e.target.value; setDraftData(newV); }} style={{ width: '100%', padding: '6px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }}>
                            <option value="Open">Open</option>
                            <option value="Enclosed">Enclosed</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <button onClick={() => setDraftData([...draftData, { vehicle_year: '', vehicle_make: '', vehicle_model: '', condition: 'Operable', trailer_type: 'Open' }])} style={{ alignSelf: 'flex-start', padding: '6px 12px', background: 'none', border: '1px solid var(--brand-blue)', color: 'var(--brand-blue)', borderRadius: '4px', cursor: 'pointer' }}>+ Add Vehicle</button>

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button onClick={handleCancelEdit} style={{ padding: '4px 8px', background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={() => handleInlineSave('vehicles')} style={{ padding: '4px 8px', background: '#10b981', border: 'none', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={14}/> Save</button>
                  </div>
                </div>
              ) : (
                <div className={styles.vehicleList}>
                  {lead.lead_vehicles && lead.lead_vehicles.length > 0 ? (
                    lead.lead_vehicles.map((v, i) => (
                      <div key={v.id || i} className={styles.vehicleItem}>
                        <div className={styles.infoBlock}>
                          <span className={styles.infoLabel}>Vehicle</span>
                          <span className={styles.infoValue}>{v.vehicle_year} {v.vehicle_make} {v.vehicle_model}</span>
                        </div>
                        <div className={styles.infoBlock}>
                          <span className={styles.infoLabel}>Condition</span>
                          <span className={styles.infoValue}>{v.condition}</span>
                        </div>
                        <div className={styles.infoBlock}>
                          <span className={styles.infoLabel}>Trailer Type</span>
                          <span className={styles.infoValue}>{v.trailer_type}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: 'var(--text-muted)' }}>No vehicles attached.</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Memo / Notes Panel */}
          {lead.notes && (
            <div className={styles.panel}>
              <div className={styles.panelHeader}>Memo / Notes</div>
              <div className={styles.panelBody} style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5', color: 'var(--text-muted)' }}>
                {lead.notes}
              </div>
            </div>
          )}

          {/* Signed Order Form Panel */}
          {lead.electronic_signature && (
            <div className={styles.panel} style={{ borderTop: '4px solid #10b981' }}>
              <div className={styles.panelHeader}>Signed Order Details</div>
              <div className={styles.panelBody}>
                 <div className={styles.infoGrid} style={{ marginBottom: '20px' }}>
                    <div className={styles.infoBlock}>
                       <span className={styles.infoLabel}>Signature</span>
                       <span className={styles.infoValue} style={{ fontFamily: '"Brush Script MT", "Great Vibes", cursive', fontSize: '2rem', color: '#60a5fa' }}>{lead.electronic_signature}</span>
                    </div>
                    <div className={styles.infoBlock}>
                       <span className={styles.infoLabel}>IP Address</span>
                       <span className={styles.infoValue}>{lead.signed_ip}</span>
                    </div>
                    <div className={styles.infoBlock}>
                       <span className={styles.infoLabel}>Timestamp</span>
                       <span className={styles.infoValue}>{new Date(lead.signed_date).toLocaleString()}</span>
                    </div>
                 </div>
                 
                 <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                   <button className={styles.btnSecondary} onClick={() => handleGeneratePDF('preview')} style={{ flex: 1, background: '#ecfdf5', color: '#065f46', borderColor: '#10b981' }}>
                      Preview PDF
                   </button>
                   <button className={styles.btnPrimary} onClick={() => handleGeneratePDF('download')} style={{ flex: 1, background: '#10b981', color: 'var(--text-primary)', borderColor: '#10b981' }}>
                      Download PDF
                   </button>
                 </div>
              </div>
            </div>
          )}

          {/* Price and Terms Panel */}
          <div className={styles.panel}>
            <div className={styles.panelHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><DollarSign size={18} /> Price and Terms</div>
              {editingPanel !== 'price' && (
                <button onClick={() => handleEditClick('price')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><Edit2 size={14} /></button>
              )}
            </div>
            <div className={styles.panelBody}>
              {editingPanel === 'price' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                     <div style={{ flex: 1 }}>
                       <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Estimated Total Price ($)</label>
                       <input type="number" value={draftData.estimated_price} onChange={e => setDraftData({...draftData, estimated_price: e.target.value})} style={{ width: '100%', padding: '6px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }} />
                     </div>
                     <div style={{ flex: 1 }}>
                       <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Carrier Pay ($)</label>
                       <input type="number" value={draftData.carrier_pay} onChange={e => setDraftData({...draftData, carrier_pay: e.target.value})} style={{ width: '100%', padding: '6px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }} />
                     </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                     <div style={{ flex: 1 }}>
                       <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Carrier Pay Terms</label>
                       <select value={draftData.carrier_pay_terms} onChange={e => setDraftData({...draftData, carrier_pay_terms: e.target.value})} style={{ width: '100%', padding: '6px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }}>
                         <option value=""></option>
                         <option value="Payment After Pickup">Payment After Pickup</option>
                         <option value="Payment After Delivery">Payment After Delivery</option>
                         <option value="Payment 1 - 5 Days after delivery">Payment 1 - 5 Days after delivery</option>
                       </select>
                     </div>
                     <div style={{ flex: 1 }}>
                       <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Carrier Payment Method</label>
                       <select value={draftData.carrier_payment_method} onChange={e => setDraftData({...draftData, carrier_payment_method: e.target.value})} style={{ width: '100%', padding: '6px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }}>
                         <option value=""></option>
                         <option value="Zelle">Zelle</option>
                         <option value="Credit Card">Credit Card</option>
                         <option value="Cash">Cash</option>
                         <option value="Cash App">Cash App</option>
                         <option value="Venmo">Venmo</option>
                         <option value="Paypal">Paypal</option>
                         <option value="ACH">ACH</option>
                         <option value="Check">Check</option>
                       </select>
                     </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                     <div style={{ flex: 1 }}>
                       <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Broker Fee Paid By</label>
                       <select value={draftData.broker_fee_paid_by} onChange={e => setDraftData({...draftData, broker_fee_paid_by: e.target.value})} style={{ width: '100%', padding: '6px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }}>
                         <option value="Customer">Customer</option>
                         <option value="Carrier">Carrier</option>
                       </select>
                     </div>
                     <div style={{ flex: 1 }}>
                       <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Broker Fee Terms</label>
                       <select value={draftData.broker_fee_terms} onChange={e => setDraftData({...draftData, broker_fee_terms: e.target.value})} style={{ width: '100%', padding: '6px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }}>
                         <option value=""></option>
                         <option value="Payment on Order">Payment on Order</option>
                         <option value="Payment on Pick up">Payment on Pick up</option>
                         <option value="Payment on Delivery">Payment on Delivery</option>
                       </select>
                     </div>
                     <div style={{ flex: 1 }}>
                       <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Broker Fee Method</label>
                       <select value={draftData.payment_method} onChange={e => setDraftData({...draftData, payment_method: e.target.value})} style={{ width: '100%', padding: '6px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }}>
                         <option value=""></option>
                         <option value="Zelle">Zelle</option>
                         <option value="Credit Card">Credit Card</option>
                         <option value="Cash">Cash</option>
                         <option value="Cash App">Cash App</option>
                         <option value="Venmo">Venmo</option>
                         <option value="Paypal">Paypal</option>
                         <option value="ACH">ACH</option>
                         <option value="Check">Check</option>
                       </select>
                     </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button onClick={handleCancelEdit} style={{ padding: '4px 8px', background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={() => handleInlineSave('price')} style={{ padding: '4px 8px', background: '#10b981', border: 'none', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={14}/> Save</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.infoBlock} style={{ marginBottom: '16px' }}>
                    <span className={styles.infoLabel}>Estimated Total Price</span>
                    <span className={styles.infoValue} style={{ fontSize: '1.5rem', fontWeight: '500', color: 'var(--success)' }}>
                      ${lead.estimated_price?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <div className={styles.infoGrid}>
                     <div className={styles.infoBlock}>
                        <span className={styles.infoLabel}>Carrier Pay</span>
                        <span className={styles.infoValue}>${lead.carrier_pay?.toFixed(2) || '0.00'}</span>
                     </div>
                     <div className={styles.infoBlock}>
                        <span className={styles.infoLabel}>Carrier Pay Terms</span>
                        <span className={styles.infoValue}>{lead.carrier_pay_terms || 'N/A'}</span>
                     </div>
                     <div className={styles.infoBlock}>
                        <span className={styles.infoLabel}>Carrier Payment Method</span>
                        <span className={styles.infoValue}>{lead.carrier_payment_method || 'N/A'}</span>
                     </div>
                  </div>

                  <div style={{ margin: '16px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}></div>

                  <div className={styles.infoGrid}>
                     <div className={styles.infoBlock}>
                        <span className={styles.infoLabel}>Broker Fee</span>
                        <span className={styles.infoValue} style={{ color: 'var(--success)', fontWeight: 'bold' }}>
                          ${((lead.estimated_price || 0) - (lead.carrier_pay || 0)).toFixed(2)}
                        </span>
                     </div>
                     <div className={styles.infoBlock}>
                        <span className={styles.infoLabel}>Broker Fee Paid By</span>
                        <span className={styles.infoValue}>{lead.broker_fee_paid_by || 'Customer'}</span>
                     </div>
                     <div className={styles.infoBlock}>
                        <span className={styles.infoLabel}>Broker Fee Terms</span>
                        <span className={styles.infoValue}>{lead.broker_fee_terms || 'N/A'}</span>
                     </div>
                     <div className={styles.infoBlock}>
                        <span className={styles.infoLabel}>Broker Fee Method</span>
                        <span className={styles.infoValue} style={{ color: 'var(--brand-blue)', fontWeight: '500' }}>
                          {lead.payment_method || 'N/A'}
                        </span>
                     </div>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>

        {/* Side Column */}
        <div className={styles.sideColumn}>
          
          {/* Customer Panel */}
          <div className={styles.panel}>
            <div className={styles.panelHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><User size={18} /> Customer Info</div>
              {editingPanel !== 'customer' && (
                <button onClick={() => handleEditClick('customer')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><Edit2 size={14} /></button>
              )}
            </div>
            <div className={styles.panelBody}>
              {editingPanel === 'customer' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>First Name</label>
                    <input type="text" value={draftData.first_name} onChange={e => setDraftData({...draftData, first_name: e.target.value})} style={{ width: '100%', padding: '6px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Last Name</label>
                    <input type="text" value={draftData.last_name} onChange={e => setDraftData({...draftData, last_name: e.target.value})} style={{ width: '100%', padding: '6px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Email</label>
                    <input type="email" value={draftData.email} onChange={e => setDraftData({...draftData, email: e.target.value})} style={{ width: '100%', padding: '6px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Phone</label>
                    <input type="tel" value={draftData.phone} onChange={e => setDraftData({...draftData, phone: e.target.value})} style={{ width: '100%', padding: '6px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button onClick={handleCancelEdit} style={{ padding: '4px 8px', background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={() => handleInlineSave('customer')} style={{ padding: '4px 8px', background: '#10b981', border: 'none', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={14}/> Save</button>
                  </div>
                </div>
              ) : (
                <div className={styles.infoGrid} style={{ gridTemplateColumns: '1fr' }}>
                  <div className={styles.infoBlock}>
                    <span className={styles.infoLabel}>Name</span>
                    <span className={styles.infoValue}>{lead.customers?.first_name} {lead.customers?.last_name}</span>
                  </div>
                  <div className={styles.infoBlock}>
                    <span className={styles.infoLabel}>Email</span>
                    <span className={styles.infoValue}>{lead.customers?.email || 'N/A'}</span>
                  </div>
                  <div className={styles.infoBlock}>
                    <span className={styles.infoLabel}>Phone</span>
                    <span className={styles.infoValue}>{lead.customers?.phone || 'N/A'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tasks Panel */}
          <div className={styles.panel}>
            <div className={styles.panelHeader} style={{ backgroundColor: '#4b91f1', color: 'var(--text-primary)' }}>Tasks</div>
            <div className={styles.panelBody} style={{ padding: '16px' }}>
              
              <form onSubmit={handleAddTask} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Action Type</label>
                    <select value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} style={{ width: '100%', padding: '8px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }}>
                      <option value="Call">Call</option>
                      <option value="Email">Email</option>
                      <option value="Text">Text</option>
                      <option value="Reminder">Reminder</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Due Date</label>
                    <input type="date" required value={taskForm.due_date} onChange={e => setTaskForm({...taskForm, due_date: e.target.value})} style={{ width: '100%', padding: '8px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }} />
                  </div>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Memo</label>
                  <input type="text" value={taskForm.description} onChange={e => setTaskForm({...taskForm, description: e.target.value})} style={{ width: '100%', padding: '8px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }} placeholder="Add a note..." />
                </div>
                
                <button type="submit" disabled={isSavingTask} style={{ alignSelf: 'flex-start', padding: '6px 16px', background: 'var(--bg-color)', border: '1px solid #4b91f1', color: '#4b91f1', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}>
                  {isSavingTask ? 'Adding...' : 'Add Task'}
                </button>
              </form>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <table style={{ width: '100%', fontSize: '0.85rem', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ paddingBottom: '8px', color: 'var(--text-secondary)', fontWeight: '500' }}>Action</th>
                      <th style={{ paddingBottom: '8px', color: 'var(--text-secondary)', fontWeight: '500' }}>Description</th>
                      <th style={{ paddingBottom: '8px', color: 'var(--text-secondary)', fontWeight: '500' }}>Due</th>
                      <th style={{ paddingBottom: '8px', color: 'var(--text-secondary)', fontWeight: '500', textAlign: 'right' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ color: 'var(--text-muted)', paddingTop: '8px' }}>No tasks assigned.</td>
                      </tr>
                    ) : (
                      tasks.map(t => (
                        <tr key={t.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ paddingTop: '8px', paddingBottom: '8px', color: 'var(--brand-blue)' }}>{t.title}</td>
                          <td style={{ paddingTop: '8px', paddingBottom: '8px', color: 'var(--text-secondary)' }}>{t.description || '-'}</td>
                          <td style={{ paddingTop: '8px', paddingBottom: '8px', color: 'var(--text-primary)' }}>{new Date(t.due_date).toLocaleDateString()}</td>
                          <td style={{ paddingTop: '8px', paddingBottom: '8px', textAlign: 'right' }}>
                            <button onClick={() => handleDeleteTask(t.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}>Delete</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
            </div>
          </div>

          {/* File Attachment Panel */}
          <div className={styles.panel}>
            <div className={styles.panelHeader} style={{ backgroundColor: '#4b91f1', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Paperclip size={18} /> File Attachment
            </div>
            <div className={styles.panelBody} style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ width: '100px', textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>File Upload</div>
                
                <div style={{ flex: 1, border: '1px solid var(--border-color)', borderRadius: '4px', padding: '16px', backgroundColor: 'rgba(0,0,0,0.1)' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <input 
                      type="file" 
                      id="file-upload" 
                      style={{ display: 'none' }} 
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                    <label 
                      htmlFor="file-upload" 
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        padding: '6px 12px', 
                        backgroundColor: '#4b91f1', 
                        color: 'var(--text-primary)', 
                        borderRadius: '4px', 
                        cursor: isUploading ? 'not-allowed' : 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500'
                      }}
                    >
                      <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span> {isUploading ? 'Uploading...' : 'Choose'}
                    </label>
                  </div>
                  
                  <div style={{ textAlign: 'center', padding: '24px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <Upload size={24} style={{ color: 'var(--text-secondary)', marginBottom: '8px' }} />
                    <div style={{ color: 'var(--text-primary)', fontWeight: '500', marginBottom: '4px' }}>Upload File</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Drop or select file</div>
                  </div>
                </div>
              </div>

              {documents.length > 0 && (
                <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <table style={{ width: '100%', fontSize: '0.85rem', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ paddingBottom: '8px', color: 'var(--text-secondary)', fontWeight: '500' }}>Document Name</th>
                        <th style={{ paddingBottom: '8px', color: 'var(--text-secondary)', fontWeight: '500' }}>Upload Date</th>
                        <th style={{ paddingBottom: '8px', color: 'var(--text-secondary)', fontWeight: '500', textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map(doc => (
                        <tr key={doc.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ paddingTop: '8px', paddingBottom: '8px', color: 'var(--text-primary)' }}>{doc.file_name}</td>
                          <td style={{ paddingTop: '8px', paddingBottom: '8px', color: 'var(--text-secondary)' }}>{new Date(doc.created_at).toLocaleDateString()}</td>
                          <td style={{ paddingTop: '8px', paddingBottom: '8px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
                              <a href={doc.file_url} target="_blank" rel="noreferrer" style={{ color: '#4b91f1', textDecoration: 'none', fontWeight: '500' }}>View</a>
                              <button onClick={() => handleDeleteDocument(doc.id, doc.file_url, doc.file_name)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Change Logs Accordion */}
      <div className={styles.panel} style={{ marginTop: '20px' }}>
        <div 
          className={styles.panelHeader} 
          style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-dark)' }}
          onClick={() => setIsLogsExpanded(!isLogsExpanded)}
        >
          <span>Change Logs ({logs.length})</span>
          <span style={{ fontSize: '1.2rem' }}>{isLogsExpanded ? '−' : '+'}</span>
        </div>
        
        {isLogsExpanded && (
          <div className={styles.panelBody} style={{ padding: 0 }}>
            <table style={{ width: '100%', fontSize: '0.85rem', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: 'var(--bg-dark)', borderBottom: '1px solid var(--border-color)' }}>
                <tr>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: '500' }}>Time Stamp</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: '500' }}>User Name</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: '500' }}>Operation</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: '500' }}>Details</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: '500' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>No logs recorded yet.</td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                        {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>
                        {log.profiles 
                          ? ((log.profiles.first_name || log.profiles.last_name) 
                              ? `${log.profiles.first_name || ''} ${log.profiles.last_name || ''}`.trim() 
                              : 'Agent')
                          : 'System'}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--brand-blue)' }}>{log.operation}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>{log.details}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{log.description}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default LeadDetails;
