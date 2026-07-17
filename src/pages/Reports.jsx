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
        <div className={styles.glassTooltip}>
          <p style={{ margin: 0, marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '600', fontSize: '0.95rem' }}>{label || payload[0].name}</p>
          {payload.map((p, idx) => (
            <p key={idx} style={{ margin: 0, display: 'flex', justifyContent: 'space-between', gap: '20px', color: p.color || 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '500' }}>
              <span>{p.name}:</span>
              <span>{p.name === 'Revenue' ? `$${p.value.toLocaleString()}` : p.value}</span>
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
        {/* Lead Sources Pie Chart */}
        <div className={styles.panel}>
          <h2>Lead Sources</h2>
          {loading ? <div style={{color:'var(--text-muted)'}}>Loading...</div> : sourceData.length === 0 ? <div style={{color:'var(--text-muted)'}}>No data found.</div> : (
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    {sourceData.map((entry, index) => (
                      <linearGradient key={`grad-${index}`} id={`colorGrad-${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.4}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie data={sourceData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value" stroke="none">
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`url(#colorGrad-${index})`} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ color: 'var(--text-primary)', fontSize: '0.85rem', paddingTop: '20px' }}/>
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
                  <defs>
                    {statusData.map((entry, index) => (
                      <linearGradient key={`gradStatus-${index}`} id={`colorGradStatus-${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS[(index+3) % COLORS.length]} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={COLORS[(index+3) % COLORS.length]} stopOpacity={0.4}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value" stroke="none">
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`url(#colorGradStatus-${index})`} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ color: 'var(--text-primary)', fontSize: '0.85rem', paddingTop: '20px' }}/>
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
                  <defs>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    </linearGradient>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.2}/>
                    </linearGradient>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{fontSize: 12}} axisLine={false} tickLine={false} dy={10} />
                  <YAxis yAxisId="left" stroke="var(--text-secondary)" tick={{fontSize: 12}} axisLine={false} tickLine={false} dx={-10} />
                  <YAxis yAxisId="right" orientation="right" stroke="var(--success)" tick={{fontSize: 12}} axisLine={false} tickLine={false} dx={10} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                  <Legend wrapperStyle={{ color: 'var(--text-primary)', fontSize: '0.9rem', paddingTop: '15px' }} iconType="circle" />
                  <Bar yAxisId="left" dataKey="leads" name="Total Leads" fill="url(#colorLeads)" radius={[6, 6, 0, 0]} barSize={20} />
                  <Bar yAxisId="left" dataKey="orders" name="Orders Booked" fill="url(#colorOrders)" radius={[6, 6, 0, 0]} barSize={20} />
                  <Bar yAxisId="right" dataKey="revenue" name="Revenue" fill="url(#colorRev)" radius={[6, 6, 0, 0]} barSize={20} />
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
                  <defs>
                    <linearGradient id="colorCarrier" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{fontSize: 12}} axisLine={false} tickLine={false} dy={10} />
                  <YAxis stroke="var(--text-secondary)" tick={{fontSize: 12}} allowDecimals={false} axisLine={false} tickLine={false} dx={-10} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                  <Bar dataKey="Dispatches" fill="url(#colorCarrier)" radius={[6, 6, 0, 0]} barSize={40} />
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
