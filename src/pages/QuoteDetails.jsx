import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import styles from './QuoteDetails.module.css';

const QuoteDetails = () => {
  const { id } = useParams(); // Should be 19388721 from the screenshot
  const [activeTab, setActiveTab] = useState('Vehicles');

  return (
    <div className={styles.pageContainer}>
      <div className={styles.scrollArea}>
        
        <div className={styles.topGrid}>
          {/* LEFT COLUMN */}
          <div className={styles.column}>
            {/* Quote Info Panel */}
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                Quote #{id || '19388721'}
              </div>
              <div className={styles.panelBody}>
                <div className={styles.formRow}>
                  <label>Status</label>
                  <select className={styles.inputField} defaultValue="New">
                    <option value="New">New</option>
                    <option value="Follow Up">Follow Up</option>
                  </select>
                </div>
                <div className={styles.formRow}>
                  <label>Quote Created</label>
                  <div className={styles.inputField}>12/13/2024 12:08 PM</div>
                </div>
                <div className={styles.formRow}>
                  <label>Transport Type</label>
                  <select className={styles.inputField} defaultValue="Open">
                    <option value="Open">Open</option>
                    <option value="Enclosed">Enclosed</option>
                  </select>
                </div>
                <div className={styles.formRow}>
                  <label>Ship Date</label>
                  <input type="text" className={`${styles.inputField} ${styles.textHighlight}`} defaultValue="12/13/2024" />
                </div>
                <div className={styles.formRow}>
                  <label>Referral Source</label>
                  <select className={styles.inputField} defaultValue="Inbound Call">
                    <option value="Inbound Call">Inbound Call</option>
                  </select>
                </div>
                <div className={styles.formRow}>
                  <label>Assigned To</label>
                  <select className={styles.inputField} defaultValue="Ben Davis">
                    <option value="Ben Davis">Ben Davis</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Route Panel */}
            <div className={styles.panel}>
              <div className={styles.panelHeader}>Route</div>
              <div className={styles.panelBody}>
                <div className={styles.formRow}>
                  <label>Origin</label>
                  <div className={styles.routeItem}>Richmond, TX 77406 <span>{'>'}</span></div>
                </div>
                <div className={styles.formRow}>
                  <label>Destination</label>
                  <div className={styles.routeItem}>Ashland, VA 23005 <span>{'>'}</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* MIDDLE COLUMN */}
          <div className={styles.column}>
            {/* Price and Terms */}
            <div className={styles.panel}>
              <div className={styles.panelHeader}>Price and Terms</div>
              <div className={styles.panelBody}>
                <div className={styles.formRow}>
                  <label>Total Tariff</label>
                  <input type="text" className={styles.inputField} defaultValue="$ 600.00" />
                </div>
                <div className={styles.formRow}>
                  <label>Carrier Pay</label>
                  <input type="text" className={styles.inputField} defaultValue="$ 500.00" />
                </div>
                <div className={styles.formRow}>
                  <label>Broker Fee</label>
                  <input type="text" className={styles.inputField} defaultValue="$ 100.00" readOnly />
                </div>
                <div className={styles.formRow}>
                  <label>Quote Expiration</label>
                  <input type="text" className={`${styles.inputField} ${styles.textHighlight}`} defaultValue="12/13/2024" />
                </div>
                <div className={styles.formRow}>
                  <label>Special Terms</label>
                  <input type="text" className={styles.inputField} />
                </div>
              </div>
            </div>

            {/* Sales Campaign */}
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                Sales Campaign Status <span className={styles.badge}>Inactive</span>
              </div>
              <div className={styles.panelBody}>
                <div className={styles.formRow}>
                  <label>Select Campaign</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input type="text" className={styles.inputField} />
                    <button style={{ padding: '2px 8px', backgroundColor: 'var(--bg-dark)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>Select</button>
                  </div>
                </div>
                <div className={styles.formRow}>
                  <label>Calls Made</label>
                  <div style={{ color: 'var(--text-primary)' }}>0</div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className={styles.column}>
            {/* Customer Panel */}
            <div className={styles.panel}>
              <div className={styles.panelHeader}>Customer</div>
              <div className={styles.panelBody}>
                <div className={styles.formRow}>
                  <label>Customer Phone</label>
                  <select className={styles.inputField} defaultValue="1111111111">
                    <option value="1111111111">1111111111</option>
                  </select>
                </div>
                <div className={styles.formRow}>
                  <label>Customer Name</label>
                  <div className={styles.routeItem}>Ben <span>{'>'}</span></div>
                </div>
                <div className={styles.formRow}>
                  <label>Email</label>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                    maddi.bhatti6@gmail.com
                    <span style={{ color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>X</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tasks Panel */}
            <div className={styles.panel}>
              <div className={styles.panelHeader}>Tasks</div>
              <div className={styles.panelBody}>
                <div className={styles.formRow}>
                  <label>Followup Date</label>
                  <input type="date" className={styles.inputField} />
                </div>
                <div className={styles.formRow}>
                  <label>Memo</label>
                  <input type="text" className={styles.inputField} />
                </div>
                <button style={{ alignSelf: 'flex-start', marginLeft: '120px', padding: '4px 12px', backgroundColor: 'transparent', color: 'var(--brand-blue)', border: '1px solid var(--brand-blue)', borderRadius: '4px', cursor: 'pointer' }}>Add Task</button>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '8px', marginTop: '1rem', color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: 500 }}>
                  <div>Action Type</div>
                  <div>Description</div>
                  <div>Due Date</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM TABS */}
        <div className={styles.tabsContainer}>
          <div className={styles.tabList}>
            {['Vehicles (1)', 'Internal Notes (0)', 'On Demand Messages (12)', 'Sales Activity (0)', 'Change Logs (0)'].map(tab => {
              const baseName = tab.split(' ')[0];
              return (
                <button 
                  key={tab} 
                  className={`${styles.tabBtn} ${activeTab === baseName ? styles.active : ''}`}
                  onClick={() => setActiveTab(baseName)}
                >
                  {tab}
                </button>
              );
            })}
          </div>
          <div className={styles.tabContent}>
            {activeTab === 'Vehicles' && (
              <div className={styles.vehicleGrid}>
                <div className={styles.vCol}>
                  <div className={styles.vRow}><span className={styles.vLabel}>Model Year:</span><span className={styles.vValue}>2022</span></div>
                  <div className={styles.vRow}><span className={styles.vLabel}>Make:</span><span className={styles.vValue}>Honda</span></div>
                  <div className={styles.vRow}><span className={styles.vLabel}>Model:</span><span className={styles.vValue}>Brabus</span></div>
                  <div className={styles.vRow}><span className={styles.vLabel}>Type:</span><span className={styles.vValue}>Car</span></div>
                  <div className={styles.vRow}><span className={styles.vLabel}>Inop:</span><span className={`${styles.vValue} ${styles.success}`}>NO</span></div>
                </div>
                <div className={styles.vCol}>
                  <div className={styles.vRow}><span className={styles.vLabel}>Carrier Pay:</span><span className={styles.vValue}>$500.00</span></div>
                  <div className={styles.vRow}><span className={styles.vLabel}>Broker Fee:</span><span className={styles.vValue}>$100.00</span></div>
                  <div className={styles.vRow}><span className={styles.vLabel}>VIN:</span><span className={styles.vValue}>n/a</span></div>
                  <div className={styles.vRow}><span className={styles.vLabel}>Plate Number:</span><span className={styles.vValue}>n/a</span></div>
                  <div className={styles.vRow}><span className={styles.vLabel}>Color:</span><span className={styles.vValue}>n/a</span></div>
                </div>
                <div className={styles.vCol}>
                  <div className={styles.vRow}><span className={styles.vLabel}>Lot Number:</span><span className={styles.vValue}>n/a</span></div>
                  <div className={styles.vRow}><span className={styles.vLabel}>Weight:</span><span className={styles.vValue}>n/a</span></div>
                  <div className={styles.vRow}><span className={styles.vLabel}>Mods:</span><span className={styles.vValue}>n/a</span></div>
                  <div className={styles.vRow}><span className={styles.vLabel}>Notes:</span><span className={styles.vValue}>n/a</span></div>
                  <div className={styles.vRow}><span className={styles.vLabel}>Add-On:</span><span className={styles.vValue}>n/a</span></div>
                </div>
              </div>
            )}
            {activeTab !== 'Vehicles' && (
              <div style={{ color: 'var(--text-muted)' }}>Empty.</div>
            )}
          </div>
        </div>

      </div>

      {/* FIXED ACTION BAR */}
      <div className={styles.actionBar}>
        <button className={styles.actionBtn}>Save</button>
        <button className={styles.actionBtn}>Save And Close</button>
        <button className={styles.actionBtn}>Close</button>
        <button className={styles.actionBtn}>Convert To Order</button>
        <button className={styles.actionBtn}>Map</button>
        <button className={styles.actionBtn}>Aqua Price</button>
        <button className={styles.actionBtn}>Send Email Campaign</button>
        <button className={styles.actionBtn}>Call Customer</button>
        <button className={styles.actionBtn}>Search CD</button>
        <button className={styles.actionBtn}>Duplicate</button>
        <button className={styles.actionBtn}>Return Trip</button>
        <button className={styles.actionBtn}>Sample Price</button>
        <button className={styles.actionBtn}>Unsubscribe</button>
      </div>
    </div>
  );
};

export default QuoteDetails;
