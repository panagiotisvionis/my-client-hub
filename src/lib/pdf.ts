import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Client, Session, Invoice, TherapistProfile, SESSION_TYPE_LABELS } from '@/types';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('el-GR');
}

async function loadNotoSans(doc: jsPDF) {
  const toBase64 = async (url: string) => {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const [regular, bold] = await Promise.all([
    toBase64('/fonts/NotoSans-Regular.ttf'),
    toBase64('/fonts/NotoSans-Bold.ttf'),
  ]);

  doc.addFileToVFS('NotoSans-Regular.ttf', regular);
  doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
  doc.addFileToVFS('NotoSans-Bold.ttf', bold);
  doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');
}

export async function generateInvoicePDF(
  invoice: Invoice,
  client: Client,
  sessions: Session[],
  profile: TherapistProfile
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  await loadNotoSans(doc);

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  const tf = { font: 'NotoSans' };

  // Header background
  doc.setFillColor(42, 90, 60);
  doc.rect(0, 0, pageW, 45, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('NotoSans', 'bold');
  doc.text('ΤΙΜΟΛΟΓΙΟ ΠΑΡΟΧΗΣ ΥΠΗΡΕΣΙΩΝ', margin, 20);

  doc.setFontSize(10);
  doc.setFont('NotoSans', 'normal');
  doc.text(`Αρ. Τιμολογίου: ${invoice.invoiceNumber}`, margin, 30);
  doc.text(`Ημερομηνία: ${formatDate(invoice.date)}`, margin, 37);

  if (invoice.myDataMark) {
    doc.text(`MARK (myDATA): ${invoice.myDataMark}`, pageW - margin - 70, 30);
  }

  doc.setTextColor(30, 30, 30);
  let y = 58;

  doc.setFontSize(9);
  doc.setFont('NotoSans', 'bold');
  doc.text('ΠΑΡΟΧΟΣ ΥΠΗΡΕΣΙΩΝ', margin, y);
  doc.text('ΑΠΟΔΕΚΤΗΣ', pageW / 2 + 5, y);

  doc.setFont('NotoSans', 'normal');
  y += 6;
  const therapistLines = [
    profile.name || '—',
    profile.profession,
    profile.address ? `${profile.address}, ${profile.city} ${profile.postalCode}` : '',
    profile.phone ? `Τηλ: ${profile.phone}` : '',
    profile.afm ? `ΑΦΜ: ${profile.afm}  ΔΟΥ: ${profile.doy}` : '',
  ].filter(Boolean);

  const clientLines = [
    `${client.lastName} ${client.firstName}`,
    client.phone ? `Τηλ: ${client.phone}` : '',
    client.email ? `Email: ${client.email}` : '',
  ].filter(Boolean);

  const maxLines = Math.max(therapistLines.length, clientLines.length);
  for (let i = 0; i < maxLines; i++) {
    if (therapistLines[i]) doc.text(therapistLines[i], margin, y + i * 5);
    if (clientLines[i]) doc.text(clientLines[i], pageW / 2 + 5, y + i * 5);
  }

  y += maxLines * 5 + 10;

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  const invoiceSessions = sessions.filter(s => invoice.sessionIds.includes(s.id));

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Ημερομηνία', 'Τύπος', 'Διάρκεια', 'Αμοιβή']],
    body: invoiceSessions.map(s => [
      formatDate(s.date),
      SESSION_TYPE_LABELS[s.type],
      `${s.duration} λ.`,
      `${s.fee.toFixed(2)} €`,
    ]),
    headStyles: { fillColor: [42, 90, 60], textColor: 255, fontStyle: 'bold', fontSize: 9, ...tf },
    bodyStyles: { fontSize: 9, ...tf },
    alternateRowStyles: { fillColor: [245, 248, 246] },
    columnStyles: { 3: { halign: 'right' } },
  });

  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  doc.setFillColor(42, 90, 60);
  doc.rect(pageW - margin - 60, finalY, 60, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('NotoSans', 'bold');
  doc.text(`ΣΥΝΟΛΟ: ${invoice.total.toFixed(2)} €`, pageW - margin - 5, finalY + 8, { align: 'right' });

  doc.setTextColor(30, 30, 30);

  if (profile.iban) {
    doc.setFontSize(8);
    doc.setFont('NotoSans', 'normal');
    doc.text(`IBAN: ${profile.iban}`, margin, finalY + 20);
  }

  const footerY = doc.internal.pageSize.getHeight() - 12;
  doc.setFontSize(7);
  doc.setFont('NotoSans', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text('Παράχθηκε από το TherapyDesk', pageW / 2, footerY, { align: 'center' });

  doc.save(`Τιμολόγιο-${invoice.invoiceNumber}-${client.lastName}.pdf`);
}

export async function generateClientReportPDF(client: Client, sessions: Session[]): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  await loadNotoSans(doc);

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  const tf = { font: 'NotoSans' };

  doc.setFillColor(42, 90, 60);
  doc.rect(0, 0, pageW, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('NotoSans', 'bold');
  doc.text(`${client.lastName} ${client.firstName}`, margin, 18);
  doc.setFontSize(9);
  doc.setFont('NotoSans', 'normal');
  doc.text(`Ιστορικό Συνεδριών — Εκτύπωση: ${formatDate(new Date().toISOString())}`, margin, 28);

  doc.setTextColor(30, 30, 30);
  let y = 48;

  const totalPaid = sessions.filter(s => s.paid).reduce((a, s) => a + s.fee, 0);
  const totalUnpaid = sessions.filter(s => !s.paid).reduce((a, s) => a + s.fee, 0);

  doc.setFontSize(9);
  doc.setFont('NotoSans', 'normal');
  doc.text(`Σύνολο: ${sessions.length}  |  Εξοφλημένα: ${totalPaid.toFixed(2)}€  |  Ανεξόφλητα: ${totalUnpaid.toFixed(2)}€`, margin, y);
  y += 10;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Ημερομηνία', 'Τύπος', 'Διάρκεια', 'Αμοιβή', 'Κατάσταση']],
    body: sessions.map(s => [
      formatDate(s.date),
      SESSION_TYPE_LABELS[s.type],
      `${s.duration} λ.`,
      `${s.fee.toFixed(2)} €`,
      s.paid ? 'Εξοφλημένη' : 'Ανεξόφλητη',
    ]),
    headStyles: { fillColor: [42, 90, 60], textColor: 255, fontStyle: 'bold', fontSize: 9, ...tf },
    bodyStyles: { fontSize: 8, ...tf },
    alternateRowStyles: { fillColor: [245, 248, 246] },
  });

  doc.save(`Αναφορά-${client.lastName}-${client.firstName}.pdf`);
}
