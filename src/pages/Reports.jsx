import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import styles from './Dashboard.module.css'; // Reusing dashboard grid styles
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Calendar } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

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
        
        // Base query to fetch ALL raw leads in the date range so we can aggregate in JS
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

        setSourceData(Object.keys(sources).map(key => ({ name: key, value: sources[key] })));
        
        setStatusData(Object.keys(statuses).map(key => ({ name: key, value: statuses[key] })));

        setCarrierVolume(Object.keys(carriersMap).map(key => ({ name: key, Dispatches: carriersMap[key] })).sort((a,b) => b.Dispatches - a.Dispatches).slice(0, 10));

        setUserPerformance(Object.values(usersMap).map(u => ({
          ...u,
          Conversion: u.leads > 0 ? parseFloat(((u.orders / u.leads) * 100).toFixed(1)) : 0
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

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: 'var(--bg-dark)', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
          <p style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 'bold' }}>{label || payload[0].name}</p>
          {payload.map((p, idx) => (
            <p key={idx} style={{ margin: 0, color: p.color || 'var(--text-secondary)' }}>
              {p.name}: {p.name === 'Revenue' ? `$${p.value}` : p.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
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
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div className={styles.dateFilter}>
            <Calendar size={14} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '4px' }}>From</span>
            <input type="date" name="from" value={dateRange.from} onChange={handleDateChange} />
          </div>
          <div className={styles.dateFilter}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>To</span>
            <input type="date" name="to" value={dateRange.to} onChange={handleDateChange} />
          </div>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statTitle}>Total Leads</span>
          <span className={styles.statValue}>{loading ? '-' : summaryStats.totalLeads}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statTitle}>Total Orders (Booked+)</span>
          <span className={styles.statValue}>{loading ? '-' : summaryStats.totalOrders}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statTitle}>Conversion Rate</span>
          <span className={styles.statValue} style={{ color: 'var(--brand-blue)' }}>{loading ? '-' : summaryStats.conversionRate}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statTitle}>Collected Broker Profit</span>
          <span className={styles.statValue} style={{ color: 'var(--success)' }}>
            {loading ? '-' : `$${summaryStats.totalRevenue.toFixed(2)}`}
          </span>
        </div>
      </div>

      <div className={styles.panelsGrid} style={{ gridTemplateColumns: '1fr 1fr', marginTop: '20px' }}>
        {/* Lead Sources Pie Chart */}
        <div className={styles.panel}>
          <h2>Lead Sources</h2>
          {loading ? <div style={{color:'var(--text-muted)'}}>Loading...</div> : sourceData.length === 0 ? <div style={{color:'var(--text-muted)'}}>No data found.</div> : (
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: 'var(--text-primary)', fontSize: '0.8rem' }}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Operational Statuses Pie Chart */}
        <div className={styles.panel}>
          <h2>Operational Status (Orders)</h2>
          {loading ? <div style={{color:'var(--text-muted)'}}>Loading...</div> : statusData.length === 0 ? <div style={{color:'var(--text-muted)'}}>No data found.</div> : (
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index+3) % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: 'var(--text-primary)', fontSize: '0.8rem' }}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className={styles.panelsGrid} style={{ gridTemplateColumns: '1fr', marginTop: '20px' }}>
        {/* User Performance Bar Chart */}
        <div className={styles.panel}>
          <h2>User Performance (Leads vs Orders)</h2>
          {loading ? <div style={{color:'var(--text-muted)'}}>Loading...</div> : userPerformance.length === 0 ? <div style={{color:'var(--text-muted)'}}>No data found.</div> : (
            <div style={{ height: '400px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userPerformance} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{fontSize: 12}} />
                  <YAxis yAxisId="left" stroke="var(--text-secondary)" tick={{fontSize: 12}} />
                  <YAxis yAxisId="right" orientation="right" stroke="var(--success)" tick={{fontSize: 12}} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ color: 'var(--text-primary)', fontSize: '0.9rem' }} />
                  <Bar yAxisId="left" dataKey="leads" name="Total Leads" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="orders" name="Orders Booked" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="revenue" name="Revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
      
      <div className={styles.panelsGrid} style={{ gridTemplateColumns: '1fr', marginTop: '20px', marginBottom: '40px' }}>
         {/* Carrier Volume Bar Chart */}
         <div className={styles.panel}>
          <h2>Top Carriers by Dispatched Volume</h2>
          {loading ? <div style={{color:'var(--text-muted)'}}>Loading...</div> : carrierVolume.length === 0 ? <div style={{color:'var(--text-muted)'}}>No dispatches found.</div> : (
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={carrierVolume} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{fontSize: 12}} />
                  <YAxis stroke="var(--text-secondary)" tick={{fontSize: 12}} allowDecimals={false} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar dataKey="Dispatches" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default Reports;
