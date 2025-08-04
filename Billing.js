import React, { useState, useRef, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Format number with commas
const formatCurrency = (num) =>
  `₹${Number(num).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const Billing = () => {
  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [purchaseMode, setPurchaseMode] = useState("Offline");

  const barcodeInputRef = useRef();

  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, [cart]);

  const parseNumber = (val) =>
    typeof val === "string"
      ? Number(val.replace(/[^\d.]/g, "")) || 0
      : val ?? 0;

  const handleScan = async (e) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    const code = barcode.trim().toUpperCase();
    const q = query(collection(db, "products"), where("barcode", "==", code));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const data = snapshot.docs[0].data();
      const { name, barcode } = data;
      const mrp = parseNumber(data.mrp);
      const salePrice = parseNumber(data.salePrice);

      if (!name || !barcode) {
        alert("⚠️ Missing product fields. Check Firestore.");
        return;
      }

      const existing = cart.find((item) => item.barcode === code);
      if (existing) {
        setCart((prev) =>
          prev.map((item) =>
            item.barcode === code ? { ...item, qty: item.qty + 1 } : item
          )
        );
      } else {
        setCart([...cart, { name, barcode, mrp, salePrice, qty: 1 }]);
      }
    } else {
      alert("❌ Item not found.");
    }

    setBarcode("");
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce(
      (sum, item) => sum + parseNumber(item.salePrice) * item.qty,
      0
    );
    const taxable = +(subtotal / 1.03).toFixed(2);
    const cgst = +(taxable * 0.015).toFixed(2);
    const sgst = +(taxable * 0.015).toFixed(2);
    const grand = +(taxable + cgst + sgst).toFixed(2);
    return { taxable, cgst, sgst, grand };
  };
const generatePDF = (invoiceId) => {
  const { taxable, cgst, sgst, grand } = calculateTotals();
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // ✅ DEBUG: Ensure cart has data
  console.log("🛒 Cart contents before PDF:", cart);
  if (!cart || cart.length === 0) {
    console.warn("❌ No items in cart. Skipping PDF generation.");
    return;
  }
  const logoBase64 =
    "data:image/png;base64,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";
  


  // ✅ Initial Background Box (static height for safety)
  doc.setDrawColor("#C2185B");
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(10, 10, pageWidth - 20, 330, 3, 3, "FD");

  // ✅ Header
  doc.addImage(logoBase64, "PNG", 15, 15, 30, 20);
  doc.setFont("helvetica", "bold").setFontSize(18).setTextColor("#C2185B");
  doc.text("Zevar Club", 50, 22);
  doc.setFontSize(9).setTextColor(0);
  doc.text("Plot 337, Near Rishi Bhawan, Ramtekri Road, Jugsalai", 50, 28);
  doc.text("Jamshedpur - 831006 | GST No: 20AADFZ7236L1ZZ", 50, 33);
  doc.text("Phone: +91-9470128088, +91-7304136011 | www.zevarclub.in", 50, 38);

  // ✅ Customer and Invoice Details
  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor("#C2185B");
  doc.text("Customer Details", 15, 50);
  doc.text("Invoice Details", pageWidth - 70, 50);

  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(0);
  const leftY = 58;
  doc.text(`Name: ${customerName}`, 15, leftY);
  doc.text(`Phone: ${customerPhone}`, 15, leftY + 6);
  doc.text(`Email: ${customerEmail}`, 15, leftY + 12);
  doc.text(`Address: ${customerAddress}`, 15, leftY + 18);
  doc.text(`Mode: ${purchaseMode}`, 15, leftY + 24);

  const rightY = 58;
  doc.text(`Invoice #: ${invoiceId}`, pageWidth - 70, rightY);
  doc.text(`Date: ${new Date().toLocaleDateString("en-IN")}`, pageWidth - 70, rightY + 6);

  // ✅ Product Table
  const tableStartY = leftY + 32;
  autoTable(doc, {
    startY: tableStartY,
    head: [["#", "Item", "MRP", "Sale Price", "Qty", "Total"]],
    body: cart.map((item, i) => [
      i + 1,
      item.name,
      item.mrp.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
      item.salePrice.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
      item.qty,
      (item.salePrice * item.qty).toLocaleString("en-IN", { minimumFractionDigits: 2 }),
    ]),
    margin: { left: 15, right: 15 },
    styles: { fontSize: 9, halign: "center" },
    headStyles: { fillColor: [194, 24, 91], textColor: 255 },
    pageBreak: 'avoid', // prevent blank pages
  });

  const endY = doc.lastAutoTable.finalY + 10;

  // ✅ Totals
  doc.setFillColor(245, 245, 245);
  doc.rect(pageWidth - 85, endY, 70, 25, "F");

  doc.setFontSize(10).setTextColor(0);
  doc.text("Taxable:", pageWidth - 83, endY + 6);
  doc.text("CGST (1.5%):", pageWidth - 83, endY + 12);
  doc.text("SGST (1.5%):", pageWidth - 83, endY + 18);

  doc.setFont("helvetica", "bold").setTextColor("#388E3C");
  doc.text("Grand Total:", pageWidth - 83, endY + 24);

  doc.setFont("helvetica", "normal").setTextColor(0);
  doc.text(taxable.toLocaleString("en-IN", { minimumFractionDigits: 2 }), pageWidth - 18, endY + 6, { align: "right" });
  doc.text(cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 }), pageWidth - 18, endY + 12, { align: "right" });
  doc.text(sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 }), pageWidth - 18, endY + 18, { align: "right" });

  doc.setFont("helvetica", "bold").setTextColor("#388E3C");
  doc.text(grand.toLocaleString("en-IN", { minimumFractionDigits: 2 }), pageWidth - 18, endY + 24, { align: "right" });

  // ✅ Thank You Note
  const finalY = endY + 35;
  doc.setFont("helvetica", "italic").setFontSize(11).setTextColor("#C2185B");
  doc.text("Thank you for shopping with Zevar Club!", pageWidth / 2, finalY, { align: "center" });

  // ✅ Save PDF
  doc.save(`${invoiceId}.pdf`);
};
  const handleSubmit = async () => {
    if (!customerName || cart.length === 0) {
      alert("⚠️ Enter customer name and add items.");
      return;
    }

    const invoiceId = "INV-" + Date.now();
    const items = cart.map((item, i) => ({
      name: item.name ?? `Item ${i + 1}`,
      barcode: item.barcode ?? `UNKNOWN`,
      qty: item.qty ?? 0,
      mrp: parseNumber(item.mrp),
      salePrice: parseNumber(item.salePrice),
    }));

    const billData = {
      invoiceId,
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      purchaseMode,
      items,
      created: Timestamp.now(),
    };

    try {
      await addDoc(collection(db, "bills"), billData);
    } catch (err) {
      console.error("[ERROR] Failed to save bill:", err);
      alert("❌ Could not save invoice. Try again.");
      return;
    }

    try {
      for (const item of cart) {
        const q = query(collection(db, "products"), where("barcode", "==", item.barcode));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const ref = doc(db, "products", snapshot.docs[0].id);
          const prevQty = snapshot.docs[0].data().qty ?? 0;
          await updateDoc(ref, { qty: prevQty - item.qty });
        }
      }
    } catch (err) {
      console.error("[ERROR] Stock update failed:", err);
    }

    generatePDF(invoiceId);
    alert("✅ Invoice saved and downloaded!");

    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setCustomerAddress("");
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4 text-pink-700">Billing Page</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <input
          ref={barcodeInputRef}
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleScan(e)}
          placeholder="Scan barcode"
          className="border p-2 w-full rounded"
        />
        <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer Name" className="border p-2 w-full rounded" />
        <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Phone" className="border p-2 w-full rounded" />
        <input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="Email" className="border p-2 w-full rounded" />
        <input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Address" className="border p-2 w-full rounded" />
        <select value={purchaseMode} onChange={(e) => setPurchaseMode(e.target.value)} className="border p-2 w-full rounded">
          <option>Offline</option>
          <option>Amazon</option>
          <option>Website</option>
        </select>
      </div>

      <div className="overflow-x-auto mb-4">
        <table className="min-w-full text-sm border">
          <thead className="bg-gray-100 text-center">
            <tr>
              <th className="p-2 border">#</th>
              <th className="p-2 border">Item</th>
              <th className="p-2 border">MRP</th>
              <th className="p-2 border">Price</th>
              <th className="p-2 border">Qty</th>
              <th className="p-2 border">Total</th>
            </tr>
          </thead>
          <tbody>
            {cart.map((item, i) => (
              <tr key={i} className="text-center">
                <td className="border p-1">{i + 1}</td>
                <td className="border p-1">{item.name}</td>
                <td className="border p-1">{formatCurrency(item.mrp)}</td>
                <td className="border p-1">{formatCurrency(item.salePrice)}</td>
                <td className="border p-1">{item.qty}</td>
                <td className="border p-1">{formatCurrency(item.salePrice * item.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-right mb-4">
        {(() => {
          const { taxable, cgst, sgst, grand } = calculateTotals();
          return (
            <>
              <p>Taxable: {formatCurrency(taxable)}</p>
              <p>CGST (1.5%): {formatCurrency(cgst)}</p>
              <p>SGST (1.5%): {formatCurrency(sgst)}</p>
              <h2 className="text-lg font-bold text-green-700">Grand Total: {formatCurrency(grand)}</h2>
            </>
          );
        })()}
      </div>

      <button onClick={handleSubmit} className="bg-pink-700 text-white px-6 py-2 rounded hover:bg-pink-800">
        Generate Invoice
      </button>
    </div>
  );
};

export default Billing;
