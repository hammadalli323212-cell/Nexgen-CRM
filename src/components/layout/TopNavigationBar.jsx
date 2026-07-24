import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ChevronDown, Search, Bell, Star, PlusCircle, LogOut, Users, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import { TENANT } from '../../config/tenant';
import { toast } from 'react-hot-toast';
import styles from './TopNavigationBar.module.css';

let globalAudioCtx = null;

const unlockAudio = () => {
  try {
    if (!globalAudioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) globalAudioCtx = new AudioContext();
    }
    if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume();
    }
  } catch (e) {}
};

if (typeof window !== 'undefined') {
  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
}

const playNotificationSound = (isOrder = false) => {
  try {
    unlockAudio();
    if (globalAudioCtx) {
      const now = globalAudioCtx.currentTime;
      const osc1 = globalAudioCtx.createOscillator();
      const osc2 = globalAudioCtx.createOscillator();
      const gain = globalAudioCtx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';

      if (isOrder) {
        osc1.frequency.setValueAtTime(523.25, now); // C5
        osc2.frequency.setValueAtTime(783.99, now + 0.15); // G5
      } else {
        osc1.frequency.setValueAtTime(440, now); // A4
        osc2.frequency.setValueAtTime(659.25, now + 0.15); // E5
      }

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(globalAudioCtx.destination);

      osc1.start(now);
      osc1.stop(now + 0.15);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.5);
    }
  } catch (err) {
    console.error('Audio playback error:', err);
  }
};

const getInitials = (name) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length > 1) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const TopNavigationBar = ({ onSearchClick }) => {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [unreadLeads, setUnreadLeads] = useState(0);
  const [unreadOrders, setUnreadOrders] = useState(0);
  const { user, role, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const lastMaxLeadNumRef = useRef(null);

  const triggerPopUpNotification = async (record) => {
    if (!record) return;
    const isOrder = ['Booked', 'Dispatched', 'In Transit', 'Delivered'].includes(record.status);
    const leadNum = record.lead_number ? `NG-${record.lead_number}` : 'New';

    let customerName = 'Website Customer';
    if (record.customer_id) {
      const { data: cust } = await supabase
        .from('customers')
        .select('first_name, last_name')
        .eq('id', record.customer_id)
        .maybeSingle();
      if (cust && (cust.first_name || cust.last_name)) {
        customerName = `${cust.first_name || ''} ${cust.last_name || ''}`.trim();
      }
    }

    playNotificationSound(isOrder);
    window.dispatchEvent(new CustomEvent('crm-lead-inserted'));

    toast.custom(
      (t) => (
        <div
          onClick={() => {
            toast.dismiss(t.id);
            navigate(isOrder ? `/orders/${record.lead_number}` : `/leads/${record.lead_number}`);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: isOrder ? '#065f46' : '#1e3a8a',
            color: '#ffffff',
            padding: '14px 20px',
            borderRadius: '10px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: '500',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            transition: 'all 0.2s ease',
            zIndex: 99999
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>{isOrder ? '🎉' : '🔔'}</span>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '1rem', color: isOrder ? '#6ee7b7' : '#93c5fd' }}>
              {isOrder ? 'New Order Received!' : 'New Lead Received!'} ({leadNum})
            </div>
            <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
              From {customerName}. Click to view details.
            </div>
          </div>
        </div>
      ),
      { duration: 8000, position: 'top-right' }
    );
  };

  useEffect(() => {
    if (!user?.id) return;

    let isSubscribed = true;

    const fetchUnreadCounts = async () => {
      try {
        const buildQuery = (table, selectStr, countOpts) => {
          let query = supabase.from(table).select(selectStr, countOpts);
          if (!isAdmin) {
             query = query.or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`);
          }
          return query;
        };

        const { count: leadsCount, error: leadsErr } = await buildQuery('leads', '*', { count: 'exact', head: true })
          .eq('is_read', false)
          .in('status', ['New', 'Quoted', 'Follow Up'])
          .eq('is_archived', false);
        
        const { count: ordersCount, error: ordersErr } = await buildQuery('leads', '*', { count: 'exact', head: true })
          .eq('is_read', false)
          .in('status', ['Booked', 'Dispatched', 'In Transit', 'Delivered'])
          .eq('is_archived', false);
          
        if (isSubscribed) {
          if (!leadsErr) setUnreadLeads(leadsCount || 0);
          if (!ordersErr) setUnreadOrders(ordersCount || 0);
        }

        // Check for newest lead for polling notification trigger
        const { data: newestLead } = await supabase
          .from('leads')
          .select('id, lead_number, status, customer_id, created_at')
          .order('lead_number', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (isSubscribed && newestLead?.lead_number) {
          if (lastMaxLeadNumRef.current !== null && newestLead.lead_number > lastMaxLeadNumRef.current) {
            triggerPopUpNotification(newestLead);
          }
          lastMaxLeadNumRef.current = newestLead.lead_number;
        }
      } catch (err) {
        console.error('Error in fetchUnreadCounts:', err);
      }
    };
    
    fetchUnreadCounts();

    // Polling backup every 10 seconds
    const pollInterval = setInterval(fetchUnreadCounts, 10000);

    // Supabase Realtime Listener with unique channel name
    const channelName = `topnav-changes-${user.id}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        async (payload) => {
          if (!isSubscribed) return;
          fetchUnreadCounts();
          const isInsert = payload.eventType === 'INSERT';
          const isConvertedToOrder = payload.eventType === 'UPDATE' && payload.old?.status !== 'Booked' && payload.new?.status === 'Booked';

          if (isInsert || isConvertedToOrder) {
            if (payload.new?.lead_number) {
              lastMaxLeadNumRef.current = Math.max(lastMaxLeadNumRef.current || 0, payload.new.lead_number);
            }
            triggerPopUpNotification(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [isAdmin, user?.id]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const navItems = [
    { name: 'Dashboard', path: '/' },
    { name: 'My Tasks', path: '/tasks' },
    { 
      name: 'Leads', 
      path: '/leads', 
      hasDropdown: true,
      dropdownItems: [
        { name: 'Active Leads', icon: <Star size={14} />, path: '/leads' },
        { name: 'Archived Records', icon: <Star size={14} style={{opacity: 0.5}} />, path: '/archive' }
      ]
    },
    { 
      name: 'Orders', 
      path: '/orders', 
      hasDropdown: true,
      dropdownItems: [
        { name: 'Active Orders', icon: <Star size={14} />, path: '/orders' },
        { name: 'Canceled Orders', icon: <Star size={14} style={{opacity: 0.5}} />, path: '/orders/canceled' }
      ]
    },
    { name: 'Customers', path: '/customers' },
    { name: 'Carriers', path: '/carriers' },
    { name: 'Reports', path: '/reports' },
  ];

  if (isAdmin) {
    navItems.push({ name: 'Users', path: '/users' });
  }

  return (
    <header className={styles.navbar}>
      <div className={styles.logoArea}>
        <img src={TENANT.LOGO_DARK} alt={`${TENANT.COMPANY_NAME} CRM`} style={{ height: '42px', objectFit: 'contain', mixBlendMode: 'multiply' }} />
      </div>
      
      <nav className={styles.navLinks}>
        {navItems.map((item) => (
          <div 
            key={item.name}
            style={{ position: 'relative' }}
            onMouseEnter={() => setActiveDropdown(item.name)}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <NavLink
              to={item.path}
              className={({ isActive }) => 
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
            >
              {item.name}
              {item.name === 'Leads' && unreadLeads > 0 && <span style={{ color: 'var(--danger)', fontWeight: 'bold', marginLeft: '6px' }}>{unreadLeads}</span>}
              {item.name === 'Orders' && unreadOrders > 0 && <span style={{ color: 'var(--danger)', fontWeight: 'bold', marginLeft: '6px' }}>{unreadOrders}</span>}
              {item.hasDropdown && <ChevronDown size={14} style={{ marginLeft: '4px' }} />}
            </NavLink>
            
            {item.hasDropdown && activeDropdown === item.name && item.dropdownItems && (
              <div className={styles.dropdownMenu}>
                {item.dropdownItems.map((dItem, idx) => (
                  <NavLink key={idx} to={dItem.path} className={styles.dropdownItem}>
                    {dItem.icon}
                    {dItem.name}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
      
      <div className={styles.rightActions}>
        <button className={styles.iconButton} onClick={toggleTheme} title="Toggle Theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className={styles.iconButton} onClick={onSearchClick} title="Search (Ctrl+K)">
          <Search size={18} />
        </button>
        <button className={styles.iconButton}>
          <Bell size={18} />
        </button>
        
        <div 
          className={styles.userProfile} 
          style={{ position: 'relative', cursor: 'pointer' }}
          onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
        >
          <div className={styles.avatar}>
            {getInitials(user?.user_metadata?.full_name)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span>{user?.user_metadata?.full_name || user?.email || 'User'}</span>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.7)' }}>{role?.toUpperCase() || 'USER'}</span>
          </div>

          {profileDropdownOpen && (
            <div className={styles.dropdownMenu} style={{ top: '45px', right: 0, left: 'auto', minWidth: '180px' }}>
              {isAdmin && (
                <NavLink to="/admin/users" className={styles.dropdownItem}>
                  <Users size={14} /> User Management
                </NavLink>
              )}
              <div 
                className={styles.dropdownItem} 
                onClick={handleSignOut}
                style={{ borderTop: '1px solid var(--border-color)', marginTop: '4px', paddingTop: '8px' }}
              >
                <LogOut size={14} /> Sign Out
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopNavigationBar;
