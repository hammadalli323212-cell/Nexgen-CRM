import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import Calendar from '../components/calendar/Calendar';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import styles from './MyTasks.module.css';
import modalStyles from '../components/common/CommandPalette.module.css';

const MyTasks = () => {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '', description: '', due_date: '', status: 'Pending'
  });
  const [isSaving, setIsSaving] = useState(false);

  const fetchTasks = async () => {
    try {
      let query = supabase
        .from('tasks')
        .select('*, leads(lead_number, customers(first_name, last_name))')
        .order('due_date', { ascending: true });
        
      if (!isAdmin && !isSuperAdmin) {
        query = query.eq('user_id', user?.id);
      }
        
      const { data, error } = await query;
      if (error) throw error;
      
      let profilesMap = {};
      if (isAdmin || isSuperAdmin) {
        const { data: profilesData } = await supabase.from('profiles').select('id, full_name');
        if (profilesData) {
          profilesMap = profilesData.reduce((acc, p) => ({ ...acc, [p.id]: p.full_name }), {});
        }
      }
      
      const mappedTasks = data.map(t => {
        let titleSuffix = '';
        if (t.leads) {
          titleSuffix += ` - NG-${t.leads.lead_number || 'N/A'}`;
          if (t.leads.customers) {
            const fName = t.leads.customers.first_name || '';
            const lName = t.leads.customers.last_name || '';
            const fullName = `${fName} ${lName}`.trim();
            if (fullName && fullName !== 'Unknown') {
              titleSuffix += ` - ${fullName}`;
            }
          }
        }
        
        let titlePrefix = '';
        if ((isAdmin || isSuperAdmin) && t.user_id && profilesMap[t.user_id]) {
          titlePrefix = `[${profilesMap[t.user_id]}] `;
        }
        
        return {
          id: t.id,
          title: `${titlePrefix}${t.title}${titleSuffix}`,
          date: t.due_date,
          completed: t.status === 'Completed',
          urgent: false // Could be added to schema later
        };
      });
      setTasks(mappedTasks);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) fetchTasks();
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.due_date) return toast.error('Title and Due Date are required');
    
    try {
      setIsSaving(true);
      const { error } = await supabase.from('tasks').insert([{
        ...formData,
        user_id: user.id
      }]);
      
      if (error) throw error;
      
      setIsModalOpen(false);
      setFormData({ title: '', description: '', due_date: '', status: 'Pending' });
      fetchTasks();
    } catch (err) {
      toast.error('Error creating task: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.pageContainer} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>My Tasks</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>Manage your calendar events and reminders.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          style={{ background: 'var(--brand-blue)', color: 'var(--text-primary)', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}
        >
          + New Task
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', padding: '20px' }}>
        {loading ? (
          <div style={{ color: 'var(--text-muted)' }}>Loading calendar...</div>
        ) : (
          <Calendar tasks={tasks} />
        )}
      </div>

      {isModalOpen && (
        <div className={modalStyles.overlay} onClick={() => setIsModalOpen(false)}>
          <div className={modalStyles.palette} style={{ padding: '24px', maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '20px' }}>Create New Task</h2>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '0.9rem' }}>Task Title *</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} style={{ width: '100%', padding: '10px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }} />
              </div>
              
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '0.9rem' }}>Due Date *</label>
                <input required type="date" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} style={{ width: '100%', padding: '10px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }} />
              </div>

              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '0.9rem' }}>Description</label>
                <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ width: '100%', padding: '10px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px', resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSaving} style={{ padding: '8px 16px', background: 'var(--brand-blue)', border: 'none', color: 'var(--text-primary)', borderRadius: '6px', cursor: 'pointer' }}>
                  {isSaving ? 'Saving...' : 'Save Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTasks;
