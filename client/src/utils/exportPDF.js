import { jsPDF } from 'jspdf';
import api from './api';

function formatDate(d) {
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export async function exportSavingsPDF() {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 20;

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Jairex - Savings Report', W / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text(`Generated: ${formatDate(new Date())}`, W / 2, y, { align: 'center' });
  y += 10;

  doc.setTextColor(0, 0, 0);

  let data;
  try {
    const res = await api.get('/savings');
    data = res.data;
  } catch {
    doc.setFontSize(12);
    doc.text('Could not load savings data.', margin, y);
    doc.save('jairex-report.pdf');
    return;
  }

  const goals = data.goals || [];
  const streak = data.streak || 0;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Overview', margin, y);
  y += 7;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Active Goals: ${goals.length}`, margin, y); y += 6;
  doc.text(`Current Streak: ${streak} days`, margin, y); y += 10;

  const fmt = (n) => `$${(Number(n) || 0).toFixed(2)}`;

  if (goals.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Goals', margin, y);
    y += 8;

    for (const goal of goals) {
      if (y > 260) { doc.addPage(); y = 20; }
      const total = goal.transactions.reduce((s, t) => s + t.amount, 0);
      const pct = goal.targetAmount > 0 ? Math.min(100, Math.round((total / goal.targetAmount) * 100)) : 0;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(goal.goalName || 'Untitled Goal', margin, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Target: ${fmt(goal.targetAmount)} | Saved: ${fmt(total)} (${pct}%)`, margin + 2, y);
      y += 5;

      if (goal.createdAt) {
        doc.text(`Created: ${formatDate(goal.createdAt)}`, margin + 2, y);
        y += 5;
      }

      if (goal.transactions.length > 0) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Date', margin + 4, y);
        doc.text('Amount', margin + 50, y);
        doc.text('Note', margin + 80, y);
        doc.text('Category', margin + 130, y);
        y += 5;

        doc.setFont('helvetica', 'normal');
        for (const tx of goal.transactions.slice(0, 20)) {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.text(formatDate(tx.date), margin + 4, y);
          doc.text(fmt(tx.amount), margin + 50, y);
          doc.text((tx.note || '-').substring(0, 30), margin + 80, y);
          doc.text(tx.category || 'savings', margin + 130, y);
          y += 4.5;
        }
        if (goal.transactions.length > 20) {
          doc.text(`... and ${goal.transactions.length - 20} more`, margin + 4, y);
          y += 5;
        }
      }
      y += 4;
    }
  }

  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Jairex - Couples Savings App', W / 2, footerY, { align: 'center' });

  doc.save('jairex-report.pdf');
}
