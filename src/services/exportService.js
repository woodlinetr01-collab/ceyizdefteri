// ============================================================================
// EXPORT SERVICE — CSV/JSON gerçekten bağımlılıksız çalışır (ücretsiz plan).
// Excel (.xlsx) ve PDF, "xlsx" ve "jspdf" paketleriyle GERÇEKTEN üretilir
// (Premium — madde 32, 45).
// ============================================================================

import { exportBackupJson } from "./storage.js";
import { fmtDate, fmtTL } from "../lib/formatUtils.js";
import { CATEGORY_MAP } from "../lib/constants.js";

function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function toCsvRow(cells) {
  return cells.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",");
}

export function exportTransactionsCsv(calc) {
  const rows = [toCsvRow(["Tarih", "Açıklama", "Tip", "Grup", "Kategori", "Tutar", "Ödenen", "Kalan", "Durum", "Yöntem", "Kart"])];
  calc.lines.forEach((l) => {
    rows.push(toCsvRow([fmtDate(l.dueDate), l.tx.desc, "Gider", l.tx.group || "", CATEGORY_MAP[l.tx.category]?.label || "", l.amount, l.paid, l.remaining, l.status, l.tx.paymentMethod || "", l.tx.cardId || ""]));
  });
  calc.incomeTx.forEach((t) => {
    rows.push(toCsvRow([fmtDate(t.date), t.desc, "Gelir", "", "", t.totalAmount, t.incomeStatus === "Alındı" ? t.totalAmount : 0, t.incomeStatus === "Alındı" ? 0 : t.totalAmount, t.incomeStatus, "", ""]));
  });
  downloadBlob("\uFEFF" + rows.join("\r\n"), `ceyiz-defteri-islemler-${Date.now()}.csv`, "text/csv;charset=utf-8");
}

export function exportBackupJsonFile(state) {
  downloadBlob(exportBackupJson(state), `ceyiz-defteri-yedek-${Date.now()}.json`, "application/json");
}

/** Excel — çok sayfalı, gerçek .xlsx. "xlsx" (SheetJS) paketi gerektirir. */
export async function exportExcel(state, calc) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const txSheet = XLSX.utils.json_to_sheet(
    calc.lines.map((l) => ({
      Tarih: l.dueDate, Açıklama: l.tx.desc, Grup: l.tx.group || "", Kategori: CATEGORY_MAP[l.tx.category]?.label || "",
      Tutar: l.amount, Ödenen: l.paid, Kalan: l.remaining, Durum: l.status, Yöntem: l.tx.paymentMethod || "",
    }))
  );
  XLSX.utils.book_append_sheet(wb, txSheet, "Giderler");

  const incomeSheet = XLSX.utils.json_to_sheet(
    calc.incomeTx.map((t) => ({ Tarih: t.date, Açıklama: t.desc, Kaynak: t.source, Tutar: t.totalAmount, Durum: t.incomeStatus }))
  );
  XLSX.utils.book_append_sheet(wb, incomeSheet, "Gelirler");

  const cardsSheet = XLSX.utils.json_to_sheet(
    calc.cardsComputed.map((c) => ({ Kart: c.name, Banka: c.bank, Limit: c.limit, "Kullanılan": c.usedLimit, "Bu Ekstre": c.thisMonth, "Toplam Borç": c.totalDebt }))
  );
  XLSX.utils.book_append_sheet(wb, cardsSheet, "Kredi Kartları");

  const debtsSheet = XLSX.utils.json_to_sheet(
    calc.debtsEnriched.map((d) => ({ Yön: d.direction === "borc" ? "Benim Ödeyeceğim" : "Benden Alınacak", Kişi: d.person, Tutar: d.amount, Ödenen: d.paid, Kalan: d.remaining, Durum: d.status }))
  );
  XLSX.utils.book_append_sheet(wb, debtsSheet, "Borç-Alacak");

  XLSX.writeFile(wb, `ceyiz-defteri-rapor-${Date.now()}.xlsx`);
}

/** PDF — gerçek, biçimlendirilmiş rapor. "jspdf" + "jspdf-autotable" gerektirir. */
export async function exportPdfReport(state, calc) {
  const { jsPDF } = await import("jspdf");
  const autoTableModule = await import("jspdf-autotable");
  const autoTable = autoTableModule.default || autoTableModule;

  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Çeyiz Defteri — Finansal Özet Raporu", 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Oluşturulma: ${fmtDate(calc.today)}`, 14, 24);

  doc.setTextColor(20);
  doc.setFontSize(11);
  const summaryRows = [
    ["Toplam Gider", fmtTL(calc.totalExpense)],
    ["Ödenen", fmtTL(calc.totalPaid)],
    ["Ödenecek", fmtTL(calc.totalUnpaid)],
    ["Toplam Borç", fmtTL(calc.totalDebtOverall)],
    ["Toplam Alacak", fmtTL(calc.receivable)],
    ["Kredi Kartı Borcu", fmtTL(calc.creditCardDebtTotal)],
    ["Önümüzdeki 12 Ay Yükü", fmtTL(calc.next12MonthsTotal)],
  ];
  autoTable(doc, { startY: 30, head: [["Özet", "Tutar"]], body: summaryRows, theme: "grid", headStyles: { fillColor: [21, 34, 56] } });

  const afterSummaryY = doc.lastAutoTable.finalY + 10;
  autoTable(doc, {
    startY: afterSummaryY,
    head: [["Tarih", "Açıklama", "Kategori", "Tutar", "Durum"]],
    body: calc.lines.slice(0, 60).map((l) => [fmtDate(l.dueDate), l.tx.desc, CATEGORY_MAP[l.tx.category]?.label || "", fmtTL(l.amount), l.status]),
    theme: "striped", headStyles: { fillColor: [182, 134, 47] }, styles: { fontSize: 8 },
  });

  doc.save(`ceyiz-defteri-rapor-${Date.now()}.pdf`);
}
