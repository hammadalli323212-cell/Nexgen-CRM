import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const generateOrderPDF = async (leadData, formData, quoteNumber, transportType, cargoLabel, tariff, deposit, nextPayment, firstPaymentDue, firstPaymentMethod, finalPaymentDue, finalPaymentMethod, ipAddress, action = 'download', targetSignature = null) => {
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
        doc.setFont("helvetica", "bold");
        doc.setFontSize(24);
        doc.setTextColor(255, 255, 255);
        doc.text("NEXGEN", 15, 26);
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
    doc.text("+(832) 886-1321", pageWidth - 15, 22, { align: "right" });
    doc.text("contact@nexgenautotransport.com", pageWidth - 15, 29, { align: "right" });

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

    autoTable(doc, {
        ...autotableTheme,
        startY: doc.lastAutoTable.finalY + 10,
        head: [['Pricing Summary', '']],
        body: [
            ['Total Tariff:', `$${tariff.toFixed(2)}`],
            ['First Payment:', `$${deposit.toFixed(2)}`],
            [`Due: ${firstPaymentDue}`, `Method: ${firstPaymentMethod}`],
            [`Final Payment:`, `$${nextPayment.toFixed(2)}`],
            [`Due: ${finalPaymentDue}`, `Method: ${finalPaymentMethod}`]
        ],
        didParseCell: function (data) {
            if (data.row.index === 3 && data.section === 'body') {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.textColor = [220, 38, 38]; 
            }
            if ((data.row.index === 2 || data.row.index === 4) && data.section === 'body') {
                data.cell.styles.fontStyle = 'italic';
                data.cell.styles.textColor = [100, 116, 139]; 
                data.cell.styles.fontSize = 8;
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

    const termsText = `Acceptance
*
By selecting "I Agree" and entering my full name as a binding electronic signature, I understand that an electronic signature has the same legal effect and can be enforced in the same way as a written signature. Furthermore, I hereby accept terms and conditions of service as described in the "Terms & Conditions" section below.

Terms & Conditions
1: The carrier and driver jointly and separately are authorized to operate and transport his/her or their motor vehicle between its pickup location and the destination. Every effort will be made to ship the vehicle within the promised period but delays can occur due to carrier schedules, mechanical failure, inclement weather, or acts of God, among other unforeseen circumstances for which it can take up to 2 weeks. NexGen Auto Transport will not be responsible for any charges or liabilities incurred due to delay of pickup or delivery. This includes but is not limited to airline tickets or rental car fees. The client will be given the carrier’s schedule at the time of dispatch. The client agrees to release NexGen Auto Transport from any liability and waive their right to sue NexGen Auto Transport LLC, or their employees, officers, volunteers, and agents (collectively “District”) from any and all claims.

2: The client agrees not to contract any other broker or carrier during the respective time which corresponds with their shipping option. Any client that is found working with another broker or carrier during this period, is subject to a non-refundable deposit fee. The initial deposit fee and/or any other transport fees are non-refundable after initiation/completion of the online order process by the customer.

3: Contracted carriers provide door-to-door transport if the truck driver can physically reach the pick-up and delivery addresses. If access to the pickup or delivery location is restricted by narrow streets, low-hanging trees, or tight turns, the driver may ask that you meet the truck at a large parking lot nearby, such as a grocery store.

4: Carriers are not licensed or insured to transport any personal or household goods, however, we do understand that you may need to put some items in the vehicle. Carrier is not liable for damage caused to the vehicle from excessive or improper loading of personal items. These items must be put in the trunk and kept to a limit of 100 lbs. Any exceptions must be previously discussed and approved by NexGen Auto Transport. An additional fee may be assessed for personal items of any weight. Any misrepresentation of the personal belongings will result in a change of price and/or a dry run fee of $150 if a carrier is made to attend the scene of the pick-up and the shipment is different from expected. If a carrier is sent out and the vehicle is not ready as indicated by the shipper there will be an additional $75.00 rescheduling fee. NexGen Auto Transport must be notified, should the shipper be unavailable for pick up or delivery, the shipper must have an alternate representative take his/her place as a shipper.

5: Vehicles must be tendered to the carrier in good running condition with no more than a half tank of fuel. Carrier will not be liable for damage caused by leaking fluids, freezing, exhaust systems, or antennas not tied down. Any claim for loss or damage must be noted and signed on the condition report at the time of delivery.

6: Trucking damage claims are covered by carriers from $100,000 up to $250,000 cargo insurance per load, and a minimum of 3/4 of a million dollars public liability and property damage. Any damage incurred to a vehicle during transport falls directly under the responsibility of the carrier and not NexGen Auto Transport. All carriers contractor will have insurance to cover damage caused by the driver, carrier or carrier’s contractor, weather, act of god, vandalism and or theft during transport. If damage is done, NexGen Auto Transport will provide you with a full insurance packet for the carrier to file a claim. NexGen Auto Transport is not responsible for damage caused by driver, carrier or carrier’s contractor, weather, act of god, vandalism and or theft during transport. All claims must be noted and signed for at the time of delivery and submitted in writing within 15 days of delivery.

7: If a carrier is sent out and the vehicle is not ready as indicated by the shipper there will be an additional $75.00 rescheduling fee. NexGen Auto Transport must be notified, should the shipper be unavailable for pick up or delivery, the shipper must have an alternate representative take his/her place as a shipper. If for any reason the vehicle becomes unavailable during a scheduled pick-up window, after an order has been placed, NexGen Auto Transport will not refund the deposit amount.

8: The client should under no circumstances release or receive vehicle(s) from a carrier without an inspection report (Bill of Lading/BOL) regardless of the time of day or the weather conditions. Failure to do so may result in the client’s inability to file a damage claim. Carriers insurance will only process claims for damages due to the carrier’s negligence. Damage must be reported to NexGen Auto Transport within 24 hours of delivery. Damage must be listed on the BOL and signed by the driver (no exceptions). If there is damage during transport, the client must notate those damages on the final inspection report, pay the remaining balance stated on this agreement, and then contact the carrier’s main office as well as the carrier’s insurance company. Failure to notate any damage on the final inspection report releases the carrier of any liability and would result in the inability to process a damage claim. It is the customer’s responsibility to review the Carrier’s dispatch sheet and confirm the customer’s correct name and address and verify the identity of the truck driver prior to releasing the vehicle for transport. NexGen Auto Transport is an acting agent.

9: Prior to releasing the vehicle to the assigned carrier at pickup, Customer shall independently verify and confirm the identity and authority of the transporting carrier and driver. Such verification shall include, without limitation, confirming that the carrier company name, truck Vehicle Identification Number (VIN) and/or identifying information, insurance documentation, and driver’s license details match the information provided by NexGen Auto Transport. Customer acknowledges and agrees that failure to perform such verification prior to surrendering possession of the vehicle constitutes Customer negligence. In the event Customer releases the vehicle without completing the required verification process, NexGen Auto Transport shall not be liable or responsible for any damages, losses, theft, claims, fraudulent activity, misdelivery, or any other liabilities arising therefrom, and Customer expressly waives any right to assert claims against NexGen Auto Transport related to such failure of verification.

10: All claims must be made with the carrier if any circumstances arise. Any/All damages are covered by the carrier’s insurance and must be claimed with the carrier’s insurance, not NexGen Auto Transport s. In the condition of a lost or stolen vehicle, all claims must be made with Carrier’s insurance.

11: Dispatched orders must be canceled by calling the offices of NexGen Auto Transport at (832) 886-1321 or sending an email to contact@nexgenautotransport.com. Cancellations of dispatched orders are subject to a non-refundable $200 fee.

12: A $150.00 non-operational fee will be charged for all non-running vehicles. This will be included in the final quote received from NexGen Auto Transport. If the vehicle becomes non-operational during transport, this fee will be applied to the original quote.

13: Customer acknowledges that the quoted prices provided by NexGen Auto Transport are based on the best market estimate at the time of booking. However, prices are subject to change due to factors beyond our control, including but not limited to high demand for truck services, unavailability of truckers, and adverse weather conditions. Upon identification of such changes, NexGen's sales team shall contact Customer and provide an updated quote for the transportation services. Upon receipt of the updated quote, Customer shall confirm their acceptance and agreement to pay the revised transportation cost. Only after receiving explicit confirmation from Customer, NexGen shall proceed to dispatch the vehicle to the selected trucker for transportation.

14: NexGen Auto Transport agrees to provide a carrier to transport your vehicle as promptly as possible under your instructions but cannot guarantee pick-up or delivery on a specified date. A cancellation fee of $200 will be charged for orders canceled 7 days before the requested available pick-up date. NexGen Auto Transport does not agree to pay for your rental of a vehicle, nor shall it be liable for the failure of mechanical or operating parts of your vehicle. The shipper warrants that he/she will pay the price quoted due to NexGen Auto Transport for delivered vehicles and will not seek to charge back a credit card. This agreement and any shipment hereunder are subject to all terms and conditions of the carrier’s tariff and the uniform straight bill of lading, copies of which are available at the office of the carrier.

15: This agreement shall be governed by and construed under the laws of the State of Texas. The parties further agree that any legal action arising out of this agreement must be filed in a court of Fort Bend County. NexGen Auto Transport’s liability is limited to the amount of money collected by NexGen Auto Transport or its affiliates to “broker’s fee” only. The client hereby submits to the jurisdiction of such courts and waives any right to jurisdiction in any other location. I hereby agree to the transport terms provided by NexGen Auto Transport. I authorize a small down payment to be paid to NexGen Auto Transport via Credit Card, Zelle, Paypal or Venmo. I further understand that any remaining balance is due on delivery and that it must be paid in full via a method decided by the carrier i.e. cash, cashier’s check, or money order to the authorized transporter.`;
    
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
        doc.text("NexGen Auto Transport | contact@nexgenautotransport.com | +(832) 886-1321", pageWidth / 2, pageHeight - 8, { align: "center" });
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 15, pageHeight - 8, { align: "right" });
    }

    if (action === 'preview') {
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      if (previewWindow) {
        previewWindow.location.href = blobUrl;
      } else {
        window.open(blobUrl, '_blank');
      }
    } else {
      doc.save(`NexGen_Order_${quoteNumber}.pdf`);
    }
  } catch (error) {
    console.error("PDF Generation Error:", error);
    if (previewWindow) previewWindow.close();
    alert(`Error generating PDF: ${error.message}`);
  }
};
