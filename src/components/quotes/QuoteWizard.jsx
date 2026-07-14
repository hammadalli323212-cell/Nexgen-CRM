import React, { useState } from 'react';
import { X } from 'lucide-react';
import styles from './QuoteWizard.module.css';

const steps = ['Customer', 'Pickup', 'Delivery', 'Vehicle', 'Pricing', 'Review'];

const QuoteWizard = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    originCity: '', originState: '', originZip: '',
    destCity: '', destState: '', destZip: ''
  });

  // Auto-fetch Origin Zip
  React.useEffect(() => {
    if (formData.originZip?.length === 5) {
      fetch(`https://api.zippopotam.us/us/${formData.originZip}`)
        .then(res => res.json())
        .then(data => {
          if (data.places && data.places.length > 0) {
            setFormData(prev => ({
              ...prev,
              originCity: data.places[0]["place name"],
              originState: data.places[0]["state abbreviation"]
            }));
          }
        })
        .catch(() => {});
    }
  }, [formData.originZip]);

  // Auto-fetch Destination Zip
  React.useEffect(() => {
    if (formData.destZip?.length === 5) {
      fetch(`https://api.zippopotam.us/us/${formData.destZip}`)
        .then(res => res.json())
        .then(data => {
          if (data.places && data.places.length > 0) {
            setFormData(prev => ({
              ...prev,
              destCity: data.places[0]["place name"],
              destState: data.places[0]["state abbreviation"]
            }));
          }
        })
        .catch(() => {});
    }
  }, [formData.destZip]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(curr => curr + 1);
    } else {
      // Submit form
      console.log('Submitting:', formData);
      onClose();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(curr => curr - 1);
  };

  return (
    <div className={styles.wizardOverlay}>
      <div className={styles.wizardContainer}>
        <div className={styles.wizardHeader}>
          <h2>New Quote Wizard</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.stepper}>
          {steps.map((step, index) => (
            <div 
              key={step} 
              className={`${styles.step} ${index === currentStep ? styles.active : ''} ${index < currentStep ? styles.completed : ''}`}
            >
              {step}
              <div className={styles.stepBar} />
            </div>
          ))}
        </div>

        <div className={styles.wizardBody}>
          {currentStep === 0 && (
            <div>
              <div className={styles.formGroup}>
                <label>First Name</label>
                <input className={styles.input} type="text" placeholder="John" />
              </div>
              <div className={styles.formGroup}>
                <label>Last Name</label>
                <input className={styles.input} type="text" placeholder="Doe" />
              </div>
              <div className={styles.formGroup}>
                <label>Email</label>
                <input className={styles.input} type="email" placeholder="john@example.com" />
              </div>
              <div className={styles.formGroup}>
                <label>Phone</label>
                <input className={styles.input} type="tel" placeholder="(555) 123-4567" />
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div>
              <div className={styles.formGroup}>
                <label>Origin Zip</label>
                <input className={styles.input} type="text" placeholder="90001" value={formData.originZip} onChange={e => setFormData({...formData, originZip: e.target.value})} />
              </div>
              <div className={styles.formGroup}>
                <label>Origin City</label>
                <input className={styles.input} type="text" placeholder="Los Angeles" value={formData.originCity} onChange={e => setFormData({...formData, originCity: e.target.value})} />
              </div>
              <div className={styles.formGroup}>
                <label>Origin State</label>
                <input className={styles.input} type="text" placeholder="CA" value={formData.originState} onChange={e => setFormData({...formData, originState: e.target.value})} />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <div className={styles.formGroup}>
                <label>Destination Zip</label>
                <input className={styles.input} type="text" placeholder="10001" value={formData.destZip} onChange={e => setFormData({...formData, destZip: e.target.value})} />
              </div>
              <div className={styles.formGroup}>
                <label>Destination City</label>
                <input className={styles.input} type="text" placeholder="New York" value={formData.destCity} onChange={e => setFormData({...formData, destCity: e.target.value})} />
              </div>
              <div className={styles.formGroup}>
                <label>Destination State</label>
                <input className={styles.input} type="text" placeholder="NY" value={formData.destState} onChange={e => setFormData({...formData, destState: e.target.value})} />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <div className={styles.formGroup}>
                <label>Vehicle Year</label>
                <input className={styles.input} type="text" placeholder="2024" />
              </div>
              <div className={styles.formGroup}>
                <label>Vehicle Make</label>
                <input className={styles.input} type="text" placeholder="Toyota" />
              </div>
              <div className={styles.formGroup}>
                <label>Vehicle Model</label>
                <input className={styles.input} type="text" placeholder="Camry" />
              </div>
              <div className={styles.formGroup}>
                <label>Condition</label>
                <select className={styles.input}>
                  <option>Running</option>
                  <option>Non-Running</option>
                </select>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div>
              <div className={styles.formGroup}>
                <label>Transport Type</label>
                <select className={styles.input}>
                  <option>Open</option>
                  <option>Enclosed</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Estimated Total Tariff</label>
                <input className={styles.input} type="number" placeholder="1200.00" />
              </div>
              <div className={styles.formGroup}>
                <label>Carrier Pay</label>
                <input className={styles.input} type="number" placeholder="1000.00" />
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Review Quote Details</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Please review the information before submitting.</p>
              {/* Summary view would go here */}
            </div>
          )}
        </div>

        <div className={styles.wizardFooter}>
          <button 
            className={styles.btnSecondary} 
            onClick={handleBack}
            style={{ visibility: currentStep === 0 ? 'hidden' : 'visible' }}
          >
            Back
          </button>
          <button className={styles.btnPrimary} onClick={handleNext}>
            {currentStep === steps.length - 1 ? 'Submit Quote' : 'Next Step'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuoteWizard;
