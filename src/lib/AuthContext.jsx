import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { TENANT } from '../config/tenant';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [phone, setPhone] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async (userId) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role, phone')
          .eq('id', userId)
          .single();
          
        if (error) {
          console.error('Error fetching profile:', error);
          // If it's a JWT error, don't aggressively log out! 
          // Supabase auto-refreshes tokens in the background. If we sign out here, 
          // we interrupt the refresh process.
          const savedRole = localStorage.getItem(`${TENANT.LOCAL_STORAGE_PREFIX}role_${userId}`);
          if (savedRole) setRole(savedRole);
        } else if (data) {
          setRole(data.role);
          if (data.phone) setPhone(data.phone);
          localStorage.setItem(`${TENANT.LOCAL_STORAGE_PREFIX}role_${userId}`, data.role);
        }
      } catch (err) {
        console.error('Unexpected error fetching profile:', err);
        const savedRole = localStorage.getItem(`${TENANT.LOCAL_STORAGE_PREFIX}role_${userId}`);
        if (savedRole) setRole(savedRole);
      } finally {
        setLoading(false);
      }
    };

    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Auth session error:', error);
        supabase.auth.signOut();
        setLoading(false);
        return;
      }
      
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    }).catch(err => {
      console.error('Unexpected getSession error:', err);
      setLoading(false);
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);


  const value = {
    user,
    role: user?.email === TENANT.ADMIN_EMAIL ? 'super_admin' : role,
    isAdmin: role === 'admin' || role === 'super_admin' || user?.email === TENANT.ADMIN_EMAIL,
    isSuperAdmin: role === 'super_admin' || user?.email === TENANT.ADMIN_EMAIL,
    phone: phone || TENANT.MAIN_PHONE,
    loading,
    signOut: () => supabase.auth.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
