import { supabase } from './supabase';

/**
 * Logs an activity to the change_logs table
 * @param {string} leadId - The UUID of the lead
 * @param {string} userId - The UUID of the user performing the action
 * @param {string} operation - High level operation name (e.g. "Entity Updated")
 * @param {string} details - Sub-category or brief detail (e.g. "Fields have been changed")
 * @param {string} description - Detailed description of what changed
 */
export const logActivity = async (leadId, userId, operation, details, description) => {
  if (!leadId || !userId) return;
  
  try {
    const { error } = await supabase.from('change_logs').insert([{
      lead_id: leadId,
      user_id: userId,
      operation,
      details,
      description
    }]);
    
    if (error) {
      console.error('Failed to log activity:', error);
    }
  } catch (err) {
    console.error('Exception logging activity:', err);
  }
};
