import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info } from 'lucide-react';
import styles from './QuoteWizardCreate.module.css';

const steps = [
  { id: 1, label: 'Customer' },
  { id: 2, label: 'Shipment' },
  { id: 3, label: 'Origin' },
  { id: 4, label: 'Destination' },
  { id: 5, label: 'Assignments' },
];

const QuoteWizardCreate = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentStep < 5) setCurrentStep(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const handleCreate = () => {
    // Navigate back to quotes list or to the new quote details
    navigate('/quotes/19388721'); 
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className={styles.panel}>
            <div className={styles.panelHeader}>Customer</div>
            <div className={styles.panelBody}>
              <div className={styles.formRow}>
                <label>Customer Phone</label>
                <div className={styles.inputWrapper}>
                  <input type="text" className={styles.inputField} placeholder="Required" />
                </div>
              </div>
              <div className={styles.formRow}>
                <label>Customer Name</label>
                <input type="text" className={styles.inputField} />
              </div>
              <div className={styles.formRow}>
                <label>Company Name</label>
                <input type="text" className={styles.inputField} />
              </div>
              <div className={styles.formRow}>
                <label>Assigned to</label>
                <input type="text" className={styles.inputField} />
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className={styles.panel}>
            <div className={styles.panelHeader}>Shipment</div>
            <div className={styles.panelBody}>
              <div className={styles.formRow}>
                <label>Ship Date</label>
                <input type="date" className={styles.inputField} />
              </div>
              <div className={styles.formRow}>
                <label>Transport Type</label>
                <select className={styles.inputField} defaultValue="Open">
                  <option value="Open">Open</option>
                  <option value="Enclosed">Enclosed</option>
                </select>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>Origin <Info size={14} style={{ marginLeft: 4 }} /></div>
              <div className={styles.panelBody}>
                <div className={styles.formRow}>
                  <label>Zip Code / City search</label>
                  <input type="text" className={styles.inputField} />
                </div>
                <div className={styles.formRow}>
                  <label>Location search</label>
                  <select className={styles.inputField} defaultValue="">
                    <option value=""></option>
                  </select>
                </div>
                <div className={styles.formRow}>
                  <label>Saved Contact</label>
                  <select className={styles.inputField} defaultValue=""><option value=""></option></select>
                </div>
                <div className={styles.formRow}>
                  <label>Auction Site</label>
                  <select className={styles.inputField} defaultValue=""><option value=""></option></select>
                </div>
                <div className={styles.formRow}>
                  <label>Terminal</label>
                  <select className={styles.inputField} defaultValue=""><option value=""></option></select>
                </div>
              </div>
            </div>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>Origin Type</div>
              <div className={styles.panelBody}>
                <div className={styles.formRow}>
                  <label>Origin Type</label>
                  <select className={styles.inputField} defaultValue=""><option value=""></option></select>
                </div>
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>Destination <Info size={14} style={{ marginLeft: 4 }} /></div>
              <div className={styles.panelBody}>
                <div className={styles.formRow}>
                  <label>Zip Code / City search</label>
                  <input type="text" className={styles.inputField} />
                </div>
                <div className={styles.formRow}>
                  <label>Location search</label>
                  <select className={styles.inputField} defaultValue="">
                    <option value=""></option>
                  </select>
                </div>
                <div className={styles.formRow}>
                  <label>Saved Contact</label>
                  <select className={styles.inputField} defaultValue=""><option value=""></option></select>
                </div>
                <div className={styles.formRow}>
                  <label>Auction Site</label>
                  <select className={styles.inputField} defaultValue=""><option value=""></option></select>
                </div>
                <div className={styles.formRow}>
                  <label>Terminal</label>
                  <select className={styles.inputField} defaultValue=""><option value=""></option></select>
                </div>
              </div>
            </div>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>Destination Type</div>
              <div className={styles.panelBody}>
                <div className={styles.formRow}>
                  <label>Destination Type</label>
                  <select className={styles.inputField} defaultValue=""><option value=""></option></select>
                </div>
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className={styles.panel}>
            <div className={styles.panelHeader}>Assignment</div>
            <div className={styles.panelBody}>
              <div className={styles.formRow}>
                <label>Referral Source</label>
                <select className={styles.inputField} defaultValue="">
                  <option value=""></option>
                  <option value="Inbound Call">Inbound Call</option>
                  <option value="Repeat Customer">Repeat Customer</option>
                  <option value="Outside Referral">Outside Referral</option>
                  <option value="Trustpilot email">Trustpilot email</option>
                  <option value="Grape">Grape</option>
                </select>
              </div>
              <div className={styles.formRow}>
                <label>Assigned To</label>
                <input type="text" className={styles.inputField} />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.pageContainer}>
      
      {/* Top Progress Tracker */}
      <div className={styles.progressContainer}>
        <div className={styles.progressLine}></div>
        {steps.map(step => (
          <div key={step.id} className={`${styles.step} ${currentStep === step.id ? styles.active : ''}`}>
            <div className={styles.stepCircle}>{step.id}</div>
            <div className={styles.stepLabel}>{step.label}</div>
          </div>
        ))}
      </div>

      {/* Form Area */}
      <div className={styles.formArea}>
        {renderStepContent()}
      </div>

      {/* Bottom Navigation */}
      <div className={styles.bottomNav}>
        <button 
          className={`${styles.navBtn} ${currentStep === 1 ? styles.hidden : ''}`} 
          onClick={handlePrev}
        >
          Previous
        </button>
        
        {currentStep < 5 ? (
          <button className={styles.navBtn} onClick={handleNext}>Next</button>
        ) : (
          <button className={styles.navBtn} onClick={handleCreate}>Create</button>
        )}
      </div>

    </div>
  );
};

export default QuoteWizardCreate;
