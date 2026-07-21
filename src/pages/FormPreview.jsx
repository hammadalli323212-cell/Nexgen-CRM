import React, { useState } from 'react';

const ElementorSimulator = ({ children }) => (
  <div style={{
    minHeight: '100vh',
    backgroundColor: '#e5e7eb',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px 20px',
    fontFamily: '"Roboto", sans-serif'
  }}>
    <style>{`
  .form-container {
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
  }

  .fake-elementor-heading {
    background-color: #3b9add; /* Nexgen Brand Blue */
    color: white;
    text-align: center;
    padding: 30px;
    border-radius: 12px 12px 0 0;
    margin-bottom: 0;
  }
  
  .fake-elementor-heading h2 {
    margin: 0 0 10px 0;
    font-size: 28px;
    font-weight: 800;
  }
  
  .fake-elementor-heading p {
    margin: 0;
    font-size: 16px;
    opacity: 0.9;
  }

  /* ---- THE EXACT CSS WE ARE TESTING (Targeting .elementor-form instead of 'selector') ---- */
  .elementor-form {
      background-color: #ffffff;
      padding: 30px;
      border-radius: 0 0 12px 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  }

  .elementor-form input[type=number]::-webkit-inner-spin-button, 
  .elementor-form input[type=number]::-webkit-outer-spin-button { 
    -webkit-appearance: none; 
    margin: 0; 
  }
  .elementor-form input[type=number] {
    -moz-appearance: textfield;
  }

  .elementor-form .elementor-field-type-text,
  .elementor-form .elementor-field-type-email,
  .elementor-form .elementor-field-type-tel,
  .elementor-form .elementor-field-type-number,
  .elementor-form .elementor-field-type-select,
  .elementor-form .elementor-field-type-date {
      position: relative;
      margin-top: 15px; 
      margin-bottom: 20px;
      padding: 0;
  }

  .elementor-form .elementor-field-type-text .elementor-field-label,
  .elementor-form .elementor-field-type-email .elementor-field-label,
  .elementor-form .elementor-field-type-tel .elementor-field-label,
  .elementor-form .elementor-field-type-number .elementor-field-label,
  .elementor-form .elementor-field-type-select .elementor-field-label,
  .elementor-form .elementor-field-type-date .elementor-field-label {
      position: absolute;
      top: -10px;
      left: 12px;
      background-color: #ffffff; 
      padding: 0 5px;
      font-size: 13px;
      color: #2980b9; /* Nexgen Darker Blue */
      font-weight: 500;
      z-index: 2;
  }

  .elementor-form input, 
  .elementor-form select, 
  .elementor-form textarea {
      background-color: #ffffff;
      border: 1px solid #94a8bc; 
      border-radius: 6px;
      color: #333333;
      padding: 14px 15px;
      font-size: 15px;
      width: 100%;
      box-shadow: none;
      transition: border-color 0.2s ease;
      position: relative;
      z-index: 1;
      box-sizing: border-box;
  }

  /* Input Focus State */
  .elementor-form input:focus, 
  .elementor-form select:focus, 
  .elementor-form textarea:focus {
      border: 2px solid #3b9add; /* Nexgen Brand Blue */
      padding: 13px 14px; /* Adjust padding to prevent jumping when border gets thicker */
      outline: none;
  }

  /* Custom Dropdown Arrow */
  .elementor-form select {
      appearance: none;
      -webkit-appearance: none;
      padding-right: 35px; /* Prevent text from overlapping the arrow */
      background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%233b9add' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
      background-repeat: no-repeat;
      background-position: right 15px center;
      background-size: 15px;
  }

  .elementor-form .elementor-field-type-radio {
      margin-top: 15px;
      margin-bottom: 25px;
  }
  
  .elementor-form .elementor-field-type-radio > .elementor-field-label {
      position: relative;
      display: flex;
      align-items: center;
      color: #2980b9; /* Nexgen Darker Blue */
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 15px;
  }
  
  .elementor-form .elementor-field-subgroup {
      display: flex;
      gap: 15px;
  }
  
  .elementor-form .elementor-field-option {
      display: flex;
      align-items: center;
      font-size: 15px;
      color: #4b5563;
      cursor: pointer;
  }
  
  .elementor-form .elementor-field-option input[type="radio"] {
      appearance: none;
      -webkit-appearance: none;
      width: 16px;
      height: 16px;
      border: 1px solid #94a8bc;
      border-radius: 50%;
      margin-right: 8px;
      position: relative;
      outline: none;
      background-color: transparent;
      cursor: pointer;
  }
  
  .elementor-form .elementor-field-option input[type="radio"]:checked {
      border: 2px solid #3b9add; /* Nexgen Brand Blue */
  }
  
  .elementor-form .elementor-field-option input[type="radio"]:checked::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 8px;
      height: 8px;
      background-color: #3b9add; /* Nexgen Brand Blue */
      border-radius: 50%;
  }

  .elementor-form .elementor-field-type-submit {
      background-color: #f3f4f6;
      margin: 20px -30px -30px -30px;
      padding: 30px;
      border-radius: 0 0 12px 12px;
      text-align: center;
  }

  .elementor-form .elementor-button {
      background-color: #3b9add; /* Nexgen Brand Blue */
      color: #ffffff;
      border: none;
      border-radius: 50px;
      padding: 18px 40px;
      font-size: 18px;
      font-weight: 700;
      text-transform: none;
      width: 80%;
      margin: 0 auto;
      display: block;
      transition: background-color 0.3s ease;
      cursor: pointer;
  }
  
  .elementor-form .elementor-button:hover {
      background-color: #2980b9; /* Nexgen Brand Blue Hover */
  }

  /* Utility classes for layout simulation */
  .row {
    display: flex;
    gap: 15px;
  }
  .row-gap-large {
    gap: 40px;
  }
  .col {
    flex: 1;
  }
    `}</style>
    {children}
  </div>
);

import { useState } from 'react';

const FormPreview = () => {
  const [step, setStep] = useState(1);

  return (
    <ElementorSimulator>
      <div className="elementor-widget-container">
        <div className="fake-elementor-heading">
          <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>Calculate Your Car Shipping Cost</h2>
        </div>

        <form className="elementor-form" onSubmit={(e) => e.preventDefault()}>
          
          {/* Mock Elementor Progress Bar */}
          <div className="e-form__indicators" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div className={`e-form__indicator ${step >= 1 ? 'e-form__indicator--active' : ''}`}>
               <span className="e-form__indicator-number">1</span>
               <span className="e-form__indicator-text">Vehicle Details</span>
            </div>
            <div className={`e-form__indicator ${step >= 2 ? 'e-form__indicator--active' : ''}`}>
               <span className="e-form__indicator-number">2</span>
               <span className="e-form__indicator-text">Your Details</span>
            </div>
          </div>

          {step === 1 && (
            <div className="step-1-content">
              <div className="row">
                <div className="col elementor-field-type-text elementor-field-group">
                  <label className="elementor-field-label">Pick-up</label>
                  <input type="text" placeholder="Zipcode" className="elementor-field" />
                </div>
                
                <div className="col elementor-field-type-text elementor-field-group">
                  <label className="elementor-field-label">Delivery</label>
                  <input type="text" placeholder="Zipcode" className="elementor-field" />
                </div>
              </div>

              <div className="row">
                <div className="col elementor-field-type-select elementor-field-group">
                  <label className="elementor-field-label">Vehicle Type</label>
                  <select className="elementor-field">
                    <option>Select</option>
                    <option>Car</option>
                    <option>SUV</option>
                    <option>Pickup</option>
                    <option>Van</option>
                    <option>Other</option>
                  </select>
                </div>
                
                <div className="col elementor-field-type-select elementor-field-group">
                  <label className="elementor-field-label">Year</label>
                  <select className="elementor-field">
                    <option>Select</option>
                    <option>2024</option>
                    <option>2023</option>
                  </select>
                </div>
                
                <div className="col elementor-field-type-select elementor-field-group">
                  <label className="elementor-field-label">Vehicle Make</label>
                  <select className="elementor-field">
                    <option>Type or select</option>
                    <option>Toyota</option>
                    <option>Honda</option>
                  </select>
                </div>
                
                <div className="col elementor-field-type-select elementor-field-group">
                  <label className="elementor-field-label">Vehicle Model</label>
                  <select className="elementor-field">
                    <option>Type or select</option>
                    <option>Camry</option>
                    <option>Civic</option>
                  </select>
                </div>
              </div>

              <div className="row row-gap-large">
                <div className="col elementor-field-type-radio elementor-field-group">
                  <label className="elementor-field-label">Transport Type</label>
                  <div className="elementor-field-subgroup">
                    <label className="elementor-field-option">
                      <input type="radio" name="transport" defaultChecked /> Open
                    </label>
                    <label className="elementor-field-option">
                      <input type="radio" name="transport" /> Enclosed
                    </label>
                  </div>
                </div>

                <div className="col elementor-field-type-radio elementor-field-group">
                  <label className="elementor-field-label">Condition</label>
                  <div className="elementor-field-subgroup">
                    <label className="elementor-field-option">
                      <input type="radio" name="condition" defaultChecked /> Operable
                    </label>
                    <label className="elementor-field-option">
                      <input type="radio" name="condition" /> Inoperable
                    </label>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col elementor-field-type-date elementor-field-group">
                  <label className="elementor-field-label">First Available Pick-up Date</label>
                  <input type="date" className="elementor-field" onClick={(e) => { if(e.target.showPicker) e.target.showPicker(); }} />
                </div>
              </div>

              <div className="elementor-field-type-submit elementor-field-group">
                <button type="button" className="elementor-button" onClick={() => setStep(2)}>
                  Next →
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="step-2-content">
              <div className="row">
                <div className="col elementor-field-type-text elementor-field-group">
                  <label className="elementor-field-label">Full Name</label>
                  <input type="text" className="elementor-field" placeholder="John Doe" />
                </div>
              </div>
              <div className="row">
                <div className="col elementor-field-type-email elementor-field-group">
                  <label className="elementor-field-label">Email Address</label>
                  <input type="email" className="elementor-field" placeholder="john@example.com" />
                </div>
                <div className="col elementor-field-type-tel elementor-field-group">
                  <label className="elementor-field-label">Phone Number</label>
                  <input type="tel" className="elementor-field" placeholder="(555) 000-0000" />
                </div>
              </div>

              <div className="elementor-field-type-submit elementor-field-group" style={{ display: 'flex', gap: '20px' }}>
                <button type="button" className="elementor-button" style={{ backgroundColor: '#94a8bc', width: '30%' }} onClick={() => setStep(1)}>
                  ← Previous
                </button>
                <button type="submit" className="elementor-button" style={{ width: '70%' }}>
                  Get a Quote →
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </ElementorSimulator>
  );
};

export default FormPreview;
