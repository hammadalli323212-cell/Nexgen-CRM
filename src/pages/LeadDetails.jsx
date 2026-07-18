import toast from 'react-hot-toast';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { User, MapPin, DollarSign, Truck, ArrowLeft, Upload, Paperclip, Trash2, Edit2, Check, X, PenTool, ChevronDown } from 'lucide-react';
import { getStatusColors, getAgentColors, SourceBadge } from '../components/common/Badges';
import { CustomDropdown } from '../components/common/CustomDropdown';
import { supabase } from '../lib/supabase';
import { generateOrderPDF } from '../lib/pdfGenerator';
import { useAuth } from '../lib/AuthContext';
import { logActivity } from '../lib/activityLogger';
import EmailPreviewModal from '../components/modals/EmailPreviewModal';
import styles from './LeadDetails.module.css';

const LeadDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user, isAdmin, phone, isSuperAdmin } = useAuth();
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


  // Email Preview State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailPreviewData, setEmailPreviewData] = useState(null);
  const [activeEmailPayload, setActiveEmailPayload] = useState(null);
  const [activeEmailEndpoint, setActiveEmailEndpoint] = useState(null);
  const [debugError, setDebugError] = useState(null);

  // Carrier Autocomplete State
  const [carrierSuggestions, setCarrierSuggestions] = useState([]);
  const [showCarrierSuggestions, setShowCarrierSuggestions] = useState(false);

  const isOrderView = location.pathname.startsWith('/orders');

  const STATUS_OPTIONS = isOrderView
    ? ['Booked', 'Dispatched', 'In Transit', 'Delivered', 'Completed', 'Cancelled']
    : ['New', 'Quoted', 'Follow Up'];

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
            order_created_at,
            source,
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
            origin_contact_name,
            origin_contact_phone,
            destination_contact_name,
            destination_contact_phone,
            status,
            order_id,
            is_read,
            notes,
            carrier_pay,
            carrier_pay_terms,
            carrier_payment_method,
            broker_fee_terms,
            broker_fee_paid_by,
            broker_fee_collected,
            payment_method,
            price_expiration_date,
            electronic_signature,
            signed_ip,
            signed_date,
            change_order_signatures,
            assigned_to,
            carrier_company_name,
            carrier_company_number,
            carrier_dispatch_number,
            carrier_driver_number,
            carrier_email,
            carrier_mc_number,
            carrier_usdot_number,
            assignee:profiles!assigned_to(first_name, last_name, full_name, email),
            creator:profiles!created_by(first_name, last_name, full_name, email),
            customers (id, first_name, last_name, email, phone),
            lead_vehicles (id, vehicle_year, vehicle_make, vehicle_model, vehicle_type, vehicle_vin, condition, trailer_type)
          `)
          .eq('lead_number', id)
          .single();
          
        if (error) throw error;

        if (data.is_read === false) {
          await supabase.from('leads').update({ is_read: true }).eq('id', data.id);
          data.is_read = true;
        }

        // Smart Route Redirection
        const isOrderRoute = location.pathname.startsWith('/orders');
        const orderStatuses = ['Booked', 'Dispatched', 'In Transit', 'Delivered', 'Completed'];
        const isOrder = orderStatuses.includes(data.status) || !!data.order_created_at;
        
        if (isOrder && !isOrderRoute) {
          navigate(`/orders/${data.lead_number}`, { replace: true });
        } else if (!isOrder && isOrderRoute) {
          navigate(`/leads/${data.lead_number}`, { replace: true });
        }

        setLead(data);
        
        // Fetch tasks for this lead
        const fetchTasks = async (leadId) => {
          const { data: taskData, error } = await supabase.from('tasks').select('*').eq('lead_id', leadId).order('due_date', { ascending: true });
          if (error) console.error("Error fetching tasks:", error);
          if (taskData) setTasks(taskData);
        };
        if (data && data.id) {
          fetchTasks(data.id);
          fetchLogs(data.id, data);
          fetchDocuments(data.id);
        }

      } catch (err) {
        console.error("Error fetching lead:", err);
        setDebugError(err.message || String(err));
      } finally {
        setLoading(false);
      }
    };
    
    const fetchLogs = async (leadId, leadObj) => {
      const { data: logData, error } = await supabase
        .from('change_logs')
        .select(`
          id, created_at, operation, details, description,
          profiles:user_id (first_name, last_name, full_name, email)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      
      if (error) console.error("Error fetching logs:", error);

      let finalLogs = logData || [];
      if (finalLogs.length > 0 && leadObj && (leadObj.status === 'Booked' || leadObj.order_created_at)) {
        const hasConversionLog = finalLogs.some(log => log.operation === 'Order Signed' || log.operation === 'Status Changed' || log.operation === 'Change Order Signed' || (log.operation === 'Entity Updated' && (log.description || '').includes('Booked')));
        if (!hasConversionLog && user?.id) {
          const { error: logErr } = await supabase.from('change_logs').insert([{
            lead_id: leadId,
            user_id: user.id,
            operation: 'Order Signed',
            details: 'Signature Captured',
            description: 'Customer electronically signed the order form (Lead -> Order)'
          }]);
          if (!logErr) {
            const { data: healedLogs, error: healErr } = await supabase
              .from('change_logs')
              .select(`id, operation, details, description, created_at, user_id, profiles:user_id (first_name, last_name, full_name, email)`)
              .eq('lead_id', leadId)
              .order('created_at', { ascending: false });
            if (healErr) console.error("Error fetching healed logs:", healErr);
            if (healedLogs) finalLogs = healedLogs;
          } else {
            console.error("Error inserting change log:", logErr);
          }
        }
      }
      setLogs(finalLogs);
    };

    const fetchDocuments = async (leadId) => {
      const { data: docs, error } = await supabase.from('lead_documents').select('*').eq('lead_id', leadId).order('created_at', { ascending: false });
      if (error) console.error("Error fetching documents:", error);
      if (docs) setDocuments(docs);
    };

    fetchLeadDetails();

    if (isAdmin) {
      const fetchTeam = async () => {
        const { data, error } = await supabase.from('profiles').select('id, full_name, email');
        if (error) console.error("Error fetching team:", error);
        if (data) setTeamMembers(data);
      };
      fetchTeam();
    }
  }, [id, isAdmin]);

  // Auto-fetch Origin Zip
  useEffect(() => {
    if (editingPanel === 'logistics' && draftData?.origin_zip?.length === 5) {
      fetch(`https://api.zippopotam.us/us/${draftData.origin_zip}`)
        .then(res => res.json())
        .then(data => {
          if (data.places && data.places.length > 0) {
            setDraftData(prev => {
              if (prev.origin_city === data.places[0]["place name"] && prev.origin_state === data.places[0]["state abbreviation"]) return prev;
              return { ...prev, origin_city: data.places[0]["place name"], origin_state: data.places[0]["state abbreviation"] };
            });
          }
        })
        .catch(() => {});
    }
  }, [draftData?.origin_zip, editingPanel]);

  // Auto-fetch Destination Zip
  useEffect(() => {
    if (editingPanel === 'logistics' && draftData?.destination_zip?.length === 5) {
      fetch(`https://api.zippopotam.us/us/${draftData.destination_zip}`)
        .then(res => res.json())
        .then(data => {
          if (data.places && data.places.length > 0) {
            setDraftData(prev => {
              if (prev.destination_city === data.places[0]["place name"] && prev.destination_state === data.places[0]["state abbreviation"]) return prev;
              return { ...prev, destination_city: data.places[0]["place name"], destination_state: data.places[0]["state abbreviation"] };
            });
          }
        })
        .catch(() => {});
    }
  }, [draftData?.destination_zip, editingPanel]);

  useEffect(() => {
    if (editingPanel === 'carrier' && draftData?.carrier_company_name?.length > 1) {
      const fetchSuggestions = async () => {
        const { data } = await supabase
          .from('carriers')
          .select('*')
          .ilike('company_name', `%${draftData.carrier_company_name}%`)
          .limit(5);
        setCarrierSuggestions(data || []);
      };
      const timeoutId = setTimeout(fetchSuggestions, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setCarrierSuggestions([]);
    }
  }, [draftData?.carrier_company_name, editingPanel]);

  if (loading) {
    return <div className={styles.loading}>Loading lead details...</div>;
  }

  if (!lead) {
    return (
      <div className={styles.loading}>
        <div>Lead not found.</div>
        {debugError && <div style={{ color: 'red', marginTop: '10px' }}>Debug: {debugError}</div>}
      </div>
    );
  }

  const handlePreviewEmail = async (endpoint, payload, loadingSetter) => {
    loadingSetter(true);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, previewOnly: true })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate email preview');
      
      setActiveEmailEndpoint(endpoint);
      setActiveEmailPayload(payload);
      setEmailPreviewData(data);
      setIsEmailModalOpen(true);
    } catch (err) {
      console.error("Preview failed:", err);
      toast.error(`Failed to generate preview: ${err.message}`);
    } finally {
      loadingSetter(false);
    }
  };

  const confirmSendEmail = async ({ cc, bcc, customSubject }) => {
    const loadingSetter = activeEmailEndpoint.includes('quote') ? setIsSendingQuote : setIsSendingEmail;
    loadingSetter(true);
    setIsEmailModalOpen(false); // Close modal while sending
    try {
      const response = await fetch(activeEmailEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...activeEmailPayload, cc, bcc, customSubject })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send email');
      
      const emailType = activeEmailEndpoint.includes('quote') ? 'Quote' : (activeEmailPayload.isChangeOrder ? 'Change Order Form' : 'Order Form');
      toast.success(`${emailType} emailed to ${activeEmailPayload.customerEmail} successfully!`);
      
      await logActivity(lead.id, user.id, 'Email Sent', emailType, `${emailType} emailed to ${activeEmailPayload.customerEmail}${cc ? ` (CC: ${cc})` : ''}`);
      const { data: logsData } = await supabase.from('change_logs').select('*, profiles:user_id(first_name, last_name, full_name, email)').eq('lead_id', lead.id).order('created_at', { ascending: false });
      if (logsData) setLogs(logsData);
    } catch (err) {
      console.error("Failed to send email:", err);
      toast.error(`Failed to send email: ${err.message}`);
    } finally {
      loadingSetter(false);
      setActiveEmailEndpoint(null);
      setActiveEmailPayload(null);
      setEmailPreviewData(null);
    }
  };

  const handleSendOrderForm = async () => {
    const baseUrl = (import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, '');
    const link = `${baseUrl}/booking/${lead.lead_number}?agent=${lead?.assigned_to || user?.id}`;
    const emailToUse = lead.customers?.email || lead.email || draftData?.email;
    const nameToUse = lead.customers?.first_name || lead.first_name || draftData?.first_name || 'Customer';

    if (!emailToUse) {
      toast.error("No email address found for this lead. Please add an email address first.");
      navigator.clipboard.writeText(link);
      return;
    }

    handlePreviewEmail('/api/send-email', {
      customerEmail: emailToUse,
      customerName: nameToUse,
      bookingLink: link,
      senderId: lead?.assigned_to || user?.id
    }, setIsSendingEmail);
  };

  const handleSendChangeOrder = async () => {
    const baseUrl = (import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, '');
    const link = `${baseUrl}/booking/${lead.lead_number}?mode=change_order&agent=${lead?.assigned_to || user?.id}`;
    const emailToUse = lead.customers?.email || lead.email || draftData?.email;
    const nameToUse = lead.customers?.first_name || lead.first_name || draftData?.first_name || 'Customer';

    if (!emailToUse) {
      toast.error("No email address found for this lead. Please add an email address first.");
      navigator.clipboard.writeText(link);
      return;
    }

    handlePreviewEmail('/api/send-email', {
      customerEmail: emailToUse,
      customerName: nameToUse,
      bookingLink: link,
      isChangeOrder: true,
      senderId: lead?.assigned_to || user?.id
    }, setIsSendingEmail);
  };

  const handleSendQuoteEmail = async () => {
    const emailToUse = lead.customers?.email || lead.email;
    const nameToUse = lead.customers?.first_name || lead.first_name || 'Customer';

    if (!emailToUse) {
      toast.error("No email address found for this lead. Please add an email address first.");
      return;
    }

    handlePreviewEmail('/api/send-quote-email', {
      customerEmail: emailToUse,
      customerName: nameToUse,
      bookingLink: `${(import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, '')}/booking/${lead.lead_number}?agent=${lead?.assigned_to || user?.id}`,
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
      },
      senderId: lead?.assigned_to || user?.id
    }, setIsSendingQuote);
  };

  const handleAssign = async (newAssigneeId) => {
    setIsAssigning(true);
    try {
      const { error } = await supabase.from('leads').update({ assigned_to: newAssigneeId || null }).eq('lead_number', id);
      if (error) throw error;
      
      const newAssignee = teamMembers.find(m => m.id === newAssigneeId);
      setLead({ 
        ...lead, 
        assigned_to: newAssigneeId,
        assignee: newAssignee ? { full_name: newAssignee.full_name, email: newAssignee.email } : null
      });

      // Log activity
      const getFullName = (profile) => profile && (profile.full_name || profile.email) 
        ? profile.full_name || profile.email
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

  const handleStatusChange = async (newStatus) => {
    setIsUpdatingStatus(true);
    try {
      const payload = { status: newStatus };
      if (['Booked', 'Dispatched', 'In Transit', 'Delivered'].includes(newStatus) && !lead.order_created_at) {
        payload.order_created_at = new Date().toISOString();
        payload.is_read = false;
      }
      
      const { error } = await supabase.from('leads').update(payload).eq('lead_number', id);
      if (error) throw error;
      
      setLead({ ...lead, ...payload });

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
      const { data: logsData } = await supabase.from('change_logs').select('*, profiles:user_id(first_name, last_name, full_name, email)').eq('lead_id', lead.id).order('created_at', { ascending: false });
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
      const { data: logsData } = await supabase.from('change_logs').select('*, profiles:user_id(first_name, last_name, full_name, email)').eq('lead_id', lead.id).order('created_at', { ascending: false });
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
      const { data: logsData } = await supabase.from('change_logs').select('*, profiles:user_id(first_name, last_name, full_name, email)').eq('lead_id', lead.id).order('created_at', { ascending: false });
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
      const { data: logsData } = await supabase.from('change_logs').select('*, profiles:user_id(first_name, last_name, full_name, email)').eq('lead_id', lead.id).order('created_at', { ascending: false });
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
        origin_contact_name: lead.origin_contact_name || '',
        origin_contact_phone: lead.origin_contact_phone || '',
        destination_contact_name: lead.destination_contact_name || '',
        destination_contact_phone: lead.destination_contact_phone || '',
        ship_date: lead.ship_date || '',
        order_id: lead.order_id || ''
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
    } else if (panel === 'notes') {
      setDraftData({ notes: lead.notes || '' });
    } else if (panel === 'carrier') {
      setDraftData({
        carrier_company_name: lead.carrier_company_name || '',
        carrier_company_number: lead.carrier_company_number || '',
        carrier_dispatch_number: lead.carrier_dispatch_number || '',
        carrier_driver_number: lead.carrier_driver_number || '',
        carrier_email: lead.carrier_email || '',
        carrier_mc_number: lead.carrier_mc_number || '',
        carrier_usdot_number: lead.carrier_usdot_number || '',
        carrier_out_of: lead.carrier_out_of || ''
      });
    }
  };

  const handleBrokerFeeToggle = async (collected) => {
    try {
      const { error } = await supabase.from('leads').update({ broker_fee_collected: collected }).eq('id', lead.id);
      if (error) throw error;
      setLead(prev => ({ ...prev, broker_fee_collected: collected }));
      toast.success(`Broker Fee marked as ${collected ? 'Collected' : 'Not Collected'}`);
      if (user?.id) {
        await supabase.from('change_logs').insert([{
          lead_id: lead.id,
          user_id: user.id,
          operation: 'Entity Updated',
          details: `Broker Fee marked as ${collected ? 'Collected' : 'Not Collected'}`
        }]);
      }
    } catch (err) {
      console.error('Failed to update broker fee status', err);
      toast.error('Failed to update broker fee status');
    }
  };

  const handleCancelEdit = () => {
    setEditingPanel(null);
    setDraftData(null);
  };

  const handleInlineSave = async (panel) => {
    try {
      let changes = [];
      
      if (panel === 'customer') {
        const current = lead.customers || {};
        for (const key of Object.keys(draftData)) {
          const oldVal = current[key] || '';
          const newVal = draftData[key] || '';
          if (oldVal !== newVal) {
            changes.push(`${key.replace(/_/g, ' ')}: ${oldVal || 'empty'} -> ${newVal || 'empty'}`);
          }
        }
        if (lead.customers?.id) {
           const { error } = await supabase.from('customers').update(draftData).eq('id', lead.customers.id);
           if (error) throw error;
        }
        setLead({ ...lead, customers: { ...lead.customers, ...draftData } });
      } 
      else if (panel === 'logistics' || panel === 'price' || panel === 'notes' || panel === 'carrier') {
        const payload = { ...draftData };
        if (payload.estimated_price !== undefined) payload.estimated_price = parseFloat(payload.estimated_price) || null;
        if (payload.carrier_pay !== undefined) payload.carrier_pay = parseFloat(payload.carrier_pay) || null;

        if (panel === 'price' && payload.estimated_price > 0 && lead.status === 'New') {
          payload.status = 'Quoted';
        }

        for (const key of Object.keys(payload)) {
          const oldVal = lead[key] === null || lead[key] === undefined ? '' : lead[key];
          const newVal = payload[key] === null || payload[key] === undefined ? '' : payload[key];
          if (String(oldVal) !== String(newVal)) {
            changes.push(`${key.replace(/_/g, ' ')}: ${oldVal || 'empty'} -> ${newVal || 'empty'}`);
          }
        }

        const payloadClean = { ...payload };
        delete payloadClean.customers;
        delete payloadClean.assignee;
        delete payloadClean.creator;
        delete payloadClean.lead_vehicles;

        const { error } = await supabase.from('leads').update(payloadClean).eq('lead_number', id);
        if (error) throw error;
        setLead({ ...lead, ...payload });

        // --- CARRIER POOL AUTO-SYNC ---
        if (panel === 'carrier' && payload.carrier_company_name) {
          const carrierName = payload.carrier_company_name.trim();
          if (carrierName) {
            try {
              const { data: existingCarrier } = await supabase
                .from('carriers')
                .select('id')
                .ilike('company_name', carrierName)
                .maybeSingle();

              const carrierPayload = {
                company_name: carrierName,
                mc_number: payload.carrier_mc_number || '',
                dot_number: payload.carrier_usdot_number || '',
                company_phone: payload.carrier_company_number || '',
                dispatch_phone: payload.carrier_dispatch_number || '',
                driver_phone: payload.carrier_driver_number || '',
                out_of: payload.carrier_out_of || ''
              };

              if (!existingCarrier) {
                await supabase.from('carriers').insert([{
                  ...carrierPayload,
                  insurance_status: 'Pending',
                  rating: 5.0,
                  available_trucks: 1
                }]);
              }
            } catch (carrierErr) {
              console.error('Failed to auto-sync carrier to pool:', carrierErr);
              // We do not throw here to prevent blocking the lead save if the pool sync fails
            }
          }
        }
        // --- END CARRIER POOL AUTO-SYNC ---
      }
      else if (panel === 'vehicles') {
        changes.push('Vehicles list updated');
        await supabase.from('lead_vehicles').delete().eq('lead_id', lead.id);
        const newVehicles = draftData.map(v => ({
           lead_id: lead.id,
           vehicle_year: v.vehicle_year,
           vehicle_make: v.vehicle_make,
           vehicle_model: v.vehicle_model,
           vehicle_type: v.vehicle_type || 'Car',
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

      const detailsText = changes.length > 0 ? changes.join(' | ') : 'No changes made';
      await logActivity(lead.id, user.id, 'Entity Updated', `${panel.charAt(0).toUpperCase() + panel.slice(1)} Panel Edited`, detailsText);
      const { data: logsData } = await supabase.from('change_logs').select('*, profiles:user_id(first_name, last_name)').eq('lead_id', lead.id).order('created_at', { ascending: false });
      if (logsData) setLogs(logsData);
      
      handleCancelEdit();
    } catch (err) {
      toast.error("Error saving: " + err.message);
    }
  };

  const handleGeneratePDF = (action, targetSignature = null) => {
    const formData = {
      firstName: lead.customers?.first_name || '',
      lastName: lead.customers?.last_name || '',
      email: lead.customers?.email || '',
      phone: lead.customers?.phone || '',
      pickupDate: lead.ship_date || 'TBD',
      originAddress: lead.origin_address || '',
      originCity: `${lead.origin_city || ''}${lead.origin_state ? `, ${lead.origin_state}` : ''} ${lead.origin_zip || ''}`.trim(),
      originContactName: lead.origin_contact_name || '',
      originContactPhone: lead.origin_contact_phone || '',
      destAddress: lead.destination_address || '',
      destCity: `${lead.destination_city || ''}${lead.destination_state ? `, ${lead.destination_state}` : ''} ${lead.destination_zip || ''}`.trim(),
      destContactName: lead.destination_contact_name || '',
      destContactPhone: lead.destination_contact_phone || ''
    };

    const quoteNumber = `NG-${lead.order_id || lead.lead_number}`;
    const transportType = lead.lead_vehicles?.[0]?.trailer_type === 'Enclosed' ? 'Enclosed' : 'Open';
    const cargoLabel = lead.lead_vehicles && lead.lead_vehicles.length > 0 
      ? lead.lead_vehicles.map(v => `${v.vehicle_year} ${v.vehicle_make} ${v.vehicle_model}`).join(', ')
      : 'Vehicle Details Not Provided';

    const tariff = Number(lead.estimated_price) || 0;
    
    let deposit = 0;
    const terms = (lead.broker_fee_terms || '').toLowerCase().replace(/\s+/g, '');
    if (terms === 'paymentonorder' || terms === 'paymentonpickup') {
      const override = Number(lead.deposit_amount);
      deposit = override > 0 
        ? override 
        : (Number(lead.estimated_price || 0) - Number(lead.carrier_pay || 0));
    } else {
      deposit = 0;
    }
    
    const nextPayment = tariff - deposit;
    
    const firstPaymentDue = lead.broker_fee_terms || 'Payment on Order';
    const firstPaymentMethod = lead.payment_method || 'Credit Card';
    const finalPaymentDue = lead.carrier_pay_terms || 'Payment on Delivery';
    const finalPaymentMethod = lead.carrier_payment_method || 'Cash / Certified Funds';
    
    const ipAddress = lead.signed_ip || '';
    generateOrderPDF(
       lead, formData, quoteNumber, transportType, cargoLabel, tariff, deposit,
       nextPayment, firstPaymentDue, firstPaymentMethod, finalPaymentDue, finalPaymentMethod, 
       ipAddress, action, targetSignature, phone
    );
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
      if (lead.is_archived) {
        navigate('/archive');
      } else if (location.pathname.startsWith('/orders')) {
        navigate('/orders');
      } else {
        navigate('/leads');
      }
    } catch (err) {
      toast.error('Error deleting: ' + err.message);
    }
  };



  return (
    <div className={styles.pageContainer}>
      <button 
        onClick={() => navigate(isOrderView ? '/orders' : '/leads')} 
        className={styles.btnBack}
      >
        <ArrowLeft size={16} /> Back to {isOrderView ? 'Orders' : 'Leads'}
      </button>

      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.leadTitle} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isOrderView ? 'Order' : 'Lead'} #NG-{lead.order_id || lead.lead_number}
            <CustomDropdown
              value={lead.status}
              options={STATUS_OPTIONS.map(s => ({ value: s, label: s }))}
              onChange={handleStatusChange}
              renderButton={(selectedOption, isOpen) => (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  fontSize: '0.9rem',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  backgroundColor: getStatusColors(lead.status).bg,
                  color: getStatusColors(lead.status).text,
                  border: `1px solid ${getStatusColors(lead.status).border}`,
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  opacity: isUpdatingStatus ? 0.7 : 1
                }}>
                  {selectedOption?.label || lead.status}
                  <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                </div>
              )}
              renderOption={(opt) => {
                const colors = getStatusColors(opt.value);
                return (
                  <span style={{
                    display: 'inline-flex', padding: '2px 8px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase',
                    backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}`
                  }}>
                    {opt.label}
                  </span>
                );
              }}
            />
          </h1>
          <div className={styles.subTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span>{lead.order_created_at ? 'Lead created on' : 'Created on'} {new Date(lead.created_at).toLocaleString()}</span>
              {lead.order_created_at && (
                <span>Order created on {new Date(lead.order_created_at).toLocaleString()}</span>
              )}
            </div>
          </div>
        </div>
        <div className={styles.actions}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', marginRight: '16px' }}>
            {isAdmin && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: '600' }}>Assigned Agent:</span>
                <CustomDropdown
                  value={lead.assigned_to || ''}
                  options={[
                    { value: '', label: 'Unassigned', color: getAgentColors('Unassigned') },
                    ...teamMembers.map(m => ({
                      value: m.id,
                      label: m.full_name || m.email,
                      color: getAgentColors(m.full_name || m.email)
                    }))
                  ]}
                  onChange={handleAssign}
                  dropdownStyle={{ right: 0, left: 'auto', minWidth: '220px' }}
                  renderButton={(selectedOption, isOpen) => {
                    const mColor = selectedOption?.color || getAgentColors('Unassigned');
                    return (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '6px 12px',
                        borderRadius: '12px',
                        backgroundColor: mColor.bg,
                        color: mColor.text,
                        border: `1px solid ${mColor.border}`,
                        fontWeight: '600',
                        opacity: isAssigning ? 0.7 : 1
                      }}>
                        <span>{selectedOption?.label || 'Unassigned'}</span>
                        <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                      </div>
                    );
                  }}
                  renderOption={(opt) => {
                    return (
                      <span style={{
                        fontWeight: '600',
                        color: opt.color.text,
                      }}>
                        {opt.label}
                      </span>
                    );
                  }}
                />
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: '600' }}>Source:</span>
              <div style={{ backgroundColor: 'var(--bg-dark)', padding: '2px 8px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <SourceBadge source={lead.source} />
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className={styles.btnSuccess} onClick={handleSendOrderForm} disabled={isSendingEmail}>
              {isSendingEmail ? 'Sending...' : 'Send Form'}
            </button>
            <button className={styles.btnWarning} onClick={handleSendChangeOrder} disabled={isSendingEmail}>
              Change Order
            </button>
            <button className={styles.btnPrimary} onClick={handleSendQuoteEmail} disabled={isSendingQuote}>
              {isSendingQuote ? 'Sending...' : 'Quote Email'}
            </button>
            {!isOrderView && (
              <button className={styles.btnWarning} onClick={handleArchiveToggle}>
                {lead.is_archived ? 'Restore' : 'Archive'}
              </button>
            )}
            {isAdmin && (
              <button className={styles.btnDanger} onClick={handleDelete}>Delete</button>
            )}
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
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    {/* LEFT COLUMN: ORIGIN */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                         <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Origin</label>
                         <textarea value={draftData.origin_address} onChange={e => setDraftData({...draftData, origin_address: e.target.value})} className={styles.inlineInput} style={{ minHeight: '60px', marginTop: '4px' }} placeholder="Address line..."></textarea>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                         <div style={{ flex: 1 }}>
                           <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>City</label>
                           <input type="text" value={draftData.origin_city} onChange={e => setDraftData({...draftData, origin_city: e.target.value})} className={styles.inlineInput} />
                         </div>
                         <div style={{ width: '60px' }}>
                           <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>State</label>
                           <input type="text" value={draftData.origin_state} onChange={e => setDraftData({...draftData, origin_state: e.target.value})} className={styles.inlineInput} />
                         </div>
                         <div style={{ width: '80px' }}>
                           <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Zip</label>
                           <input type="text" value={draftData.origin_zip} onChange={e => setDraftData({...draftData, origin_zip: e.target.value})} className={styles.inlineInput} />
                         </div>
                      </div>
                      
                      <div className={styles.infoBlock}>
                        <span className={styles.infoLabel}>PICKUP CONTACT</span>
                        <input type="text" value={draftData.origin_contact_name} onChange={e => setDraftData({...draftData, origin_contact_name: e.target.value})} className={styles.inlineInput} placeholder="Contact Name" />
                        <input type="tel" value={draftData.origin_contact_phone} onChange={e => setDraftData({...draftData, origin_contact_phone: e.target.value})} className={styles.inlineInput} placeholder="Contact Phone" style={{marginTop: '4px'}} />
                      </div>
                      
                      <div className={styles.infoBlock}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Est. Ship Date</label>
                        <input type="date" value={draftData.ship_date} onChange={e => setDraftData({...draftData, ship_date: e.target.value})} className={styles.inlineInput} style={{ marginTop: '4px' }} />
                      </div>
                    </div>

                    {/* RIGHT COLUMN: DESTINATION */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                         <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Destination</label>
                         <textarea value={draftData.destination_address} onChange={e => setDraftData({...draftData, destination_address: e.target.value})} className={styles.inlineInput} style={{ minHeight: '60px', marginTop: '4px' }} placeholder="Address line..."></textarea>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                         <div style={{ flex: 1 }}>
                           <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>City</label>
                           <input type="text" value={draftData.destination_city} onChange={e => setDraftData({...draftData, destination_city: e.target.value})} className={styles.inlineInput} />
                         </div>
                         <div style={{ width: '60px' }}>
                           <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>State</label>
                           <input type="text" value={draftData.destination_state} onChange={e => setDraftData({...draftData, destination_state: e.target.value})} className={styles.inlineInput} />
                         </div>
                         <div style={{ width: '80px' }}>
                           <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Zip</label>
                           <input type="text" value={draftData.destination_zip} onChange={e => setDraftData({...draftData, destination_zip: e.target.value})} className={styles.inlineInput} />
                         </div>
                      </div>

                      <div className={styles.infoBlock}>
                        <span className={styles.infoLabel}>DELIVERY CONTACT</span>
                        <input type="text" value={draftData.destination_contact_name} onChange={e => setDraftData({...draftData, destination_contact_name: e.target.value})} className={styles.inlineInput} placeholder="Contact Name" />
                        <input type="tel" value={draftData.destination_contact_phone} onChange={e => setDraftData({...draftData, destination_contact_phone: e.target.value})} className={styles.inlineInput} placeholder="Contact Phone" style={{marginTop: '4px'}} />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button onClick={handleCancelEdit} style={{ padding: '6px 12px', background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={() => handleInlineSave('logistics')} style={{ padding: '6px 16px', background: '#10b981', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}><Check size={16}/> Save</button>
                  </div>
                </>
              ) : (
                <div className={styles.infoGrid}>
                  {/* LEFT COLUMN: ORIGIN */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className={styles.infoBlock}>
                      <span className={styles.infoLabel}>Origin</span>
                      <span className={styles.infoValue}>
                        <div>{lead.origin_city}, {lead.origin_state} {lead.origin_zip}</div>
                        {lead.origin_address && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{lead.origin_address}</div>}
                      </span>
                    </div>
                    <div className={styles.infoBlock}>
                      <span className={styles.infoLabel}>PICKUP CONTACT</span>
                      <span className={styles.infoValue}>
                        {lead.origin_contact_name || 'N/A'}
                        {lead.origin_contact_phone && <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{lead.origin_contact_phone}</span>}
                      </span>
                    </div>
                    <div className={styles.infoBlock}>
                      <span className={styles.infoLabel}>Estimated Ship Date</span>
                      <span className={styles.infoValue}>{lead.ship_date || 'TBD'}</span>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: DESTINATION */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className={styles.infoBlock}>
                      <span className={styles.infoLabel}>Destination</span>
                      <span className={styles.infoValue}>
                        <div>{lead.destination_city}, {lead.destination_state} {lead.destination_zip}</div>
                        {lead.destination_address && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{lead.destination_address}</div>}
                      </span>
                    </div>
                    <div className={styles.infoBlock}>
                      <span className={styles.infoLabel}>DELIVERY CONTACT</span>
                      <span className={styles.infoValue}>
                        {lead.destination_contact_name || 'N/A'}
                        {lead.destination_contact_phone && <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{lead.destination_contact_phone}</span>}
                      </span>
                    </div>
                    <div className={styles.infoBlock}>
                      <span className={styles.infoLabel}>Order ID (Reference)</span>
                      <span className={styles.infoValue}>{lead.order_id || 'N/A'}</span>
                    </div>
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
                    <div key={i} style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', position: 'relative' }}>
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
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Type</label>
                          <select 
                            value={['Car', 'SUV', 'Pickup', 'Van', 'Motorcycle'].includes(v.vehicle_type) ? v.vehicle_type : 'Other'} 
                            onChange={e => { const newV = [...draftData]; newV[i].vehicle_type = e.target.value === 'Other' ? '' : e.target.value; setDraftData(newV); }} 
                            style={{ width: '100%', padding: '6px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }}
                          >
                            <option value="Car">Car</option>
                            <option value="SUV">SUV</option>
                            <option value="Pickup">Pickup</option>
                            <option value="Van">Van</option>
                            <option value="Motorcycle">Motorcycle</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        {(!['Car', 'SUV', 'Pickup', 'Van', 'Motorcycle'].includes(v.vehicle_type)) && (
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Specify Type</label>
                            <input type="text" value={v.vehicle_type === 'Other' ? '' : v.vehicle_type} onChange={e => { const newV = [...draftData]; newV[i].vehicle_type = e.target.value; setDraftData(newV); }} placeholder="e.g. Boat" style={{ width: '100%', padding: '6px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }} />
                          </div>
                        )}
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
                  
                  <button onClick={() => setDraftData([...draftData, { vehicle_year: '', vehicle_make: '', vehicle_model: '', vehicle_type: 'Car', condition: 'Operable', trailer_type: 'Open' }])} style={{ alignSelf: 'flex-start', padding: '6px 12px', background: 'none', border: '1px solid var(--brand-blue)', color: 'var(--brand-blue)', borderRadius: '4px', cursor: 'pointer' }}>+ Add Vehicle</button>

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
                          <span className={styles.infoValue}>{v.vehicle_year} {v.vehicle_make} {v.vehicle_model} {v.vehicle_type ? `(${v.vehicle_type})` : ''}</span>
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
          <div className={styles.panel}>
            <div className={styles.panelHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>Memo / Notes</div>
              {editingPanel !== 'notes' && (
                <button onClick={() => handleEditClick('notes')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><Edit2 size={14} /></button>
              )}
            </div>
            <div className={styles.panelBody}>
              {editingPanel === 'notes' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <textarea 
                    value={draftData?.notes || ''} 
                    onChange={e => setDraftData({...draftData, notes: e.target.value})}
                    style={{ width: '100%', minHeight: '100px', padding: '8px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', resize: 'vertical' }}
                    placeholder="Add notes..."
                  />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={handleCancelEdit} style={{ padding: '4px 8px', background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={() => handleInlineSave('notes')} style={{ padding: '4px 8px', background: '#10b981', border: 'none', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={14}/> Save</button>
                  </div>
                </div>
              ) : (
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5', color: 'var(--text-primary)' }}>
                  {lead.notes ? lead.notes : <span style={{ opacity: 0.7, fontStyle: 'italic', color: 'var(--text-muted)' }}>No notes added.</span>}
                </div>
              )}
            </div>
          </div>

          {/* Removed Signed Order Form Panel from here */}

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

                  <div style={{ margin: '16px 0', borderTop: '1px solid var(--border-color)' }}></div>

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
                        <span className={styles.infoLabel}>Broker Fee Collected</span>
                        <select 
                          value={lead.broker_fee_collected ? 'Yes' : 'No'} 
                          onChange={(e) => handleBrokerFeeToggle(e.target.value === 'Yes')}
                          style={{ 
                            padding: '4px', 
                            background: 'var(--bg-secondary)', 
                            border: '1px solid var(--border-color)', 
                            color: lead.broker_fee_collected ? 'var(--success)' : 'var(--text-primary)', 
                            borderRadius: '4px',
                            cursor: 'pointer',
                            outline: 'none',
                            width: '80px'
                          }}
                        >
                          <option value="No" style={{color: 'var(--text-primary)'}}>No</option>
                          <option value="Yes" style={{color: 'var(--text-primary)'}}>Yes</option>
                        </select>
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
                    <input type="text" value={draftData.first_name} onChange={e => setDraftData({...draftData, first_name: e.target.value})} className={styles.inlineInput} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Last Name</label>
                    <input type="text" value={draftData.last_name} onChange={e => setDraftData({...draftData, last_name: e.target.value})} className={styles.inlineInput} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Email</label>
                    <input type="email" value={draftData.email} onChange={e => setDraftData({...draftData, email: e.target.value})} className={styles.inlineInput} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Phone</label>
                    <input type="tel" value={draftData.phone} onChange={e => setDraftData({...draftData, phone: e.target.value})} className={styles.inlineInput} />
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
                    <span className={styles.infoValue}>{lead.customers?.first_name} {lead.customers?.last_name && lead.customers.last_name !== 'Unknown' ? lead.customers.last_name : ''}</span>
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
            <div className={styles.panelHeader} style={{ backgroundColor: 'var(--brand-blue)', color: '#fff' }}>Tasks</div>
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
                        <tr key={t.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                          <td style={{ paddingTop: '8px', paddingBottom: '8px', color: 'var(--brand-blue)' }}>{t.title}</td>
                          <td style={{ paddingTop: '8px', paddingBottom: '8px', color: 'var(--text-secondary)' }}>{t.description || '-'}</td>
                          <td style={{ paddingTop: '8px', paddingBottom: '8px', color: 'var(--text-primary)' }}>
                            {t.due_date ? (() => {
                              const [y, m, d] = t.due_date.split('-');
                              return new Date(y, m - 1, d).toLocaleDateString();
                            })() : ''}
                          </td>
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

          {/* Signed Documents Panel */}
          <div className={styles.panel} style={{ marginBottom: '20px' }}>
            <div className={styles.panelHeader} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PenTool size={18} /> Signed Documents
            </div>
            <div className={styles.panelBody} style={{ padding: '15px' }}>
               
               {!lead.electronic_signature && (!lead.change_order_signatures || lead.change_order_signatures.length === 0) ? (
                 <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '10px 0' }}>
                   No signed documents yet.
                 </div>
               ) : (
                 <>
                   {/* Original Signature */}
                   {lead.electronic_signature && (
                 <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-dark)', borderRadius: '6px', marginBottom: '8px', borderLeft: '3px solid #10b981' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px' }}>
                     <div>
                       <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', marginBottom: '2px' }}>Original Signature</span>
                       <span style={{ fontFamily: '"Brush Script MT", "Great Vibes", cursive', fontSize: '1.2rem', color: 'var(--brand-blue)', lineHeight: '1' }}>{lead.electronic_signature}</span>
                     </div>
                     <div style={{ textAlign: 'right' }}>
                       <span style={{ fontSize: '0.7rem', display: 'block', color: 'var(--text-primary)' }}>{new Date(lead.signed_date).toLocaleDateString()}</span>
                       <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>IP: {lead.signed_ip}</span>
                     </div>
                   </div>
                   <div style={{ display: 'flex', gap: '4px', padding: '8px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-dark)' }}>
                     <button className={styles.btnSecondary} onClick={() => handleGeneratePDF('preview', { type: 'original' })} style={{ flex: 1, padding: '4px', fontSize: '0.7rem', background: '#ecfdf5', color: '#065f46', borderColor: '#10b981' }}>Preview</button>
                     <button className={styles.btnPrimary} onClick={() => handleGeneratePDF('download', { type: 'original' })} style={{ flex: 1, padding: '4px', fontSize: '0.7rem', background: '#10b981', color: '#fff', borderColor: '#10b981' }}>Download</button>
                   </div>
                  </div>
                  )}

                   {/* Change Order Signatures */}
                   {Array.isArray(lead.change_order_signatures) && lead.change_order_signatures.map((sig, idx) => (
                     <div key={idx} style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-dark)', borderRadius: '6px', marginBottom: '8px', borderLeft: '3px solid #f59e0b' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px' }}>
                         <div>
                           <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', marginBottom: '2px' }}>Change Order {idx + 1}</span>
                           <span style={{ fontFamily: '"Brush Script MT", "Great Vibes", cursive', fontSize: '1.2rem', color: 'var(--brand-blue)', lineHeight: '1' }}>{sig.signature}</span>
                         </div>
                         <div style={{ textAlign: 'right' }}>
                           <span style={{ fontSize: '0.7rem', display: 'block', color: 'var(--text-primary)' }}>{new Date(sig.date).toLocaleDateString()}</span>
                           <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>IP: {sig.ip}</span>
                         </div>
                       </div>
                       <div style={{ display: 'flex', gap: '4px', padding: '8px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-dark)' }}>
                         <button className={styles.btnSecondary} onClick={() => handleGeneratePDF('preview', sig)} style={{ flex: 1, padding: '4px', fontSize: '0.7rem', background: '#ecfdf5', color: '#065f46', borderColor: '#10b981' }}>Preview</button>
                         <button className={styles.btnPrimary} onClick={() => handleGeneratePDF('download', sig)} style={{ flex: 1, padding: '4px', fontSize: '0.7rem', background: '#10b981', color: '#fff', borderColor: '#10b981' }}>Download</button>
                       </div>
                     </div>
                   ))}
                 </>
               )}
            </div>
          </div>

          {/* Assigned Carrier Panel */}
          <div className={styles.panel} style={{ marginBottom: '20px' }}>
            <div className={styles.panelHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Truck size={18} /> Assigned Carrier
              </div>
              {editingPanel !== 'carrier' && (
                <button onClick={() => handleEditClick('carrier')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><Edit2 size={14} /></button>
              )}
            </div>
            <div className={styles.panelBody}>
              {editingPanel === 'carrier' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ position: 'relative' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Carrier Company Name</label>
                    <input type="text" className={styles.inlineInput} style={{ marginTop: '4px', width: '100%' }} 
                      value={draftData.carrier_company_name} 
                      onChange={e => {
                        setDraftData({...draftData, carrier_company_name: e.target.value});
                        setShowCarrierSuggestions(true);
                      }} 
                      onFocus={() => setShowCarrierSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowCarrierSuggestions(false), 200)}
                      placeholder="Company Name" />
                    
                    {showCarrierSuggestions && carrierSuggestions.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '6px', zIndex: 50, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', marginTop: '4px' }}>
                        {carrierSuggestions.map(c => (
                           <div key={c.id} style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-dark)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                onClick={() => {
                                  setDraftData({
                                    ...draftData,
                                    carrier_company_name: c.company_name,
                                    carrier_mc_number: c.mc_number || draftData.carrier_mc_number || '',
                                    carrier_usdot_number: c.dot_number || draftData.carrier_usdot_number || '',
                                    carrier_company_number: c.company_phone || draftData.carrier_company_number || '',
                                    carrier_dispatch_number: c.dispatch_phone || draftData.carrier_dispatch_number || '',
                                    carrier_driver_number: c.driver_phone || draftData.carrier_driver_number || '',
                                    carrier_out_of: c.out_of || draftData.carrier_out_of || ''
                                  });
                                  setShowCarrierSuggestions(false);
                                }}>
                             <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{c.company_name}</div>
                             <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                               MC: {c.mc_number || 'N/A'} | DOT: {c.dot_number || 'N/A'} | Rating: {c.rating || 'N/A'}
                             </div>
                           </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Out of (City, State)</label>
                    <input type="text" className={styles.inlineInput} style={{ marginTop: '4px', width: '100%' }} value={draftData.carrier_out_of} onChange={e => setDraftData({...draftData, carrier_out_of: e.target.value})} placeholder="e.g. Miami, FL" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Company Number</label>
                      <input type="text" className={styles.inlineInput} style={{ marginTop: '4px' }} value={draftData.carrier_company_number} onChange={e => setDraftData({...draftData, carrier_company_number: e.target.value})} placeholder="Company Number" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Email</label>
                      <input type="email" className={styles.inlineInput} style={{ marginTop: '4px' }} value={draftData.carrier_email} onChange={e => setDraftData({...draftData, carrier_email: e.target.value})} placeholder="Email" />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Dispatch Number</label>
                      <input type="text" className={styles.inlineInput} style={{ marginTop: '4px' }} value={draftData.carrier_dispatch_number} onChange={e => setDraftData({...draftData, carrier_dispatch_number: e.target.value})} placeholder="Dispatch Number" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Driver Number</label>
                      <input type="text" className={styles.inlineInput} style={{ marginTop: '4px' }} value={draftData.carrier_driver_number} onChange={e => setDraftData({...draftData, carrier_driver_number: e.target.value})} placeholder="Driver Number" />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>MC Number</label>
                      <input type="text" className={styles.inlineInput} style={{ marginTop: '4px' }} value={draftData.carrier_mc_number} onChange={e => setDraftData({...draftData, carrier_mc_number: e.target.value})} placeholder="MC Number" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>USDOT Number</label>
                      <input type="text" className={styles.inlineInput} style={{ marginTop: '4px' }} value={draftData.carrier_usdot_number} onChange={e => setDraftData({...draftData, carrier_usdot_number: e.target.value})} placeholder="USDOT Number" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button onClick={handleCancelEdit} className={styles.btnSecondary}>Cancel</button>
                    <button onClick={() => handleInlineSave('carrier')} className={styles.btnPrimary} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={14}/> Save</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className={styles.infoBlock}>
                    <span className={styles.infoLabel}>Company Name</span>
                    <span className={styles.infoValue}>{lead.carrier_company_name || '-'}</span>
                  </div>
                  <div className={styles.infoBlock}>
                    <span className={styles.infoLabel}>Out of (City, State)</span>
                    <span className={styles.infoValue}>{lead.carrier_out_of || '-'}</span>
                  </div>
                  <div className={styles.infoBlock}>
                    <span className={styles.infoLabel}>Email</span>
                    <span className={styles.infoValue}>{lead.carrier_email || '-'}</span>
                  </div>
                  <div className={styles.infoBlock}>
                    <span className={styles.infoLabel}>Company Number</span>
                    <span className={styles.infoValue}>{lead.carrier_company_number || '-'}</span>
                  </div>
                  <div className={styles.infoBlock}>
                    <span className={styles.infoLabel}>Dispatch Number</span>
                    <span className={styles.infoValue}>{lead.carrier_dispatch_number || '-'}</span>
                  </div>
                  <div className={styles.infoBlock}>
                    <span className={styles.infoLabel}>Driver Number</span>
                    <span className={styles.infoValue}>{lead.carrier_driver_number || '-'}</span>
                  </div>
                  <div className={styles.infoBlock}>
                    <span className={styles.infoLabel}>MC Number</span>
                    <span className={styles.infoValue}>{lead.carrier_mc_number || '-'}</span>
                  </div>
                  <div className={styles.infoBlock}>
                    <span className={styles.infoLabel}>USDOT Number</span>
                    <span className={styles.infoValue}>{lead.carrier_usdot_number || '-'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* File Attachment Panel */}
          <div className={styles.panel}>
            <div className={styles.panelHeader} style={{ backgroundColor: 'var(--brand-blue)', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Paperclip size={18} /> File Attachment
            </div>
            <div className={styles.panelBody} style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ width: '100px', textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>File Upload</div>
                
                <div style={{ flex: 1, border: '1px solid var(--border-color)', borderRadius: '4px', padding: '16px', backgroundColor: 'var(--bg-secondary)' }}>
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
                        backgroundColor: 'var(--brand-blue)', 
                        color: '#fff', 
                        borderRadius: '4px', 
                        cursor: isUploading ? 'not-allowed' : 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500'
                      }}
                    >
                      <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span> {isUploading ? 'Uploading...' : 'Choose'}
                    </label>
                  </div>
                  
                  <div style={{ textAlign: 'center', padding: '24px 0', borderTop: '1px solid var(--border-color)' }}>
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
                        <tr key={doc.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                          <td style={{ paddingTop: '8px', paddingBottom: '8px', color: 'var(--text-primary)' }}>{doc.file_name}</td>
                          <td style={{ paddingTop: '8px', paddingBottom: '8px', color: 'var(--text-secondary)' }}>{new Date(doc.created_at).toLocaleDateString()}</td>
                          <td style={{ paddingTop: '8px', paddingBottom: '8px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
                              <a href={doc.file_url} target="_blank" rel="noreferrer" style={{ color: 'var(--brand-blue)', textDecoration: 'none', fontWeight: '500' }}>View</a>
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
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                        {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>
                        {log.operation.includes('Signed')
                          ? 'Customer' 
                          : (log.profiles 
                            ? ((log.profiles.first_name || log.profiles.last_name) 
                                ? `${log.profiles.first_name || ''} ${log.profiles.last_name || ''}`.trim() 
                                : (log.profiles.full_name || log.profiles.email || 'Agent'))
                            : 'System')}
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

      <EmailPreviewModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        onSend={confirmSendEmail}
        emailPreview={emailPreviewData}
        customerEmail={activeEmailPayload?.customerEmail}
      />
    </div>
  );
};

export default LeadDetails;
