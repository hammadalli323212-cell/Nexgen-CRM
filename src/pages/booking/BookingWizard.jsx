import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { generateOrderPDF } from '../../lib/pdfGenerator';
import { logActivity } from '../../lib/activityLogger';
import { TENANT } from '../../config/tenant';
import styles from './BookingWizard.module.css';

const STEPS = [
  { id: 'order-info', label: 'Order Info' },
  { id: 'origin', label: 'Origin' },
  { id: 'destination', label: 'Destination' },
  { id: 'terms', label: 'Terms & Condition' }
];

const TERMS_TEXT = `TERMS AND CONDITIONS

1: The carrier and driver jointly and separately are authorized to operate and transport his/her or their motor vehicle between its pickup location and the destination. Every effort will be made to ship the vehicle within the promised period but delays can occur due to carrier schedules, mechanical failure, inclement weather, or acts of God, among other unforeseen circumstances for which it can take up to 2 weeks. ${TENANT.COMPANY_NAME} will not be responsible for any charges or liabilities incurred due to delay of pickup or delivery. This includes but is not limited to airline tickets or rental car fees. The client will be given the carrier’s schedule at the time of dispatch. The client agrees to release ${TENANT.COMPANY_NAME} from any liability and waive their right to sue ${TENANT.COMPANY_LEGAL_NAME}, or their employees, officers, volunteers, and agents (collectively “District”) from any and all claims.

2: The shipper should inspect the vehicle and report any damage to the driver of the carrier vehicle. Any damage must be noted on the Bill of Lading and signed by the driver.

3: The vehicle must be clean and free of all loose items. The carrier will not be responsible for the loss or damage to any such items left in the vehicle.

4: Carriers are not licensed or insured to transport any personal or household goods, however, we do understand that you may need to put some items in the vehicle. Carrier is not liable for damage caused to the vehicle from excessive or improper loading of personal items. These items must be put in the trunk and kept to a limit of 100 lbs. Any exceptions must be previously discussed and approved by ${TENANT.COMPANY_NAME}. An additional fee may be assessed for personal items of any weight. Any misrepresentation of the personal belongings will result in a change of price and/or a dry run fee of $150 if a carrier is made to attend the scene of the pick-up and the shipment is different from expected. If a carrier is sent out and the vehicle is not ready as indicated by the shipper there will be an additional $75.00 rescheduling fee. ${TENANT.COMPANY_NAME} must be notified, should the shipper be unavailable for pick up or delivery, the shipper must have an alternate representative take his/her place as a shipper.

5: The customer agrees to pay the quoted price for the delivery of the vehicle. Payments must be made directly to the carrier upon delivery in the form of cash, cashier's check, or money order unless other arrangements have been made.

6: Trucking damage claims are covered by carriers from $100,000 up to $250,000 cargo insurance per load, and a minimum of 3/4 of a million dollars public liability and property damage. Any damage incurred to a vehicle during transport falls directly under the responsibility of the carrier and not ${TENANT.COMPANY_NAME}. All carriers contractor will have insurance to cover damage caused by the driver, carrier or carrier’s contractor, weather, act of god, vandalism and or theft during transport. If damage is done, ${TENANT.COMPANY_NAME} will provide you with a full insurance packet for the carrier to file a claim. ${TENANT.COMPANY_NAME} is not responsible for damage caused by driver, carrier or carrier’s contractor, weather, act of god, vandalism and or theft during transport. All claims must be noted and signed for at the time of delivery and submitted in writing within 15 days of delivery.

7: If a carrier is sent out and the vehicle is not ready as indicated by the shipper there will be an additional $75.00 rescheduling fee. ${TENANT.COMPANY_NAME} must be notified, should the shipper be unavailable for pick up or delivery, the shipper must have an alternate representative take his/her place as a shipper. If for any reason the vehicle becomes unavailable during a scheduled pick-up window, after an order has been placed, ${TENANT.COMPANY_NAME} will not refund the deposit amount.

8: The client should under no circumstances release or receive vehicle(s) from a carrier without an inspection report (Bill of Lading/BOL) regardless of the time of day or the weather conditions. Failure to do so may result in the client’s inability to file a damage claim. Carriers insurance will only process claims for damages due to the carrier’s negligence. Damage must be reported to ${TENANT.COMPANY_NAME} within 24 hours of delivery. Damage must be listed on the BOL and signed by the driver (no exceptions). If there is damage during transport, the client must notate those damages on the final inspection report, pay the remaining balance stated on this agreement, and then contact the carrier’s main office as well as the carrier’s insurance company. Failure to notate any damage on the final inspection report releases the carrier of any liability and would result in the inability to process a damage claim. It is the customer’s responsibility to review the Carrier’s dispatch sheet and confirm the customer’s correct name and address and verify the identity of the truck driver prior to releasing the vehicle for transport. ${TENANT.COMPANY_NAME} is an acting agent.

9: Prior to releasing the vehicle to the assigned carrier at pickup, Customer shall independently verify and confirm the identity and authority of the transporting carrier and driver. Such verification shall include, without limitation, confirming that the carrier company name, truck Vehicle Identification Number (VIN) and/or identifying information, insurance documentation, and driver’s license details match the information provided by ${TENANT.COMPANY_NAME}. Customer acknowledges and agrees that failure to perform such verification prior to surrendering possession of the vehicle constitutes Customer negligence. In the event Customer releases the vehicle without completing the required verification process, ${TENANT.COMPANY_NAME} shall not be liable or responsible for any damages, losses, theft, claims, fraudulent activity, misdelivery, or any other liabilities arising therefrom, and Customer expressly waives any right to assert claims against ${TENANT.COMPANY_NAME} related to such failure of verification.

10: All claims must be made with the carrier if any circumstances arise. Any/All damages are covered by the carrier’s insurance and must be claimed with the carrier’s insurance, not ${TENANT.COMPANY_NAME}. In the condition of a lost or stolen vehicle, all claims must be made with Carrier’s insurance.

11: Dispatched orders must be canceled by calling the offices of ${TENANT.COMPANY_NAME} at ${TENANT.MAIN_PHONE} or sending an email to ${TENANT.SUPPORT_EMAIL}. Cancellations of dispatched orders are subject to a non-refundable $200 fee.

12: A $150.00 non-operational fee will be charged for all non-running vehicles. This will be included in the final quote received from ${TENANT.COMPANY_NAME}. If the vehicle becomes non-operational during transport, this fee will be applied to the original quote.

13: Customer acknowledges that the quoted prices provided by ${TENANT.COMPANY_NAME} are based on the best market estimate at the time of booking. However, prices are subject to change due to factors beyond our control, including but not limited to high demand for truck services, unavailability of truckers, and adverse weather conditions. Upon identification of such changes, ${TENANT.COMPANY_NAME.split(' ')[0]}'s sales team shall contact Customer and provide an updated quote for the transportation services. Upon receipt of the updated quote, Customer shall confirm their acceptance and agreement to pay the revised transportation cost. Only after receiving explicit confirmation from Customer, ${TENANT.COMPANY_NAME.split(' ')[0]} shall proceed to dispatch the vehicle to the selected trucker for transportation.

14: ${TENANT.COMPANY_NAME} agrees to provide a carrier to transport your vehicle as promptly as possible under your instructions but cannot guarantee pick-up or delivery on a specified date. A cancellation fee of $200 will be charged for orders canceled 7 days before the requested available pick-up date. ${TENANT.COMPANY_NAME} does not agree to pay for your rental of a vehicle, nor shall it be liable for the failure of mechanical or operating parts of your vehicle. The shipper warrants that he/she will pay the price quoted due to ${TENANT.COMPANY_NAME} for delivered vehicles and will not seek to charge back a credit card. This agreement and any shipment hereunder are subject to all terms and conditions of the carrier’s tariff and the uniform straight bill of lading, copies of which are available at the office of the carrier.

15: This agreement shall be governed by and construed under the laws of the State of Texas. The parties further agree that any legal action arising out of this agreement must be filed in a court of Fort Bend County. ${TENANT.COMPANY_NAME}’s liability is limited to the amount of money collected by ${TENANT.COMPANY_NAME} or its affiliates to “broker’s fee” only. The client hereby submits to the jurisdiction of such courts and waives any right to jurisdiction in any other location. I hereby agree to the transport terms provided by ${TENANT.COMPANY_NAME}. I authorize a small down payment to be paid to ${TENANT.COMPANY_NAME} via Credit Card, Zelle, Paypal or Venmo. I further understand that any remaining balance is due on delivery and that it must be paid in full via a method decided by the carrier i.e. cash, cashier’s check, or money order to the authorized transporter.`;

const BookingWizard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [leadData, setLeadData] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '', pickupDate: '',
    originAddress: '', originCity: '', isOriginContact: false, originContactName: '', originContactEmail: '', originContactPhone: '',
    destAddress: '', destCity: '', isDestContact: false, destContactName: '', destContactEmail: '', destContactPhone: '',
    agreed: false, signature: ''
  });
  const [ipAddress, setIpAddress] = useState('Fetching...');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Auto-trigger print if ?download=true is in the URL
  useEffect(() => {
    if (isSuccess && new URLSearchParams(window.location.search).get('download') === 'true' && leadData) {
      setTimeout(() => {
        const quoteNumber = `NG-${leadData.order_id || leadData.lead_number}`;
        const tariff = Number(leadData.estimated_price) || 0;
        let deposit = 0;
        const terms = (leadData.broker_fee_terms || '').toLowerCase().replace(/\\s+/g, '');
        if (terms === 'paymentonorder' || terms === 'paymentonpickup') {
          const override = Number(leadData.deposit_amount);
          deposit = override > 0 ? override : (Number(leadData.estimated_price || 0) - Number(leadData.carrier_pay || 0));
        }
        const nextPayment = tariff - deposit;
        const firstPaymentDue = leadData.broker_fee_terms || 'Payment on Order';
        const firstPaymentMethod = leadData.payment_method || 'Credit Card';
        const finalPaymentDue = leadData.carrier_pay_terms || 'Payment on Delivery';
        const finalPaymentMethod = leadData.carrier_payment_method || 'Cash / Certified Funds';
        const vehicles = leadData.lead_vehicles || [];
        const cargoLabel = vehicles.length > 0 
          ? vehicles.map(v => `${v.vehicle_year || ''} ${v.vehicle_make || ''} ${v.vehicle_model || ''}`).join(', ') 
          : 'Pending Vehicle Details';
        const transportType = leadData.transport_type || 'Open';

        generateOrderPDF(leadData, formData, quoteNumber, transportType, cargoLabel, tariff, deposit, nextPayment, firstPaymentDue, firstPaymentMethod, finalPaymentDue, finalPaymentMethod, ipAddress, 'download');
      }, 800);
    }
  }, [isSuccess, leadData, formData, ipAddress]);

  useEffect(() => {
    // Auth Check & Fetch Data
    const loadWizardData = async () => {
      // Allow CRM Admins to view the order directly without login
      const { data: { session } } = await supabase.auth.getSession();
      const isAuth = sessionStorage.getItem(`booking_auth_${id}`);
      
      if (!isAuth && !session) {
        navigate(`/booking/${id}${window.location.search}`);
        return;
      }

      const { data, error } = await supabase
        .from('leads')
        .select('*, customers(*), lead_vehicles(*)')
        .eq('lead_number', id)
        .single();
        
      if (data) {
        setLeadData(data);
        const isChangeOrder = new URLSearchParams(window.location.search).get('mode') === 'change_order';
        if (data.status === 'Booked' && data.electronic_signature && !isChangeOrder) {
          setIsSuccess(true);
        }
        setFormData(prev => ({
          ...prev,
          firstName: data.customers?.first_name || '',
          lastName: data.customers?.last_name || '',
          email: data.customers?.email || '',
          phone: data.customers?.phone || '',
          pickupDate: data.ship_date || '',
          originCity: `${data.origin_city || ''}${data.origin_state ? `, ${data.origin_state}` : ''} ${data.origin_zip || ''}`.trim(),
          originAddress: data.origin_address || '',
          originContactName: data.origin_contact_name || '',
          originContactPhone: data.origin_contact_phone || '',
          destCity: `${data.destination_city || ''}${data.destination_state ? `, ${data.destination_state}` : ''} ${data.destination_zip || ''}`.trim(),
          destAddress: data.destination_address || '',
          destContactName: data.destination_contact_name || '',
          destContactPhone: data.destination_contact_phone || '',
        }));
      }
    };
    loadWizardData();

    // Fetch IP Address
    const fetchIp = async () => {
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        setIpAddress(data.ip);
      } catch (err) {
        setIpAddress('Unavailable');
      }
    };
    fetchIp();
  }, [id, navigate]);

  if (!leadData) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading your secure order form...</div>;

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleBookOrder = async () => {
    if (!formData.agreed || !formData.signature) {
      toast.error("Please agree to the terms and provide an electronic signature.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      // 1. Sync updated Customer data
      if (leadData?.customers?.id) {
        const { error: customerError } = await supabase.from('customers').update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone
        }).eq('id', leadData.customers.id);
        
        if (customerError) console.error("Failed to sync customer details:", customerError);
      }

      // 2. Sync updated Lead data
      const isChangeOrder = new URLSearchParams(window.location.search).get('mode') === 'change_order';
      
      const updatePayload = {
        origin_address: formData.originAddress,
        destination_address: formData.destAddress,
        origin_contact_name: formData.isOriginContact ? `${formData.firstName} ${formData.lastName}`.trim() : formData.originContactName,
        origin_contact_phone: formData.isOriginContact ? formData.phone : formData.originContactPhone,
        destination_contact_name: formData.isDestContact ? `${formData.firstName} ${formData.lastName}`.trim() : formData.destContactName,
        destination_contact_phone: formData.isDestContact ? formData.phone : formData.destContactPhone,
        ship_date: formData.pickupDate || leadData.ship_date,
        is_read: false
      };

      if (!isChangeOrder || ['New', 'Quoted', 'Follow Up'].includes(leadData?.status)) {
        updatePayload.status = 'Booked';
      }

      if (!leadData.order_created_at && !isChangeOrder) {
        updatePayload.order_created_at = new Date().toISOString();
      }

      if (isChangeOrder) {
        const existingSignatures = Array.isArray(leadData.change_order_signatures) ? leadData.change_order_signatures : [];
        updatePayload.change_order_signatures = [
          ...existingSignatures,
          {
             signature: formData.signature,
             ip: ipAddress,
             date: new Date().toISOString()
          }
        ];
      } else {
        updatePayload.electronic_signature = formData.signature;
        updatePayload.signed_ip = ipAddress;
        updatePayload.signed_date = new Date().toISOString();
      }

      const { error } = await supabase.from('leads').update(updatePayload).eq('lead_number', id);

      if (error) throw error;
      
      // Log the signature activity
      const logUserId = leadData.assigned_to || leadData.created_by;
      if (isChangeOrder) {
        await logActivity(leadData.id, logUserId, 'Change Order Signed', 'Signature Captured', 'Customer electronically signed the change order');
      } else {
        await logActivity(leadData.id, logUserId, 'Order Signed', 'Signature Captured', 'Customer electronically signed the order form (Lead -> Order)');
      }
      
      setLeadData(prev => ({
        ...prev,
        ...updatePayload
      }));
      
      setIsSuccess(true);
      window.scrollTo(0,0);
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Derived Info for Sidebar
  const quoteNumber = `NG-${leadData.order_id || leadData.lead_number}`;
  const tariff = Number(leadData.estimated_price) || 0;
  
  let deposit = 0;
  const terms = (leadData.broker_fee_terms || '').toLowerCase().replace(/\s+/g, '');
  if (terms === 'paymentonorder' || terms === 'paymentonpickup') {
    const override = Number(leadData.deposit_amount);
    deposit = override > 0 
      ? override 
      : (Number(leadData.estimated_price || 0) - Number(leadData.carrier_pay || 0));
  } else {
    deposit = 0;
  }
  
  const nextPayment = tariff - deposit;
  const expirationDate = leadData.price_expiration_date ? new Date(leadData.price_expiration_date).toLocaleDateString() : 'Pending';
  
  const firstPaymentDue = leadData.broker_fee_terms || 'Payment on Order';
  const firstPaymentMethod = leadData.payment_method || 'Credit Card';
  const finalPaymentDue = leadData.carrier_pay_terms || 'Payment on Delivery';
  const finalPaymentMethod = leadData.carrier_payment_method || 'Cash / Certified Funds';

  const vehicles = leadData.lead_vehicles || [];
  const cargoLabel = vehicles.length > 0 
    ? vehicles.map(v => `${v.vehicle_year || ''} ${v.vehicle_make || ''} ${v.vehicle_model || ''}`).join(', ') 
    : 'Pending Vehicle Details';
  const transportType = leadData.transport_type || 'Open';

  return (
    <div className={styles.wizardContainer}>
      
      {/* Header Banner */}
      <div className={styles.topBanner}>
        <div className={styles.bannerContent}>
          <div className={styles.bannerLeft}>
            <h1>Book My Shipment</h1>
            <p>Fill out the form below to book your transportation order</p>
            
            {/* Breadcrumb Steps */}
            <div className={styles.breadcrumb}>
              {STEPS.map((step, index) => (
                <React.Fragment key={step.id}>
                  <div className={`${styles.crumb} ${currentStep === index ? styles.crumbActive : ''}`}>
                    {step.label}
                  </div>
                  {index < STEPS.length - 1 && <span className={styles.crumbChevron}>›</span>}
                </React.Fragment>
              ))}
            </div>
          </div>
          <div className={styles.bannerRight}>
            <div className={styles.quoteBox}>
              <div className={styles.quoteLabel}>QUOTE</div>
              <div className={styles.quoteNum}>{quoteNumber}</div>
            </div>
            <div className={styles.expBox}>
              <div className={styles.expLabel}>Price Expiration Date</div>
              <div className={styles.expDate}>{expirationDate}</div>
            </div>
          </div>
        </div>
      </div>

      {isSuccess ? (
        <div className={styles.mainArea} style={{ flexDirection: 'column', alignItems: 'center', paddingTop: '40px' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '3rem', color: '#10b981', marginBottom: '20px' }}>✓</div>
            <h2 style={{ fontSize: '2rem', color: 'var(--text-primary)', marginBottom: '10px' }}>Order Successfully Submitted!</h2>
            <p style={{ color: '#555', fontSize: '1.1rem', marginBottom: '30px' }}>Your signed contract has been received and stored securely.</p>
            <button 
              onClick={() => generateOrderPDF(leadData, formData, quoteNumber, transportType, cargoLabel, tariff, deposit, nextPayment, firstPaymentDue, firstPaymentMethod, finalPaymentDue, finalPaymentMethod, ipAddress, 'download')}
              style={{ background: 'var(--brand-blue)', color: '#fff', border: 'none', padding: '15px 30px', borderRadius: '6px', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '15px', width: '100%', maxWidth: '350px' }}
            >
              Download PDF Contract
            </button>
            <button 
              onClick={() => generateOrderPDF(leadData, formData, quoteNumber, transportType, cargoLabel, tariff, deposit, nextPayment, firstPaymentDue, firstPaymentMethod, finalPaymentDue, finalPaymentMethod, ipAddress, 'preview')}
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '2px solid var(--border-color)', padding: '13px 30px', borderRadius: '6px', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold', width: '100%', maxWidth: '350px' }}
            >
              Preview PDF
            </button>
          </div>
        </div>
      ) : (
      <div className={styles.mainArea}>
        {/* Left Column (Form) */}
        <div className={styles.formArea}>
          
          {/* STEP 0: CONTACT INFO */}
          {currentStep === 0 && (
            <div className={styles.stepBlock}>
              <h2 className={styles.stepTitle}>CONTACT INFO</h2>
              
              <div className={styles.inputGroup}>
                <label>First Name</label>
                <input type="text" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
              </div>
              <div className={styles.inputGroup}>
                <label>Last Name</label>
                <input type="text" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
              </div>
              <div className={styles.inputGroup}>
                <label>Email</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className={styles.inputGroup}>
                <label>Phone</label>
                <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className={styles.inputGroup}>
                <label>First Available Pickup Date</label>
                <input type="date" value={formData.pickupDate} onChange={e => setFormData({...formData, pickupDate: e.target.value})} />
              </div>
            </div>
          )}

          {/* STEP 1: ORIGIN */}
          {currentStep === 1 && (
            <div className={styles.stepBlock}>
              <h2 className={styles.stepTitle}>ORIGIN</h2>
              <p className={styles.stepSubtitle}>This is the pickup location.</p>
              
              <div className={styles.inputGroup}>
                <label>Origin Address</label>
                <input type="text" value={formData.originAddress} onChange={e => setFormData({...formData, originAddress: e.target.value})} />
              </div>
              <div className={styles.inputGroup}>
                <label>Origin City</label>
                <input type="text" value={formData.originCity} readOnly className={styles.inputReadOnly} />
              </div>

              <h3 className={styles.subHeading}>ORIGIN CONTACT</h3>
              <p className={styles.stepSubtitle}>This is the person that we will contact on the day of the pickup to make arrangements.</p>
              
              <div className={styles.checkboxGroup}>
                <input type="checkbox" id="originContact" checked={formData.isOriginContact} onChange={e => setFormData({...formData, isOriginContact: e.target.checked})} />
                <label htmlFor="originContact">I Am The Pickup Contact</label>
              </div>

              {!formData.isOriginContact && (
                <>
                  <div className={styles.inputGroup}>
                    <label>Origin Contact Name</label>
                    <input type="text" value={formData.originContactName} onChange={e => setFormData({...formData, originContactName: e.target.value})} />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Origin Contact Email</label>
                    <input type="email" value={formData.originContactEmail} onChange={e => setFormData({...formData, originContactEmail: e.target.value})} />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Origin Contact Phone</label>
                    <input type="tel" value={formData.originContactPhone} onChange={e => setFormData({...formData, originContactPhone: e.target.value})} />
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 2: DESTINATION */}
          {currentStep === 2 && (
            <div className={styles.stepBlock}>
              <h2 className={styles.stepTitle}>DESTINATION</h2>
              <p className={styles.stepSubtitle}>This is the delivery location.</p>
              
              <div className={styles.inputGroup}>
                <label>Destination Address</label>
                <input type="text" value={formData.destAddress} onChange={e => setFormData({...formData, destAddress: e.target.value})} />
              </div>
              <div className={styles.inputGroup}>
                <label>Destination City</label>
                <input type="text" value={formData.destCity} readOnly className={styles.inputReadOnly} />
              </div>

              <h3 className={styles.subHeading}>DESTINATION CONTACT</h3>
              <p className={styles.stepSubtitle}>This is the person that we will contact on the day of the delivery to make arrangements.</p>
              
              <div className={styles.checkboxGroup}>
                <input type="checkbox" id="destContact" checked={formData.isDestContact} onChange={e => setFormData({...formData, isDestContact: e.target.checked})} />
                <label htmlFor="destContact">I Am The Destination Contact</label>
              </div>

              {!formData.isDestContact && (
                <>
                  <div className={styles.inputGroup}>
                    <label>Destination Contact Name</label>
                    <input type="text" value={formData.destContactName} onChange={e => setFormData({...formData, destContactName: e.target.value})} />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Destination Contact Email</label>
                    <input type="email" value={formData.destContactEmail} onChange={e => setFormData({...formData, destContactEmail: e.target.value})} />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Destination Contact Phone</label>
                    <input type="tel" value={formData.destContactPhone} onChange={e => setFormData({...formData, destContactPhone: e.target.value})} />
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 3: TERMS */}
          {currentStep === 3 && (
            <div className={styles.stepBlock}>
              <h2 className={styles.stepTitle}>ACCEPTANCE</h2>
              <p className={styles.termsWarning}>
                *By selecting "I Agree" and entering my full name as a binding electronic signature, I understand that an electronic signature has the same legal effect and can be enforced in the same way as a written signature. Furthermore, I hereby accept terms and conditions of service as described in the "Terms & Conditions" section below.
              </p>
              
              <div className={styles.termsBox}>
                <pre>{TERMS_TEXT}</pre>
              </div>

              <div className={styles.checkboxGroup} style={{ marginTop: '20px', marginBottom: '20px' }}>
                <input type="checkbox" id="agreed" checked={formData.agreed} onChange={e => setFormData({...formData, agreed: e.target.checked})} />
                <label htmlFor="agreed" style={{ fontWeight: 'bold' }}>I Agree</label>
              </div>

              <div className={styles.inputGroup}>
                <label>Electronic signature (Your full name)*</label>
                <input type="text" value={formData.signature} onChange={e => setFormData({...formData, signature: e.target.value})} />
              </div>

              <div className={styles.ipGroup}>
                <div className={styles.ipBox}>
                  <label>Your IP address</label>
                  <div>{ipAddress}</div>
                </div>
                <div className={styles.ipBox}>
                  <label>Agreed to terms on this day</label>
                  <div>{new Date().toString()}</div>
                </div>
              </div>
            </div>
          )}

          {/* Nav Buttons */}
          <div className={styles.navButtons}>
            {currentStep > 0 ? (
              <button className={styles.btnPrev} onClick={handlePrev}>&lt; Previous</button>
            ) : <div></div>}
            
            {currentStep < STEPS.length - 1 ? (
              <button className={styles.btnNext} onClick={handleNext}>Next &gt;</button>
            ) : (
              <button className={styles.btnSubmit} onClick={handleBookOrder} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Book My Order >'}
              </button>
            )}
          </div>

        </div>

        {/* Right Column (Sidebar) */}
        <div className={styles.sidebar}>
          
          <div className={styles.sideCard}>
            <div className={styles.sideCardHeader}>PRICE</div>
            <div className={styles.sideCardBody}>
              <div className={styles.priceRowLarge}>
                <span>Total tariff</span>
                <span>${tariff.toFixed(2)}</span>
              </div>
              
              <div className={styles.priceRow}>
                <span>First Payment</span>
                <span>${deposit.toFixed(2)}</span>
              </div>
              {(!leadData.broker_fee_terms || leadData.broker_fee_terms === 'N/A') ? null : (
                <div className={styles.priceRow} style={{ color: '#555', fontSize: '0.85rem', paddingTop: '0', borderBottom: 'none' }}>
                  <span style={{flex: 1}}>Due: {firstPaymentDue}</span>
                  <span style={{textAlign: 'right'}}>{firstPaymentMethod}</span>
                </div>
              )}
              
              <div className={styles.priceRow} style={{ marginTop: '10px' }}>
                <span>Final Payment</span>
                <span>${nextPayment.toFixed(2)}</span>
              </div>
              {(!leadData.carrier_pay_terms || leadData.carrier_pay_terms === 'N/A') ? null : (
                <div className={styles.priceRow} style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', paddingTop: '0', borderBottom: 'none' }}>
                  <span style={{flex: 1}}>Due: {finalPaymentDue}</span>
                  <span style={{textAlign: 'right'}}>{finalPaymentMethod}</span>
                </div>
              )}
            </div>
          </div>

          <div className={styles.sideCard} style={{ marginTop: '30px' }}>
            <div className={styles.sideCardHeader}>CARGO</div>
            <div className={styles.sideCardBody} style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <div className={styles.cargoRow}>
                <span className={styles.cargoLabel}>Transport Type:</span>
                <span className={styles.transportTag}>{transportType}</span>
              </div>
              <div className={styles.cargoDetails}>
                <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>Cargo:</div>
                <div style={{ fontWeight: '500' }}>{cargoLabel}</div>
              </div>
            </div>
          </div>

        </div>
      </div>
      )}
    </div>
  );
};

export default BookingWizard;
