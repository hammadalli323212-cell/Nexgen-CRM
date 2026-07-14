import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import styles from './Dashboard.module.css'; // Reusing dashboard grid styles

const Reports = () => {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState({
    totalLeads: 0,
    totalOrders: 0,
    conversionRate: '0%',
    totalRevenue: 0,
    topCarriers: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        if (!user) return;
        
        // Base query builder helper
        const buildQuery = (table, selectStr, countOpts) => {
          let query = supabase.from(table).select(selectStr, countOpts).eq('is_archived', false);
          if (!isAdmin) {
             query = query.or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`);
          }
          return query;
        };

        // 1. Fetch total leads vs orders
        const { count: totalLeads } = await buildQuery('leads', '*', { count: 'exact', head: true });
        const { count: totalOrders } = await buildQuery('leads', '*', { count: 'exact', head: true }).in('status', ['Booked', 'Dispatched', 'In Transit', 'Delivered']);
        
        const conversionRate = totalLeads > 0 ? ((totalOrders / totalLeads) * 100).toFixed(1) + '%' : '0%';

        // 2. Total Revenue (all time for simplicity)
        const { data: revenueData } = await buildQuery('leads', 'estimated_price, carrier_pay').in('status', ['Booked', 'Dispatched', 'In Transit', 'Delivered']);
        
        let revenue = 0;
        if (revenueData) {
          revenueData.forEach(lead => {
            const price = lead.estimated_price || 0;
            const pay = lead.carrier_pay || 0;
            revenue += (price - pay);
          });
        }

        // 3. Top Carriers (simple aggregation)
        const { data: dispatches } = await buildQuery('leads', 'carrier_id, carriers(name)').not('carrier_id', 'is', null);
        
        const carrierCounts = {};
        if (dispatches) {
          dispatches.forEach(d => {
            const name = d.carriers?.name || 'Unknown';
            carrierCounts[name] = (carrierCounts[name] || 0) + 1;
          });
        }
        
        const topCarriers = Object.entries(carrierCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setStats({
          totalLeads: totalLeads || 0,
          totalOrders: totalOrders || 0,
          conversionRate,
          totalRevenue: revenue,
          topCarriers
        });
      } catch (err) {
        console.error('Error fetching reports:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [user, isAdmin]);

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1>Reports & Analytics</h1>
        <p>Key performance metrics and historical data.</p>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statTitle}>Total Leads</span>
          <span className={styles.statValue}>{loading ? '-' : stats.totalLeads}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statTitle}>Total Orders (Booked+)</span>
          <span className={styles.statValue}>{loading ? '-' : stats.totalOrders}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statTitle}>Conversion Rate</span>
          <span className={styles.statValue} style={{ color: 'var(--brand-blue)' }}>{loading ? '-' : stats.conversionRate}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statTitle}>Total Broker Profit</span>
          <span className={styles.statValue} style={{ color: 'var(--success)' }}>
            {loading ? '-' : `$${stats.totalRevenue.toFixed(2)}`}
          </span>
        </div>
      </div>

      <div className={styles.panelsGrid} style={{ gridTemplateColumns: '1fr' }}>
        <div className={styles.panel}>
          <h2>Top Carriers (by Dispatches)</h2>
          {loading ? (
            <div style={{ color: 'var(--text-muted)', marginTop: '20px' }}>Loading...</div>
          ) : stats.topCarriers.length > 0 ? (
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stats.topCarriers.map((c, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-color)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{c.name}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{c.count} dispatches</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', marginTop: '20px' }}>No carriers dispatched yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
