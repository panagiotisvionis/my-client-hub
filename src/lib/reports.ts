import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Client, Session, Expense, TherapistProfile, SESSION_TYPE_LABELS, EXPENSE_CATEGORY_LABELS } from '@/types';

function fmt(d: string) { return new Date(d).toLocaleDateString('el-GR'); }
function fmtMoney(n: number) { return `${n.toFixed(2)} €`; }

export function generateMonthlyReport(
  year: number,
  month: number,
  sessions: Session[],
  clients: Client[],
  expenses: Expense[],
  profile: TherapistProfile
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;

  const monthName = new Date(year, month, 1).toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });

  // Header
  doc.setFillColor(42, 90, 60);
  doc.rect(0, 0, pageW, 38, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('ΜΗΝΙΑΙΑ ΑΝΑΦΟΡΑ', margin, 16);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(monthName.toUpperCase(), margin, 25);
  if (profile.name) doc.text(profile.name, pageW - margin, 25, { align: 'right' });
  doc.setFontSize(8);
  doc.text(`ΑΦΜ: ${profile.afm || '—'}`, pageW - margin, 32, { align: 'right' });

  doc.setTextColor(30, 30, 30);

  const monthSessions = sessions.filter(s => {
    const d = new Date(s.date);
    return d.getMonth() === month && d.getFullYear() === year && s.status !== 'cancelled';
  });
  const monthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });

  const totalRevenue = monthSessions.reduce((a, s) => a + s.fee, 0);
  const totalPaid = monthSessions.filter(s => s.paid).reduce((a, s) => a + s.fee, 0);
  const totalUnpaid = totalRevenue - totalPaid;
  const totalExpenses = monthExpenses.reduce((a, e) => a + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const noShows = monthSessions.filter(s => s.status === 'no_show').length;

  let y = 50;

  // KPI summary boxes
  const boxW = (pageW - margin * 2 - 9) / 4;
  const boxes = [
    { label: 'Συνεδρίες', value: String(monthSessions.length), color: [42, 90, 60] as [number, number, number] },
    { label: 'Έσοδα', value: fmtMoney(totalRevenue), color: [200, 132, 74] as [number, number, number] },
    { label: 'Δαπάνες', value: fmtMoney(totalExpenses), color: [180, 60, 60] as [number, number, number] },
    { label: 'Καθαρό', value: fmtMoney(netProfit), color: netProfit >= 0 ? [42, 90, 60] as [number, number, number] : [180, 60, 60] as [number, number, number] },
  ];
  boxes.forEach((box, i) => {
    const x = margin + i * (boxW + 3);
    doc.setFillColor(box.color[0], box.color[1], box.color[2]);
    doc.roundedRect(x, y, boxW, 18, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text(box.label, x + boxW / 2, y + 6, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(box.value, x + boxW / 2, y + 13, { align: 'center' });
    doc.setFont('helvetica', 'normal');
  });

  doc.setTextColor(30, 30, 30);
  y += 24;

  // Sessions table
  if (monthSessions.length > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('ΑΝΑΛΥΣΗ ΣΥΝΕΔΡΙΩΝ', margin, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Ημερομηνία', 'Θεραπευόμενος', 'Τύπος', 'Διάρκεια', 'Αμοιβή', 'Πληρωμή']],
      body: monthSessions.map(s => {
        const client = clients.find(c => c.id === s.clientId);
        return [
          fmt(s.date),
          client ? `${client.lastName} ${client.firstName}` : '—',
          SESSION_TYPE_LABELS[s.type],
          `${s.duration}λ.`,
          fmtMoney(s.fee),
          s.paid ? 'Εξοφλημένη' : 'Εκκρεμής',
        ];
      }),
      headStyles: { fillColor: [42, 90, 60], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7.5 },
      alternateRowStyles: { fillColor: [245, 248, 246] },
      columnStyles: { 4: { halign: 'right' }, 5: { halign: 'center' } },
    });

    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  // Expenses table
  if (monthExpenses.length > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('ΔΑΠΑΝΕΣ', margin, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Ημερομηνία', 'Κατηγορία', 'Περιγραφή', 'Ποσό']],
      body: monthExpenses.map(e => [
        fmt(e.date),
        EXPENSE_CATEGORY_LABELS[e.category],
        e.description,
        fmtMoney(e.amount),
      ]),
      headStyles: { fillColor: [180, 60, 60], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7.5 },
      alternateRowStyles: { fillColor: [255, 248, 248] },
      columnStyles: { 3: { halign: 'right' } },
    });

    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  // Financial summary
  autoTable(doc, {
    startY: y,
    margin: { left: margin + 60, right: margin },
    body: [
      ['Σύνολο Εσόδων', fmtMoney(totalRevenue)],
      ['  Εξοφλημένα', fmtMoney(totalPaid)],
      ['  Ανεξόφλητα', fmtMoney(totalUnpaid)],
      ['Σύνολο Δαπανών', fmtMoney(totalExpenses)],
      ['ΚΑΘΑΡΟ ΚΕΡΔΟΣ', fmtMoney(netProfit)],
    ],
    bodyStyles: { fontSize: 8 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    didParseCell: (data) => {
      if (data.row.index === 4) {
        data.cell.styles.fillColor = netProfit >= 0 ? [235, 248, 240] : [255, 235, 235];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(`TherapyDesk — Αναφορά ${monthName} — ${new Date().toLocaleDateString('el-GR')}`, pageW / 2, footerY, { align: 'center' });

  doc.save(`Αναφορά-${year}-${String(month + 1).padStart(2, '0')}.pdf`);
}
