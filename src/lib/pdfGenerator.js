import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const generateOrderPDF = async (leadData, formData, quoteNumber, transportType, cargoLabel, tariff, deposit, nextPayment, paymentMethod, ipAddress, action = 'download') => {
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

    // Try to load logo.png, if it exists in public folder
    const logoDataUrl = await getBase64ImageFromUrl('/logo.png');
    
    if (logoDataUrl && !logoDataUrl.includes('text/html')) {
        doc.addImage(logoDataUrl, 'PNG', 15, 8, 45, 24);
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
        styles: { fontSize: 10, cellPadding: 6, font: 'helvetica' },
        headStyles: { fillColor: [240, 248, 255], textColor: [11, 19, 43], fontStyle: 'bold', fontSize: 11, cellPadding: 8 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70, textColor: [50, 50, 50] }, 1: { textColor: [30, 30, 30] } },
        margin: { top: 10, left: 15, right: 15 },
    };

    autoTable(doc, {
        ...autotableTheme,
        startY: startY,
        head: [['Customer Details', '']],
        body: [
            ['Full Name:', `${formData.firstName} ${formData.lastName}`],
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
                `${formData.originAddress}\n${formData.originCity}`,
                `${formData.destAddress}\n${formData.destCity}`
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
            ['1st Payment:', `$${deposit.toFixed(2)}`],
            [`Final Payment (${paymentMethod}):`, `$${nextPayment.toFixed(2)}`]
        ],
        didParseCell: function (data) {
            // Highlight the balance due
            if (data.row.index === 2 && data.section === 'body') {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.textColor = [220, 38, 38]; // Red for balance due
            }
        }
    });

    // 4. Terms & Conditions
    let currentY = doc.lastAutoTable.finalY + 15;
    
    // Check if we need to add a page before rendering terms
    if (currentY > pageHeight - 60) {
        doc.addPage();
        currentY = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(11, 19, 43);
    doc.text("Terms and Conditions", 15, currentY);
    
    currentY += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);

    const termsText = "1. Carrier and driver jointly and separately are authorized to operate and transport the motor vehicle between its pickup location and the destination set forth on the auto transport order.\n2. NexGen Auto Transport agrees to provide a carrier to transport your vehicle as promptly as possible in accordance with your instructions but cannot guarantee pickup or delivery on a specified date or time.\n3. The customer authorizes NexGen Auto Transport to hire an independent carrier to transport their vehicle. All carriers are fully insured and authorized by the FMCSA.\n4. All damages must be noted on the Bill of Lading (BOL) at delivery. Any claims for damage must be made directly to the assigned carrier's insurance.\n5. Personal items left inside the vehicle are entirely at the customer's own risk. The carrier's insurance does not cover personal property.";
    
    const splitTerms = doc.splitTextToSize(termsText, pageWidth - 30);
    doc.text(splitTerms, 15, currentY);
    
    currentY += (splitTerms.length * 3.5) + 10;

    // 5. Electronic Signature Block
    if (currentY > pageHeight - 60) {
        doc.addPage();
        currentY = 20;
    }

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(15, currentY, pageWidth - 30, 45, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("CUSTOMER SIGNATURE", 25, currentY + 12);
    
    doc.setFont("times", "italic");
    doc.setFontSize(28);
    doc.setTextColor(15, 23, 42);
    doc.text(leadData?.electronic_signature || formData.signature || "Not Signed", 25, currentY + 32);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("IP ADDRESS", pageWidth - 100, currentY + 12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(leadData?.signed_ip || ipAddress || "N/A", pageWidth - 100, currentY + 20);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("TIMESTAMP", pageWidth - 100, currentY + 30);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    const timeStamp = leadData?.signed_date ? new Date(leadData.signed_date).toLocaleString() : new Date().toLocaleString();
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
      window.open(blobUrl, '_blank');
    } else {
      doc.save(`NexGen_Order_${quoteNumber}.pdf`);
    }
  } catch (error) {
    console.error("PDF Generation Error:", error);
    alert(`Error generating PDF: ${error.message}`);
  }
};
