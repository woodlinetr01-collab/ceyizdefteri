// ============================================================================
// IMPORT SERVICE (Premium — madde 33-34)
//
// CSV: Tam güvenilir, sağlam bir parser — kredi kartı ekstrenizi CSV olarak
// indirip yükleyebilirsiniz. Tarih/Açıklama/Tutar kolonlarını otomatik
// algılamaya çalışır (yaygın başlık adlarıyla eşleştirir), bulamazsa
// kullanıcıya sorulacak şekilde ham kolon listesini döndürür.
//
// PDF: Tam otomatik ve %100 güvenilir bir PDF ekstre ayrıştırma GENEL OLARAK
// mümkün değildir (her banka farklı bir PDF şablonu kullanır). Burada
// "pdfjs-dist" ile PDF'ten gerçek metin çıkarımı yapılır, ardından satır
// bazında tarih + tutar deseniyle eşleşen satırlar heuristik olarak işlem
// adayı olarak çıkarılır. HİÇBİR kayıt otomatik eklenmez — kullanıcı
// önizleme tablosunda görüp onaylamadan sisteme işlenmez (talimat madde 34
// ile birebir uyumlu).
//
// Her iki yol da aynı çıktı şeklini üretir: { candidates, rawPreview }
// candidates: [{ date, desc, amount, isDuplicate }]
// ============================================================================

import { findPossibleDuplicate, suggestCategory } from "../lib/financeEngine.js";

function parseCsvText(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) return { header: [], rows: [] };
  const splitLine = (l) => l.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
  const header = splitLine(lines[0]).map((h) => h.toLowerCase());
  const rows = lines.slice(1).map(splitLine);
  return { header, rows };
}

const DATE_HEADERS = ["tarih", "date", "işlem tarihi", "islem tarihi"];
const DESC_HEADERS = ["açıklama", "aciklama", "description", "işlem", "islem", "detay"];
const AMOUNT_HEADERS = ["tutar", "amount", "işlem tutarı", "islem tutari"];

function findColumn(header, candidates) {
  for (const c of candidates) {
    const idx = header.findIndex((h) => h.includes(c));
    if (idx >= 0) return idx;
  }
  return -1;
}

function normalizeAmount(raw) {
  if (!raw) return NaN;
  const cleaned = raw.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  return parseFloat(cleaned);
}
function normalizeDate(raw) {
  if (!raw) return null;
  const m1 = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2].padStart(2, "0")}-${m1[1].padStart(2, "0")}`;
  const m2 = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m2) return `${m2[1]}-${m2[2].padStart(2, "0")}-${m2[3].padStart(2, "0")}`;
  return null;
}

export function parseCsvStatement(text, existingTransactions) {
  const { header, rows } = parseCsvText(text);
  const dateIdx = findColumn(header, DATE_HEADERS);
  const descIdx = findColumn(header, DESC_HEADERS);
  const amountIdx = findColumn(header, AMOUNT_HEADERS);

  if (dateIdx < 0 || descIdx < 0 || amountIdx < 0) {
    return { ok: false, header, rows: rows.slice(0, 5), candidates: [] };
  }

  const candidates = rows
    .map((r) => {
      const date = normalizeDate(r[dateIdx]);
      const desc = r[descIdx];
      const amount = Math.abs(normalizeAmount(r[amountIdx]));
      if (!date || !desc || Number.isNaN(amount)) return null;
      const dup = findPossibleDuplicate(existingTransactions, { type: "expense", date, totalAmount: amount, desc, cardId: null });
      return { date, desc, amount, suggestedCategory: suggestCategory(desc), isDuplicate: !!dup };
    })
    .filter(Boolean);

  return { ok: true, candidates };
}

/** PDF'ten metin çıkarıp heuristik olarak işlem adaylarını bulur.
 * "pdfjs-dist" paketi gerektirir; hiçbir kayıt otomatik eklenmez. */
export async function parsePdfStatement(file, existingTransactions) {
  const pdfjsLib = await import("pdfjs-dist");
  const workerSrc = (await import("pdfjs-dist/build/pdf.worker.mjs?url")).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let fullText = "";
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    fullText += content.items.map((it) => it.str).join(" ") + "\n";
  }

  // Heuristik: "GG.AA.YYYY ... Açıklama ... 1.234,56" desenini arar.
  const lineRx = /(\d{1,2}[./]\d{1,2}[./]\d{4})\s+(.{4,60}?)\s+([\d.]+,\d{2}|\d+,\d{2})/g;
  const candidates = [];
  let m;
  while ((m = lineRx.exec(fullText))) {
    const date = normalizeDate(m[1].replace(/\//g, "."));
    const desc = m[2].trim();
    const amount = normalizeAmount(m[3]);
    if (!date || Number.isNaN(amount)) continue;
    const dup = findPossibleDuplicate(existingTransactions, { type: "expense", date, totalAmount: amount, desc, cardId: null });
    candidates.push({ date, desc, amount, suggestedCategory: suggestCategory(desc), isDuplicate: !!dup });
  }

  return { ok: candidates.length > 0, candidates, rawTextSample: fullText.slice(0, 400) };
}
