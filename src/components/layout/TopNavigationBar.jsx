import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ChevronDown, Search, Bell, Star, PlusCircle, LogOut, Users, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import styles from './TopNavigationBar.module.css';

const TopNavigationBar = ({ onSearchClick }) => {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [unreadLeads, setUnreadLeads] = useState(0);
  const [unreadOrders, setUnreadOrders] = useState(0);
  const { user, role, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUnreadCounts = async () => {
      // Base query builder helper
      const buildQuery = (table, selectStr, countOpts) => {
        let query = supabase.from(table).select(selectStr, countOpts);
        if (!isAdmin) {
           query = query.or(`assigned_to.eq.${user?.id},created_by.eq.${user?.id}`);
        }
        return query;
      };

      const { count: leadsCount } = await buildQuery('leads', '*', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('status', 'Booked')
        .eq('is_archived', false);
      
      const { count: ordersCount } = await buildQuery('leads', '*', { count: 'exact', head: true })
        .eq('is_read', false)
        .eq('status', 'Booked')
        .eq('is_archived', false);
        
      setUnreadLeads(leadsCount || 0);
      setUnreadOrders(ordersCount || 0);
    };
    
    fetchUnreadCounts();
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        (payload) => fetchUnreadCounts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
    { name: 'Orders', path: '/orders', hasDropdown: true },
    { name: 'Dispatch', path: '/dispatch' },
    { name: 'Customers', path: '/customers' },
    { name: 'Carriers', path: '/carriers', hasDropdown: true },
    { name: 'Reports', path: '/reports', hasDropdown: true },
  ];

  if (isAdmin) {
    navItems.push({ name: 'Users', path: '/users' });
  }

  return (
    <header className={styles.navbar}>
      <div className={styles.logoArea}>
        <img src="/logo-transparent.png" alt="NexGen CRM" style={{ height: '42px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
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
            {user?.user_metadata?.full_name ? user.user_metadata.full_name.substring(0, 2).toUpperCase() : 'U'}
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
