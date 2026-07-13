import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import TopNavigationBar from './TopNavigationBar';
import CommandPalette from '../common/CommandPalette';
import styles from './AppLayout.module.css';

const AppLayout = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={styles.layout}>
      <TopNavigationBar onSearchClick={() => setIsSearchOpen(true)} />
      <main className={styles.mainContent}>
        <div className={styles.pageWrapper}>
          <Outlet />
        </div>
      </main>
      <CommandPalette isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
};

export default AppLayout;
