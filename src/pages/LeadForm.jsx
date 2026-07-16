import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { logActivity } from '../lib/activityLogger';
import styles from './LeadForm.module.css';

const initialVehicle = {
  year: '',
  make: '',
  model: '',
  type: 'Car',
  vin: '',
  condition: 'Operable',
  trailer: 'Open'
};

const LeadForm = ({ isOrder = false }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const { user } = useAuth();
  
  // Form State
  const [internalLeadId, setInternalLeadId] = useState(null); // The UUID in the db
  const [originalData, setOriginalData] = useState(null); // For diffing logs
  const [customer, setCustomer] = useState({ id: null, first_name: '', last_name: '', phone: '', email: '', leadSource: '', orderId: '' });
  const [locations, setLocations] = useState({ 
    pickupAddress: '', pickupLocation: '', pickupZip: '', 
    dropoffAddress: '', dropoffLocation: '', dropoffZip: '',
    estPickupDate: '', estDropoffDate: ''
  });
  const [vehicles, setVehicles] = useState([{ ...initialVehicle }]);
  const [price, setPrice] = useState('');
  const [carrierPay, setCarrierPay] = useState('');
  const [carrierPayTerms, setCarrierPayTerms] = useState('');
  const [carrierPaymentMethod, setCarrierPaymentMethod] = useState('');
  const [brokerFeeTerms, setBrokerFeeTerms] = useState('');
  const [brokerFeePaidBy, setBrokerFeePaidBy] = useState('Customer');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [priceExpirationDate, setPriceExpirationDate] = useState('');
  const [notes, setNotes] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [fetchingZip, setFetchingZip] = useState({ pickup: false, dropoff: false });

  // Auto-fetch Pickup Zip
  useEffect(() => {
    if (locations.pickupZip.length === 5 && !isEditMode) {
      const fetchZip = async () => {
        setFetchingZip(prev => ({ ...prev, pickup: true }));
        try {
          const res = await fetch(`https://api.zippopotam.us/us/${locations.pickupZip}`);
          if (res.ok) {
            const data = await res.json();
            if (data.places && data.places.length > 0) {
              const place = data.places[0];
              setLocations(prev => ({
                ...prev,
                pickupLocation: `${place['place name']}, ${place['state abbreviation']}`
              }));
            }
          }
        } catch (err) {
          console.error("Failed to fetch zip data", err);
        } finally {
          setFetchingZip(prev => ({ ...prev, pickup: false }));
        }
      };
      fetchZip();
    }
  }, [locations.pickupZip, isEditMode]);

  // Auto-fetch Dropoff Zip
  useEffect(() => {
    if (locations.dropoffZip.length === 5 && !isEditMode) {
      const fetchZip = async () => {
        setFetchingZip(prev => ({ ...prev, dropoff: true }));
        try {
          const res = await fetch(`https://api.zippopotam.us/us/${locations.dropoffZip}`);
          if (res.ok) {
            const data = await res.json();
            if (data.places && data.places.length > 0) {
              const place = data.places[0];
              setLocations(prev => ({
                ...prev,
                dropoffLocation: `${place['place name']}, ${place['state abbreviation']}`
              }));
            }
          }
        } catch (err) {
          console.error("Failed to fetch zip data", err);
        } finally {
          setFetchingZip(prev => ({ ...prev, dropoff: false }));
        }
      };
      fetchZip();
    }
  }, [locations.dropoffZip, isEditMode]);

  useEffect(() => {
    if (isEditMode) {
      const fetchLead = async () => {
        try {
          const { data, error } = await supabase
            .from('leads')
            .select(`
              *,
              customers (*),
              lead_vehicles (*)
            `)
            .eq('lead_number', id)
            .single();

          if (error) throw error;
          
          setInternalLeadId(data.id);
          setOriginalData(data);
          
          setCustomer({
            id: data.customers.id,
            first_name: data.customers.first_name || '',
            last_name: data.customers.last_name || '',
            phone: data.customers.phone || '',
            email: data.customers.email || '',
            leadSource: data.source || '',
            orderId: data.order_id || ''
          });

          setLocations({
            pickupAddress: data.origin_address || '',
            pickupLocation: data.origin_city || '',
            pickupZip: data.origin_zip || '',
            dropoffAddress: data.destination_address || '',
            dropoffLocation: data.destination_city || '',
            dropoffZip: data.destination_zip || '',
            estPickupDate: data.ship_date || '',
            estDropoffDate: data.delivery_date || ''
          });

          if (data.lead_vehicles && data.lead_vehicles.length > 0) {
            setVehicles(data.lead_vehicles.map(v => ({
              year: v.vehicle_year || '',
              make: v.vehicle_make || '',
              model: v.vehicle_model || '',
              type: v.vehicle_type || 'Car',
              vin: v.vehicle_vin || '',
              condition: v.condition || 'Operable',
              trailer: v.trailer_type || 'Open'
            })));
          }

          setPrice(data.estimated_price || '');
          setCarrierPay(data.carrier_pay || '');
          setCarrierPayTerms(data.carrier_pay_terms || '');
          setCarrierPaymentMethod(data.carrier_payment_method || '');
          setBrokerFeeTerms(data.broker_fee_terms || '');
          setBrokerFeePaidBy(data.broker_fee_paid_by || 'Customer');
          setPaymentMethod(data.payment_method || '');
          setPriceExpirationDate(data.price_expiration_date || '');
          setNotes(data.notes || '');

        } catch (err) {
          console.error("Error loading lead:", err);
          toast.error("Failed to load lead details.");
        } finally {
          setIsLoading(false);
        }
      };
      fetchLead();
    }
  }, [id, isEditMode]);

  const handleAddVehicle = () => {
    setVehicles([...vehicles, { ...initialVehicle }]);
  };

  const handleRemoveVehicle = (index) => {
    const newVehicles = [...vehicles];
    newVehicles.splice(index, 1);
    setVehicles(newVehicles);
  };

  const handleVehicleChange = (index, field, value) => {
    const newVehicles = [...vehicles];
    newVehicles[index][field] = value;
    setVehicles(newVehicles);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      const firstName = customer.first_name || '';
      const lastName = customer.last_name || '';
      
      let customerId = customer.id;

      if (isEditMode && customerId) {
        // Update existing customer
        await supabase.from('customers').update({
          first_name: firstName,
          last_name: lastName,
          email: customer.email,
          phone: customer.phone,
        }).eq('id', customerId);
      } else {
        // Insert new customer
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .insert([{
            first_name: firstName,
            last_name: lastName,
            email: customer.email,
            phone: customer.phone,
          }])
          .select()
          .single();
        if (customerError) throw customerError;
        customerId = customerData.id;
      }

      const leadPayload = {
        customer_id: customerId,
        order_id: customer.orderId,
        source: customer.leadSource || 'Manual',
        origin_address: locations.pickupAddress,
        origin_city: locations.pickupLocation,
        origin_zip: locations.pickupZip,
        destination_address: locations.dropoffAddress,
        destination_city: locations.dropoffLocation,
        destination_zip: locations.dropoffZip,
        ship_date: locations.estPickupDate || null,
        delivery_date: locations.estDropoffDate || null,
        estimated_price: price ? parseFloat(price) : null,
        carrier_pay: carrierPay ? parseFloat(carrierPay) : null,
        carrier_pay_terms: carrierPayTerms,
        carrier_payment_method: carrierPaymentMethod,
        broker_fee_terms: brokerFeeTerms,
        broker_fee_paid_by: brokerFeePaidBy,
        deposit_amount: price && carrierPay ? parseFloat(price) - parseFloat(carrierPay) : null,
        payment_method: paymentMethod,
        price_expiration_date: priceExpirationDate || null,
        notes: notes
      };

      let leadId = internalLeadId;

      if (isEditMode && leadId) {
        // Auto-update status to Quoted if price was added
        if (originalData?.status === 'New' && leadPayload.estimated_price > 0) {
          leadPayload.status = 'Quoted';
        }
        
        // Update Lead
        const { error: updateError } = await supabase.from('leads').update(leadPayload).eq('id', leadId);
        if (updateError) throw updateError;
        
        // Delete old vehicles
        const { error: deleteError } = await supabase.from('lead_vehicles').delete().eq('lead_id', leadId);
        if (deleteError) throw deleteError;
      } else {
        // Insert Lead
        leadPayload.status = isOrder ? 'Booked' : (leadPayload.estimated_price > 0 ? 'Quoted' : 'New');
        if (isOrder) {
          leadPayload.order_created_at = new Date().toISOString();
        }
        leadPayload.assigned_to = user?.id;
        leadPayload.created_by = user?.id;
        const { data: leadData, error: leadError } = await supabase
          .from('leads')
          .insert([leadPayload])
          .select()
          .single();
        if (leadError) throw leadError;
        leadId = leadData.id;
      }

      // Insert Vehicles
      if (vehicles.length > 0) {
        const vehicleInserts = vehicles.map(v => ({
          lead_id: leadId,
          vehicle_year: v.year,
          vehicle_make: v.make,
          vehicle_model: v.model,
          vehicle_type: v.type,
          vehicle_vin: v.vin,
          condition: v.condition,
          trailer_type: v.trailer
        }));

        const { error: vehiclesError } = await supabase
          .from('lead_vehicles')
          .insert(vehicleInserts);

        if (vehiclesError) throw vehiclesError;
      }

      if (isEditMode && leadId && originalData) {
        const changes = [];
        if (originalData.estimated_price !== (price ? parseFloat(price) : null)) changes.push(`Price: ${originalData.estimated_price || 0} -> ${price}`);
        if (originalData.carrier_pay !== (carrierPay ? parseFloat(carrierPay) : null)) changes.push(`Carrier Pay: ${originalData.carrier_pay || 0} -> ${carrierPay}`);
        if ((originalData.ship_date || '') !== locations.estPickupDate) changes.push(`Ship Date: ${originalData.ship_date || 'None'} -> ${locations.estPickupDate}`);
        if ((originalData.delivery_date || '') !== locations.estDropoffDate) changes.push(`Dropoff Date: ${originalData.delivery_date || 'None'} -> ${locations.estDropoffDate}`);
        if ((originalData.origin_city || '') !== locations.pickupLocation) changes.push(`Origin City: ${originalData.origin_city || 'None'} -> ${locations.pickupLocation}`);
        if ((originalData.destination_city || '') !== locations.dropoffLocation) changes.push(`Dest City: ${originalData.destination_city || 'None'} -> ${locations.dropoffLocation}`);
        
        if (changes.length > 0) {
          await logActivity(leadId, user.id, 'Entity Updated', 'Fields have been changed', changes.join(' | '));
        }
      } else if (!isEditMode && leadId) {
        await logActivity(leadId, user.id, `New ${isOrder ? 'Order' : 'Lead'} Created`, 'Success', 'Initial record creation');
      }

      toast.success(`${isOrder ? 'Order' : 'Lead'} successfully ${isEditMode ? 'updated' : 'saved'}!`);
      if (isEditMode) {
        navigate(`/leads/${id}`);
      } else {
        navigate(isOrder ? '/orders' : '/leads');
      }

    } catch (err) {
      console.error('Error saving lead:', err);
      toast.error('Failed to save lead. Error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const calculatedBrokerFee = (parseFloat(price || 0) - parseFloat(carrierPay || 0)).toFixed(2);

  if (isLoading) return <div style={{ padding: '40px', color: 'var(--text-primary)' }}>Loading lead...</div>;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <h1>{isEditMode ? `Edit ${isOrder ? 'Order' : 'Lead'} #NG-${id}` : `Create New ${isOrder ? 'Order' : 'Lead'}`}</h1>
      </div>

      <div className={styles.formGrid}>
        
        {/* Customer Details */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>Customer Details</div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>First Name</label>
              <input type="text" className={styles.input} value={customer.first_name} onChange={e => setCustomer({...customer, first_name: e.target.value})} />
            </div>
            <div className={styles.formGroup}>
              <label>Last Name</label>
              <input type="text" className={styles.input} value={customer.last_name} onChange={e => setCustomer({...customer, last_name: e.target.value})} />
            </div>
            <div className={styles.formGroup}>
              <label>Phone Number</label>
              <input type="tel" className={styles.input} value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} />
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
              <label>Email Address</label>
              <input type="email" className={styles.input} value={customer.email} onChange={e => setCustomer({...customer, email: e.target.value})} />
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Lead Source</label>
              <select className={styles.input} value={customer.leadSource} onChange={e => setCustomer({...customer, leadSource: e.target.value})}>
                <option value=""></option>
                <option value="Kiwi">Kiwi</option>
                <option value="Inbound">Inbound</option>
                <option value="Referral">Referral</option>
                <option value="Dealer">Dealer</option>
                <option value="Repeat">Repeat</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Order ID (Optional)</label>
              <input type="text" className={styles.input} value={customer.orderId} onChange={e => setCustomer({...customer, orderId: e.target.value})} />
            </div>
          </div>
        </div>

        {/* Logistics and Dates */}
        <div className={`${styles.section} ${styles.fullWidth}`}>
          <h2 className={styles.sectionTitle}>Locations & Dates</h2>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Pickup Address</label>
              <input type="text" className={styles.input} value={locations.pickupAddress} onChange={e => setLocations({...locations, pickupAddress: e.target.value})} placeholder="e.g. 123 Main St" />
            </div>
            <div className={styles.formGroup}>
              <label>Dropoff Address</label>
              <input type="text" className={styles.input} value={locations.dropoffAddress} onChange={e => setLocations({...locations, dropoffAddress: e.target.value})} placeholder="e.g. 456 Market St" />
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Pickup Location (City, ST)</label>
              <input type="text" className={styles.input} value={locations.pickupLocation} onChange={e => setLocations({...locations, pickupLocation: e.target.value})} />
            </div>
            <div className={styles.formGroup}>
              <label>Dropoff Location (City, ST)</label>
              <input type="text" className={styles.input} value={locations.dropoffLocation} onChange={e => setLocations({...locations, dropoffLocation: e.target.value})} />
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Pickup Zip</label>
              <div style={{ position: 'relative' }}>
                <input type="text" className={styles.input} style={{ width: '100%' }} maxLength={5} value={locations.pickupZip} onChange={e => setLocations({...locations, pickupZip: e.target.value.replace(/\D/g, '')})} />
                {fetchingZip.pickup && <span style={{ position: 'absolute', right: '10px', top: '10px', color: 'var(--brand-blue)', fontSize: '0.8rem' }}>Fetching...</span>}
              </div>
            </div>
            <div className={styles.formGroup}>
              <label>Dropoff Zip</label>
              <div style={{ position: 'relative' }}>
                <input type="text" className={styles.input} style={{ width: '100%' }} maxLength={5} value={locations.dropoffZip} onChange={e => setLocations({...locations, dropoffZip: e.target.value.replace(/\D/g, '')})} />
                {fetchingZip.dropoff && <span style={{ position: 'absolute', right: '10px', top: '10px', color: 'var(--brand-blue)', fontSize: '0.8rem' }}>Fetching...</span>}
              </div>
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Est. Pickup Date</label>
              <input type="date" className={styles.input} value={locations.estPickupDate} onChange={e => setLocations({...locations, estPickupDate: e.target.value})} />
            </div>
            <div className={styles.formGroup}>
              <label>Est. Dropoff Date</label>
              <input type="date" className={styles.input} value={locations.estDropoffDate} onChange={e => setLocations({...locations, estDropoffDate: e.target.value})} />
            </div>
          </div>
        </div>

        {/* Vehicles */}
        <div className={`${styles.section} ${styles.fullWidth}`}>
          <div className={styles.sectionHeader}>
            Vehicles
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{vehicles.length} Vehicle(s)</span>
          </div>
          
          {vehicles.map((vehicle, index) => (
            <div key={index} className={styles.vehicleCard}>
              {vehicles.length > 1 && (
                <button className={styles.removeBtn} onClick={() => handleRemoveVehicle(index)}>
                  <Trash2 size={16} />
                </button>
              )}
              
              <div className={styles.formRow} style={{ gridTemplateColumns: (vehicle.type && !['Car', 'SUV', 'Pickup', 'Van', 'Motorcycle'].includes(vehicle.type)) ? '1fr 1fr 1fr 1fr 1fr 1fr' : '1fr 1fr 1fr 1fr 1fr' }}>
                <div className={styles.formGroup}>
                  <label>Year</label>
                  <input type="text" className={styles.input} value={vehicle.year || ''} onChange={e => handleVehicleChange(index, 'year', e.target.value)} />
                </div>
                <div className={styles.formGroup}>
                  <label>Make</label>
                  <input type="text" className={styles.input} value={vehicle.make || ''} onChange={e => handleVehicleChange(index, 'make', e.target.value)} />
                </div>
                <div className={styles.formGroup}>
                  <label>Model</label>
                  <input type="text" className={styles.input} value={vehicle.model || ''} onChange={e => handleVehicleChange(index, 'model', e.target.value)} />
                </div>
                <div className={styles.formGroup}>
                  <label>Type</label>
                  <select 
                    className={styles.input} 
                    value={['Car', 'SUV', 'Pickup', 'Van', 'Motorcycle'].includes(vehicle.type) ? vehicle.type : 'Other'} 
                    onChange={e => handleVehicleChange(index, 'type', e.target.value === 'Other' ? '' : e.target.value)}
                  >
                    <option value="Car">Car</option>
                    <option value="SUV">SUV</option>
                    <option value="Pickup">Pickup</option>
                    <option value="Van">Van</option>
                    <option value="Motorcycle">Motorcycle</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                {(!['Car', 'SUV', 'Pickup', 'Van', 'Motorcycle'].includes(vehicle.type || 'Car')) && (
                  <div className={styles.formGroup}>
                    <label>Specify Type</label>
                    <input type="text" className={styles.input} value={vehicle.type === 'Other' ? '' : (vehicle.type || '')} onChange={e => handleVehicleChange(index, 'type', e.target.value)} placeholder="e.g. Boat" />
                  </div>
                )}
                <div className={styles.formGroup}>
                  <label>VIN (Optional)</label>
                  <input type="text" className={styles.input} value={vehicle.vin || ''} onChange={e => handleVehicleChange(index, 'vin', e.target.value)} />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Condition</label>
                  <select className={styles.input} value={vehicle.condition} onChange={e => handleVehicleChange(index, 'condition', e.target.value)}>
                    <option value="Operable">Operable</option>
                    <option value="Inoperable">Inoperable</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Trailer Type</label>
                  <select className={styles.input} value={vehicle.trailer} onChange={e => handleVehicleChange(index, 'trailer', e.target.value)}>
                    <option value="Open">Open</option>
                    <option value="Enclosed">Enclosed</option>
                  </select>
                </div>
              </div>
            </div>
          ))}

          <button className={styles.addVehicleBtn} onClick={handleAddVehicle}>
            <Plus size={16} /> Add Another Vehicle
          </button>
        </div>

        {/* Notes / Memo */}
        <div className={`${styles.section} ${styles.fullWidth}`}>
          <div className={styles.sectionHeader}>Memo / Notes</div>
          <textarea 
            className={styles.input} 
            style={{ width: '100%', minHeight: '100px', resize: 'vertical' }} 
            value={notes} 
            onChange={e => setNotes(e.target.value)}
            placeholder="Enter any internal notes or memos here..."
          />
        </div>

        {/* Pricing & Submission */}
        <div className={`${styles.section} ${styles.fullWidth}`}>
          <div className={styles.sectionHeader}>Price and Terms</div>
          
          <div className={styles.formRow} style={{ alignItems: 'flex-end', marginBottom: 0 }}>
             <div className={styles.formGroup}>
                <label>Estimated Total Price ($)</label>
                <input type="number" className={styles.input} placeholder="0.00" value={price} onChange={e => setPrice(e.target.value)} />
             </div>
             
             <div className={styles.formGroup}>
                <label>Carrier Pay ($)</label>
                <input type="number" className={styles.input} placeholder="0.00" value={carrierPay} onChange={e => setCarrierPay(e.target.value)} />
             </div>

             <div className={styles.formGroup}>
                <label>Carrier Pay Terms</label>
                <select className={styles.input} value={carrierPayTerms} onChange={e => setCarrierPayTerms(e.target.value)}>
                  <option value=""></option>
                  <option value="Payment After Pickup">Payment After Pickup</option>
                  <option value="Payment After Delivery">Payment After Delivery</option>
                  <option value="Payment 1 - 5 Days after delivery">Payment 1 - 5 Days after delivery</option>
                </select>
             </div>
             
             <div className={styles.formGroup}>
                <label>Carrier Payment Method</label>
                <select className={styles.input} value={carrierPaymentMethod} onChange={e => setCarrierPaymentMethod(e.target.value)}>
                  <option value=""></option>
                  <option value="Zelle">Zelle</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Cash App">Cash App</option>
                  <option value="Venmo">Venmo</option>
                  <option value="Paypal">Paypal</option>
                  <option value="ACH">ACH</option>
                  <option value="Check">Check</option>
                </select>
             </div>
          </div>
          
          <div className={styles.formRow} style={{ alignItems: 'flex-end', marginBottom: 0, marginTop: '20px' }}>
             <div className={styles.formGroup}>
                <label>Broker Fee ($)</label>
                <div style={{ color: 'var(--success)', fontSize: '1.2rem', fontWeight: 'bold', padding: '10px 0' }}>
                  ${calculatedBrokerFee}
                </div>
             </div>

             <div className={styles.formGroup}>
                <label>Broker Fee Paid By</label>
                <select className={styles.input} value={brokerFeePaidBy} onChange={e => setBrokerFeePaidBy(e.target.value)}>
                  <option value="Customer">Customer</option>
                  <option value="Carrier">Carrier</option>
                </select>
             </div>

             <div className={styles.formGroup}>
                <label>Broker Fee Terms</label>
                <select className={styles.input} value={brokerFeeTerms} onChange={e => setBrokerFeeTerms(e.target.value)}>
                  <option value=""></option>
                  <option value="Payment on Order">Payment on Order</option>
                  <option value="Payment on Pick up">Payment on Pick up</option>
                  <option value="Payment on Delivery">Payment on Delivery</option>
                </select>
             </div>
             
             <div className={styles.formGroup}>
                <label>Broker Fee Method</label>
                <select className={styles.input} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                  <option value=""></option>
                  <option value="Zelle">Zelle</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Cash App">Cash App</option>
                  <option value="Venmo">Venmo</option>
                  <option value="Paypal">Paypal</option>
                  <option value="ACH">ACH</option>
                  <option value="Check">Check</option>
                </select>
             </div>
          </div>
          
          <div className={styles.formRow} style={{ alignItems: 'flex-end', marginTop: '20px' }}>
             <div className={styles.formGroup}>
                <label>Price Expiration Date</label>
                <input type="date" className={styles.input} value={priceExpirationDate} onChange={e => setPriceExpirationDate(e.target.value)} />
             </div>
             
             <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', gridColumn: '2 / -1', marginTop: '20px' }}>
                <button className={styles.btnCancel} onClick={() => navigate(isEditMode ? `/leads/${id}` : (isOrder ? '/orders' : '/leads'))} disabled={isSaving}>Cancel</button>
                <button className={styles.btnPrimary} onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : (isEditMode ? `Update ${isOrder ? 'Order' : 'Lead'}` : `Save ${isOrder ? 'Order' : 'Lead'}`)}
                </button>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LeadForm;
