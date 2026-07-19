import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TENANT } from '../config/tenant';

export const generateOrderPDF = async (leadData, formData, quoteNumber, transportType, cargoLabel, tariff, deposit, nextPayment, firstPaymentDue, firstPaymentMethod, finalPaymentDue, finalPaymentMethod, ipAddress, action = 'download', targetSignature = null, agentPhone = TENANT.MAIN_PHONE) => {
  let previewWindow = null;
  if (action === 'preview') {
    previewWindow = window.open('', '_blank');
    if (previewWindow) {
      previewWindow.document.write('<html><body style="font-family:sans-serif;padding:20px;">Generating secure PDF preview...</body></html>');
    }
  }

  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Helper to get image base64 from a URL
    const getBase64ImageFromUrl = async (imageUrl) => {
        try {
            const res = await fetch(imageUrl);
            const blob = await res.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.addEventListener("load", function () {
                    resolve(reader.result);
                }, false);
                reader.onerror = () => reject();
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            return null;
        }
    };

    // 1. Header (Full Width Block)
    // Deep dark navy blue background
    doc.setFillColor(11, 19, 43); 
    doc.rect(0, 0, pageWidth, 40, "F");
    
    // Electric blue line at absolute top edge
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, 3, "F");

    // Try to load logo-dark.jpg, if it exists in public folder
    const logoDataUrl = await getBase64ImageFromUrl('/logo-dark.jpg');
    
    if (logoDataUrl && !logoDataUrl.includes('text/html')) {
        doc.addImage(logoDataUrl, 'JPEG', 15, 8, 45, 20);
    } else {
        // Fallback Text Branding
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(33, 33, 33);
        doc.text(TENANT.COMPANY_NAME.toUpperCase(), 15, 26);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(24);
        doc.setTextColor(59, 130, 246);
        doc.text(" AUTO TRANSPORT", 52, 26);
    }

    // Right Side: Muted contact info details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(220, 220, 220);
    doc.text("MC: 1482694 | DOT: 3969190", pageWidth - 15, 15, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(`+${agentPhone}`, pageWidth - 15, 22, { align: "right" });
    doc.text(TENANT.SUPPORT_EMAIL, pageWidth - 15, 29, { align: "right" });

    // 2. Title & Reference
    let startY = 55;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(11, 19, 43);
    doc.text("Shipment Agreement", 15, startY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Order ID: #${quoteNumber}`, pageWidth - 15, startY - 6, { align: "right" });
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 15, startY + 2, { align: "right" });

    // Electric blue horizontal separator
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(1.5);
    doc.line(15, startY + 8, pageWidth - 15, startY + 8);
    startY += 15;

    // 3. Data Sections (Using light blue block headings)
    const autotableTheme = {
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 3, font: 'helvetica' },
        headStyles: { fillColor: [240, 248, 255], textColor: [11, 19, 43], fontStyle: 'bold', fontSize: 10, cellPadding: 4 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70, textColor: [50, 50, 50] }, 1: { textColor: [30, 30, 30] } },
        margin: { top: 10, left: 15, right: 15 },
    };

    autoTable(doc, {
        ...autotableTheme,
        startY: startY,
        head: [['Customer Details', '']],
        body: [
            ['Full Name:', `${formData.firstName || ''} ${formData.lastName && formData.lastName !== 'Unknown' ? formData.lastName : ''}`.trim()],
            ['Email:', formData.email],
            ['Phone:', formData.phone],
            ['Estimated Ship Date:', formData.pickupDate]
        ],
    });

    autoTable(doc, {
        ...autotableTheme,
        startY: doc.lastAutoTable.finalY + 10,
        head: [['Origin (Pickup Location)', 'Destination (Delivery Location)']],
        headStyles: { ...autotableTheme.headStyles },
        columnStyles: { 0: { cellWidth: (pageWidth - 30) / 2 }, 1: { cellWidth: (pageWidth - 30) / 2 } },
        body: [
            [
                `${formData.originAddress}\n${formData.originCity}${formData.originContactName ? `\nContact: ${formData.originContactName}` : ''}${formData.originContactPhone ? `\nPhone: ${formData.originContactPhone}` : ''}`,
                `${formData.destAddress}\n${formData.destCity}${formData.destContactName ? `\nContact: ${formData.destContactName}` : ''}${formData.destContactPhone ? `\nPhone: ${formData.destContactPhone}` : ''}`
            ]
        ],
    });

    autoTable(doc, {
        ...autotableTheme,
        startY: doc.lastAutoTable.finalY + 10,
        head: [['Cargo / Vehicles to Transport', '']],
        body: [
            ['Vehicle Details:', cargoLabel],
            ['Transport Type:', `${transportType} Transport`]
        ],
    });

    const pricingBody = [
        ['Total Tariff:', `$${tariff.toFixed(2)}`]
    ];

    const hideFirst = !leadData.broker_fee_terms || leadData.broker_fee_terms === 'N/A';
    const hideFinal = !leadData.carrier_pay_terms || leadData.carrier_pay_terms === 'N/A';

    pricingBody.push(['First Payment:', `$${deposit.toFixed(2)}`]);
    if (!hideFirst) {
        pricingBody.push([`Due: ${firstPaymentDue}`, `Method: ${firstPaymentMethod}`]);
    }

    pricingBody.push([`Final Payment:`, `$${nextPayment.toFixed(2)}`]);
    if (!hideFinal) {
        pricingBody.push([`Due: ${finalPaymentDue}`, `Method: ${finalPaymentMethod}`]);
    }

    autoTable(doc, {
        ...autotableTheme,
        startY: doc.lastAutoTable.finalY + 10,
        head: [['Pricing Summary', '']],
        body: pricingBody,
        didParseCell: function (data) {
            if (data.section === 'body') {
                const cellText = data.row.cells[0]?.text?.[0] || '';
                if (cellText.startsWith('Final Payment')) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.textColor = [220, 38, 38]; 
                }
                if (cellText.startsWith('Due:')) {
                    data.cell.styles.fontStyle = 'italic';
                    data.cell.styles.textColor = [100, 116, 139]; 
                    data.cell.styles.fontSize = 8;
                }
            }
        }
    });

    // 4. Terms & Conditions
    // Force Terms & Conditions to start perfectly at the top of Page 2
    doc.addPage();
    let currentY = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(11, 19, 43);
    doc.text("Terms and Conditions", 15, currentY);
    
    currentY += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);

    const termsText = `TERMS AND CONDITIONS

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
    
    const splitTerms = doc.splitTextToSize(termsText, pageWidth - 30);
    
    for (let i = 0; i < splitTerms.length; i++) {
        if (currentY > pageHeight - 60) { // Keep room for signature just in case it's huge, but it shouldn't trigger with font 6
            doc.addPage();
            currentY = 20;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(6);
            doc.setTextColor(100, 100, 100);
        }
        doc.text(splitTerms[i], 15, currentY);
        currentY += 2;
    }
    
    currentY += 10;

    // 5. Electronic Signature Block
    // Remove the page break logic for signature since we want it on Page 2 with Terms
    if (currentY > pageHeight - 50) {
        // Fallback just in case terms are exceptionally long
        doc.addPage();
        currentY = 20;
    }

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(15, currentY, pageWidth - 30, 45, "FD");

    const hasChangeOrders = Array.isArray(leadData?.change_order_signatures) && leadData.change_order_signatures.length > 0;
    let latestSig = hasChangeOrders ? leadData.change_order_signatures[leadData.change_order_signatures.length - 1] : null;
    
    // If a specific signature is requested, use it instead
    let isChangeOrderDisplay = hasChangeOrders;
    if (targetSignature) {
      if (targetSignature.type === 'original') {
        latestSig = null;
        isChangeOrderDisplay = false;
      } else {
        latestSig = targetSignature;
        isChangeOrderDisplay = true;
      }
    }
    
    const displaySignature = latestSig ? latestSig.signature : (leadData?.electronic_signature || formData.signature || "Not Signed");
    const displayIp = latestSig ? latestSig.ip : (leadData?.signed_ip || ipAddress || "N/A");
    const displayDate = latestSig ? latestSig.date : (leadData?.signed_date || new Date().toISOString());

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(isChangeOrderDisplay ? "CHANGE ORDER SIGNATURE" : "CUSTOMER SIGNATURE", 25, currentY + 12);
    
    doc.setFont("times", "italic");
    doc.setFontSize(28);
    doc.setTextColor(15, 23, 42);
    doc.text(displaySignature, 25, currentY + 32);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("IP ADDRESS", pageWidth - 100, currentY + 12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(displayIp, pageWidth - 100, currentY + 20);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("TIMESTAMP", pageWidth - 100, currentY + 30);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    const timeStamp = displayDate ? new Date(displayDate).toLocaleString() : new Date().toLocaleString();
    doc.text(timeStamp, pageWidth - 100, currentY + 38);

    // 6. Footer (Every Page)
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(11, 19, 43);
        doc.rect(0, pageHeight - 20, pageWidth, 20, "F");
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        if (action !== 'download' && action !== 'blob' && action !== 'print' && action !== 'sign') {
        doc.text(`${TENANT.COMPANY_NAME} | ${TENANT.SUPPORT_EMAIL} | +${agentPhone}`, pageWidth / 2, pageHeight - 8, { align: "center" });
      }  doc.text(`Page ${i} of ${pageCount}`, pageWidth - 15, pageHeight - 8, { align: "right" });
    }

    if (action === 'preview') {
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      if (previewWindow) {
        previewWindow.location.href = blobUrl;
      } else {
        window.open(blobUrl, '_blank');
      }
    } else if (action === 'print') {
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } else {
      doc.save(`${TENANT.COMPANY_NAME.replace(/ /g, '_')}_Order_${quoteNumber}.pdf`);
    }
  } catch (error) {
    console.error("PDF Generation Error:", error);
    if (previewWindow) previewWindow.close();
    alert(`Error generating PDF: ${error.message}`);
  }
};
