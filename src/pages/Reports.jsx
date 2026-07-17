import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import styles from './Dashboard.module.css';
import { Calendar } from 'lucide-react';

const Reports = () => {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Date filter state
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const [dateRange, setDateRange] = useState({
    from: thirtyDaysAgo.toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  // Report Data States
  const [summaryStats, setSummaryStats] = useState({ totalLeads: 0, totalOrders: 0, conversionRate: '0%', totalRevenue: 0 });
  const [sourceData, setSourceData] = useState([]);
  const [userPerformance, setUserPerformance] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [carrierVolume, setCarrierVolume] = useState([]);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        if (!user) return;
        setLoading(true);
        
        let query = supabase.from('leads').select('*, assignee:profiles!assigned_to(first_name, last_name), carriers(company_name)')
          .eq('is_archived', false)
          .gte('created_at', `${dateRange.from}T00:00:00Z`)
          .lte('created_at', `${dateRange.to}T23:59:59Z`);

        if (!isAdmin) {
           query = query.or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`);
        }

        const { data: leads, error } = await query;
        if (error) throw error;

        // 1. Summary Stats
        let tLeads = 0;
        let tOrders = 0;
        let tRevenue = 0;

        // Aggregation objects
        const sources = {};
        const statuses = {};
        const usersMap = {};
        const carriersMap = {};

        const orderStatuses = ['Booked', 'Dispatched', 'In Transit', 'Picked Up', 'Delivered', 'Completed'];

        leads?.forEach(lead => {
          tLeads++;
          
          const isOrder = orderStatuses.includes(lead.status) || lead.status === 'Canceled';
          if (isOrder) tOrders++;

          if (orderStatuses.includes(lead.status) && lead.broker_fee_collected) {
            tRevenue += ((lead.estimated_price || 0) - (lead.carrier_pay || 0));
          }

          // Agg Sources
          const src = lead.source || 'Unknown';
          sources[src] = (sources[src] || 0) + 1;

          // Agg Statuses (only for orders)
          if (isOrder) {
            statuses[lead.status] = (statuses[lead.status] || 0) + 1;
          }

          // Agg Users
          const userName = lead.assignee ? `${lead.assignee.first_name} ${lead.assignee.last_name}` : 'Unassigned';
          if (!usersMap[userName]) {
            usersMap[userName] = { name: userName, leads: 0, orders: 0, revenue: 0 };
          }
          usersMap[userName].leads++;
          if (isOrder) usersMap[userName].orders++;
          if (isOrder && lead.broker_fee_collected) {
            usersMap[userName].revenue += ((lead.estimated_price || 0) - (lead.carrier_pay || 0));
          }

          // Agg Carriers
          if (lead.carrier_id && lead.carriers) {
            const carrierName = lead.carriers.company_name || 'Unknown';
            carriersMap[carrierName] = (carriersMap[carrierName] || 0) + 1;
          }
        });

        // Finalize state formatting
        setSummaryStats({
          totalLeads: tLeads,
          totalOrders: tOrders,
          conversionRate: tLeads > 0 ? ((tOrders / tLeads) * 100).toFixed(1) + '%' : '0%',
          totalRevenue: tRevenue
        });

        setSourceData(Object.keys(sources).map(key => ({ name: key, value: sources[key] })).sort((a,b) => b.value - a.value));
        
        setStatusData(Object.keys(statuses).map(key => ({ name: key, value: statuses[key] })).sort((a,b) => b.value - a.value));

        setCarrierVolume(Object.keys(carriersMap).map(key => ({ name: key, dispatches: carriersMap[key] })).sort((a,b) => b.dispatches - a.dispatches).slice(0, 10));

        setUserPerformance(Object.values(usersMap).map(u => ({
          ...u,
          conversion: u.leads > 0 ? parseFloat(((u.orders / u.leads) * 100).toFixed(1)) : 0
        })).sort((a,b) => b.leads - a.leads));

      } catch (err) {
        console.error('Error fetching reports:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [user, isAdmin, dateRange]);

  const handleDateChange = (e) => {
    setDateRange({ ...dateRange, [e.target.name]: e.target.value });
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${m}/${d}/${y}`;
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1>Reports & Analytics</h1>
          <p>Visualizing data from {formatDisplayDate(dateRange.from)} to {formatDisplayDate(dateRange.to)}</p>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div className={styles.dateFilter} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} style={{ color: 'var(--brand-blue)' }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>From</span>
            <input type="date" name="from" value={dateRange.from} onChange={handleDateChange} className={styles.datePickerInput} />
          </div>
          <div className={styles.dateFilter} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>To</span>
            <input type="date" name="to" value={dateRange.to} onChange={handleDateChange} className={styles.datePickerInput} />
          </div>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard} style={{ borderTop: '3px solid var(--brand-blue)' }}>
          <span className={styles.statTitle}>Total Leads</span>
          <span className={styles.statValue}>{loading ? '-' : summaryStats.totalLeads}</span>
        </div>
        <div className={styles.statCard} style={{ borderTop: '3px solid var(--warning)' }}>
          <span className={styles.statTitle}>Total Orders (Booked+)</span>
          <span className={styles.statValue}>{loading ? '-' : summaryStats.totalOrders}</span>
        </div>
        <div className={styles.statCard} style={{ borderTop: '3px solid var(--info)' }}>
          <span className={styles.statTitle}>Conversion Rate</span>
          <span className={styles.statValue} style={{ background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)', WebkitBackgroundClip: 'text' }}>{loading ? '-' : summaryStats.conversionRate}</span>
        </div>
        <div className={styles.statCard} style={{ borderTop: '3px solid var(--success)' }}>
          <span className={styles.statTitle}>Collected Broker Profit</span>
          <span className={styles.statValue} style={{ background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)', WebkitBackgroundClip: 'text' }}>
            {loading ? '-' : `$${summaryStats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </span>
        </div>
      </div>

      <div className={styles.panelsGrid} style={{ gridTemplateColumns: '1fr 1fr', marginTop: '20px' }}>
        {/* Lead Sources Table */}
        <div className={styles.panel} style={{ padding: '0' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
            <h2 style={{ margin: 0, border: 'none', padding: 0 }}>Lead Sources</h2>
          </div>
          {loading ? <div style={{padding: '20px', color:'var(--text-muted)'}}>Loading...</div> : sourceData.length === 0 ? <div style={{padding: '20px', color:'var(--text-muted)'}}>No data found.</div> : (
            <div style={{ overflowX: 'auto', paddingBottom: '10px' }}>
              <table className={styles.reportTable}>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th style={{ textAlign: 'right' }}>Total Leads</th>
                  </tr>
                </thead>
                <tbody>
                  {sourceData.map((s, i) => (
                    <tr key={i}>
                      <td>{s.name}</td>
                      <td style={{ textAlign: 'right' }}>{s.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Operational Statuses Table */}
        <div className={styles.panel} style={{ padding: '0' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
            <h2 style={{ margin: 0, border: 'none', padding: 0 }}>Operational Status (Orders)</h2>
          </div>
          {loading ? <div style={{padding: '20px', color:'var(--text-muted)'}}>Loading...</div> : statusData.length === 0 ? <div style={{padding: '20px', color:'var(--text-muted)'}}>No data found.</div> : (
            <div style={{ overflowX: 'auto', paddingBottom: '10px' }}>
              <table className={styles.reportTable}>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {statusData.map((s, i) => (
                    <tr key={i}>
                      <td>{s.name}</td>
                      <td style={{ textAlign: 'right' }}>{s.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className={styles.panelsGrid} style={{ gridTemplateColumns: '1fr', marginTop: '20px' }}>
        {/* User Performance Table */}
        <div className={styles.panel} style={{ padding: '0' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
            <h2 style={{ margin: 0, border: 'none', padding: 0 }}>User Performance</h2>
          </div>
          {loading ? <div style={{padding: '20px', color:'var(--text-muted)'}}>Loading...</div> : userPerformance.length === 0 ? <div style={{padding: '20px', color:'var(--text-muted)'}}>No data found.</div> : (
            <div style={{ overflowX: 'auto', paddingBottom: '10px' }}>
              <table className={styles.reportTable}>
                <thead>
                  <tr>
                    <th>Agent Name</th>
                    <th style={{ textAlign: 'right' }}>Leads Assigned</th>
                    <th style={{ textAlign: 'right' }}>Orders Booked</th>
                    <th style={{ textAlign: 'right' }}>Conversion Rate</th>
                    <th style={{ textAlign: 'right' }}>Broker Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {userPerformance.map((u, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: '500' }}>{u.name}</td>
                      <td style={{ textAlign: 'right' }}>{u.leads}</td>
                      <td style={{ textAlign: 'right' }}>{u.orders}</td>
                      <td style={{ textAlign: 'right', color: 'var(--brand-blue)' }}>{u.conversion}%</td>
                      <td style={{ textAlign: 'right', color: 'var(--success)' }}>${u.revenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits:2})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      <div className={styles.panelsGrid} style={{ gridTemplateColumns: '1fr', marginTop: '20px', marginBottom: '40px' }}>
         {/* Carrier Volume Table */}
         <div className={styles.panel} style={{ padding: '0' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
            <h2 style={{ margin: 0, border: 'none', padding: 0 }}>Top Carriers by Dispatched Volume</h2>
          </div>
          {loading ? <div style={{padding: '20px', color:'var(--text-muted)'}}>Loading...</div> : carrierVolume.length === 0 ? <div style={{padding: '20px', color:'var(--text-muted)'}}>No dispatches found.</div> : (
            <div style={{ overflowX: 'auto', paddingBottom: '10px' }}>
              <table className={styles.reportTable}>
                <thead>
                  <tr>
                    <th>Carrier Name</th>
                    <th style={{ textAlign: 'right' }}>Total Dispatches</th>
                  </tr>
                </thead>
                <tbody>
                  {carrierVolume.map((c, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: '500' }}>{c.name}</td>
                      <td style={{ textAlign: 'right', color: '#8b5cf6', fontWeight: 'bold' }}>{c.dispatches}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default Reports;
