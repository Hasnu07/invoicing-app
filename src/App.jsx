import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  FileText, Truck, FileCheck2, Receipt, FilePlus2, RefreshCw, Building2, Users, Package,
  Settings as SettingsIcon, LayoutDashboard, Plus, Trash2, Copy, Printer, Download, Eye,
  Search, X, ChevronUp, ChevronDown, Check, Image as ImageIcon, Upload, Palette, Save,
  ArrowLeft, CreditCard, Calendar, AlertTriangle, Pencil, Banknote, Hash, Mail, Phone,
  Globe, MapPin, ChevronRight, Filter, FileDown, MoreHorizontal, CircleDot,
  Inbox, Paperclip, ExternalLink
} from 'lucide-react';

/* ============================================================================
   INVOICES — Multi-company document generator
   Invoices · Delivery notes · Pro-forma · Credit notes · Quotes · Receipts
   Customizable themes · Live preview · Print/PDF · HTML
   Single-file React app. Persistence: window.storage. No backend.
   ============================================================================ */

const STORE_KEY = 'fg_store_v7';
const BACKUP_VERSION = 2;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_UPLOAD_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// ---------------------------------------------------------------- Doc types ---
const DOC_TYPES = {
  fattura:      { label: 'Invoice',          short: 'INV',  icon: FileText,   money: true,  goods: false },
  proforma:     { label: 'Pro-forma invoice', short: 'PRO',  icon: FileCheck2, money: true,  goods: false },
  ddt:          { label: 'Delivery note',              short: 'DN', icon: Truck,      money: false, goods: true  },
  nota_credito: { label: 'Credit note',  short: 'CN',  icon: RefreshCw,  money: true,  goods: false },
  preventivo:   { label: 'Quote',       short: 'QT',  icon: FilePlus2,  money: true,  goods: false },
  ricevuta:     { label: 'Receipt',         short: 'REC',  icon: Receipt,    money: true,  goods: false },
  acquisto:     { label: 'Purchase invoice', short: 'PI',   icon: Banknote,   money: true,  goods: false },
};
const DOC_ORDER = ['fattura', 'proforma', 'ddt', 'nota_credito', 'preventivo', 'ricevuta', 'acquisto'];

// ------------------------------------------------------------------- Statuses ---
const STATUSES = {
  bozza:     { label: 'Draft',     color: '#8a93a0' },
  emessa:    { label: 'Issued',    color: '#4a7fd8' },
  inviata:   { label: 'Sent',   color: '#9a6cd8' },
  pagata:    { label: 'Paid',    color: '#3fa46a' },
  scaduta:   { label: 'Overdue',   color: '#d8a24a' },
  annullata: { label: 'Cancelled', color: '#d36a6a' },
};
const STATUS_ORDER = ['bozza', 'emessa', 'inviata', 'pagata', 'scaduta', 'annullata'];

// ------------------------------------------------------------------ Presets ---
const IVA_PRESETS = [22, 10, 5, 4, 0];
const UM_PRESETS = ['pcs', 'no.', 'h', 'days', 'kg', 'g', 'm', 'm²', 'l', 'ea', 'lump sum'];
const PAYMENT_METHODS = ['Bank transfer', 'SEPA transfer', 'Cash', 'Cheque', 'Credit card', 'PayPal', 'RiBa', 'Direct payment'];
const DDT_CAUSALI = ['Sale', 'Sale or return', 'On approval', 'Return', 'Repair', 'Gift', 'Transfer', 'Processing', 'Loan for use'];
const DDT_ASPETTO = ['Box', 'Packages', 'Parcel', 'Envelope', 'Pallet', 'Unpacked', 'Bulk'];
const PORTO = ['Prepaid', 'Collect', 'Free destination'];
const FORME_GIURIDICHE = ['Ltd', 'Ltd (simplified)', 'Single-member Ltd', 'PLC', 'Limited partnership', 'General partnership', 'Sole proprietorship', 'Self-employed', 'Simple partnership'];
const REGIMI = ['Standard', 'Flat-rate', 'Margin scheme', 'Minimum scheme', 'Agricultural'];
const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'AED', 'HKD'];

// ------------------------------------------------------------- Themes --
const TEMPLATES = {
  classico: { label: 'Classic' },
  moderno:  { label: 'Modern' },
  minimale: { label: 'Minimal' },
  elegante: { label: 'Elegant' },
  custom:   { label: 'Custom' },
};
const TEMPLATE_ORDER = ['classico', 'moderno', 'minimale', 'elegante', 'custom'];

const FONTS = {
  humanist: { label: 'Humanist', head: "'Public Sans', system-ui, sans-serif",   body: "'Public Sans', system-ui, sans-serif" },
  grotesk:  { label: 'Grotesk',  head: "'Hanken Grotesk', system-ui, sans-serif", body: "'Hanken Grotesk', system-ui, sans-serif" },
  serif:    { label: 'Serif',    head: "'Fraunces', Georgia, serif",              body: "'Public Sans', system-ui, sans-serif" },
  mono:     { label: 'Mono',     head: "'IBM Plex Mono', monospace",              body: "'IBM Plex Mono', monospace" },
};

const ACCENT_SWATCHES = ['#1f6feb', '#0f766e', '#b45309', '#7c3aed', '#be123c', '#0e7490', '#1f2937', '#c9a44c', '#15803d', '#9d174d'];

const DEFAULT_THEME = {
  template: 'classico',
  accent: '#1f6feb',
  ink: '#14181f',
  font: 'humanist',
  logoPosition: 'left',
  showLogo: true,
  showPaymentBox: true,
  showNotes: true,
  showSignature: false,
  showStamp: false,
  stampTemplate: '',
  stampImage: '',
  stampPosition: 'bottom-right',
  stampOpacity: 0.85,
  stampPosX: null,
  stampPosY: null,
  accentStyle: 'band', // band | line | soft
  customHTML: '',       // user-provided HTML for the 'custom' template (token-filled)
  customHTMLBuy: '',    // brand-styled acquisition-note (purchase invoice) template
};

const GOOGLE_FONTS = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Hanken+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Public+Sans:wght@400;500;600;700&display=swap";

const STAMP_PRESETS = [
  { id: 'paid', label: 'Paid', color: '#16a34a', shape: 'circle', text: 'PAID', rot: -20 },
  { id: 'approved', label: 'Approved', color: '#1d4ed8', shape: 'circle', text: 'APPROVED', rot: -15 },
  { id: 'draft', label: 'Draft', color: '#dc2626', shape: 'rect', text: 'DRAFT', rot: -12 },
  { id: 'copy', label: 'Copy', color: '#6b7280', shape: 'circle', text: 'COPY', rot: -20 },
  { id: 'void', label: 'Void', color: '#dc2626', shape: 'rect', text: 'VOID', rot: -10 },
  { id: 'original', label: 'Original', color: '#1e3a5f', shape: 'rect', text: 'ORIGINAL', rot: -8 },
];

function buildStampSVG({ color, shape, text, rot }) {
  if (shape === 'circle') {
    const compact = text.length > 5;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><g transform="rotate(${rot} 100 100)"><circle cx="100" cy="100" r="88" fill="none" stroke="${color}" stroke-width="7"/><circle cx="100" cy="100" r="76" fill="none" stroke="${color}" stroke-width="2.5"/><text x="100" y="${compact ? 108 : 116}" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-size="${compact ? 24 : 44}" font-weight="900" fill="${color}" letter-spacing="3">${text}</text></g></svg>`;
  }
  const w = text.length > 5 ? 300 : 240;
  const fs = text.length > 5 ? 44 : 56;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} 120"><g transform="rotate(${rot} ${w / 2} 60)"><rect x="8" y="8" width="${w - 16}" height="104" rx="8" fill="none" stroke="${color}" stroke-width="6"/><rect x="16" y="16" width="${w - 32}" height="88" rx="5" fill="none" stroke="${color}" stroke-width="2"/><text x="${w / 2}" y="80" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-size="${fs}" font-weight="900" fill="${color}" letter-spacing="4">${text}</text></g></svg>`;
}

function stampPresetToDataUrl(preset) {
  return 'data:image/svg+xml,' + encodeURIComponent(buildStampSVG(preset));
}

function resolveStampImageSrc(theme) {
  if (theme.stampImage) return safeImageSrc(theme.stampImage) || '';
  if (theme.stampTemplate) {
    const preset = STAMP_PRESETS.find((p) => p.id === theme.stampTemplate);
    if (preset) return stampPresetToDataUrl(preset);
  }
  return '';
}

const STAMP_THEME_KEYS = ['showStamp', 'stampTemplate', 'stampImage', 'stampPosition', 'stampOpacity', 'stampPosX', 'stampPosY'];

function pickStampTheme(theme) {
  const o = {};
  for (const k of STAMP_THEME_KEYS) {
    if (!theme || theme[k] === undefined || theme[k] === null) continue;
    if (k === 'showStamp' || theme[k] !== '') o[k] = theme[k];
  }
  return o;
}

function stampPresetXY(position) {
  if (position === 'bottom-left') return { x: 16, y: 88 };
  if (position === 'center') return { x: 50, y: 50 };
  return { x: 84, y: 88 };
}

function getStampXY(theme) {
  if (theme.stampPosX != null && theme.stampPosY != null) {
    return { x: clamp(num(theme.stampPosX), 0, 100), y: clamp(num(theme.stampPosY), 0, 100) };
  }
  return stampPresetXY(theme.stampPosition || 'bottom-right');
}

function stampPositionStyle(theme) {
  if (theme.stampPosition === 'custom' || (theme.stampPosX != null && theme.stampPosY != null)) {
    const { x, y } = getStampXY(theme);
    return `left:${x}%;top:${y}%;transform:translate(-50%,-50%);`;
  }
  const pos = theme.stampPosition || 'bottom-right';
  if (pos === 'bottom-left') return 'bottom:22mm;left:16mm;';
  if (pos === 'center') return 'top:50%;left:50%;transform:translate(-50%,-50%);';
  return 'bottom:22mm;right:16mm;';
}

function buildStampOverlayHTML(theme) {
  if (!theme.showStamp) return '';
  const src = resolveStampImageSrc(theme);
  if (!src) return '';
  const posStyle = stampPositionStyle(theme);
  const opacity = theme.stampOpacity != null ? theme.stampOpacity : 0.85;
  return `<div class="stamp-overlay-block" style="position:absolute;${posStyle}z-index:10;pointer-events:none;width:55mm;print-color-adjust:exact;-webkit-print-color-adjust:exact;"><img src="${src.replace(/"/g, '')}" alt="" style="width:100%;height:auto;opacity:${opacity};mix-blend-mode:multiply;display:block;"/></div>`;
}

// ----------------------------------------------------------------- Helpers ---
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const num = (v) => { const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/,/g, '')); return isFinite(n) ? n : 0; };
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (iso, days) => { const d = new Date((iso || todayISO()) + 'T00:00:00'); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
const yearOf = (iso) => parseInt((iso || todayISO()).slice(0, 4), 10);

function money(n, cur = 'EUR') {
  try { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: cur }).format(num(n)); }
  catch { return new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num(n)) + ' ' + cur; }
}
function qtyFmt(n) { return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 3 }).format(num(n)); }
function pctFmt(n) { return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(num(n)) + '%'; }
function dateFmt(iso) { if (!iso) return ''; const p = iso.split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso; }

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nl2br = (s) => esc(s).replace(/\n/g, '<br/>');

// --------------------------------------------- Custom-template token engine ---
// Tiny mustache-like renderer. Supports:
//   {{key}}            escaped value
//   {{{key}}}          raw value (HTML blocks, e.g. {{{items_table}}})
//   {{#key}}...{{/key}} section: repeats for arrays, shows once if truthy
//   {{^key}}...{{/key}} inverted section: shows when empty/falsy
// Dotted keys are supported (e.g. {{company.name}}).
const getPath = (o, path) => path.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
function renderTemplate(tpl, ctx) {
  let out = String(tpl == null ? '' : tpl);
  out = out.replace(/\{\{#([\w.]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (m, key, inner) => {
    const v = getPath(ctx, key);
    if (Array.isArray(v)) return v.map((it) => renderTemplate(inner, (it && typeof it === 'object') ? { ...ctx, ...it } : ctx)).join('');
    return v ? renderTemplate(inner, ctx) : '';
  });
  out = out.replace(/\{\{\^([\w.]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (m, key, inner) => {
    const v = getPath(ctx, key);
    const empty = Array.isArray(v) ? v.length === 0 : !v;
    return empty ? renderTemplate(inner, ctx) : '';
  });
  out = out.replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (m, key) => { const v = getPath(ctx, key); return v == null ? '' : String(v); });
  out = out.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, key) => { const v = getPath(ctx, key); return v == null ? '' : esc(String(v)); });
  return out;
}

// Editable starter shown when 'Custom' is selected but no HTML has been provided yet.
const CUSTOM_STARTER = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  :root { --accent: {{theme.accent}}; --ink: {{theme.ink}}; }
  body { margin: 0; font-family: 'Public Sans', system-ui, sans-serif; color: var(--ink); font-size: 12.5px; line-height: 1.5; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; padding: 18mm 16mm 14mm; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
  .brand { font-size: 20px; font-weight: 800; }
  .brand img { max-height: 60px; max-width: 220px; object-fit: contain; }
  .muted { color: #6b7280; font-weight: 400; font-size: 11.5px; }
  .doc-title { text-align: right; }
  .doc-title h1 { margin: 0; font-size: 26px; color: var(--accent); letter-spacing: .03em; }
  .meta { margin-top: 6px; font-size: 11.5px; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 12mm; }
  .lbl { font-size: 9.5px; text-transform: uppercase; letter-spacing: .12em; color: var(--accent); font-weight: 700; margin-bottom: 4px; }
  .pname { font-size: 15px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin-top: 10mm; }
  th { text-align: left; font-size: 9.5px; text-transform: uppercase; letter-spacing: .06em; color: #475569; padding: 8px; border-bottom: 2px solid var(--accent); }
  td { padding: 9px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
  .r { text-align: right; } .c { text-align: center; }
  .totals { display: flex; justify-content: flex-end; margin-top: 7mm; }
  .tbox { width: 80mm; }
  .trow { display: flex; justify-content: space-between; padding: 5px 0; }
  .trow.grand { border-top: 2px solid var(--accent); margin-top: 6px; padding-top: 9px; font-weight: 800; font-size: 15px; color: var(--accent); }
  .foot { margin-top: 10mm; display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; font-size: 11.5px; }
  .boxtitle { font-size: 9.5px; text-transform: uppercase; letter-spacing: .1em; color: var(--accent); font-weight: 700; margin-bottom: 5px; }
  .ftext { margin-top: 12mm; text-align: center; font-size: 9.5px; color: #9aa1ab; }
</style>
</head>
<body>
  <div class="page">
    <div class="top">
      <div class="brand">{{#has_logo}}<img src="{{company.logo}}" alt=""/>{{/has_logo}}{{^has_logo}}{{company.name}}{{/has_logo}}<div class="muted">{{company.city}} · VAT {{company.vat}}</div></div>
      <div class="doc-title"><h1>{{type_label}}</h1><div class="meta">{{number}} · {{date}}{{#has_due}}<br/>Due: {{due_date}}{{/has_due}}{{#has_valid_until}}<br/>Valid until: {{valid_until}}{{/has_valid_until}}</div></div>
    </div>
    <div class="parties">
      <div><div class="lbl">From</div><div class="pname">{{company.name}}</div><div class="muted">{{company.address}}<br/>{{company.cap}} {{company.city}} {{company.prov}}<br/>{{company.country}}</div></div>
      <div><div class="lbl">Bill to</div><div class="pname">{{client.name}}</div><div class="muted">{{client.address}}<br/>{{client.cap}} {{client.city}} {{client.prov}}<br/>{{client.country}}</div>{{#client.vat}}<div class="muted">VAT {{client.vat}}</div>{{/client.vat}}</div>
    </div>
    <table>
      <thead><tr><th>#</th><th>Description</th><th class="r">Qty</th><th class="c">Unit</th><th class="r">Price</th><th class="c">VAT</th><th class="r">Amount</th></tr></thead>
      <tbody>{{#items}}
        <tr><td>{{n}}</td><td>{{desc}}{{#note}}<br/><span class="muted">{{note}}</span>{{/note}}</td><td class="r">{{qty}}</td><td class="c">{{unit}}</td><td class="r">{{price}}</td><td class="c">{{vat}}</td><td class="r">{{amount}}</td></tr>{{/items}}
      </tbody>
    </table>
    <div class="totals"><div class="tbox">
      <div class="trow"><span>Taxable</span><span>{{totals.taxable}}</span></div>
      <div class="trow"><span>VAT</span><span>{{totals.vat}}</span></div>
      {{#has_stamp}}<div class="trow"><span>Stamp duty</span><span>{{totals.stamp}}</span></div>{{/has_stamp}}
      <div class="trow grand"><span>Total</span><span>{{totals.total}}</span></div>
      {{#has_withholding}}<div class="trow"><span>Withholding</span><span>− {{totals.withholding}}</span></div><div class="trow grand"><span>Net payable</span><span>{{totals.net}}</span></div>{{/has_withholding}}
    </div></div>
    <div class="foot">
      {{#has_payment}}<div><div class="boxtitle">Payment</div>{{payment.method}}{{#payment.iban}}<br/>IBAN {{payment.iban}}{{/payment.iban}}{{#payment.terms}}<br/>{{payment.terms}}{{/payment.terms}}</div>{{/has_payment}}
      {{#has_notes}}<div><div class="boxtitle">Notes</div>{{notes}}</div>{{/has_notes}}
    </div>
    {{#has_tax_notes}}<div class="ftext">{{tax_notes}}</div>{{/has_tax_notes}}
  </div>
</body>
</html>`;

function downloadBlob(filename, content, mime = 'text/html;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 250);
}

function printHTML(html) {
  const iframe = document.createElement('iframe');
  Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0', visibility: 'hidden' });
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);
  iframe.srcdoc = html;
  iframe.onload = () => {
    setTimeout(() => {
      try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch (e) { /* noop */ }
      setTimeout(() => { try { document.body.removeChild(iframe); } catch (e) { /* noop */ } }, 1800);
    }, 500);
  };
}

async function fileToScaledDataURL(file, max = 440) {
  const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl; });
  let w = img.width, h = img.height;
  if (w > max || h > max) { const r = Math.min(max / w, max / h); w = Math.round(w * r); h = Math.round(h * r); }
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/png');
}

// ----------------------------------------------------- Numbering / themes ---
const effectiveTheme = (company, doc) => ({ ...DEFAULT_THEME, ...(company?.theme || {}), ...(doc?.themeOverride || {}) });
const formatDocNumber = (type, seq, year) => `${DOC_TYPES[type]?.short || ''} ${seq}/${year}`.trim();
function nextSeq(documents, companyId, type, year) {
  return (documents || [])
    .filter((d) => d.companyId === companyId && d.type === type && d.year === year)
    .reduce((m, d) => Math.max(m, parseInt(d.seq) || 0), 0) + 1;
}

// ------------------------------------------------------- Calculation engine ---
function lineImponibile(line) {
  const gross = num(line.qty) * num(line.price);
  return gross * (1 - num(line.discount) / 100);
}

function computeTotals(doc) {
  const lines = doc.lines || [];
  const byRate = {};
  let imponibileLines = 0;
  let hasDiscount = false;
  for (const l of lines) {
    const imp = lineImponibile(l);
    imponibileLines += imp;
    if (num(l.discount) > 0) hasDiscount = true;
    const rate = num(l.iva);
    byRate[rate] = (byRate[rate] || 0) + imp;
  }
  // Pension fund: added to the taxable base and subject to VAT (rate cassa.iva)
  let cassaAmount = 0;
  if (doc.cassa && doc.cassa.enabled) {
    cassaAmount = imponibileLines * num(doc.cassa.rate) / 100;
    const cr = num(doc.cassa.iva);
    byRate[cr] = (byRate[cr] || 0) + cassaAmount;
  }
  const rates = Object.keys(byRate).map(Number).sort((a, b) => b - a);
  const ivaBreakdown = rates.map((r) => ({ rate: r, imponibile: byRate[r], iva: byRate[r] * r / 100 }));
  const totImponibile = ivaBreakdown.reduce((s, x) => s + x.imponibile, 0);
  const totIva = ivaBreakdown.reduce((s, x) => s + x.iva, 0);
  const bollo = (doc.bollo && doc.bollo.enabled) ? num(doc.bollo.amount) : 0;
  let ritenuta = 0;
  if (doc.ritenuta && doc.ritenuta.enabled) {
    const base = doc.ritenuta.base === 'imponibile_cassa' ? (imponibileLines + cassaAmount) : imponibileLines;
    ritenuta = base * num(doc.ritenuta.rate) / 100;
  }
  const totaleDocumento = totImponibile + totIva + bollo;
  const nettoAPagare = totaleDocumento - ritenuta;
  return { imponibileLines, cassaAmount, ivaBreakdown, totImponibile, totIva, bollo, ritenuta, totaleDocumento, nettoAPagare, hasDiscount };
}

// ============================================================================
//  DOCUMENT HTML BUILDER (single source for preview + print + PDF)
// ============================================================================
function partyTax(p) {
  if (!p) return '';
  const rows = [];
  if (p.piva) rows.push(`VAT ${esc(p.piva)}`);
  if (p.cf && p.cf !== p.piva) rows.push(`Tax Code ${esc(p.cf)}`);
  return rows.join(' · ');
}
function partyAddress(p) {
  if (!p) return '';
  const a = [];
  if (p.address) a.push(esc(p.address));
  const cityLine = [p.cap, p.city, p.prov ? `(${p.prov})` : ''].filter(Boolean).join(' ');
  if (cityLine) a.push(esc(cityLine));
  if (p.country && p.country.toLowerCase() !== 'italy') a.push(esc(p.country));
  return a.join('<br/>');
}
function companyName(c) {
  if (!c) return '';
  const fg = c.forma && c.forma !== 'Sole proprietorship' && c.forma !== 'Self-employed' ? ` ${c.forma}` : '';
  return esc((c.name || '') + (fg ? '' : '')) + (fg ? `<span class="fg">${esc(c.forma)}</span>` : '');
}

function buildDocumentHTML(doc, company, client, settings, opts = {}) {
  const omitStamp = !!opts.omitStamp;
  const t = effectiveTheme(company, doc);
  const meta = DOC_TYPES[doc.type] || DOC_TYPES.fattura;
  const cur = doc.currency || (settings && settings.currency) || 'EUR';
  const font = FONTS[t.font] || FONTS.humanist;
  const accent = t.accent || '#1f6feb';
  const ink = t.ink || '#14181f';
  const totals = meta.money ? computeTotals(doc) : null;
  const showValues = meta.money || doc.showValues;
  const isGoods = meta.goods;

  // ---- Items ----
  const lines = doc.lines || [];
  const hasDiscount = totals ? totals.hasDiscount : lines.some((l) => num(l.discount) > 0);
  const colCount = 2 + (showValues ? (hasDiscount ? 5 : 4) : 1); // # desc qta um [prezzo sconto iva importo]
  const head = [];
  head.push('<th class="c idx">#</th>');
  head.push('<th>Description</th>');
  head.push('<th class="r">Qty</th>');
  head.push('<th class="c">Unit</th>');
  if (showValues) {
    head.push('<th class="r">Price</th>');
    if (hasDiscount) head.push('<th class="r">Disc.%</th>');
    head.push('<th class="c">VAT</th>');
    head.push('<th class="r">Amount</th>');
  }
  const body = lines.map((l, i) => {
    const cells = [];
    cells.push(`<td class="c idx">${i + 1}</td>`);
    cells.push(`<td><span class="dsc">${nl2br(l.desc || '')}</span>${l.note ? `<span class="dscnote">${nl2br(l.note)}</span>` : ''}</td>`);
    cells.push(`<td class="r tnum">${qtyFmt(l.qty)}</td>`);
    cells.push(`<td class="c">${esc(l.um || '')}</td>`);
    if (showValues) {
      cells.push(`<td class="r tnum">${money(l.price, cur)}</td>`);
      if (hasDiscount) cells.push(`<td class="r tnum">${num(l.discount) ? pctFmt(l.discount) : '—'}</td>`);
      cells.push(`<td class="c tnum">${num(l.iva)}%</td>`);
      cells.push(`<td class="r tnum">${money(lineImponibile(l), cur)}</td>`);
    }
    return `<tr>${cells.join('')}</tr>`;
  }).join('');
  const emptyRows = lines.length === 0 ? `<tr><td class="empty" colspan="${colCount}">No items added</td></tr>` : '';

  // ---- Totals ----
  let totalsHTML = '';
  if (totals) {
    const r = [];
    totals.ivaBreakdown.forEach((b) => {
      r.push(`<div class="trow"><span>Taxable${b.rate ? ` (${b.rate}%)` : ' (exempt)'}</span><span class="tnum">${money(b.imponibile, cur)}</span></div>`);
      if (b.rate > 0) r.push(`<div class="trow sub"><span>VAT ${b.rate}%</span><span class="tnum">${money(b.iva, cur)}</span></div>`);
    });
    r.push(`<div class="trow line"><span>Total taxable</span><span class="tnum">${money(totals.totImponibile, cur)}</span></div>`);
    if (totals.totIva > 0) r.push(`<div class="trow"><span>Total VAT</span><span class="tnum">${money(totals.totIva, cur)}</span></div>`);
    if (totals.bollo > 0) r.push(`<div class="trow"><span>Stamp duty</span><span class="tnum">${money(totals.bollo, cur)}</span></div>`);
    r.push(`<div class="trow grand"><span>Document total</span><span class="tnum">${money(totals.totaleDocumento, cur)}</span></div>`);
    if (totals.ritenuta > 0) {
      r.push(`<div class="trow neg"><span>Withholding tax (${pctFmt(doc.ritenuta.rate)})</span><span class="tnum">− ${money(totals.ritenuta, cur)}</span></div>`);
      r.push(`<div class="trow grand net"><span>Net payable</span><span class="tnum">${money(totals.nettoAPagare, cur)}</span></div>`);
    }
    totalsHTML = `<div class="totals"><div class="tbox">${r.join('')}</div></div>`;
  }

  // ---- Transport (DDT) ----
  let transportHTML = '';
  if (isGoods) {
    const tr = doc.transport || {};
    const cell = (lab, val) => `<div class="tcell"><span class="tlab">${esc(lab)}</span><span class="tval">${esc(val || '—')}</span></div>`;
    transportHTML = `
      <div class="transport">
        <div class="tgrid">
          ${cell('Reason for transport', tr.causale)}
          ${cell('Appearance of goods', tr.aspetto)}
          ${cell('No. of packages', tr.colli)}
          ${cell('Weight', tr.peso)}
          ${cell('Carrier', tr.vettore)}
          ${cell('Carriage', tr.porto)}
          ${cell('Transport date & time', [dateFmt(tr.date), tr.time].filter(Boolean).join(' '))}
          ${cell('Document date', dateFmt(doc.date))}
        </div>
      </div>`;
  }

  // ---- Payment / notes / signature / legal ----
  const pay = doc.payment || {};
  let paymentHTML = '';
  if (meta.money && t.showPaymentBox) {
    const rows = [];
    if (pay.method) rows.push(`<div><span class="plab">Method</span><span>${esc(pay.method)}</span></div>`);
    const iban = pay.iban || (company && company.iban);
    if (iban) rows.push(`<div><span class="plab">IBAN</span><span class="tnum">${esc(iban)}</span></div>`);
    if (company && company.bank) rows.push(`<div><span class="plab">Bank</span><span>${esc(company.bank)}</span></div>`);
    if (doc.dueDate && (doc.type === 'fattura' || doc.type === 'proforma')) rows.push(`<div><span class="plab">Due date</span><span>${dateFmt(doc.dueDate)}</span></div>`);
    if (pay.terms) rows.push(`<div><span class="plab">Terms</span><span>${esc(pay.terms)}</span></div>`);
    if (rows.length) paymentHTML = `<div class="paybox"><div class="boxtitle">Payment</div>${rows.join('')}</div>`;
  }

  let notesHTML = '';
  const noteParts = [];
  if (t.showNotes && doc.notes) noteParts.push(`<div class="notes"><div class="boxtitle">Notes</div>${nl2br(doc.notes)}</div>`);
  if (isGoods && doc.transport && doc.transport.annotazioni) noteParts.push(`<div class="notes"><div class="boxtitle">Remarks</div>${nl2br(doc.transport.annotazioni)}</div>`);
  if (noteParts.length) notesHTML = noteParts.join('');

  // Automatic tax notes
  const fiscalNotes = [];
  if (company && company.regime === 'Flat-rate') fiscalNotes.push("Transaction carried out under Art. 1, paragraphs 54-89, Law 190/2014 (flat-rate scheme). Amount not subject to withholding tax.");
  if (totals && totals.cassaAmount > 0) fiscalNotes.push(`Taxable amount includes pension fund contribution (${pctFmt(doc.cassa.rate)}).`);
  if (totals && totals.bollo > 0) fiscalNotes.push('Virtual stamp duty applied.');
  if (doc.causaleFiscale) fiscalNotes.push(esc(doc.causaleFiscale));
  const fiscalHTML = fiscalNotes.length ? `<div class="fiscal">${fiscalNotes.map((x) => `<div>${x}</div>`).join('')}</div>` : '';

  let signatureHTML = '';
  if (isGoods) {
    signatureHTML = `<div class="signs three">
      <div class="sign"><span class="slab">Driver's signature</span></div>
      <div class="sign"><span class="slab">Carrier's signature</span></div>
      <div class="sign"><span class="slab">Recipient's signature</span></div>
    </div>`;
  } else if (t.showSignature) {
    signatureHTML = `<div class="signs one"><div class="sign"><span class="slab">Stamp and signature</span></div></div>`;
  }

  const legalBits = [];
  if (company) {
    if (company.rea) legalBits.push(`REA ${esc(company.rea)}`);
    if (company.capitale) legalBits.push(`Share cap. ${esc(company.capitale)}`);
    if (company.pec) legalBits.push(`PEC ${esc(company.pec)}`);
    if (company.sdi) legalBits.push(`SDI ${esc(company.sdi)}`);
  }
  const legalHTML = legalBits.length ? `<div class="legal">${legalBits.join(' · ')}</div>` : '';
  const footerText = t.footerText || (company && company.footerText) || '';
  const stampHTML = omitStamp ? '' : buildStampOverlayHTML(t);
  const stampFixedHTML = stampHTML ? stampHTML.replace('position:absolute;', 'position:fixed;') : '';

  // ---- Logo ----
  const logoSrc = safeImageSrc(company && company.logo);
  const logo = (t.showLogo && logoSrc)
    ? `<div class="logo"><img src="${logoSrc}" alt="logo"/></div>` : '';

  // ---- Party blocks (issuer/recipient) ----
  const companyBlock = `
    <div class="party company">
      <div class="pname">${companyName(company)}</div>
      <div class="paddr">${partyAddress(company)}</div>
      <div class="ptax">${partyTax(company)}</div>
      ${company && (company.email || company.phone) ? `<div class="pcontacts">${[company.email, company.phone].filter(Boolean).map(esc).join(' · ')}</div>` : ''}
    </div>`;
  const clientBlock = `
    <div class="party client">
      <div class="plabel">Bill to</div>
      <div class="pname">${client ? companyName(client) : '<span class="ph">No client selected</span>'}</div>
      <div class="paddr">${partyAddress(client)}</div>
      <div class="ptax">${partyTax(client)}</div>
      ${client && client.sdi ? `<div class="pcontacts">SDI ${esc(client.sdi)}</div>` : ''}
    </div>`;

  // ---- Document meta ----
  const metaRows = [];
  metaRows.push(`<div><span class="mlab">Number</span><span class="mval">${esc(doc.number || formatDocNumber(doc.type, doc.seq, doc.year))}</span></div>`);
  metaRows.push(`<div><span class="mlab">Date</span><span class="mval">${dateFmt(doc.date)}</span></div>`);
  if ((doc.type === 'fattura' || doc.type === 'proforma') && doc.dueDate) metaRows.push(`<div><span class="mlab">Due date</span><span class="mval">${dateFmt(doc.dueDate)}</span></div>`);
  if (doc.type === 'preventivo' && doc.validUntil) metaRows.push(`<div><span class="mlab">Valid until</span><span class="mval">${dateFmt(doc.validUntil)}</span></div>`);
  if (doc.refDoc) metaRows.push(`<div><span class="mlab">Ref.</span><span class="mval">${esc(doc.refDoc)}</span></div>`);
  const metaHTML = `<div class="meta">${metaRows.join('')}</div>`;
  const docTitle = meta.label.toUpperCase();

  // ---------------------------------------------------------------- HEADER --
  let header = '';
  if (t.template === 'moderno') {
    header = `
      <div class="band">
        <div class="band-l">${t.showLogo && logoSrc ? `<img class="band-logo" src="${logoSrc}" alt="logo"/>` : `<div class="band-name">${esc((company && company.name) || '')}</div>`}</div>
        <div class="band-r"><div class="band-title">${docTitle}</div><div class="band-num">${esc(doc.number || formatDocNumber(doc.type, doc.seq, doc.year))} · ${dateFmt(doc.date)}</div></div>
      </div>
      <div class="cards">
        <div class="card"><div class="cardlab">From</div>${companyBlock}</div>
        <div class="card"><div class="cardlab">To</div>${clientBlock}</div>
      </div>`;
  } else if (t.template === 'minimale') {
    header = `
      <div class="mini-head">
        <div class="mini-l">
          ${logo}
          <div class="pname">${esc((company && company.name) || '')}${company && company.forma ? ` <span class="fg">${esc(company.forma)}</span>` : ''}</div>
          <div class="paddr">${partyAddress(company)}</div>
          <div class="ptax">${partyTax(company)}</div>
        </div>
        <div class="mini-r">
          <div class="mini-title">${docTitle}</div>
          ${metaHTML}
        </div>
      </div>
      <div class="mini-client">${clientBlock}</div>`;
  } else if (t.template === 'elegante') {
    header = `
      <div class="rule top"></div>
      <div class="ele-head ${t.logoPosition === 'center' ? 'center' : ''}">
        ${logo}
        <div class="ele-title">${docTitle}</div>
        <div class="ele-sub">${esc(doc.number || formatDocNumber(doc.type, doc.seq, doc.year))} — ${dateFmt(doc.date)}</div>
      </div>
      <div class="rule"></div>
      <div class="ele-parties">
        <div class="ele-col">${companyBlock}</div>
        <div class="ele-col">${clientBlock}</div>
      </div>`;
  } else { // classic
    header = `
      <div class="classic-head">
        <div class="ch-l">
          ${logo}
          ${companyBlock}
        </div>
        <div class="ch-r">
          <div class="doc-title">${docTitle}</div>
          ${metaHTML}
        </div>
      </div>
      <div class="classic-client">${clientBlock}</div>`;
  }

  // -------------------------------------------------------------------- CSS --
  const css = `
    @import url('${GOOGLE_FONTS}');
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { font-family: ${font.body}; color: ${ink}; background: #f1f2f4; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 12px; line-height: 1.5; }
    .page { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; padding: 16mm 16mm 14mm; position: relative; }
    @media print { body { background: #fff; } .page { box-shadow: none; margin: 0; } }
    h1,h2,h3,.pname,.doc-title,.band-title,.mini-title,.ele-title,.boxtitle,.cardlab,.mlab,.tlab,.plab,th { font-family: ${font.head}; }
    .fg { font-weight: 400; opacity: .72; font-size: .9em; }
    .ph { color: #b8bdc6; font-weight: 400; }
    .tnum { font-variant-numeric: tabular-nums; }
    .muted { color: #6b7280; }

    .party .plabel, .party .plabel { font-size: 9.5px; text-transform: uppercase; letter-spacing: .12em; color: ${accent}; font-weight: 700; margin-bottom: 3px; }
    .party .pname { font-size: 15px; font-weight: 700; line-height: 1.25; }
    .party .paddr { color: #4b5563; margin-top: 3px; font-size: 11.5px; }
    .party .ptax { color: #4b5563; margin-top: 3px; font-size: 11px; }
    .party .pcontacts { color: #6b7280; margin-top: 2px; font-size: 11px; }

    .meta > div { display: flex; justify-content: space-between; gap: 14px; padding: 3px 0; }
    .meta .mlab { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #6b7280; }
    .meta .mval { font-weight: 600; }

    /* TABLE */
    table.items { width: 100%; border-collapse: collapse; margin-top: 8mm; }
    table.items th { text-align: left; font-size: 9.5px; letter-spacing: .06em; text-transform: uppercase; color: #475569; padding: 7px 8px; border-bottom: 2px solid ${accent}; white-space: nowrap; }
    table.items td { padding: 8px 8px; border-bottom: 1px solid #edeef0; vertical-align: top; }
    table.items .idx { width: 22px; color: #9aa1ab; font-size: 11px; }
    table.items .r { text-align: right; } table.items .c { text-align: center; }
    .dsc { font-weight: 600; }
    .dscnote { display: block; color: #6b7280; font-size: 11px; margin-top: 2px; font-weight: 400; }
    td.empty { text-align: center; color: #b8bdc6; padding: 22px; }

    /* TOTALS */
    .totals { display: flex; justify-content: flex-end; margin-top: 7mm; }
    .tbox { width: 82mm; }
    .trow { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px; }
    .trow.sub { color: #6b7280; }
    .trow.line { border-top: 1px solid #e5e7eb; margin-top: 3px; padding-top: 8px; font-weight: 600; }
    .trow.neg { color: #b45309; }
    .trow.grand { border-top: 2px solid ${accent}; margin-top: 6px; padding-top: 9px; font-weight: 800; font-size: 15px; }
    .trow.grand.net { border-top: 1px dashed ${accent}; }
    .trow.grand .tnum { color: ${accent}; }

    /* TRANSPORT */
    .transport { margin-top: 7mm; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
    .tgrid { display: grid; grid-template-columns: 1fr 1fr; }
    .tcell { padding: 8px 12px; border-bottom: 1px solid #eef0f2; border-right: 1px solid #eef0f2; }
    .tcell:nth-child(2n) { border-right: none; }
    .tlab { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: .07em; color: #6b7280; }
    .tval { font-weight: 600; }

    /* PAY / NOTES / FISCAL */
    .footer { margin-top: 8mm; display: grid; grid-template-columns: 1fr 1fr; gap: 7mm; }
    .boxtitle { font-size: 9.5px; text-transform: uppercase; letter-spacing: .1em; color: ${accent}; font-weight: 700; margin-bottom: 6px; }
    .paybox > div { display: flex; gap: 10px; padding: 2px 0; font-size: 11.5px; }
    .paybox .plab { min-width: 72px; color: #6b7280; }
    .notes { font-size: 11.5px; color: #374151; }
    .notes + .notes { margin-top: 10px; }
    .fiscal { margin-top: 7mm; font-size: 10px; color: #6b7280; line-height: 1.5; border-top: 1px solid #eef0f2; padding-top: 6px; }

    /* SIGNS */
    .signs { display: grid; gap: 14px; margin-top: 12mm; }
    .signs.three { grid-template-columns: 1fr 1fr 1fr; }
    .signs.one { grid-template-columns: 1fr; max-width: 70mm; margin-left: auto; }
    .sign { border-top: 1px solid #cbd2da; padding-top: 6px; }
    .sign .slab { font-size: 10px; color: #6b7280; }

    .legal { margin-top: 10mm; text-align: center; font-size: 9.5px; color: #9aa1ab; }
    .ftext { margin-top: 4px; text-align: center; font-size: 9.5px; color: #9aa1ab; }

    .logo img { max-height: 64px; max-width: 220px; object-fit: contain; }

    /* ---- CLASSIC ---- */
    .classic-head { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; }
    .classic-head .logo { margin-bottom: 10px; }
    .classic-head .ch-r { text-align: right; min-width: 64mm; }
    .doc-title { font-size: 26px; font-weight: 800; letter-spacing: .02em; color: ${accent}; margin-bottom: 8px; }
    .classic-client { margin-top: 9mm; display: flex; justify-content: flex-end; }
    .classic-client .party { width: 86mm; background: ${t.accentStyle === 'soft' ? accent + '12' : '#f8f9fb'}; border: 1px solid #eceef1; border-radius: 8px; padding: 12px 14px; }
    .classic-client .plabel { color: ${accent}; }

    /* ---- MODERN ---- */
    .band { background: ${accent}; color: #fff; border-radius: 12px; padding: 18px 22px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .band-logo { max-height: 52px; max-width: 200px; object-fit: contain; filter: brightness(0) invert(1); }
    .band-name { font-size: 20px; font-weight: 800; }
    .band-r { text-align: right; }
    .band-title { font-size: 22px; font-weight: 800; letter-spacing: .04em; }
    .band-num { opacity: .85; font-size: 12px; margin-top: 2px; }
    .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
    .card { border: 1px solid #eceef1; border-radius: 10px; padding: 14px 16px; }
    .card .cardlab { font-size: 9.5px; text-transform: uppercase; letter-spacing: .12em; color: ${accent}; font-weight: 700; margin-bottom: 8px; }
    .moderno table.items th { background: ${accent}; color: #fff; border-bottom: none; padding: 9px 8px; }
    .moderno table.items th:first-child { border-radius: 7px 0 0 7px; }
    .moderno table.items th:last-child { border-radius: 0 7px 7px 0; }
    .moderno table.items tr:nth-child(even) td { background: ${accent}08; }
    .moderno .tbox { background: ${accent}0a; border-radius: 10px; padding: 12px 16px; }

    /* ---- MINIMAL ---- */
    .mini-head { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; }
    .mini-title { font-size: 13px; font-weight: 700; letter-spacing: .26em; text-transform: uppercase; color: ${ink}; margin-bottom: 10px; text-align: right; }
    .mini-r { min-width: 60mm; }
    .minimale .pname { font-size: 14px; }
    .mini-client { margin-top: 9mm; }
    .mini-client .plabel { letter-spacing: .2em; }
    .minimale table.items th { border-bottom: 1px solid ${ink}; color: ${ink}; }
    .minimale table.items td { border-bottom: 1px solid #f1f2f4; }
    .minimale .trow.grand { border-top: 1px solid ${ink}; }
    .minimale .trow.grand .tnum { color: ${ink}; }
    .minimale .doc-title { color: ${ink}; }

    /* ---- ELEGANT ---- */
    .rule { height: 1px; background: ${accent}; opacity: .55; margin: 7mm 0; }
    .rule.top { margin-top: 0; }
    .ele-head { text-align: ${t.logoPosition === 'center' ? 'center' : 'left'}; padding: 4mm 0 6mm; }
    .ele-head .logo { margin-bottom: 8px; ${t.logoPosition === 'center' ? 'display:flex;justify-content:center;' : ''} }
    .ele-title { font-size: 30px; font-weight: 500; letter-spacing: .14em; color: ${ink}; }
    .ele-sub { color: ${accent}; letter-spacing: .14em; font-size: 11.5px; margin-top: 6px; text-transform: uppercase; }
    .ele-parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .elegante table.items th { border-bottom: 1px solid ${accent}; text-transform: uppercase; }
    .elegante .trow.grand { border-top: 1px solid ${accent}; }
  `;

  // ---- CUSTOM TEMPLATE (user-provided HTML, token-filled) ----
  if (t.template === 'custom') {
    const tr = doc.transport || {};
    const n2 = (x) => new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(x) || 0);
    const dfmt = (iso, sep) => { const p = String(iso || '').split('-'); return p.length === 3 ? p[2] + sep + p[1] + sep + p[0] : (iso || ''); };
    const vatRates = totals ? totals.ivaBreakdown.map((b) => b.rate) : [];
    const vatRateLabel = vatRates.length === 1 ? `(${vatRates[0]}%)` : '';
    const ctx = {
      type_label: meta.label,
      number: doc.number || formatDocNumber(doc.type, doc.seq, doc.year),
      date: dateFmt(doc.date),
      due_date: dateFmt(doc.dueDate),
      valid_until: dateFmt(doc.validUntil),
      date_dot: dfmt(doc.date, '.'),
      due_date_dot: dfmt(doc.dueDate, '.'),
      date_sp: dfmt(doc.date, ' / '),
      due_date_sp: dfmt(doc.dueDate, ' / '),
      valid_until_dot: dfmt(doc.validUntil, '.'),
      valid_until_sp: dfmt(doc.validUntil, ' / '),
      ref: doc.refDoc || '',
      subject: doc.subject || '',
      contact_person: doc.contactPerson || '',
      currency: cur,
      vat_rate_label: vatRateLabel,
      status_label: (STATUSES[doc.status] || {}).label || '',
      notes: doc.notes || '',
      tax_notes: doc.causaleFiscale || '',
      acq_seller: (company && company.acqSellerDecl) || '', acq_buyer: (company && company.acqBuyerNote) || '', acq_vat: (company && company.acqVatNote) || '',
      company: company ? {
        name: company.name || '', forma: company.forma || '', address: company.address || '', cap: company.cap || '',
        city: company.city || '', prov: company.prov || '', country: company.country || '',
        vat: company.piva || '', taxcode: company.cf || '', sdi: company.sdi || '', pec: company.pec || '',
        rea: company.rea || '', capital: company.capitale || '', email: company.email || '', phone: company.phone || '',
        bank: company.bank || '', iban: company.iban || '', swift: company.swift || '',
        iban_plain: (company.iban || '').replace(/\s+/g, ''),
        bank_info: company.bankInfo ? nl2br(company.bankInfo) : '', logo: logoSrc,
      } : {},
      client: client ? {
        name: client.name || '', forma: client.forma || '', address: client.address || '', cap: client.cap || '',
        city: client.city || '', prov: client.prov || '', country: client.country || '',
        vat: client.piva || '', taxcode: client.cf || '', sdi: client.sdi || '', email: client.email || '', phone: client.phone || '',
      } : {},
      totals: {
        taxable: totals ? money(totals.totImponibile, cur) : '',
        vat: totals ? money(totals.totIva, cur) : '',
        total: totals ? money(totals.totaleDocumento, cur) : '',
        net: totals ? money(totals.nettoAPagare, cur) : '',
        withholding: totals ? money(totals.ritenuta, cur) : '',
        stamp: totals ? money(totals.bollo, cur) : '',
        fund: totals ? money(totals.cassaAmount, cur) : '',
        taxable_n: totals ? n2(totals.totImponibile) : '',
        vat_n: totals ? n2(totals.totIva) : '',
        total_n: totals ? n2(totals.totaleDocumento) : '',
        net_n: totals ? n2(totals.nettoAPagare) : '',
      },
      payment: {
        method: (doc.payment && doc.payment.method) || '',
        iban: (doc.payment && doc.payment.iban) || (company && company.iban) || '',
        terms: (doc.payment && doc.payment.terms) || '',
      },
      transport: {
        reason: tr.causale || '', appearance: tr.aspetto || '', packages: tr.colli || '', weight: tr.peso || '',
        carrier: tr.vettore || '', carriage: tr.porto || '', date: dateFmt(tr.date), time: tr.time || '', remarks: tr.annotazioni || '',
      },
      theme: { accent, ink },
      items: lines.map((l, i) => ({
        n: i + 1, desc: l.desc || '', note: l.note || '', qty: qtyFmt(l.qty), unit: l.um || '',
        price: money(l.price, cur), discount: num(l.discount) ? pctFmt(l.discount) : '', vat: num(l.iva) + '%', amount: money(lineImponibile(l), cur),
      })),
      // ready-made raw HTML blocks (styled by the standard CSS that wraps body fragments)
      items_table: `<table class="items"><thead><tr>${head.join('')}</tr></thead><tbody>${body}${emptyRows}</tbody></table>`,
      totals_block: totalsHTML, transport_block: transportHTML, payment_block: paymentHTML, notes_block: notesHTML,
      fiscal_block: fiscalHTML, signature_block: signatureHTML, legal_block: legalHTML, logo,
      company_block: companyBlock, client_block: clientBlock, meta_block: metaHTML,
      // flags for {{#...}} conditionals
      has_due: !!doc.dueDate, has_valid_until: !!doc.validUntil, has_ref: !!doc.refDoc,
      is_invoice: doc.type === 'fattura', is_other_money: !!meta.money && doc.type !== 'fattura',
      is_credit: doc.type === 'nota_credito', is_receipt: doc.type === 'ricevuta', is_acquisition: doc.type === 'acquisto',
      has_acq_seller: !!(company && company.acqSellerDecl), has_acq_buyer: !!(company && company.acqBuyerNote), has_acq_vat: !!(company && company.acqVatNote),
      show_bank: doc.type === 'fattura' || doc.type === 'proforma', has_discount: lines.some((l) => num(l.discount) > 0),
      has_subject: !!doc.subject, has_contact: !!doc.contactPerson, has_bank_info: !!(company && company.bankInfo),
      has_notes: !!doc.notes, has_tax_notes: !!doc.causaleFiscale, has_transport: isGoods,
      has_payment: !!meta.money, has_withholding: !!(totals && totals.ritenuta > 0),
      has_fund: !!(totals && totals.cassaAmount > 0), has_stamp: !!(totals && totals.bollo > 0),
      has_logo: !!(t.showLogo && logoSrc), is_goods: isGoods, has_values: showValues,
      stamp_block: stampHTML,
    };
    const tpl = (doc.type === 'acquisto' && t.customHTMLBuy && t.customHTMLBuy.trim()) ? t.customHTMLBuy : ((t.customHTML && t.customHTML.trim()) ? t.customHTML : CUSTOM_STARTER);
    const rendered = sanitizeHTML(renderTemplate(tpl, ctx));
    const appendStamp = stampFixedHTML && !rendered.includes('stamp-overlay-block') && stampHTML;
    if (/<!doctype|<html[\s>]/i.test(rendered)) {
      if (appendStamp) return sanitizeHTML(rendered.replace('</body>', stampFixedHTML + '</body>'));
      return sanitizeHTML(rendered);
    }
    // body fragment -> wrap with the standard stylesheet so {{{items_table}}}/{{{totals_block}}} render styled
    return sanitizeHTML(`<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${esc(doc.number || meta.label)} — ${esc((company && company.name) || '')}</title><style>${css}</style></head><body class="${t.template} tpl-custom">${rendered}${appendStamp || ''}</body></html>`);
  }

  return sanitizeHTML(`<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${esc(doc.number || meta.label)} — ${esc((company && company.name) || '')}</title><style>${css}</style></head>
  <body class="${t.template}">
    <div class="page tpl-${t.template}">
      ${header}
      <table class="items"><thead><tr>${head.join('')}</tr></thead><tbody>${body}${emptyRows}</tbody></table>
      ${transportHTML}
      ${totalsHTML}
      ${(paymentHTML || notesHTML) ? `<div class="footer">${paymentHTML || '<div></div>'}${notesHTML || '<div></div>'}</div>` : ''}
      ${fiscalHTML}
      ${signatureHTML}
      ${stampHTML}
      ${legalHTML}
      ${footerText ? `<div class="ftext">${nl2br(footerText)}</div>` : ''}
    </div>
  </body></html>`);
}

// ============================================================================
//  SAMPLE DATA (realistic seed for testing the system)
// ============================================================================
// ---- Brand assets (extracted logos, embedded as WebP data URIs) ----
const LOGO_ESTIVAL = "data:image/webp;base64,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";
const LOGO_ALMAS = "data:image/webp;base64,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";
const LOGO_PURO_MOTORS = "data:image/webp;base64,UklGRlIaAABXRUJQVlA4IEYaAADQZQCdASpoAVUAPj0aikQiIaET2faAIAPEsoUPROPBofRecNWH8PvrB3fUr4E/W/bT2lPMA/UrpDeYD9oP2k94f/AerL0D/55/gOsz9Aj9rvTb/c74UP22/Zn2ZP/trK/k/+gfi/39fzv8Zv3U9cfw/5f+ufkh/Xv/T/i/iy/kvHd5p/Rf5H0L/if1r+zf239mP7X/2v+H7Rfhz8Yf3H8svgI/G/5D/Y/6t+y39z/dP24dnNqH+o/1vqBevXzv/Gf3D/Df8b/F+i9/Iejf5x/Yf9b+ZX95+wH+P/zb/D/ln/hv/19V/6rwyvQvYD/mn9d/33+Q/dz/jfSj/L/8f/F/ux/sfcT+Y/4j/if5X95v8v9g/8k/oP+g/uX+f/7f+R////c+8/2n/th7Jf6t/+M57XMpt2u3qHSI31m3dxPDgKxykxEBwA+k5vyd25feyFOgYYMeW3viBXgH9NKU+Ru5kap9IUNTmn5/U7YOcwuZAPhg+/6/I+ZOwkNM+xAJBa2ZypIGImoFvGtZ2v3phoaNGJJ0LWoCsZJWoTnsqNu2Nq25jgOf7muNt66Zz9b6KpvvyoBC7gSyr/BvVBbqxc1TwG6neW3DbLHNXGvfkRnzuKNOY9/erItDSZ/TkAu4pvQIYWjOZSFZHIeplCbeVXs0RW3LFoDX/8Zr854V8V2pWl0QA+5le41rAbD2O2OWS8PjUZyN/xFdzGBEBRQfEfSDq4gzz/DZy5eE8YyxLsL7YWPKELICXHvw8Ai80IrDTOU4ysehRhA+QOoqEEa+GlqE+yMhsdj+ItdT1UCMDpRR29UFKxWbapCQdBcDI94iZXC65nx1XjZRGf1vPZpg067i2R497xZ+8Ibnk1+XL45/xfhglHcGdBnjKPQMJl3YjHjsCpSecDG9wcOKRR82ztEH6bwgHFQjZbnzxE8v3Yh3XdlI+Yk8BIq6APtTFmjqembIpL1IfZEfuVODjbgv3yja6h4RbOgyzV2faDxPgk93XoUpgNtrz4E2oASXA5DlrMQnJXapepAJJrvQwK2kLGrMV7mosfBW8xmm4WYf5eZAl+YNdl/ECM6NsSkXUmawTEeEAB23DJ5AAP7+DMac/PanZ/Pn4FXd6ix335Enf3fL3PASWKxiNOFaTtFbm4kK5M7Gv9rjS386NLY8ZyN9FwGmAB7o98RPJYoN84c4Sley55ksIKFUShYfKu91hF3nPzWmvm3hRt8lv/oSibA3UOhjOp/exUszkNFwYwr+7LjB3uS2O89rtLl8jxXFf3P+hPfxIUmUh3ANZvB+VUAEepRO1Wte3a3VBf2xbwDq0toQFxWgYR+F0S3M43Ac03rDHLGk/dej5d7P5Txr7U6Pw/4VwVlfTsr5AybSN8xsy/KIN3F3IzJExTswwwh7LGy0hbvSMBSb1s7x5zNVp2fRATlNNhSMzuwSmbWWvCxmbLh6JeMHA9vsRJCgS9x5bHDHIsVvASg0suc3ZeEbtqejEzj25U7cjYGzoqe8tyhj0YH6emZRnDd4pXIt+UI/bqmHkm56SIkGHcSc1X61E92LS/0FBPviM1TMDSeL6Y5F2hj4PT9YUAQtJI18SRRdhEauuEtnEeGqP+VazLbxuAWjtimHQp5Y7/xvHaIR/5EXY9Ct2ynbVgyAzBOSf172BC4KliLDHphAYBAa/jFOgxdZr4/2sjNeLEgR+vhdMkmkYf1Hexgfm371JWBCTEdP/GWquEcFtKRJes1DwtGX3XGO+Aoq7F4C0StPZseRaxv4cMNnpf2zJLXQthUSCKlW8H8DT5c8BLT91nRDaxgtyDM/wiX6W84VdNWVGmb+C+5aj9u8gaQ3qf/3ALeDZop6/KYYeGG4eJC5JD8rCaMUIbWmpbujWcHwdB4gbkQrz6KTNGQXNH6Q0SuQORbNROV18RyfVh3Zm+C3RsdXAt8lTg43bAwxzMcHq53TtRkEJDmUaGi6+SPG5pmqxAoKagk5h4aYISB6tjBKe+eohLjiCzL52vffazmz7ufNh1rvh6pmn9fBVs1Wgv/ypVr3sSSeerp3jNdN5VT0z18TA3usTOaqI00wRoC8WcSPbPYd9cWs4i7jVxDvYp7+ZEqZL4/AevytRTwyuZtVvkLAHjwDeWnXYsduszSws/d3uk2pQUjFn2J24sxYZuyBa5NxrTMSFU+B8+1G3od4rmfA/EjKJoL3iCb1MHNLjA693ZztK6YfIOqox/V1vwvfA/xIh9hJA2dyPz0MuGPSMEz4aoNstH6Xt6KJR9jYRSbYGx4XR/B52eZ9WgX05BDcaDuogolyurPVAyV22QaqZh9sjjygaK56ljxzvdvC9lYk+LMXEmjc4PV2tMfnzOQQxaSzKVOmbwjFmgU5rPbVc2wUlLXKavvjuXq4H5rTz0H9V+i3i+Y95aBdKMw01p9uxT9GELE9MMLUTbyoPd9+qdtQJBmp99u5660ZZtx8RcIvDRiBuQCpZn/ZwqxB62F6xy/R6UqkEjPXPz8SryywU+0kU6ZRbcCXhF8a52+8TYI08asLHxfUIlLVz1NHPfVMFWNxSwJD1OrJ4uDYzsjrvWbCZ9ilnG1OV1FtTQq4NNEd0FckBuMp3HzaYW6U7nLx5wykik9z+7COQnl/EHHl0R9bA5ppLjTFLORk1Md7SFuh4RVji5D1+ODw417ShQTYQeUZM4G5XKUUSb3xkDiC7lOMdxt/hR7zcbAzCgEwjZWXfShsPva5e/e1B+DtBtTjO9n5rzi7wJv9SHnEvsl/mMsUnGBWklsSFZGt4uPiburR5b1ebbt83S/y/Jlvu8vmO1P+zP8IQEiMFCUlef/YglJwbG+CSczgtFlTRPK/aChwdne2kqGv6LQbxaCKimSXNMnYZc94ive73MyzablByqP+PbhF+5GZsxmO58NZmm8l7h+eQL24uPelKOmf1qU2Bwh4IWXV20Zj2ZmsXl8HV5tFbZE2dU4DdWn1PPCxSgHTr8XzLTfN70MxDjmdLOptSg+ctV6GQPbTq3PNhATXWdQuMEdWR7EREFR2Gu5/6unF9qcf4joKmsyFwN5vCyUC6OZDhJNn1U0qO0ew3awGQ/lKmH7LeGMkXc65yEsAwVWdq1ys/lMSygTI1T/8ebXaUJzikdR+n5J0eFXLYDgWISa3wXSDxIM3d96bYwD9AhzIUKpkvW2w+NSJNafyZVoHcIuxOxwab1e5Mk35C2iNetaKWfBvg6U6lsyhQv6zGS3pDSnnR6w88ocH1j5/Ho+DewdZekeeA5Y01OpbP8DIbtguX9d851ebANK0dci4kRN76F1VjkaUxSRgZlYa6Npuz0fsdD7/ZgX69+IfEXlmeQg2SAOmi2ut7FiiQWYolcqss73wAXPN3OZtBr8Ig9SriteBKqLCLmus+GQ9JycURN5l0CRDaSUEIy5jEtaylgtxH5wbcXPGHiz/Ge6vJvF2CI4lR0khrANnmZ+t+gEwW4ziVpEXIF1uUOZ6dCBz0mfrZaMf5moA6RPYvgfhbBLaB43+k7L0zu2ojKzxrTRobN9hwyvttgRSoAZGS0oekFatCG4Z8VJaQBAh2afcrUKKDdxFWg1wkrQ01+E0oB0vLzYctIfNuB0R5zIXxQsGwF8jmi2I7Z86PcUyN/P7AZ48LPkXu1P/ga295/vjfUwB75K3iFg3mSxnGmiZyMR18fl2KtB8X3xNoTuYPUfogCooaqmrUKfLM7Co6tc75+DXN2r/3e3Uo7qIBaez+f38hvqamCma5nEO460HjzSKjZKSQ7aHdA7il5Ex9+RT7UMV6d/Z+CagReMec/VX1FAwTi0RwFs/njAM193OK8WmxWdZ3U79VW+djbxW1AqF9AaazAdJ4hS/R7M8edmWhKb9HGrTEam9rCw9ClXcBoQrTMXrC3xOxTUi05Zm78r4SLw1ZOX1B8ejPjReL5D3ZyDPxIozvFQRXybMH1Tr2HSu5KQMhjhPQu6m0J/GESmCiwLPBB1pBIwYL8ZuK8ihrIXOXeld8686+BFs/YdogtujqsM0D4CqPgW+pZtiKllLcFU56muwZogRFd088jlhdxu6V71g+7yKLAaFi50JPZnuC+Ik+rVfzZwTBmCxxxhcib3AEO5s6nw3QpoP2XFeaXcFDqrTB1FDQefBsIj5OUgotrAeENdabbCPlh1B2leF/2za8nRbK1wiFREDw9VaVwV9IO9aOU6X8SdFcRKpOYrRtxDXkPRDf1OHi/hzgNhNatK7/R3kJm0RNo5pDseKdP+ZnOk7zPLNZUOIGija4qCRhmfwjbxmTr+Qihoz/cn4NEHIRTXEUfqzWvZmbuf233R1woLw4UFIV13EUv215OHvYgBK53UcIrm4Fo7HPKe6U9LxT33ZclA//zb/tCEZkGVeNIxIXVoVi6Amk0NaB/L2ioc9IYFuujAZIw7c2KbYjH5WwnOEZV1pQCzx8Ufgvkqxvl7SS7bIR3vEePEh0UHtuzuwb3KRMArYrbPfz2iv/9kDjwbkrwvf+omDs+msa0DENTwZedL6aFf8s1CInP3G2Zfc6TAGoVFMByvtjdkjNi2hglBTvEudcUDy07jhnSAtXU2MEJyL3Qn/mqdYWR+NmbS44NTfoHSLTKSooqWEWs+Eon62Zb1v8Olzb/Y/FLsQzRv8z6XcnHtHKZWt8nIiTl+8srr8KTfISKew3u9xzeiY3Q9BiW/DkHMZ0juCG+nbI2kyKPWwW9HHWzl3MNlYnAx99yUh9T8lM6mfIPMt2mOXz3gkAzKA2/k0g0GnTpXSDBALGvd2FWV3IY9AgXOuFQ9AKkkbMPNucf/OEjMBMw9vCnNX69LddljK5HQLyRfo2b/yTPnw/fUDpmFmNH1JUEaNN+AQG12aBOEn3txU3mzTQikjRK2c+7z1Qf5iPU9UbkBJ/3tSFZQGdi7qT/sf20W32l0BwcCImhhh8MCqBZdoF3cXo8X7BK0UUaEDVIU1S1aYc9N3gMjE5goXeTW1YDis0UM9B1TMVNUOa8RpSIe1EZrq7v+FMmN/jXbEpdw+bMMZwQAXoAXctZl4/BNHkTzRKGt+9zFxiZIRMpf731FLZwWSxCUquyHaUDlsl69ObHo76E5Zy0T/FOj6XaiwCht7N/0FUHPKsnn7Pbpk2Fs2zY3vR2jY5tDa62Ei2EkFJFUCBQFttO+RGyzDyS2x94Em4EvM3Dag9ZvMXxbdHmE0M7I61efXD15ZcE9XwXmj/8oSqxsfDdxwKNFh9Kf7DiaVfc+4FDvBqrt7mi2t9K8tuFRNesRZbjKQRhzrYRB7atwxiR/8wHHQeOOdREHGRFoy8ZtNQsz4qGvU/Y5Ctf/oqf9JnDiGgMMnE5aQ8H940LssrrQRkyq0E+dOHHUPcTAZFwfjVoEVZCWLVJabMfvo89FrwUhKIdc4Iz4yzn4O1kcvbjpi6myl2UENcDlpOqIeq68yiuohhPOBJWMbpeRDXYaBwRN5a9QVnyact3dEmKqUzSlKcl6i9Q5DkwNayx1jKc9vf66eMVhevT1avJKQY+p3JJHhmh1OtpExQy7vP6cbf+9z42MvDQPBGJTMnURX2hAT4L+4q376zqbM3csR1sAqB05V9kaCnLRucBiIzq7H8Axna4VwYwLCR4XtzMElHOrmmshRJ/mH3/1rJvLW+IbML5kn+cvT6E9lYMb0LF0sZn7BC1A8crFpL+T1eUls7EZ6+WVs7Ari4VuuS9JIOVoxaYUSYpgbsEHefE6tEoi1PTcIa9/2E2N2UJdpAPTbedcPWuIjPvLpsORQX4uAhitx9XrRedjLSzaXM4EaC9XjnGHCk0Yu/rUQd13KKvAOHS7PuJkm/irGZtCUYLDN6RgKdohBor/DfbXwpCO08z2jiFfm/G0Ne8TAu8afZTAnmZB2TZPKZDitMERJcNGc6PWI4l1ECvFo2+jeICXE89KKHiCPNzkY2RUv9X7PtPenD64HcVRvNtmvyGOJfCnZglWaVzWTwqax/XenfdoUvMtt4yelREamh58GubmK8u+Yxrf9r5N1YP0yAUm2xSmNXsENtf5cBqMZvZgioeFKIxpC4RLkDaNy3g5mLjQengoyAGxMUxQXdJPISjbh48R2TYtBBtjRa7yurHFiX3/kepjm8BLI3/AOLSjAaXFLKyGJLktfhq1JhcD2XJ0l2sXL+VR5U5FlEgFvqr3StzQhYhL6orzZQ6SWnPrQ8HkOUmqEi6FsNCGdXZErM8X/pyYWPDFRgmWI2TdBXofaHTzDuCRWNyaprcscTc5FjJiGUP6wtCgbY0Y+2HH6FCaKK77YzbLYkU2lxHb2kMmBHbYxCY3HXsP+P8+dshYMal8BzR37+4kddIv7TbanMET8RX3W+oaKI0mo35bfH7IWvPeQtQq3HkNjqf3StgHpkZztirfBySKXmyHNC/x0q5qokBioCWYX8f/obBNtxLdk/U6dXPpqHnBi0MEy0sbo4dOTIFQ/X3GmKrU9fP3Lc2Jr1oHt2+UJmZ/E0U4IXouX3+mo4KVLSClSoKX+Oyl1F/TJz36Cgvf7KLAhJr6j+KNXr1QjYuM7mwZN++niAP3xLlfYVHv8clppBTQl7/7WLfW6iwpX+aZoszuKsSaWUtpuSNYuu5tPnh6NNssQoXs3UhzF8sanSqMnAj0cSvBCBz6yyrj8yd4hzi0pCEjQEmScGYsJzpnAubzqdo+DnvtbZE5CQrNyAfY8TOj5gk0Evd21GaCwsnnsG9M+FOBjt3CL2Ixk4Per8nVTKFAYlwscwvGeuFYhkTuxSyAN7YyrEz5dPwamLn9OSBABk8ksw0n2LTTAZsW8Bv1NCxz+NjJ3nzcymC1rwQWgxfw7hvGRFkMN8kfs6EEBNyyvvHUYIzDPwtL+Wj5A8nFa6ksUmg5E7+6QrHcy/flv1liiato8Q4ry8RYf/FVBhU2bs3EMacDi9+BHnUYAA3CtPBoUlLkeHYAEx31lPzqHLo0ofFNbYR4eJSkd980jWHgXIIQNBpqT9n3l8W2wiNbn0vufb940d+PL60VghWUuffofI0ezuqZPWiC8Qyzfng/liFrF2uaSmvbYue9WXoeEBtmrdzm2Mj0j0fIuXNxdFQm0DcyvTae4vX1AdHnhGF4wG25BRdwVFB+CtpnPCyre3rS0mPQaqoLvLv/8zBkrkr4+bbItACSHaoa8353Y8+G1QDXuGDDk4q3jYWs90kXCm+1vf+5XAZe064i5izaUSaErkgSqaT/f753hSfaz0aE3h9KrscNz2WESRE8MOGJ6D92OWB+QiC9F55fLUKfRliI70ogcZf+wIPxDsz34Eh/iFBqiWsimV9jlOP3FSsHRHh3uj0QBewE57gknhdl4dsa5LuBUQ2TjGV0s3V8+6bDEcKsBhvL+5z6sb870VgY0OFzPFj7U5xntf7j3Z/6OmUlNalixE7xPpps/n86IQ/HrAhAd+3N/nv/SPiZ7IvBnPa5yubX+Q8KHg9mQDino7A8APTl52xzIb5gS3Vcv2joIqUesBQLo5ST5LSLtI8d3lXEm9P2G6a5el53Fw1FrwtaQkW17VJRNyskAUKas68sAZU82XYl15BxGX4XI53yK9otjp0IhKG5/wnRBHvbWLfQQfuKwNLsTS36wbcmeKoD9y/6WtZnBngEK8ud0LSe3PHyCMidvMJFTu5Rg23eYZ16nx+nosHKHjPztODv4KM2LJi1mNWNqyT60Z+N0LxQkIMp6YreQ1t/IJNN3zWwFq/vymBBaJ8q7hqG24yNrQNs/qNstVQ0G5PvsqA/vmgQ9NHUCGx0lZviERCJLOIOI5nANiRl0rTejAEMLchUBr7XhNVIWF1NKdhNJo17WBQiX82x/2FMB0UrvUawbA8BudUSYirAvOzWGAh4y2iWpcfhd/vjFtjtKNyRCBDg3zaXxsdjVGnWfoQsoUTeciRg2d4N55oE3MGJTdB6uGSidj8eCbRY+E/DCRsKg5W3g/fNTWFO0hRTz9v5G+dDbtmsQ1RaJfJCBVrGKmXDNHuQCIjD1Aja7f7yWEpRbCkq2XtFGV5TMlzurtph2HNTuptne0IqWrtmIkshQCh9U9mzlKz7JXkcflulp3xzcMDXibqqY9MGPW1yOxSwgof3DwRnjV3Vhg5TMyezDBQapxMtj0JVJ4BV+S+T8ZrzPwzQjWowDyey1FXSBnqSXeAwiqYkP8rgBzmz1HwljG7R4PAnXz50iiQM6QYK3JuqsNGfkE3aEpUBs4Fq3a5yWRJdlDFK0fQcnVRfNvMW7YMc1vtFPz8ETwblOKpgSAPsgcg8C+tW8VcbLkXw2rDoD3ljHj7xnB/OROA/pVpZnTPiEy3ZnfuQ94fR39EThKQTjTQFD/zaofPIJa1QcHO56fHYk+WsIcjIuIQNJR7v45kKbIj59OlgGQ0Sv8xnGy1/DYXIY4e/FlMEeZUOueAld4Tjt3SIVNt1OSPMuKfNzkiZrNVrH0d1oMLdGM3rbTUCCHamAQEXU66Mbd1v5adPaCm9oTMoeef6f4zl3Z9ER4+qdTyuDygi6sbv8MNaeoGJNInLoL2YHpXAvU7yKywHGm6msXJDzCOz0RT6ow+xuAaI7uDr9FWhSvbolm35VakWtbJqpTx4ZpLxyonJ4Al1GohbLBCXW83KnCSm+dFu5G4UcRv6stNQYP/UpBSnS+iZXpnycANYZAgf8NyqNNyrQN7UVsIdkH7BDSBvKIDeuqQi5mW1r3gbKLbN/WOffvswkXglR6eXMFfbj0fKws6UDFnYbGMVNHmEgAXmwEG70u8SUAL+r6wp5johaAdpe2QligWKwNBBfjEEQUgxC8TiXyq54g6YzF9HXNMdNaRJvpRsfnAAZdl3EqGv1oOJw6VkLRhIGJcKH8i5C5fu26sa5c7P+Yc82QPIr+ERd9zsBDBIUoaJrrPMeDPPm6YdKEWIl73afxYVr4zfW45ygyqNrx0pVZMmktkMoM0uDsbC0rnKl8vNZHWGfT/p5oxIl9X8MAAA=";
const LOGO_PURO_WATCHES = "data:image/webp;base64,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";

// ---- Per-company invoice templates (match the user's real invoices) ----
const TPL_ESTIVAL = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<style>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');
@page{size:A4;margin:0}*{box-sizing:border-box}
body{margin:0;font-family:'Montserrat',Arial,sans-serif;color:#2b2b2b;font-size:11.5px;line-height:1.55;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;min-height:297mm;margin:0 auto;background:#fff;padding:15mm 16mm}
.head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}
.logo img{max-height:84px;max-width:250px;object-fit:contain}
.cobox{border:1.5px solid #143559;border-radius:9px;padding:13px 16px;max-width:300px;font-size:11.5px;line-height:1.65;color:#143559}
.cobox .nm{color:#c6a161;font-weight:700;font-size:12.5px;margin-bottom:3px}
.cobox .b{font-weight:700;color:#143559}
.band{background:#c6a161;color:#fff;font-weight:700;text-transform:uppercase;letter-spacing:.16em;font-size:9.5px;padding:7px 14px;border-radius:4px;display:inline-block}
.client{border:1.5px solid #143559;border-radius:9px;padding:14px 16px;margin-top:9px;max-width:55%;font-size:11.5px;line-height:1.7}
.client .b{font-weight:700}
.pill{display:inline-block;border:1.5px solid #b9c2cf;border-radius:999px;padding:9px 22px;font-weight:600;margin-top:14px;font-size:12.5px}
.refnote{font-size:11px;color:#5b6470;margin-left:10px}
.bandfull{background:#c6a161;color:#fff;font-weight:700;text-transform:uppercase;letter-spacing:.1em;font-size:10.5px;padding:10px 14px;border-radius:3px;margin-top:16px}
.dates{display:flex;gap:16px;margin-top:16px}
.dcol{flex:1}
.dlab{font-size:10.5px;color:#3a3a3a;margin-bottom:8px;font-weight:500}
.dval{border:1.5px solid #b9c2cf;border-radius:999px;padding:9px 16px;text-align:center;font-weight:500;font-size:12.5px}
.tbl{width:100%;border-collapse:collapse;margin-top:18px}
.tbl thead{display:table-header-group}
.tbl thead th{background:#c6a161;color:#fff;text-transform:uppercase;letter-spacing:.05em;font-size:9.5px;font-weight:700;padding:10px 14px;text-align:left}
.tbl thead th.r{text-align:right}.tbl thead th.c{text-align:center}
.tbl tbody tr{page-break-inside:avoid}
.tbl td{padding:15px 14px;border-bottom:1px solid #ececec;vertical-align:middle;font-size:11.5px}
.tbl td.r{text-align:right}.tbl td.c{text-align:center}
.tp{margin-top:12px;border:1.5px solid #b9c2cf;border-radius:8px;padding:6px 16px}
.tp-row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #eee;font-size:11.5px}
.tp-row:last-child{border-bottom:none}
.tp-k{color:#143559;font-weight:700}
.tp-rem{margin-top:10px;font-size:11.5px}
.tp-rem .tp-k{display:block;margin-bottom:3px}
.tot{display:flex;justify-content:flex-end;margin-top:8px}
.totbox{width:82mm}
.tr{display:flex;justify-content:space-between;padding:7px 14px;font-size:11.5px}
.tr .k{font-weight:700}
.tr.sep{border-top:1px solid #e3e3e3}
.tr.g{border-top:1px solid #e3e3e3;font-size:12.5px}
.tr.g .k{font-weight:700;color:#2b2b2b}
.tr.g .v{font-weight:800;color:#c6a161}
.paid{margin-top:14px;font-size:11.5px;color:#143559;font-weight:600}
.note{margin-top:14px;font-size:11px;color:#444}
.foot{margin-top:18mm}
.tc{background:#143559;color:#fff;border-radius:7px;padding:18px 24px;max-width:58%}
.tc .t{color:#c6a161;font-weight:700;text-align:center;font-size:11.5px}
.tc .m{color:#c6a161;font-weight:700;text-align:center;font-size:11.5px;margin-bottom:12px}
.tc .q{font-size:10.5px;color:#cdd6e2;text-align:center}
.bankbox{border:1.5px solid #b9c2cf;border-radius:8px;padding:18px 20px;margin-top:12px;display:flex;justify-content:space-between;align-items:center;gap:20px}
.bankbox .bd{font-size:11.5px;line-height:1.8;color:#2b2b2b}
.bankbox .nb{font-weight:800;font-size:30px;color:#009f98;letter-spacing:-.6px;white-space:nowrap}
</style></head><body>
<div class="page">
  <div class="head">
    <div class="logo">{{#has_logo}}<img src="{{company.logo}}" alt=""/>{{/has_logo}}{{^has_logo}}<div style="font-weight:800;font-size:22px;color:#c6a161">{{company.name}}</div>{{/has_logo}}</div>
    <div class="cobox">
      <div class="nm">{{company.name}}</div>
      <div class="b">{{company.address}}{{#company.city}} {{company.city}}{{/company.city}} {{company.country}}</div>
      {{#company.vat}}<div class="b">VAT# {{company.vat}}</div>{{/company.vat}}
      {{#company.email}}<div>{{company.email}}</div>{{/company.email}}
      {{#company.phone}}<div>{{company.phone}}</div>{{/company.phone}}
    </div>
  </div>

  <div style="margin-top:20px"><span class="band">Invoice to</span></div>
  <div class="client">
    <div>{{client.name}}</div>
    <div>{{client.address}}{{#client.cap}}, {{client.cap}}{{/client.cap}} {{client.city}} {{client.country}}</div>
    {{#client.vat}}<div>VAT# <span class="b">{{client.vat}}</span></div>{{/client.vat}}
    {{#client.email}}<div>{{client.email}}</div>{{/client.email}}
    {{#client.sdi}}<div>Code Univoco {{client.sdi}}</div>{{/client.sdi}}
  </div>

  <div><span class="pill">{{type_label}} {{number}}</span>{{#has_ref}}<span class="refnote">Ref. {{ref}}</span>{{/has_ref}}</div>

  {{#has_subject}}<div class="bandfull">{{subject}}</div>{{/has_subject}}

  <div class="dates">
    <div class="dcol"><div class="dlab">Issue Date:</div><div class="dval">{{date_dot}}</div></div>
    {{#has_due}}<div class="dcol"><div class="dlab">Payable by:</div><div class="dval">{{due_date_dot}}</div></div>{{/has_due}}
    {{#has_valid_until}}<div class="dcol"><div class="dlab">Valid until:</div><div class="dval">{{valid_until_dot}}</div></div>{{/has_valid_until}}
    {{#has_contact}}<div class="dcol"><div class="dlab">Contact Person:</div><div class="dval">{{contact_person}}</div></div>{{/has_contact}}
  </div>

  <table class="tbl">
    <thead><tr><th>Description</th>{{#has_values}}<th class="r">Rate</th>{{#has_discount}}<th class="r">Disc.</th>{{/has_discount}}{{/has_values}}<th class="c">QTY</th>{{#has_values}}<th class="r">Amount</th>{{/has_values}}</tr></thead>
    <tbody>{{#items}}
      <tr><td>{{desc}}{{#note}}<br/><span style="color:#7a828d">{{note}}</span>{{/note}}</td>{{#has_values}}<td class="r">{{price}}</td>{{#has_discount}}<td class="r">{{discount}}</td>{{/has_discount}}{{/has_values}}<td class="c">{{qty}}{{#is_goods}} {{unit}}{{/is_goods}}</td>{{#has_values}}<td class="r">{{amount}}</td>{{/has_values}}</tr>{{/items}}
    </tbody>
  </table>

  {{#is_goods}}
  <div style="margin-top:16px"><span class="band">Transport details</span></div>
  <div class="tp">
      {{#transport.reason}}<div class="tp-row"><span class="tp-k">Reason for transport</span><span>{{transport.reason}}</span></div>{{/transport.reason}}
      {{#transport.appearance}}<div class="tp-row"><span class="tp-k">Goods appearance</span><span>{{transport.appearance}}</span></div>{{/transport.appearance}}
      {{#transport.packages}}<div class="tp-row"><span class="tp-k">Packages</span><span>{{transport.packages}}</span></div>{{/transport.packages}}
      {{#transport.weight}}<div class="tp-row"><span class="tp-k">Weight</span><span>{{transport.weight}}</span></div>{{/transport.weight}}
      {{#transport.carrier}}<div class="tp-row"><span class="tp-k">Carrier</span><span>{{transport.carrier}}</span></div>{{/transport.carrier}}
      {{#transport.carriage}}<div class="tp-row"><span class="tp-k">Carriage</span><span>{{transport.carriage}}</span></div>{{/transport.carriage}}
      {{#transport.date}}<div class="tp-row"><span class="tp-k">Transport date</span><span>{{transport.date}}{{#transport.time}} &middot; {{transport.time}}{{/transport.time}}</span></div>{{/transport.date}}
  </div>
  {{#transport.remarks}}<div class="tp-rem"><span class="tp-k">Remarks</span>{{transport.remarks}}</div>{{/transport.remarks}}
  {{/is_goods}}

  {{#has_values}}<div class="tot"><div class="totbox">
    <div class="tr sep"><span class="k">Subtotal</span><span>{{totals.taxable}}</span></div>
    {{#has_fund}}<div class="tr"><span class="k">incl. pension fund</span><span>{{totals.fund}}</span></div>{{/has_fund}}
    <div class="tr"><span class="k">Tax {{vat_rate_label}}</span><span>{{totals.vat}}</span></div>
    {{#has_stamp}}<div class="tr"><span class="k">Stamp duty</span><span>{{totals.stamp}}</span></div>{{/has_stamp}}
    <div class="tr g"><span class="k">{{#is_credit}}Total credited{{/is_credit}}{{^is_credit}}Total{{/is_credit}}</span><span class="v">{{totals.total}}</span></div>
    {{#has_withholding}}<div class="tr"><span class="k">Withholding</span><span>&minus; {{totals.withholding}}</span></div><div class="tr g"><span class="k">Net to pay</span><span class="v">{{totals.net}}</span></div>{{/has_withholding}}
  </div></div>{{/has_values}}

  {{#is_receipt}}<div class="paid">Payment received via {{payment.method}}{{#date_dot}} on {{date_dot}}{{/date_dot}}.</div>{{/is_receipt}}
  {{#has_notes}}<div class="note">{{notes}}</div>{{/has_notes}}

  <div class="foot">
    <div class="tc">{{#has_tax_notes}}<div class="t">Terms &amp; Conditions:</div><div class="m">&ldquo;{{tax_notes}}&rdquo;</div>{{/has_tax_notes}}<div class="q">Do you have any questions? Get in touch with us.</div></div>
  </div>
</div>

{{#show_bank}}<div class="page">
  <div style="margin-top:2mm"><span class="band">Bank Details:</span></div>
  <div class="bankbox">
    <div class="bd">
      <div>Company Name: {{company.name}}</div>
      {{#company.bank}}<div>Bank Name: {{company.bank}}</div>{{/company.bank}}
      {{#company.iban}}<div>IBAN: {{company.iban}}</div>{{/company.iban}}
      {{#company.swift}}<div>Swift: {{company.swift}}</div>{{/company.swift}}
    </div>
    <div class="nb">novobanco</div>
  </div>
</div>{{/show_bank}}
</body></html>`;
const TPL_ALMAS = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&display=swap');
@page{size:A4;margin:0}*{box-sizing:border-box}
body{margin:0;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#2b2b2b;font-size:11.5px;line-height:1.6;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;min-height:297mm;margin:0 auto;background:#f5f3f0;padding:17mm 17mm}
.ser{font-family:'Cormorant Garamond',Georgia,serif}
.head{display:flex;justify-content:space-between;align-items:flex-start;gap:24px}
.logo img{max-height:66px;max-width:240px;object-fit:contain}
.co{text-align:right;font-size:10.5px;color:#3a3a3a;line-height:1.6}
.co .nm{font-weight:700;color:#222;font-size:11.5px}
.kv{margin-top:16px;display:inline-block}
.kv .row{display:flex;justify-content:space-between;gap:24px;padding:2px 0}
.kv .k{font-family:'Cormorant Garamond',serif;color:#5b1824;letter-spacing:.06em;text-transform:uppercase;font-size:12.5px;font-weight:600}
.kv .v{font-weight:700;color:#222;font-size:11.5px}
.title{margin-top:15mm}
.title .lab{font-family:'Cormorant Garamond',serif;letter-spacing:.42em;color:#9a9794;font-size:16px;font-weight:500}
.title .num{font-family:'Cormorant Garamond',serif;color:#5b1824;font-size:48px;line-height:1.0;margin-top:2px;font-weight:500}
.rule{height:1px;background:#c9bfae;width:120px;margin:16px 0}
.lbl{color:#7a5560;text-transform:uppercase;letter-spacing:.18em;font-size:9.5px;font-weight:700}
.bill{margin-top:12mm}
.bill .nm{margin-top:6px;font-size:11.5px}
.bill .ad{color:#333;font-size:11.5px;line-height:1.65}
.tbl{width:100%;border-collapse:collapse;margin-top:13mm}
.tbl thead{display:table-header-group}
.tbl th{text-align:left;color:#9a9794;text-transform:uppercase;letter-spacing:.12em;font-size:9.5px;font-weight:700;border-bottom:1px solid #d8d3c7;padding:0 4px 10px}
.tbl th.r{text-align:right}.tbl th.c{text-align:center}
.tbl tbody tr{page-break-inside:avoid}
.tbl td{padding:14px 4px;border-bottom:1px solid #e3ded2;vertical-align:top;font-size:11.5px}
.tbl td.r{text-align:right}.tbl td.c{text-align:center}
.tbl .ref{color:#555;padding-left:14px}
.tp{margin-top:8px}
.tp-row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #e3ded2;font-size:11.5px}
.tp-k{color:#8a8782;text-transform:uppercase;letter-spacing:.08em;font-size:9.5px}
.tp-rem{margin-top:12px;font-size:11px;color:#555}
.tot{display:flex;justify-content:flex-end;margin-top:16mm}
.totbox{width:92mm}
.tr{display:flex;justify-content:space-between;padding:8px 4px}
.tr .k{color:#8a8782;text-transform:uppercase;letter-spacing:.1em;font-size:9.5px}
.tr.g{margin-top:6px;padding-top:10px}
.tr.g .k{font-family:'Cormorant Garamond',serif;color:#5b1824;text-transform:none;letter-spacing:.02em;font-size:16px;font-weight:600}
.tr.g .v{font-family:'Cormorant Garamond',serif;color:#5b1824;font-size:18px;font-weight:600}
.paid{margin-top:12mm;color:#5b1824;font-size:11.5px;font-weight:700}
.legal{margin-top:12mm;color:#6a6a6a;font-size:10.5px;line-height:1.7;max-width:62%}
.ft{margin-top:12mm;border-top:1px solid #ddd6c9;padding-top:11px;text-align:center;color:#8a8782;font-size:10.5px;letter-spacing:.03em}
.p2head{display:flex;justify-content:space-between;align-items:flex-start}
.pn{color:#5b1824;letter-spacing:.06em;font-size:18px;font-weight:500}
.p2rule{height:1px;background:#d8d3c7;margin-top:16px}
.refband{background:#ece8e3;display:flex;justify-content:center;align-items:center;padding:14px 0}
.refband span{color:#3a2b2e;font-size:18px;letter-spacing:.04em}
.refband .div{width:1px;height:18px;background:#b3a99d;margin:0 28px}
.amtrow{display:flex;justify-content:space-between;align-items:flex-end;margin-top:20px}
.amtrow .cap{color:#9a9794;text-transform:uppercase;letter-spacing:.14em;font-size:9.5px;font-weight:700}
.amtrow .amt{color:#5b1824;font-size:40px;margin-top:6px}
.amtrow .cur{color:#5b1824;font-size:22px;margin-top:6px}
.bdlbl{color:#5b1824;text-transform:uppercase;letter-spacing:.12em;font-size:10.5px;font-weight:700;margin-top:14mm}
.bankcard{border:1px solid #d8d3c7;border-radius:10px;padding:24px 28px;margin-top:12px}
.bankcard .bk{color:#5b1824;font-size:40px;letter-spacing:.01em}
.bankcard .bkrule{height:1px;background:#e3ded2;margin:16px 0 20px}
.bankcard .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px 28px}
.bankcard .cap{color:#9a9794;text-transform:uppercase;letter-spacing:.1em;font-size:9.5px;font-weight:700}
.bankcard .val{color:#3a2b2e;font-size:12.5px;margin-top:4px}
</style></head><body>
<div class="page">
  <div class="head">
    <div class="logo">{{#has_logo}}<img src="{{company.logo}}" alt=""/>{{/has_logo}}{{^has_logo}}<div class="ser" style="color:#5b1824;font-size:24px">{{company.name}}</div>{{/has_logo}}</div>
    <div class="co">
      <div class="nm">{{company.name}}</div>
      {{#company.email}}<div>{{company.email}}</div>{{/company.email}}
      <div>{{company.address}}</div>
      <div>{{company.cap}} {{company.city}}, {{company.country}}</div>
      <div class="kv">
        {{#company.vat}}<div class="row"><span class="k">VAT:</span><span class="v">{{company.vat}}</span></div>{{/company.vat}}
        <div class="row"><span class="k">Date:</span><span class="v">{{date_sp}}</span></div>
        {{#has_due}}<div class="row"><span class="k">Due date:</span><span class="v">{{due_date_sp}}</span></div>{{/has_due}}
        {{#has_valid_until}}<div class="row"><span class="k">Valid until:</span><span class="v">{{valid_until_sp}}</span></div>{{/has_valid_until}}
        {{#has_ref}}<div class="row"><span class="k">Ref. doc:</span><span class="v">{{ref}}</span></div>{{/has_ref}}
      </div>
    </div>
  </div>

  <div class="title"><div class="lab">{{type_label}}</div><div class="num">{{number}}</div></div>
  <div class="rule"></div>

  <div class="bill">
    <div class="lbl">Bill to</div>
    <div class="nm">{{client.name}}</div>
    <div class="ad">{{client.address}}<br/>{{client.cap}} {{client.city}}{{#client.country}}<br/>{{client.country}}{{/client.country}}{{#client.vat}}<br/>{{client.vat}}{{/client.vat}}{{#client.sdi}}<br/>SDI {{client.sdi}}{{/client.sdi}}{{#client.email}}<br/>{{client.email}}{{/client.email}}</div>
  </div>

  <table class="tbl">
    <thead><tr><th>Description</th><th class="c">QTY</th>{{#has_values}}<th class="r">Unit price</th>{{#has_discount}}<th class="r">Disc.</th>{{/has_discount}}<th class="r">Total</th>{{/has_values}}</tr></thead>
    <tbody>{{#items}}
      <tr><td>{{desc}}{{#note}}<div class="ref">{{note}}</div>{{/note}}</td><td class="c">{{qty}}{{#is_goods}} {{unit}}{{/is_goods}}</td>{{#has_values}}<td class="r">{{price}}</td>{{#has_discount}}<td class="r">{{discount}}</td>{{/has_discount}}<td class="r">{{amount}}</td>{{/has_values}}</tr>{{/items}}
    </tbody>
  </table>

  {{#is_goods}}
  <div class="lbl" style="margin-top:12mm">Transport details</div>
  <div class="tp">
      {{#transport.reason}}<div class="tp-row"><span class="tp-k">Reason for transport</span><span>{{transport.reason}}</span></div>{{/transport.reason}}
      {{#transport.appearance}}<div class="tp-row"><span class="tp-k">Goods appearance</span><span>{{transport.appearance}}</span></div>{{/transport.appearance}}
      {{#transport.packages}}<div class="tp-row"><span class="tp-k">Packages</span><span>{{transport.packages}}</span></div>{{/transport.packages}}
      {{#transport.weight}}<div class="tp-row"><span class="tp-k">Weight</span><span>{{transport.weight}}</span></div>{{/transport.weight}}
      {{#transport.carrier}}<div class="tp-row"><span class="tp-k">Carrier</span><span>{{transport.carrier}}</span></div>{{/transport.carrier}}
      {{#transport.carriage}}<div class="tp-row"><span class="tp-k">Carriage</span><span>{{transport.carriage}}</span></div>{{/transport.carriage}}
      {{#transport.date}}<div class="tp-row"><span class="tp-k">Transport date</span><span>{{transport.date}}{{#transport.time}} &middot; {{transport.time}}{{/transport.time}}</span></div>{{/transport.date}}
  </div>
  {{#transport.remarks}}<div class="tp-rem">{{transport.remarks}}</div>{{/transport.remarks}}
  {{/is_goods}}

  {{#has_values}}<div class="tot"><div class="totbox">
    <div class="tr"><span class="k">Subtotal</span><span>{{totals.taxable}}</span></div>
    {{#has_fund}}<div class="tr"><span class="k">incl. pension fund</span><span>{{totals.fund}}</span></div>{{/has_fund}}
    <div class="tr"><span class="k">VAT {{vat_rate_label}}</span><span>{{totals.vat}}</span></div>
    {{#has_stamp}}<div class="tr"><span class="k">Stamp duty</span><span>{{totals.stamp}}</span></div>{{/has_stamp}}
    <div class="tr g"><span class="k">{{#is_credit}}Total credited{{/is_credit}}{{^is_credit}}Total amount due{{/is_credit}}</span><span class="v">{{totals.total}}</span></div>
    {{#has_withholding}}<div class="tr"><span class="k">Withholding</span><span>&minus; {{totals.withholding}}</span></div><div class="tr g"><span class="k">Net to pay</span><span class="v">{{totals.net}}</span></div>{{/has_withholding}}
  </div></div>{{/has_values}}

  {{#is_receipt}}<div class="paid">Payment received via {{payment.method}}{{#date_sp}} on {{date_sp}}{{/date_sp}}.</div>{{/is_receipt}}
  {{#has_tax_notes}}<div class="legal">{{tax_notes}}</div>{{/has_tax_notes}}

  <div class="ft">{{company.email}}{{#company.phone}} &nbsp;&middot;&nbsp; {{company.phone}}{{/company.phone}} &nbsp;&middot;&nbsp; www.almaselitistas.com</div>
</div>

{{#show_bank}}<div class="page">
  <div class="p2head">
    <div class="logo">{{#has_logo}}<img src="{{company.logo}}" alt=""/>{{/has_logo}}</div>
    <div class="pn ser">PAYMENT NOTICE</div>
  </div>
  <div class="p2rule"></div>
  <div class="refband"><span class="ser">PAYMENT REFERENCE</span><span class="div"></span><span class="ser">{{type_label}} {{number}}</span></div>
  <div class="amtrow">
    <div><div class="cap">Total amount due</div><div class="amt ser">{{totals.total}}</div></div>
    <div style="text-align:right"><div class="cap">Currency</div><div class="cur ser">{{currency}}</div></div>
  </div>
  <div class="rule"></div>
  <div class="bdlbl">Banking details</div>
  <div class="bankcard">
    <div class="bk ser">{{company.bank}}</div>
    <div class="bkrule"></div>
    <div class="grid">
      <div><div class="cap">Bank name</div><div class="val ser">{{company.bank}}</div></div>
      <div><div class="cap">Company name</div><div class="val ser">{{company.name}}</div></div>
      {{#company.iban}}<div><div class="cap">IBAN</div><div class="val ser">{{company.iban_plain}}</div></div>{{/company.iban}}
      {{#company.swift}}<div><div class="cap">SWIFT / BIC</div><div class="val ser">{{company.swift}}</div></div>{{/company.swift}}
    </div>
  </div>
  <div class="ft" style="margin-top:24mm">{{company.name}} &nbsp;&middot;&nbsp; {{company.address}}, {{company.cap}} {{company.city}}, {{company.country}}<br/>EORI &mdash; Active and valid for customs purposes &middot; VIES Registered</div>
</div>{{/show_bank}}
</body></html>`;
const TPL_PURO_MOTORS = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<style>
@page{size:A4;margin:0}*{box-sizing:border-box}
body{margin:0;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#1f1f1f;font-size:11.5px;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;min-height:297mm;margin:0 auto;background:#fff;padding:15mm 15mm 12mm}
.head{display:flex;justify-content:flex-end}
.hbox{text-align:right}
.hbox img{max-height:82px;max-width:300px;object-fit:contain;display:inline-block}
.hbox .ad{font-size:10.5px;color:#555;margin-top:6px;line-height:1.5}
.hbox .vat{font-size:10.5px;color:#222;font-weight:700;margin-top:2px}
.hr{height:2px;background:#222;margin:12px 0 16px}
.lab{font-size:13.5px;color:#222}
.party .nm{margin-top:4px}
.party .ad{font-size:11.5px;color:#222;line-height:1.6}
.party .b{font-weight:700}
.invno{font-weight:700;font-size:13.5px;border-bottom:1px solid #d9d9d9;padding-bottom:7px;margin-top:18px}
.subj{color:#821916;font-weight:700;font-size:12.5px;border-bottom:1px solid #e2e2e2;padding-bottom:7px;margin-top:11px}
.meta{display:flex;justify-content:space-between;border-bottom:1px solid #e2e2e2;padding:8px 0 10px;margin-top:6px;font-size:11.5px}
.meta .row{display:flex;gap:12px;padding:1px 0}
.meta .k{color:#666;min-width:80px}
.meta .rt{display:flex;gap:14px}
.greet{margin-top:13px;font-size:11.5px}
.tp{margin-top:10px;border-top:1px solid #e2e2e2}
.tp-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;font-size:11.5px}
.tp-k{color:#666;font-weight:700}
.tp-rem{margin-top:10px;font-size:11px;color:#333}
.paid{margin-top:12px;color:#821916;font-weight:700;font-size:11.5px}
.tbl{width:100%;border-collapse:collapse;margin-top:12px}
.tbl thead{display:table-header-group}
.tbl tbody tr{page-break-inside:avoid}
.tbl th{border-bottom:2px solid #222;text-align:left;font-weight:700;font-size:13.5px;padding:9px 8px}
.tbl th.r{text-align:right}.tbl th.c{text-align:center}
.tbl td{border-bottom:1px solid #e6e6e6;padding:13px 8px;vertical-align:middle;font-size:11.5px}
.tbl td.r{text-align:right}.tbl td.c{text-align:center}
.tbl .cond{font-weight:700;font-size:10.5px;color:#222;margin-top:4px}
.tot{display:flex;justify-content:flex-end;margin-top:0}
.totbox{width:80mm;border-top:1px solid #ccc}
.tr{display:flex;justify-content:space-between;padding:8px 8px;font-size:12.5px}
.tr .k{font-weight:700}
.tr.g{font-weight:700;font-size:13.5px}
.bank{margin-top:14mm}
.bank .h{font-size:11.5px;color:#222;margin-bottom:9px}
.bcols{display:flex;gap:18px;font-size:10.5px;color:#555;line-height:1.55}
.bcols .c{flex:1}
.foot{margin-top:14mm;text-align:center}
.tcbar{background:#821916;color:#fff;font-weight:700;font-size:11.5px;padding:9px 14px;border-radius:2px;display:inline-block;min-width:62%}
.qbar{background:#821916;color:#fff;font-size:10.5px;padding:6px 14px;border-radius:2px;display:inline-block;min-width:42%;margin-top:7px}
</style></head><body>
<div class="page">
  <div class="head"><div class="hbox">
    {{#has_logo}}<img src="{{company.logo}}" alt=""/>{{/has_logo}}{{^has_logo}}<div style="font-weight:700;font-size:20px;color:#821916">{{company.name}}</div>{{/has_logo}}
    <div class="ad">{{company.address}}{{#company.city}}<br/>{{company.city}}, {{company.country}}{{/company.city}}</div>
  </div></div>
  <div class="hr"></div>

  <div class="party">
    <div class="lab">Invoice to :</div>
    <div class="nm">{{client.name}}</div>
    <div class="ad">{{client.address}}<br/>{{client.cap}} {{client.city}}{{#client.country}} {{client.country}}{{/client.country}}{{#client.email}}<br/>{{client.email}}{{/client.email}}{{#client.vat}}<br/><span class="b">VAT# {{client.vat}}</span>{{/client.vat}}</div>
  </div>

  <div class="invno">{{type_label}} {{number}}</div>
  {{#has_subject}}<div class="subj">{{subject}}</div>{{/has_subject}}

  <div class="meta">
    <div>
      <div class="row"><span class="k">date:</span><span>{{date_dot}}</span></div>
      {{#has_due}}<div class="row"><span class="k">payable by:</span><span>{{due_date_dot}}</span></div>{{/has_due}}
      {{#has_valid_until}}<div class="row"><span class="k">valid until:</span><span>{{valid_until_dot}}</span></div>{{/has_valid_until}}
      {{#has_ref}}<div class="row"><span class="k">ref. doc:</span><span>{{ref}}</span></div>{{/has_ref}}
    </div>
    {{#has_contact}}<div class="rt"><span class="k">contact person:</span><span>{{contact_person}}</span></div>{{/has_contact}}
  </div>

  <div class="greet">Dear {{client.name}},{{#is_invoice}}<br/>Thank you for your trust. Your invoice is made up as follows:{{/is_invoice}}{{#is_other_money}}<br/>Thank you for your trust. Please find the details below:{{/is_other_money}}{{#is_goods}}<br/>Please find the delivery details below.{{/is_goods}}</div>

  <table class="tbl">
    <thead><tr><th>Description</th>{{#has_values}}<th class="r">Rate</th>{{#has_discount}}<th class="r">Disc.</th>{{/has_discount}}{{/has_values}}<th class="c">QTY</th>{{#has_values}}<th class="r">Amount</th>{{/has_values}}</tr></thead>
    <tbody>{{#items}}
      <tr><td>{{desc}}{{#note}}<div class="cond">{{note}}</div>{{/note}}</td>{{#has_values}}<td class="r">{{price}}</td>{{#has_discount}}<td class="r">{{discount}}</td>{{/has_discount}}{{/has_values}}<td class="c">{{qty}}{{#is_goods}} {{unit}}{{/is_goods}}</td>{{#has_values}}<td class="r">{{amount}}</td>{{/has_values}}</tr>{{/items}}
    </tbody>
  </table>

  {{#is_goods}}
  <div class="tp">
      {{#transport.reason}}<div class="tp-row"><span class="tp-k">Reason for transport</span><span>{{transport.reason}}</span></div>{{/transport.reason}}
      {{#transport.appearance}}<div class="tp-row"><span class="tp-k">Goods appearance</span><span>{{transport.appearance}}</span></div>{{/transport.appearance}}
      {{#transport.packages}}<div class="tp-row"><span class="tp-k">Packages</span><span>{{transport.packages}}</span></div>{{/transport.packages}}
      {{#transport.weight}}<div class="tp-row"><span class="tp-k">Weight</span><span>{{transport.weight}}</span></div>{{/transport.weight}}
      {{#transport.carrier}}<div class="tp-row"><span class="tp-k">Carrier</span><span>{{transport.carrier}}</span></div>{{/transport.carrier}}
      {{#transport.carriage}}<div class="tp-row"><span class="tp-k">Carriage</span><span>{{transport.carriage}}</span></div>{{/transport.carriage}}
      {{#transport.date}}<div class="tp-row"><span class="tp-k">Transport date</span><span>{{transport.date}}{{#transport.time}} &middot; {{transport.time}}{{/transport.time}}</span></div>{{/transport.date}}
  </div>
  {{#transport.remarks}}<div class="tp-rem"><b>Remarks:</b> {{transport.remarks}}</div>{{/transport.remarks}}
  {{/is_goods}}

  {{#has_values}}<div class="tot"><div class="totbox">
    <div class="tr"><span class="k">Subtotal</span><span>{{totals.taxable}}</span></div>
    {{#has_fund}}<div class="tr"><span>incl. pension fund</span><span>{{totals.fund}}</span></div>{{/has_fund}}
    <div class="tr"><span>Tax {{vat_rate_label}}</span><span>{{totals.vat}}</span></div>
    {{#has_stamp}}<div class="tr"><span>Stamp duty</span><span>{{totals.stamp}}</span></div>{{/has_stamp}}
    <div class="tr g"><span>{{#is_credit}}Total Credited{{/is_credit}}{{^is_credit}}Total{{/is_credit}}</span><span>{{totals.total}}</span></div>
    {{#has_withholding}}<div class="tr"><span>Withholding</span><span>&minus; {{totals.withholding}}</span></div><div class="tr g"><span>Net to Pay</span><span>{{totals.net}}</span></div>{{/has_withholding}}
  </div></div>{{/has_values}}

  {{#is_receipt}}<div class="paid">Payment received via {{payment.method}}{{#date_dot}} on {{date_dot}}{{/date_dot}}.</div>{{/is_receipt}}

  {{#show_bank}}<div class="bank">
    <div class="h">Bank Details:</div>
    <div class="bcols">
      <div class="c">AED Account Details:<br/>PUROSANGUE MOTORS L.L.C-F.Z<br/>AE03 0860 0000 0965 9696 419<br/>WIOBAEADXXX</div>
      <div class="c">USD Account Details:<br/>PUROSANGUE MOTORS L.L.C-F.Z<br/>AE90 0860 0000 0955 2721 798<br/>WIOBAEADXXX</div>
      <div class="c">EUR Account Details:<br/>PUROSANGUE MOTORS L.L.C-F.Z<br/>AE53 0860 0000 0937 5026 418<br/>WIOBAEADXXX</div>
    </div>
  </div>{{/show_bank}}

  <div class="foot">
    {{#has_tax_notes}}<div class="tcbar">Terms &amp; Conditions: &ldquo;{{tax_notes}}&rdquo;</div>{{/has_tax_notes}}
    <br/><div class="qbar">Do you have any questions? Get in touch with us.</div>
  </div>
</div>
</body></html>`;
const TPL_PURO_WATCHES = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<style>
@page{size:A4;margin:0}*{box-sizing:border-box}
body{margin:0;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#1f1f1f;font-size:11.5px;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;min-height:297mm;margin:0 auto;background:#fff;padding:15mm 15mm 12mm}
.head{display:flex;justify-content:flex-end}
.hbox{text-align:right}
.hbox img{max-height:82px;max-width:300px;object-fit:contain;display:inline-block}
.hbox .ad{font-size:10.5px;color:#555;margin-top:6px;line-height:1.5}
.hbox .vat{font-size:10.5px;color:#222;font-weight:700;margin-top:2px}
.hr{height:2px;background:#222;margin:12px 0 16px}
.lab{font-size:13.5px;color:#222}
.party .nm{margin-top:4px}
.party .ad{font-size:11.5px;color:#222;line-height:1.6}
.party .b{font-weight:700}
.invno{font-weight:700;font-size:13.5px;border-bottom:1px solid #d9d9d9;padding-bottom:7px;margin-top:18px}
.subj{color:#821916;font-weight:700;font-size:12.5px;border-bottom:1px solid #e2e2e2;padding-bottom:7px;margin-top:11px}
.meta{display:flex;justify-content:space-between;border-bottom:1px solid #e2e2e2;padding:8px 0 10px;margin-top:6px;font-size:11.5px}
.meta .row{display:flex;gap:12px;padding:1px 0}
.meta .k{color:#666;min-width:80px}
.meta .rt{display:flex;gap:14px}
.greet{margin-top:13px;font-size:11.5px}
.tp{margin-top:10px;border-top:1px solid #e2e2e2}
.tp-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;font-size:11.5px}
.tp-k{color:#666;font-weight:700}
.tp-rem{margin-top:10px;font-size:11px;color:#333}
.paid{margin-top:12px;color:#821916;font-weight:700;font-size:11.5px}
.tbl{width:100%;border-collapse:collapse;margin-top:12px}
.tbl thead{display:table-header-group}
.tbl tbody tr{page-break-inside:avoid}
.tbl th{border-bottom:2px solid #222;text-align:left;font-weight:700;font-size:13.5px;padding:9px 8px}
.tbl th.r{text-align:right}.tbl th.c{text-align:center}
.tbl td{padding:14px 8px;vertical-align:middle;font-size:11.5px}
.tbl td.r{text-align:right}.tbl td.c{text-align:center}
.trow{display:flex;justify-content:flex-end;border-top:1px solid #d9d9d9}
.trow .box{width:64mm;display:flex;justify-content:space-between;padding:14px 8px;font-size:12.5px}
.trow .k{font-weight:700}
.trow.g .box{font-size:13.5px}
.bank{margin-top:14mm;font-size:10.5px;color:#444}
.bank .h{font-size:11.5px;color:#222;margin-bottom:8px}
.foot{margin-top:12mm;text-align:center}
.tcbar{background:#821916;color:#fff;font-weight:700;font-size:11.5px;padding:9px 14px;border-radius:2px;display:inline-block;min-width:62%}
.qbar{background:#821916;color:#fff;font-size:10.5px;padding:6px 14px;border-radius:2px;display:inline-block;min-width:42%;margin-top:7px}
</style></head><body>
<div class="page">
  <div class="head"><div class="hbox">
    {{#has_logo}}<img src="{{company.logo}}" alt=""/>{{/has_logo}}{{^has_logo}}<div style="font-weight:700;font-size:20px;color:#821916">{{company.name}}</div>{{/has_logo}}
    <div class="ad">{{company.address}}{{#company.city}} {{company.cap}} {{company.city}} {{company.country}}{{/company.city}}</div>
    {{#company.vat}}<div class="vat">VAT: {{company.vat}}</div>{{/company.vat}}
  </div></div>
  <div class="hr"></div>

  <div class="party">
    <div class="lab">Invoice to :</div>
    <div class="nm">{{client.name}}</div>
    <div class="ad">{{client.address}}<br/>{{client.cap}} {{client.city}}{{#client.email}}<br/>{{client.email}}{{/client.email}}{{#client.vat}}<br/>VAT# {{client.vat}}{{/client.vat}}</div>
  </div>

  <div class="invno">{{type_label}} {{number}}</div>
  {{#has_subject}}<div class="subj">{{subject}}</div>{{/has_subject}}

  <div class="meta">
    <div>
      <div class="row"><span class="k">date:</span><span>{{date_dot}}</span></div>
      {{#has_due}}<div class="row"><span class="k">payable by:</span><span>{{due_date_dot}}</span></div>{{/has_due}}
      {{#has_valid_until}}<div class="row"><span class="k">valid until:</span><span>{{valid_until_dot}}</span></div>{{/has_valid_until}}
      {{#has_ref}}<div class="row"><span class="k">ref. doc:</span><span>{{ref}}</span></div>{{/has_ref}}
    </div>
    {{#has_contact}}<div class="rt"><span class="k">contact person:</span><span>{{contact_person}}</span></div>{{/has_contact}}
  </div>

  <div class="greet">Dear {{client.name}},{{#is_invoice}}<br/>Thank you for your trust. Your invoice is made up as follows:{{/is_invoice}}{{#is_other_money}}<br/>Thank you for your trust. Please find the details below:{{/is_other_money}}{{#is_goods}}<br/>Please find the delivery details below.{{/is_goods}}</div>

  <table class="tbl">
    <thead><tr><th>Description</th>{{#has_values}}<th class="r">Rate</th>{{#has_discount}}<th class="r">Disc.</th>{{/has_discount}}{{/has_values}}<th class="c">QTY</th>{{#has_values}}<th class="r">Amount</th>{{/has_values}}</tr></thead>
    <tbody>{{#items}}
      <tr><td>{{desc}}{{#note}}<div class="cond" style="font-weight:700;font-size:10.5px;margin-top:4px">{{note}}</div>{{/note}}</td>{{#has_values}}<td class="r">{{price}}</td>{{#has_discount}}<td class="r">{{discount}}</td>{{/has_discount}}{{/has_values}}<td class="c">{{qty}}{{#is_goods}} {{unit}}{{/is_goods}}</td>{{#has_values}}<td class="r">{{amount}}</td>{{/has_values}}</tr>{{/items}}
    </tbody>
  </table>

  {{#is_goods}}
  <div class="tp">
      {{#transport.reason}}<div class="tp-row"><span class="tp-k">Reason for transport</span><span>{{transport.reason}}</span></div>{{/transport.reason}}
      {{#transport.appearance}}<div class="tp-row"><span class="tp-k">Goods appearance</span><span>{{transport.appearance}}</span></div>{{/transport.appearance}}
      {{#transport.packages}}<div class="tp-row"><span class="tp-k">Packages</span><span>{{transport.packages}}</span></div>{{/transport.packages}}
      {{#transport.weight}}<div class="tp-row"><span class="tp-k">Weight</span><span>{{transport.weight}}</span></div>{{/transport.weight}}
      {{#transport.carrier}}<div class="tp-row"><span class="tp-k">Carrier</span><span>{{transport.carrier}}</span></div>{{/transport.carrier}}
      {{#transport.carriage}}<div class="tp-row"><span class="tp-k">Carriage</span><span>{{transport.carriage}}</span></div>{{/transport.carriage}}
      {{#transport.date}}<div class="tp-row"><span class="tp-k">Transport date</span><span>{{transport.date}}{{#transport.time}} &middot; {{transport.time}}{{/transport.time}}</span></div>{{/transport.date}}
  </div>
  {{#transport.remarks}}<div class="tp-rem"><b>Remarks:</b> {{transport.remarks}}</div>{{/transport.remarks}}
  {{/is_goods}}

  {{#has_values}}
  <div class="trow"><div class="box"><span class="k">Subtotal</span><span>{{totals.taxable}}</span></div></div>
  {{#has_fund}}<div class="trow" style="margin-top:10px"><div class="box"><span class="k">incl. pension fund</span><span>{{totals.fund}}</span></div></div>{{/has_fund}}
  <div class="trow" style="margin-top:14px"><div class="box"><span class="k">Tax {{vat_rate_label}}</span><span>{{totals.vat}}</span></div></div>
  {{#has_stamp}}<div class="trow" style="margin-top:10px"><div class="box"><span class="k">Stamp duty</span><span>{{totals.stamp}}</span></div></div>{{/has_stamp}}
  <div class="trow g" style="margin-top:14px"><div class="box"><span class="k">{{#is_credit}}Total Credited{{/is_credit}}{{^is_credit}}Amount Due{{/is_credit}}</span><span class="k">{{totals.total}}</span></div></div>
  {{#has_withholding}}<div class="trow" style="margin-top:10px"><div class="box"><span class="k">Withholding</span><span>&minus; {{totals.withholding}}</span></div></div><div class="trow g" style="margin-top:14px"><div class="box"><span class="k">Net to Pay</span><span class="k">{{totals.net}}</span></div></div>{{/has_withholding}}
  {{/has_values}}

  {{#is_receipt}}<div class="paid">Payment received via {{payment.method}}{{#date_dot}} on {{date_dot}}{{/date_dot}}.</div>{{/is_receipt}}

  {{#show_bank}}{{#has_bank_info}}<div class="bank"><div class="h">Bank Details:</div>{{{company.bank_info}}}</div>{{/has_bank_info}}{{/show_bank}}

  <div class="foot">
    {{#has_tax_notes}}<div class="tcbar">Terms &amp; Conditions: &ldquo;{{tax_notes}}&rdquo;</div>{{/has_tax_notes}}
    <br/><div class="qbar">Do you have any questions? Get in touch with us.</div>
  </div>
</div>
</body></html>`;



const TPL_ESTIVAL_BUY = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<style>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');
@page{size:A4;margin:0}*{box-sizing:border-box}
body{margin:0;font-family:'Montserrat',Arial,sans-serif;color:#2b2b2b;font-size:11.5px;line-height:1.55;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;min-height:297mm;margin:0 auto;background:#fff;padding:15mm 16mm}
.ahead{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}
.alogo img{max-height:80px;max-width:260px;object-fit:contain}
.nmfb{font-weight:800;font-size:20px;color:#c6a161}
.acontact{text-align:right;font-size:10.5px;color:#555;line-height:1.6}
.atitle{background:#c6a161;color:#fff;text-transform:uppercase;letter-spacing:.12em;font-weight:700;font-size:12px;padding:11px 16px;border-radius:4px;margin-top:16px;text-align:center}
.ameta{display:flex;gap:14px;margin-top:16px}
.abox{flex:1;border:1.5px solid #b9c2cf;border-radius:8px;padding:12px 14px;font-size:11px;line-height:1.55}
.abox .h{text-transform:uppercase;letter-spacing:.1em;font-size:9px;font-weight:700;color:#c6a161}
.abox .v{margin-top:4px}
.abox .vb{font-weight:700;font-size:13px;color:#2b2b2b}
.abox .b{font-weight:700}
.atbl{width:100%;border-collapse:collapse;margin-top:18px}
.atbl thead{display:table-header-group}
.atbl th{background:#c6a161;color:#fff;text-transform:uppercase;letter-spacing:.05em;font-size:9.5px;font-weight:700;padding:10px 14px;text-align:left}
.atbl th.r{text-align:right}
.atbl tbody tr{page-break-inside:avoid}
.atbl td{padding:13px 14px;border-bottom:1px solid #ececec;font-size:11.5px;vertical-align:top}
.atbl td.r{text-align:right;white-space:nowrap}
.atbl .sub{color:#7a828d;font-size:10.5px}
.atot{display:flex;justify-content:flex-end;margin-top:6px}
.atotbox{width:84mm}
.atr{display:flex;justify-content:space-between;padding:7px 14px;font-size:11.5px}
.atr.g{border-top:1px solid #e3e3e3;font-weight:800;font-size:13px;color:#c6a161}
.adecl{margin-top:14mm;border-radius:8px;padding:16px 20px;background:#143559;color:#cdd6e2}
.adecl .h{text-transform:uppercase;letter-spacing:.08em;font-size:9.5px;font-weight:700;color:#c6a161;margin-top:11px}
.adecl .h:first-child{margin-top:0}
.adecl p{margin:4px 0 0;font-size:10.5px;line-height:1.6}
.asign{display:flex;justify-content:space-between;gap:40px;margin-top:20mm}
.asig{flex:1;text-align:center;text-transform:uppercase;letter-spacing:.1em;font-size:10px;font-weight:700;color:#2b2b2b}
.asig .line{border-top:1.5px solid #333;margin-bottom:8px}
</style></head><body>
<div class="page">
  <div class="ahead">
    <div class="alogo">{{#has_logo}}<img src="{{company.logo}}" alt=""/>{{/has_logo}}{{^has_logo}}<div class="nmfb">{{company.name}}</div>{{/has_logo}}</div>
    <div class="acontact">{{#company.email}}<div>{{company.email}}</div>{{/company.email}}{{#company.phone}}<div>{{company.phone}}</div>{{/company.phone}}<div>{{company.address}}{{#company.city}}, {{company.city}}{{/company.city}}{{#company.country}}, {{company.country}}{{/company.country}}</div>{{#company.vat}}<div>VAT# {{company.vat}}</div>{{/company.vat}}</div>
  </div>

  <div class="atitle">Purchase Invoice / Acquisition Note</div>
  <div class="ameta">
    <div class="abox"><div class="h">Voucher No</div><div class="v vb">{{number}}</div><div class="h" style="margin-top:9px">Date</div><div class="v vb">{{date_dot}}</div></div>
    <div class="abox"><div class="h">Seller</div><div class="v"><span class="b">{{client.name}}</span><br/>{{client.address}}{{#client.cap}}, {{client.cap}}{{/client.cap}}{{#client.city}}<br/>{{client.city}}{{/client.city}}{{#client.country}}, {{client.country}}{{/client.country}}{{#client.email}}<br/>{{client.email}}{{/client.email}}{{#client.vat}}<br/>VAT# {{client.vat}}{{/client.vat}}</div></div>
    <div class="abox"><div class="h">Buyer</div><div class="v"><span class="b">{{company.name}}</span><br/>{{company.address}}{{#company.city}}<br/>{{company.city}}{{/company.city}}{{#company.cap}} {{company.cap}}{{/company.cap}}{{#company.country}}<br/>{{company.country}}{{/company.country}}{{#company.vat}}<br/>VAT# {{company.vat}}{{/company.vat}}</div></div>
  </div>
  <table class="atbl">
    <thead><tr><th>Description</th><th class="r">Purchase price</th></tr></thead>
    <tbody>{{#items}}<tr><td>{{desc}}{{#note}}<br/><span class="sub">{{note}}</span>{{/note}}</td><td class="r">{{amount}}</td></tr>{{/items}}</tbody>
  </table>
  <div class="atot"><div class="atotbox">
    <div class="atr"><span>Subtotal</span><span>{{totals.taxable}}</span></div>
    <div class="atr"><span>VAT {{vat_rate_label}}</span><span>{{totals.vat}}</span></div>
    <div class="atr g"><span>Grand Total</span><span>{{totals.total}}</span></div>
  </div></div>
  <div class="adecl">
    {{#has_acq_seller}}<div class="h">Seller declaration</div><p>{{acq_seller}}</p>{{/has_acq_seller}}
    {{#has_acq_buyer}}<div class="h">Buyer note</div><p>{{acq_buyer}}</p>{{/has_acq_buyer}}
    {{#has_acq_vat}}<div class="h">VAT margin scheme note (if applicable)</div><p>{{acq_vat}}</p>{{/has_acq_vat}}
  </div>
  <div class="asign">
    <div class="asig"><div class="line"></div>Seller signature</div>
    <div class="asig"><div class="line"></div>Buyer signature</div>
  </div>
</div>
</body></html>`;

const TPL_PURO_MOTORS_BUY = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<style>
@page{size:A4;margin:0}*{box-sizing:border-box}
body{margin:0;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#1f1f1f;font-size:11.5px;line-height:1.55;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;min-height:297mm;margin:0 auto;background:#fff;padding:15mm 16mm}
.ahead{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}
.alogo img{max-height:80px;max-width:260px;object-fit:contain}
.nmfb{font-weight:800;font-size:20px;color:#821916}
.acontact{text-align:right;font-size:10.5px;color:#555;line-height:1.6}
.atitle{background:#821916;color:#fff;text-transform:uppercase;letter-spacing:.12em;font-weight:700;font-size:12px;padding:11px 16px;border-radius:4px;margin-top:16px;text-align:center}
.ameta{display:flex;gap:14px;margin-top:16px}
.abox{flex:1;border:1.5px solid #dddddd;border-radius:8px;padding:12px 14px;font-size:11px;line-height:1.55}
.abox .h{text-transform:uppercase;letter-spacing:.1em;font-size:9px;font-weight:700;color:#821916}
.abox .v{margin-top:4px}
.abox .vb{font-weight:700;font-size:13px;color:#1f1f1f}
.abox .b{font-weight:700}
.atbl{width:100%;border-collapse:collapse;margin-top:18px}
.atbl thead{display:table-header-group}
.atbl th{background:#821916;color:#fff;text-transform:uppercase;letter-spacing:.05em;font-size:9.5px;font-weight:700;padding:10px 14px;text-align:left}
.atbl th.r{text-align:right}
.atbl tbody tr{page-break-inside:avoid}
.atbl td{padding:13px 14px;border-bottom:1px solid #ececec;font-size:11.5px;vertical-align:top}
.atbl td.r{text-align:right;white-space:nowrap}
.atbl .sub{color:#7a828d;font-size:10.5px}
.atot{display:flex;justify-content:flex-end;margin-top:6px}
.atotbox{width:84mm}
.atr{display:flex;justify-content:space-between;padding:7px 14px;font-size:11.5px}
.atr.g{border-top:1px solid #e3e3e3;font-weight:800;font-size:13px;color:#821916}
.adecl{margin-top:14mm;border-radius:8px;padding:16px 20px;background:#1f1f1f;color:#cfcfcf}
.adecl .h{text-transform:uppercase;letter-spacing:.08em;font-size:9.5px;font-weight:700;color:#ffffff;margin-top:11px}
.adecl .h:first-child{margin-top:0}
.adecl p{margin:4px 0 0;font-size:10.5px;line-height:1.6}
.asign{display:flex;justify-content:space-between;gap:40px;margin-top:20mm}
.asig{flex:1;text-align:center;text-transform:uppercase;letter-spacing:.1em;font-size:10px;font-weight:700;color:#1f1f1f}
.asig .line{border-top:1.5px solid #333;margin-bottom:8px}
</style></head><body>
<div class="page">
  <div class="ahead">
    <div class="alogo">{{#has_logo}}<img src="{{company.logo}}" alt=""/>{{/has_logo}}{{^has_logo}}<div class="nmfb">{{company.name}}</div>{{/has_logo}}</div>
    <div class="acontact">{{#company.email}}<div>{{company.email}}</div>{{/company.email}}{{#company.phone}}<div>{{company.phone}}</div>{{/company.phone}}<div>{{company.address}}{{#company.city}}, {{company.city}}{{/company.city}}{{#company.country}}, {{company.country}}{{/company.country}}</div>{{#company.vat}}<div>VAT# {{company.vat}}</div>{{/company.vat}}</div>
  </div>

  <div class="atitle">Purchase Invoice / Acquisition Note</div>
  <div class="ameta">
    <div class="abox"><div class="h">Voucher No</div><div class="v vb">{{number}}</div><div class="h" style="margin-top:9px">Date</div><div class="v vb">{{date_dot}}</div></div>
    <div class="abox"><div class="h">Seller</div><div class="v"><span class="b">{{client.name}}</span><br/>{{client.address}}{{#client.cap}}, {{client.cap}}{{/client.cap}}{{#client.city}}<br/>{{client.city}}{{/client.city}}{{#client.country}}, {{client.country}}{{/client.country}}{{#client.email}}<br/>{{client.email}}{{/client.email}}{{#client.vat}}<br/>VAT# {{client.vat}}{{/client.vat}}</div></div>
    <div class="abox"><div class="h">Buyer</div><div class="v"><span class="b">{{company.name}}</span><br/>{{company.address}}{{#company.city}}<br/>{{company.city}}{{/company.city}}{{#company.cap}} {{company.cap}}{{/company.cap}}{{#company.country}}<br/>{{company.country}}{{/company.country}}{{#company.vat}}<br/>VAT# {{company.vat}}{{/company.vat}}</div></div>
  </div>
  <table class="atbl">
    <thead><tr><th>Description</th><th class="r">Purchase price</th></tr></thead>
    <tbody>{{#items}}<tr><td>{{desc}}{{#note}}<br/><span class="sub">{{note}}</span>{{/note}}</td><td class="r">{{amount}}</td></tr>{{/items}}</tbody>
  </table>
  <div class="atot"><div class="atotbox">
    <div class="atr"><span>Subtotal</span><span>{{totals.taxable}}</span></div>
    <div class="atr"><span>VAT {{vat_rate_label}}</span><span>{{totals.vat}}</span></div>
    <div class="atr g"><span>Grand Total</span><span>{{totals.total}}</span></div>
  </div></div>
  <div class="adecl">
    {{#has_acq_seller}}<div class="h">Seller declaration</div><p>{{acq_seller}}</p>{{/has_acq_seller}}
    {{#has_acq_buyer}}<div class="h">Buyer note</div><p>{{acq_buyer}}</p>{{/has_acq_buyer}}
    {{#has_acq_vat}}<div class="h">VAT margin scheme note (if applicable)</div><p>{{acq_vat}}</p>{{/has_acq_vat}}
  </div>
  <div class="asign">
    <div class="asig"><div class="line"></div>Seller signature</div>
    <div class="asig"><div class="line"></div>Buyer signature</div>
  </div>
</div>
</body></html>`;

const TPL_PURO_WATCHES_BUY = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<style>
@page{size:A4;margin:0}*{box-sizing:border-box}
body{margin:0;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#1f1f1f;font-size:11.5px;line-height:1.55;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;min-height:297mm;margin:0 auto;background:#fff;padding:15mm 16mm}
.ahead{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}
.alogo img{max-height:80px;max-width:260px;object-fit:contain}
.nmfb{font-weight:800;font-size:20px;color:#821916}
.acontact{text-align:right;font-size:10.5px;color:#555;line-height:1.6}
.atitle{background:#821916;color:#fff;text-transform:uppercase;letter-spacing:.12em;font-weight:700;font-size:12px;padding:11px 16px;border-radius:4px;margin-top:16px;text-align:center}
.ameta{display:flex;gap:14px;margin-top:16px}
.abox{flex:1;border:1.5px solid #dddddd;border-radius:8px;padding:12px 14px;font-size:11px;line-height:1.55}
.abox .h{text-transform:uppercase;letter-spacing:.1em;font-size:9px;font-weight:700;color:#821916}
.abox .v{margin-top:4px}
.abox .vb{font-weight:700;font-size:13px;color:#1f1f1f}
.abox .b{font-weight:700}
.atbl{width:100%;border-collapse:collapse;margin-top:18px}
.atbl thead{display:table-header-group}
.atbl th{background:#821916;color:#fff;text-transform:uppercase;letter-spacing:.05em;font-size:9.5px;font-weight:700;padding:10px 14px;text-align:left}
.atbl th.r{text-align:right}
.atbl tbody tr{page-break-inside:avoid}
.atbl td{padding:13px 14px;border-bottom:1px solid #ececec;font-size:11.5px;vertical-align:top}
.atbl td.r{text-align:right;white-space:nowrap}
.atbl .sub{color:#7a828d;font-size:10.5px}
.atot{display:flex;justify-content:flex-end;margin-top:6px}
.atotbox{width:84mm}
.atr{display:flex;justify-content:space-between;padding:7px 14px;font-size:11.5px}
.atr.g{border-top:1px solid #e3e3e3;font-weight:800;font-size:13px;color:#821916}
.adecl{margin-top:14mm;border-radius:8px;padding:16px 20px;background:#1f1f1f;color:#cfcfcf}
.adecl .h{text-transform:uppercase;letter-spacing:.08em;font-size:9.5px;font-weight:700;color:#ffffff;margin-top:11px}
.adecl .h:first-child{margin-top:0}
.adecl p{margin:4px 0 0;font-size:10.5px;line-height:1.6}
.asign{display:flex;justify-content:space-between;gap:40px;margin-top:20mm}
.asig{flex:1;text-align:center;text-transform:uppercase;letter-spacing:.1em;font-size:10px;font-weight:700;color:#1f1f1f}
.asig .line{border-top:1.5px solid #333;margin-bottom:8px}
</style></head><body>
<div class="page">
  <div class="ahead">
    <div class="alogo">{{#has_logo}}<img src="{{company.logo}}" alt=""/>{{/has_logo}}{{^has_logo}}<div class="nmfb">{{company.name}}</div>{{/has_logo}}</div>
    <div class="acontact">{{#company.email}}<div>{{company.email}}</div>{{/company.email}}{{#company.phone}}<div>{{company.phone}}</div>{{/company.phone}}<div>{{company.address}}{{#company.city}}, {{company.city}}{{/company.city}}{{#company.country}}, {{company.country}}{{/company.country}}</div>{{#company.vat}}<div>VAT# {{company.vat}}</div>{{/company.vat}}</div>
  </div>

  <div class="atitle">Purchase Invoice / Acquisition Note</div>
  <div class="ameta">
    <div class="abox"><div class="h">Voucher No</div><div class="v vb">{{number}}</div><div class="h" style="margin-top:9px">Date</div><div class="v vb">{{date_dot}}</div></div>
    <div class="abox"><div class="h">Seller</div><div class="v"><span class="b">{{client.name}}</span><br/>{{client.address}}{{#client.cap}}, {{client.cap}}{{/client.cap}}{{#client.city}}<br/>{{client.city}}{{/client.city}}{{#client.country}}, {{client.country}}{{/client.country}}{{#client.email}}<br/>{{client.email}}{{/client.email}}{{#client.vat}}<br/>VAT# {{client.vat}}{{/client.vat}}</div></div>
    <div class="abox"><div class="h">Buyer</div><div class="v"><span class="b">{{company.name}}</span><br/>{{company.address}}{{#company.city}}<br/>{{company.city}}{{/company.city}}{{#company.cap}} {{company.cap}}{{/company.cap}}{{#company.country}}<br/>{{company.country}}{{/company.country}}{{#company.vat}}<br/>VAT# {{company.vat}}{{/company.vat}}</div></div>
  </div>
  <table class="atbl">
    <thead><tr><th>Description</th><th class="r">Purchase price</th></tr></thead>
    <tbody>{{#items}}<tr><td>{{desc}}{{#note}}<br/><span class="sub">{{note}}</span>{{/note}}</td><td class="r">{{amount}}</td></tr>{{/items}}</tbody>
  </table>
  <div class="atot"><div class="atotbox">
    <div class="atr"><span>Subtotal</span><span>{{totals.taxable}}</span></div>
    <div class="atr"><span>VAT {{vat_rate_label}}</span><span>{{totals.vat}}</span></div>
    <div class="atr g"><span>Grand Total</span><span>{{totals.total}}</span></div>
  </div></div>
  <div class="adecl">
    {{#has_acq_seller}}<div class="h">Seller declaration</div><p>{{acq_seller}}</p>{{/has_acq_seller}}
    {{#has_acq_buyer}}<div class="h">Buyer note</div><p>{{acq_buyer}}</p>{{/has_acq_buyer}}
    {{#has_acq_vat}}<div class="h">VAT margin scheme note (if applicable)</div><p>{{acq_vat}}</p>{{/has_acq_vat}}
  </div>
  <div class="asign">
    <div class="asig"><div class="line"></div>Seller signature</div>
    <div class="asig"><div class="line"></div>Buyer signature</div>
  </div>
</div>
</body></html>`;

const TPL_ALMAS_BUY = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&display=swap');
@page{size:A4;margin:0}*{box-sizing:border-box}
body{margin:0;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#2b2b2b;font-size:11.5px;line-height:1.55;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;min-height:297mm;margin:0 auto;background:#f5f3f0;padding:15mm 16mm}
.ahead{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}
.alogo img{max-height:80px;max-width:260px;object-fit:contain}
.nmfb{font-weight:800;font-size:20px;color:#5b1824}
.acontact{text-align:right;font-size:10.5px;color:#555;line-height:1.6}
.atitle{background:#5b1824;color:#fff;text-transform:uppercase;letter-spacing:.12em;font-weight:700;font-size:12px;padding:11px 16px;border-radius:4px;margin-top:16px;text-align:center}
.ameta{display:flex;gap:14px;margin-top:16px}
.abox{flex:1;border:1.5px solid #d8d3c7;border-radius:8px;padding:12px 14px;font-size:11px;line-height:1.55}
.abox .h{text-transform:uppercase;letter-spacing:.1em;font-size:9px;font-weight:700;color:#5b1824}
.abox .v{margin-top:4px}
.abox .vb{font-weight:700;font-size:13px;color:#2b2b2b}
.abox .b{font-weight:700}
.atbl{width:100%;border-collapse:collapse;margin-top:18px}
.atbl thead{display:table-header-group}
.atbl th{background:#5b1824;color:#fff;text-transform:uppercase;letter-spacing:.05em;font-size:9.5px;font-weight:700;padding:10px 14px;text-align:left}
.atbl th.r{text-align:right}
.atbl tbody tr{page-break-inside:avoid}
.atbl td{padding:13px 14px;border-bottom:1px solid #ececec;font-size:11.5px;vertical-align:top}
.atbl td.r{text-align:right;white-space:nowrap}
.atbl .sub{color:#7a828d;font-size:10.5px}
.atot{display:flex;justify-content:flex-end;margin-top:6px}
.atotbox{width:84mm}
.atr{display:flex;justify-content:space-between;padding:7px 14px;font-size:11.5px}
.atr.g{border-top:1px solid #e3e3e3;font-weight:800;font-size:13px;color:#5b1824}
.adecl{margin-top:14mm;border-radius:8px;padding:16px 20px;background:#ece8e3;color:#3a2b2e}
.adecl .h{text-transform:uppercase;letter-spacing:.08em;font-size:9.5px;font-weight:700;color:#5b1824;margin-top:11px}
.adecl .h:first-child{margin-top:0}
.adecl p{margin:4px 0 0;font-size:10.5px;line-height:1.6}
.asign{display:flex;justify-content:space-between;gap:40px;margin-top:20mm}
.asig{flex:1;text-align:center;text-transform:uppercase;letter-spacing:.1em;font-size:10px;font-weight:700;color:#2b2b2b}
.asig .line{border-top:1.5px solid #333;margin-bottom:8px}
.atitle{font-family:'Cormorant Garamond',Georgia,serif;letter-spacing:.18em;font-weight:600;font-size:14px}
.atr.g{font-family:'Cormorant Garamond',Georgia,serif;font-size:15px;font-weight:600}
.abox .vb{font-family:'Cormorant Garamond',Georgia,serif;font-size:15px}
</style></head><body>
<div class="page">
  <div class="ahead">
    <div class="alogo">{{#has_logo}}<img src="{{company.logo}}" alt=""/>{{/has_logo}}{{^has_logo}}<div class="nmfb">{{company.name}}</div>{{/has_logo}}</div>
    <div class="acontact">{{#company.email}}<div>{{company.email}}</div>{{/company.email}}{{#company.phone}}<div>{{company.phone}}</div>{{/company.phone}}<div>{{company.address}}{{#company.city}}, {{company.city}}{{/company.city}}{{#company.country}}, {{company.country}}{{/company.country}}</div>{{#company.vat}}<div>VAT# {{company.vat}}</div>{{/company.vat}}</div>
  </div>

  <div class="atitle">Purchase Invoice / Acquisition Note</div>
  <div class="ameta">
    <div class="abox"><div class="h">Voucher No</div><div class="v vb">{{number}}</div><div class="h" style="margin-top:9px">Date</div><div class="v vb">{{date_dot}}</div></div>
    <div class="abox"><div class="h">Seller</div><div class="v"><span class="b">{{client.name}}</span><br/>{{client.address}}{{#client.cap}}, {{client.cap}}{{/client.cap}}{{#client.city}}<br/>{{client.city}}{{/client.city}}{{#client.country}}, {{client.country}}{{/client.country}}{{#client.email}}<br/>{{client.email}}{{/client.email}}{{#client.vat}}<br/>VAT# {{client.vat}}{{/client.vat}}</div></div>
    <div class="abox"><div class="h">Buyer</div><div class="v"><span class="b">{{company.name}}</span><br/>{{company.address}}{{#company.city}}<br/>{{company.city}}{{/company.city}}{{#company.cap}} {{company.cap}}{{/company.cap}}{{#company.country}}<br/>{{company.country}}{{/company.country}}{{#company.vat}}<br/>VAT# {{company.vat}}{{/company.vat}}</div></div>
  </div>
  <table class="atbl">
    <thead><tr><th>Description</th><th class="r">Purchase price</th></tr></thead>
    <tbody>{{#items}}<tr><td>{{desc}}{{#note}}<br/><span class="sub">{{note}}</span>{{/note}}</td><td class="r">{{amount}}</td></tr>{{/items}}</tbody>
  </table>
  <div class="atot"><div class="atotbox">
    <div class="atr"><span>Subtotal</span><span>{{totals.taxable}}</span></div>
    <div class="atr"><span>VAT {{vat_rate_label}}</span><span>{{totals.vat}}</span></div>
    <div class="atr g"><span>Grand Total</span><span>{{totals.total}}</span></div>
  </div></div>
  <div class="adecl">
    {{#has_acq_seller}}<div class="h">Seller declaration</div><p>{{acq_seller}}</p>{{/has_acq_seller}}
    {{#has_acq_buyer}}<div class="h">Buyer note</div><p>{{acq_buyer}}</p>{{/has_acq_buyer}}
    {{#has_acq_vat}}<div class="h">VAT margin scheme note (if applicable)</div><p>{{acq_vat}}</p>{{/has_acq_vat}}
  </div>
  <div class="asign">
    <div class="asig"><div class="line"></div>Seller signature</div>
    <div class="asig"><div class="line"></div>Buyer signature</div>
  </div>
</div>
</body></html>`;

const SAMPLE_PDF = "data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA1OTUgODQyXSAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA1IDAgUiA+PiA+PiAvQ29udGVudHMgNCAwIFIgPj4KZW5kb2JqCjQgMCBvYmoKPDwgL0xlbmd0aCAyMDMgPj4Kc3RyZWFtCkJUIC9GMSAyMiBUZiA2MCA3NzAgVGQgKFNBTVBMRSBTVVBQTElFUiBJTlZPSUNFKSBUaiAvRjEgMTIgVGYgMCAtMzQgVGQgKEV4YW1wbGUgdXBsb2FkZWQgcHVyY2hhc2UgZG9jdW1lbnQgLSByZXBsYWNlIHdpdGggYSByZWFsIFBERi4pIFRqIDAgLTE4IFRkIChIZWxkIGluIHRoZSBzeXN0ZW0gZm9yIGFjY291bnRpbmcgLyBWQVQgcmVjb3Jkcy4pIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKNSAwIG9iago8PCAvVHlwZSAvRm9udCAvU3VidHlwZSAvVHlwZTEgL0Jhc2VGb250IC9IZWx2ZXRpY2EgPj4KZW5kb2JqCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDU4IDAwMDAwIG4gCjAwMDAwMDAxMTUgMDAwMDAgbiAKMDAwMDAwMDI0MSAwMDAwMCBuIAowMDAwMDAwNDk1IDAwMDAwIG4gCnRyYWlsZXIKPDwgL1NpemUgNiAvUm9vdCAxIDAgUiA+PgpzdGFydHhyZWYKNTY1CiUlRU9G";

function seedStore() {
  const c1 = uid(), c2 = uid(), c3 = uid(), c4 = uid();
  const cl1 = uid(), cl2 = uid(), cl3 = uid(), cl4 = uid(), cl5 = uid();
  const companies = [
    {
      id: c1, name: 'Estival Habitual Unipessoal LDA', forma: '', regime: 'Margin scheme',
      piva: 'PT518361438', cf: '',
      address: 'Rua Gomes de Brito 4, 2ºB', cap: '', city: 'Lisbon', prov: '', country: 'Portugal',
      email: 'accounts@estivalhabitual.com', phone: '+351 910 758 420', pec: '', sdi: '', rea: '', capitale: '',
      bank: 'NOVOBANCO', iban: 'PT50 0007 0000 0076 9504 4932 3', swift: 'BESCPTPL',
      bankInfo: 'Company Name: Estival Habitual Unipessoal LDA\nBank Name: NOVOBANCO\nIBAN: PT50 0007 0000 0076 9504 4932 3\nSwift: BESCPTPL',
      currency: 'EUR',
      causaleFiscale: 'Margin scheme is adopted in this invoice',
      acqSellerDecl: "I confirm I am the legal owner of the watch described above and have the right to sell it. I transfer ownership to Estival Habitual Unipessoal LDA on receipt of full payment.",
      acqBuyerNote: "Acquired for resale. Records retained by buyer for VAT & AML compliance.",
      acqVatNote: "This acquisition is by a dealer of second-hand goods eligible for the VAT Margin Scheme under Article 313 of Council Directive 2006/112/EC (transposed by Decree-Law 199/96 of 18 October). The margin scheme may apply upon resale.",
      footerText: '', logo: LOGO_ESTIVAL,
      theme: { ...DEFAULT_THEME, template: 'custom', accent: '#c6a161', ink: '#143559', showLogo: true, customHTML: TPL_ESTIVAL, customHTMLBuy: TPL_ESTIVAL_BUY },
    },
    {
      id: c2, name: 'Purosangue Motors L.L.C-F.Z', forma: '', regime: 'Margin scheme',
      piva: '', cf: '',
      address: 'Meydan Grandstand, 6th floor, Meydan Road, Nad Al Sheba', cap: '', city: 'Dubai', prov: '', country: 'United Arab Emirates',
      email: '', phone: '', pec: '', sdi: '', rea: '', capitale: '',
      bank: 'Wio Bank', iban: 'AE53 0860 0000 0937 5026 418', swift: 'WIOBAEADXXX',
      bankInfo: 'Account holder: Purosangue Motors L.L.C-F.Z\nAED Account: AE03 0860 0000 0965 9696 419 (WIOBAEADXXX)\nUSD Account: AE90 0860 0000 0955 2721 798 (WIOBAEADXXX)\nEUR Account: AE53 0860 0000 0937 5026 418 (WIOBAEADXXX)',
      currency: 'EUR',
      causaleFiscale: 'Margin scheme is adopted in this invoice',
      acqSellerDecl: "I confirm I am the legal owner of the watch described above and have the right to sell it. I transfer ownership to Purosangue Motors L.L.C-F.Z on receipt of full payment.",
      acqBuyerNote: "Acquired for resale. Records retained by buyer for VAT & AML compliance.",
      acqVatNote: "This acquisition is by a dealer of second-hand goods eligible for the Profit Margin Scheme under UAE VAT law (Federal Decree-Law No. 8 of 2017 on Value Added Tax). The margin scheme may apply upon resale.",
      footerText: '', logo: LOGO_PURO_MOTORS,
      theme: { ...DEFAULT_THEME, template: 'custom', accent: '#821916', ink: '#1f1f1f', showLogo: true, customHTML: TPL_PURO_MOTORS, customHTMLBuy: TPL_PURO_MOTORS_BUY },
    },
    {
      id: c3, name: 'Almas Elitistas Unipessoal, LDA', forma: '', regime: 'Margin scheme',
      piva: 'PT 519283627', cf: '',
      address: 'Rua Pascoal de Melo, n.º 3, 1.º andar, Porta 5', cap: '1170-294', city: 'Lisboa', prov: '', country: 'Portugal',
      email: 'accounts@almaselitistas.com', phone: '+351 920 108 581', pec: '', sdi: '', rea: '', capitale: '',
      bank: 'NOVOBANCO', iban: 'PT50 0007 0000 0087 0744 4602 3', swift: 'BESCPTPL',
      bankInfo: 'Company: Almas Elitistas Unipessoal LDA\nBank Name: NOVOBANCO\nIBAN: PT50 0007 0000 0087 0744 4602 3\nSWIFT / BIC: BESCPTPL',
      currency: 'EUR',
      causaleFiscale: 'Margin scheme - Second-hand goods. Article 313 of Council Directive 2006/112/EC and Decree-Law 199/96 of 18 October. VAT not separately chargeable.',
      acqSellerDecl: "I confirm I am the legal owner of the watch described above and have the right to sell it. I transfer ownership to Almas Elitistas Unipessoal, LDA on receipt of full payment.",
      acqBuyerNote: "Acquired for resale. Records retained by buyer for VAT & AML compliance.",
      acqVatNote: "This acquisition is by a dealer of second-hand goods eligible for the VAT Margin Scheme under Article 313 of Council Directive 2006/112/EC and Decree-Law 199/96 of 18 October. The margin scheme may apply upon resale.",
      footerText: '', logo: LOGO_ALMAS,
      theme: { ...DEFAULT_THEME, template: 'custom', accent: '#5b1824', ink: '#2b2b2b', showLogo: true, customHTML: TPL_ALMAS, customHTMLBuy: TPL_ALMAS_BUY },
    },
    {
      id: c4, name: 'Purosangue Watches LTD', forma: '', regime: 'Margin scheme',
      piva: '496 6419 38', cf: '',
      address: '51 Baywood Street', cap: 'BB1 6NS', city: 'Lancashire', prov: '', country: 'United Kingdom',
      email: '', phone: '', pec: '', sdi: '', rea: '', capitale: '',
      bank: '', iban: '', swift: '',
      bankInfo: 'Purosangue Watches Ltd\nSort Code: 23-08-01\nAcc No: 14635958',
      currency: 'GBP',
      causaleFiscale: 'Margin scheme is adopted in this invoice',
      acqSellerDecl: "I confirm I am the legal owner of the watch described above and have the right to sell it. I transfer ownership to PuroSangue Watches Ltd on receipt of full payment.",
      acqBuyerNote: "Acquired for resale. Records retained by buyer for HMRC/VAT & AML compliance.",
      acqVatNote: "This acquisition is by a dealer of second-hand goods eligible for the VAT Margin Scheme under HMRC's VAT Notice 718. The margin scheme may apply upon resale.",
      footerText: '', logo: LOGO_PURO_WATCHES,
      theme: { ...DEFAULT_THEME, template: 'custom', accent: '#821916', ink: '#1f1f1f', showLogo: true, customHTML: TPL_PURO_WATCHES, customHTMLBuy: TPL_PURO_WATCHES_BUY },
    },
  ];
  const clients = [
    { id: cl1, type: 'azienda', name: 'ENERGIQA SRL', forma: '', piva: 'IT 11958640010', cf: '', address: 'Via della Rocca 21', cap: '10123', city: 'Torino', prov: 'TO', country: 'Italy', email: 'amministrazione@energiqa.com', phone: '', sdi: 'W7YVJK9' },
    { id: cl2, type: 'azienda', name: 'TIMEO LUXURY TRADING LTD', forma: '', piva: 'CY60107606T', cf: '', address: '77 Strovolos Av., Strovolos Center O 301', cap: '2018', city: 'Strovolos', prov: '', country: 'Cyprus', email: 'timeoltl@hotmail.com', phone: '', sdi: '' },
    { id: cl3, type: 'azienda', name: 'Startime srl', forma: '', piva: 'IT12403780963', cf: '', address: 'Via Pelizza da Volpedo 54', cap: '20092', city: 'Cinisello Balsamo', prov: 'MI', country: 'Italy', email: 'startimewatchesmilano@gmail.com', phone: '', sdi: 'USAL8PV' },
    { id: cl4, type: 'azienda', name: 'Kettle Kids Limited', forma: '', piva: '', cf: '', address: '16 Maddox Street, Mayfair', cap: 'W1S 1PH', city: 'London', prov: '', country: 'United Kingdom', email: 'info@thekettlekids.com', phone: '', sdi: '' },
    { id: cl5, type: 'privato', name: 'Davinder Kalsi', forma: '', piva: '', cf: '', address: '20 Sandyford Place', cap: 'G3 7NG', city: 'Glasgow', prov: '', country: 'United Kingdom', email: 'dsinghk@gmail.com', phone: '', sdi: '' },
  ];
  const products = [
    { id: uid(), desc: 'Rolex Daytona', um: 'pcs', price: 0, iva: 0 },
    { id: uid(), desc: 'Rolex Yacht-Master', um: 'pcs', price: 0, iva: 0 },
    { id: uid(), desc: 'Cartier Panthère', um: 'pcs', price: 0, iva: 0 },
    { id: uid(), desc: 'Patek Philippe Aquanaut', um: 'pcs', price: 0, iva: 0 },
    { id: uid(), desc: 'Omega Speedmaster Moonwatch', um: 'pcs', price: 0, iva: 0 },
  ];
  const L = (desc, qty, price, note) => ({ id: uid(), desc, qty: qty == null ? 1 : qty, um: 'pcs', price: price || 0, iva: 0, discount: 0, note: note || '' });
  const D = (over) => ({
    id: uid(), type: 'fattura', status: 'emessa',
    validUntil: '', refDoc: '', subject: '', contactPerson: '',
    number: '', seq: 1, year: 2026,
    lines: [], notes: '', causaleFiscale: '',
    cassa: { enabled: false, rate: 4, iva: 22 },
    ritenuta: { enabled: false, rate: 20, base: 'imponibile' },
    bollo: { enabled: false, amount: 2 },
    payment: { method: 'Bank transfer', iban: '', terms: '' },
    transport: { causale: '', aspetto: '', colli: '', peso: '', vettore: '', porto: '', date: '', time: '', annotazioni: '' },
    themeOverride: {}, createdAt: Date.now(),
    ...over,
  });
  const documents = [
    D({ companyId: c1, clientId: cl1, currency: 'EUR', number: 'INV-1050', seq: 1050,
        date: '2026-04-27', dueDate: '2026-05-04', contactPerson: 'Vilmos Horvath',
        subject: 'OMEGA SPEEDMASTER MOONWATCH | PORTUGIESER AUTOMATIC CHRONOGRAPH',
        causaleFiscale: 'Margin scheme is adopted in this invoice',
        lines: [ L('Deposit | TBC', 1, 4850), L('Portugieser Automatic Chronograph | Ref IW371605 | SNR 6225017', 1, 4800) ] }),
    D({ companyId: c2, clientId: cl2, currency: 'EUR', number: 'INV-00010', seq: 10,
        date: '2026-06-04', dueDate: '2026-06-11', contactPerson: 'Purosangue Motors LLC',
        subject: 'Rolex YM | Daytona | YM | Cartier',
        causaleFiscale: 'Margin scheme is adopted in this invoice',
        lines: [
          L('Rolex Yacht Master | SNR P6293340', 1, 22000, 'Condition: USED'),
          L('Rolex Daytona | SNR 081T82Y2', 1, 70000, 'Condition: USED'),
          L('Rolex Yacht Master | SNR 0G7F2690', 1, 14000, 'Condition: USED'),
          L('Cartier Panthère | Ref WSPN0013', 1, 3000, 'Condition: USED'),
        ] }),
    D({ companyId: c3, clientId: cl3, currency: 'EUR', number: '0016/2026', seq: 16,
        date: '2026-06-05', dueDate: '2026-06-12',
        causaleFiscale: 'Margin scheme - Second-hand goods. Article 313 of Council Directive 2006/112/EC and Decree-Law 199/96 of 18 October. VAT not separately chargeable.',
        lines: [ L('Cartier Panthère', 1, 5170, 'Ref WSPN0015 | SNR 4016100496GY1') ] }),
    D({ companyId: c4, clientId: cl4, currency: 'GBP', number: 'INV-0037/2026', seq: 37,
        date: '2026-05-21', dueDate: '2026-05-28', contactPerson: 'Purosangue Watches LTD',
        causaleFiscale: 'Margin scheme is adopted in this invoice',
        lines: [ L('Patek Philippe Aquanaut | Ref 5167A-001 | SNR 7298801/6387045', 1, 55000) ] }),

    // --- Other document formats (one example of each), each rendered in its company's own graphics ---
    D({ companyId: c1, clientId: cl1, type: 'proforma', currency: 'EUR', number: 'PRO-1051', seq: 1051,
        date: '2026-05-02', dueDate: '2026-05-09', contactPerson: 'Vilmos Horvath',
        subject: 'AUDEMARS PIGUET ROYAL OAK | PROPOSAL',
        causaleFiscale: 'Margin scheme is adopted in this invoice',
        lines: [ L('Audemars Piguet Royal Oak | Ref 15500ST | SNR M01234', 1, 38500, 'Condition: USED') ] }),
    D({ companyId: c1, clientId: cl1, type: 'ricevuta', currency: 'EUR', number: 'REC-1052', seq: 1052,
        date: '2026-05-05', contactPerson: 'Vilmos Horvath',
        causaleFiscale: 'Margin scheme is adopted in this invoice',
        lines: [ L('Deposit received | OMEGA Speedmaster Moonwatch', 1, 4850) ] }),
    D({ companyId: c2, clientId: cl2, type: 'ddt', currency: 'EUR', number: 'DN-0007', seq: 7,
        date: '2026-06-06',
        transport: { causale: 'Sale', aspetto: 'Watch boxes', colli: '4', peso: '2 kg', vettore: 'Insured courier', porto: 'Prepaid', date: '2026-06-06', time: '14:30', annotazioni: 'Insured shipment - handle with care. Signature required on delivery.' },
        lines: [
          L('Rolex Yacht Master | SNR P6293340', 1, 0, 'Condition: USED'),
          L('Rolex Daytona | SNR 081T82Y2', 1, 0, 'Condition: USED'),
          L('Cartier Panthère | Ref WSPN0013', 1, 0, 'Condition: USED'),
        ] }),
    D({ companyId: c3, clientId: cl3, type: 'nota_credito', currency: 'EUR', number: 'CN-0017/2026', seq: 17,
        date: '2026-06-06', refDoc: 'Invoice 0016/2026',
        causaleFiscale: 'Margin scheme - Second-hand goods. Article 313 of Council Directive 2006/112/EC and Decree-Law 199/96 of 18 October. VAT not separately chargeable.',
        lines: [ L('Cartier Panthère', 1, 5170, 'Ref WSPN0015 | SNR 4016100496GY1 - credit for returned item') ] }),
    D({ companyId: c4, clientId: cl4, type: 'preventivo', currency: 'GBP', number: 'QT-0038/2026', seq: 38,
        date: '2026-05-21', validUntil: '2026-06-21', contactPerson: 'Purosangue Watches LTD',
        causaleFiscale: 'Margin scheme is adopted in this invoice',
        lines: [ L('Patek Philippe Aquanaut | Ref 5167A-001 | SNR 7298801/6387045', 1, 55000) ] }),

    // ===== Additional documents: varied watches, currencies (EUR/GBP/USD/CHF/AED) and every format =====
    // --- Estival Habitual ---
    D({ companyId: c1, clientId: cl1, currency: 'EUR', number: 'INV-1053', seq: 1053, date: '2026-04-12', dueDate: '2026-04-19', contactPerson: 'Vilmos Horvath', causaleFiscale: 'Margin scheme is adopted in this invoice',
        lines: [ L('Rolex Submariner Date | Ref 126610LN | SNR 7K842109', 1, 12800, 'Condition: USED'), L('Tudor Black Bay 58 | Ref 79030N | SNR K7781200', 1, 2950, 'Condition: USED') ] }),
    D({ companyId: c1, clientId: cl1, currency: 'EUR', number: 'INV-1054', seq: 1054, date: '2026-04-20', dueDate: '2026-04-27', causaleFiscale: 'Margin scheme is adopted in this invoice',
        lines: [ L('Patek Philippe Nautilus | Ref 5711/1A | SNR 6201882', 1, 135000, 'Condition: USED') ] }),
    D({ companyId: c1, clientId: cl1, currency: 'EUR', number: 'INV-1055', seq: 1055, date: '2026-05-08', dueDate: '2026-05-15', causaleFiscale: 'Margin scheme is adopted in this invoice',
        lines: [ L('Omega Seamaster 300 | Ref 210.30.42 | SNR 55009911', 1, 5200), L('Breitling Navitimer B01 | Ref AB0138 | SNR 8812345', 1, 8999) ] }),
    D({ companyId: c1, clientId: cl1, currency: 'EUR', number: 'INV-1056', seq: 1056, date: '2026-05-18', dueDate: '2026-05-25', subject: 'COLLECTION PURCHASE | 6 PIECES', causaleFiscale: 'Margin scheme is adopted in this invoice',
        lines: [ L('Rolex GMT-Master II | Ref 126710BLRO | SNR 8H551020', 1, 19500, 'Condition: USED'), L('Omega Speedmaster Moonwatch | Ref 310.30.42 | SNR 99887766', 1, 6800, 'Condition: USED'), L('Cartier Santos | Ref WSSA0018 | SNR PT4490', 1, 7250, 'Condition: USED'), L('Tudor Black Bay 58 | Ref 79030N | SNR K7781201', 1, 2950, 'Condition: USED'), L('Grand Seiko Snowflake | Ref SBGA211 | SNR 5511002', 1, 4200, 'Condition: USED'), L('Zenith El Primero | Ref 03.2040 | SNR 19887700', 1, 6900, 'Condition: USED') ] }),
    D({ companyId: c1, clientId: cl1, currency: 'CHF', number: 'INV-1057', seq: 1057, date: '2026-05-26', dueDate: '2026-06-02', causaleFiscale: 'Margin scheme is adopted in this invoice',
        lines: [ L('A. Lange & Söhne Lange 1 | Ref 191.032 | SNR 220011', 1, 48900, 'Condition: USED') ] }),
    D({ companyId: c1, clientId: cl1, type: 'proforma', currency: 'EUR', number: 'PRO-1058', seq: 1058, date: '2026-05-29', dueDate: '2026-06-05', subject: 'OFFER | AUDEMARS PIGUET ROYAL OAK', causaleFiscale: 'Margin scheme is adopted in this invoice',
        lines: [ L('Audemars Piguet Royal Oak | Ref 15500ST | SNR M01234', 1, 38500, 'Condition: USED') ] }),
    D({ companyId: c1, clientId: cl1, type: 'ricevuta', currency: 'EUR', number: 'REC-1059', seq: 1059, date: '2026-05-30', causaleFiscale: 'Margin scheme is adopted in this invoice',
        lines: [ L('Deposit received | Patek Philippe Aquanaut', 1, 10000) ] }),
    D({ companyId: c1, clientId: cl1, type: 'nota_credito', currency: 'EUR', number: 'CN-1060', seq: 1060, date: '2026-06-01', refDoc: 'Invoice INV-1053', causaleFiscale: 'Margin scheme is adopted in this invoice',
        lines: [ L('Rolex Submariner Date | Ref 126610LN - return credit', 1, 12800) ] }),
    // --- Purosangue Motors ---
    D({ companyId: c2, clientId: cl2, currency: 'EUR', number: 'INV-00011', seq: 11, date: '2026-06-06', dueDate: '2026-06-13', contactPerson: 'Purosangue Motors LLC', subject: 'Rolex Daytona | GMT-Master II', causaleFiscale: 'Margin scheme is adopted in this invoice',
        lines: [ L('Rolex Daytona | Ref 116500LN | SNR 9R223344', 1, 38500, 'Condition: USED'), L('Rolex GMT-Master II | Ref 126710BLRO | SNR 8H551020', 1, 19500, 'Condition: USED') ] }),
    D({ companyId: c2, clientId: cl2, currency: 'AED', number: 'INV-00012', seq: 12, date: '2026-05-22', dueDate: '2026-05-29', contactPerson: 'Purosangue Motors LLC', causaleFiscale: 'Margin scheme is adopted in this invoice',
        lines: [ L('Richard Mille RM 011 | Ref RM011 | SNR 556677', 1, 250000, 'Condition: USED') ] }),
    D({ companyId: c2, clientId: cl2, currency: 'USD', number: 'INV-00013', seq: 13, date: '2026-05-15', dueDate: '2026-05-22', contactPerson: 'Purosangue Motors LLC', causaleFiscale: 'Margin scheme is adopted in this invoice',
        lines: [ L('Audemars Piguet Royal Oak | Ref 15500ST | SNR M01235', 1, 42000, 'Condition: USED'), L('Omega Speedmaster Moonwatch | Ref 310.30.42 | SNR 99887767', 1, 6800, 'Condition: USED') ] }),
    D({ companyId: c2, clientId: cl2, currency: 'EUR', number: 'INV-00014', seq: 14, date: '2026-05-02', dueDate: '2026-05-09', contactPerson: 'Purosangue Motors LLC', subject: 'GRAND COMPLICATIONS', causaleFiscale: 'Margin scheme is adopted in this invoice',
        lines: [ L('Patek Philippe Grandmaster Chime | Ref 6300A | SNR 0000001', 1, 1250000, 'Unique piece'), L('Richard Mille RM 056 | Ref RM056 | SNR 000045', 1, 880000, 'Condition: USED') ] }),
    D({ companyId: c2, clientId: cl2, currency: 'AED', number: 'INV-00015', seq: 15, date: '2026-04-28', dueDate: '2026-05-05', contactPerson: 'Purosangue Motors LLC', causaleFiscale: 'Margin scheme is adopted in this invoice',
        lines: [ L('Audemars Piguet Royal Oak Offshore | Ref 26470ST | SNR J55667', 1, 68000, 'Condition: USED'), L('Hublot Big Bang | Ref 301.SB | SNR 1209887', 1, 21000, 'Condition: USED'), L('Panerai Luminor Marina | Ref PAM01312 | SNR BB998812', 1, 9500, 'Condition: USED') ] }),
    D({ companyId: c2, clientId: cl2, type: 'proforma', currency: 'EUR', number: 'PRO-00018', seq: 18, date: '2026-06-02', dueDate: '2026-06-09', contactPerson: 'Purosangue Motors LLC', subject: 'OFFER | ROLEX DAYTONA', causaleFiscale: 'Margin scheme is adopted in this invoice',
        lines: [ L('Rolex Daytona | Ref 116500LN | SNR 9R223345', 1, 39000, 'Condition: USED') ] }),
    D({ companyId: c2, clientId: cl2, type: 'ddt', currency: 'EUR', number: 'DN-0008', seq: 8, date: '2026-06-06',
        transport: { causale: 'Sale', aspetto: 'Watch boxes', colli: '3', peso: '1.8 kg', vettore: 'FedEx Priority', porto: 'Prepaid', date: '2026-06-06', time: '10:15', annotazioni: 'Fragile - fully insured. Signature required.' },
        lines: [ L('Rolex Daytona | SNR 9R223344', 1, 0, 'Condition: USED'), L('Rolex GMT-Master II | SNR 8H551020', 1, 0, 'Condition: USED'), L('Cartier Santos | SNR PT4490', 1, 0, 'Condition: USED') ] }),
    D({ companyId: c2, clientId: cl2, type: 'preventivo', currency: 'EUR', number: 'QT-00019', seq: 19, date: '2026-05-20', validUntil: '2026-07-31', contactPerson: 'Purosangue Motors LLC', causaleFiscale: 'Margin scheme is adopted in this invoice',
        lines: [ L('Patek Philippe Nautilus | Ref 5711/1A | SNR 6201883', 1, 140000, 'Condition: USED') ] }),
    // --- Almas Elitistas ---
    D({ companyId: c3, clientId: cl3, currency: 'EUR', number: '0021/2026', seq: 21, date: '2026-06-06', dueDate: '2026-06-13', causaleFiscale: 'Margin scheme - Second-hand goods. Article 313 of Council Directive 2006/112/EC and Decree-Law 199/96 of 18 October. VAT not separately chargeable.',
        lines: [ L('Cartier Santos | Ref WSSA0018', 2, 7250, 'Condition: NEW') ] }),
    D({ companyId: c3, clientId: cl3, currency: 'EUR', number: '0022/2026', seq: 22, date: '2026-05-25', dueDate: '2026-06-01', causaleFiscale: 'Margin scheme - Second-hand goods. Article 313 of Council Directive 2006/112/EC and Decree-Law 199/96 of 18 October. VAT not separately chargeable.',
        lines: [ L('Vacheron Constantin Overseas | Ref 4500V | SNR BX12345', 1, 28000, 'Condition: USED') ] }),
    D({ companyId: c3, clientId: cl3, currency: 'EUR', number: '0023/2026', seq: 23, date: '2026-05-12', dueDate: '2026-05-19', causaleFiscale: 'Margin scheme - Second-hand goods. Article 313 of Council Directive 2006/112/EC and Decree-Law 199/96 of 18 October. VAT not separately chargeable.',
        lines: [ L('Cartier Panthère « édition spéciale »', 1, 5170, 'Réf WSPN0019 | SNR 4016100777') ] }),
    D({ companyId: c3, clientId: cl3, currency: 'EUR', number: '0024/2026', seq: 24, date: '2026-04-30', dueDate: '2026-05-07', causaleFiscale: 'Margin scheme - Second-hand goods. Article 313 of Council Directive 2006/112/EC and Decree-Law 199/96 of 18 October. VAT not separately chargeable.',
        lines: [ L('Patek Philippe Calatrava | Ref 5227G | SNR 6011223', 1, 3100, 'Condition: USED') ] }),
    D({ companyId: c3, clientId: cl3, type: 'nota_credito', currency: 'EUR', number: 'CN-0025/2026', seq: 25, date: '2026-06-07', refDoc: 'Invoice 0021/2026', causaleFiscale: 'Margin scheme - Second-hand goods. Article 313 of Council Directive 2006/112/EC and Decree-Law 199/96 of 18 October. VAT not separately chargeable.',
        lines: [ L('Cartier Santos | Ref WSSA0018 - return credit', 1, 7250) ] }),
    // --- Purosangue Watches ---
    D({ companyId: c4, clientId: cl4, currency: 'GBP', number: 'INV-0044/2026', seq: 44, date: '2026-05-24', dueDate: '2026-05-31', contactPerson: 'Purosangue Watches LTD', causaleFiscale: 'Margin scheme is adopted in this invoice',
        lines: [ L('Rolex Day-Date 40 | Ref 228238 | SNR 3344117', 1, 41000, 'Condition: USED'), L('Jaeger-LeCoultre Reverso | Ref Q397842 | SNR 3990221', 1, 9800, 'Condition: USED') ] }),
    D({ companyId: c4, clientId: cl4, currency: 'GBP', number: 'INV-0045/2026', seq: 45, date: '2026-05-10', dueDate: '2026-05-17', contactPerson: 'Purosangue Watches LTD', causaleFiscale: 'Margin scheme is adopted in this invoice',
        lines: [ L('Grand Seiko Snowflake | Ref SBGA211 | SNR 5511003', 2, 4200, 'Condition: USED'), L('Zenith El Primero | Ref 03.2040 | SNR 19887701', 1, 6900, 'Condition: USED') ] }),
    D({ companyId: c4, clientId: cl4, type: 'ricevuta', currency: 'GBP', number: 'REC-0046/2026', seq: 46, date: '2026-05-28', contactPerson: 'Purosangue Watches LTD', causaleFiscale: 'Margin scheme is adopted in this invoice',
        lines: [ L('Balance received | Patek Philippe Aquanaut', 1, 15000) ] }),
    D({ companyId: c4, clientId: cl4, type: 'ddt', currency: 'GBP', number: 'DN-0047/2026', seq: 47, date: '2026-06-06',
        transport: { causale: 'Repair return', aspetto: 'Padded envelope', colli: '1', peso: '0.4 kg', vettore: 'Royal Mail Special Delivery', porto: 'Carriage paid', date: '2026-06-06', time: '', annotazioni: 'Tracked and insured.' },
        lines: [ L('Omega Speedmaster Moonwatch | SNR 99887766', 1, 0, 'Condition: USED') ] }),
    D({ companyId: c4, clientId: cl4, type: 'preventivo', currency: 'GBP', number: 'QT-0048/2026', seq: 48, date: '2026-05-19', validUntil: '2026-07-15', contactPerson: 'Purosangue Watches LTD', causaleFiscale: 'Margin scheme is adopted in this invoice',
        lines: [ L('Rolex Daytona | Ref 116500LN | SNR 9R223399', 1, 29500, 'Condition: USED') ] }),

    // ===== Acquisition notes (purchase invoices) — buying watches from private sellers =====
    D({ companyId: c4, clientId: cl5, type: 'acquisto', currency: 'GBP', number: 'PSW-PI-2026-0005', seq: 5, date: '2026-03-31',
        lines: [
          L('Rolex Sky-Dweller Mint Green | Ref 336934', 1, 18000),
          L('Rolex Oyster Perpetual | Ref 126000 | SNR 3488L952', 1, 6700),
          L('Rolex Land Dweller | Ref 127334 | SNR T8K73738', 1, 18000),
          L('Rolex Oyster Perpetual | Ref 134300 | SNR U70605Z4', 1, 7500),
          L('Rolex Explorer | Ref 224270 | SNR LW593791', 1, 6000),
          L('Rolex Oyster Perpetual | Ref 134300 | SNR S815S022', 1, 8500),
          L('Patek Philippe Calatrava | Ref 5212A | SNR 7593618/6489485', 1, 28050),
          L('Patek Philippe Calatrava Weekly Calendar | Ref 5212A-001 | SNR 7664417/6629240', 1, 20000),
          L('Rolex Oyster Perpetual 41 | Ref 134300 | SNR H40754Q6', 1, 8000),
          L('Patek Philippe Golden Ellipse | Ref 5738R-001 | SNR 7853723/6840502', 1, 20000),
          L('Patek Philippe Complication | Ref 5328G-001 | SNR 7736659/6882036', 1, 40000),
          L('Rolex Oyster Perpetual | Ref 126000 | SNR 5P2W9260', 1, 8250),
          L('Rolex Daytona | Ref 126508 | SNR P46K5764', 1, 58000)
        ] }),
    D({ companyId: c1, clientId: cl5, type: 'acquisto', currency: 'EUR', number: 'EST-PI-2026-0001', seq: 1, date: '2026-04-15',
        lines: [ L('Rolex Submariner Date | Ref 126610LN | SNR 7K842109', 1, 11800), L('Omega Speedmaster Moonwatch | Ref 310.30.42 | SNR 99887766', 1, 5600) ] }),
    D({ companyId: c2, clientId: cl5, type: 'acquisto', currency: 'EUR', number: 'PM-PI-2026-0001', seq: 1, date: '2026-04-18',
        lines: [ L('Audemars Piguet Royal Oak | Ref 15500ST | SNR M01234', 1, 36000), L('Rolex GMT-Master II | Ref 126710BLRO | SNR 8H551020', 1, 17500) ] }),
    D({ companyId: c3, clientId: cl5, type: 'acquisto', currency: 'EUR', number: 'ALM-PI-2026-0001', seq: 1, date: '2026-04-22',
        lines: [ L('Cartier Santos | Ref WSSA0018 | SNR PT4490', 1, 6500), L('Vacheron Constantin Overseas | Ref 4500V | SNR BX12345', 1, 26000) ] }),
  ];
  const incoming = [
    { id: uid(), companyId: c4, supplier: 'Crown & Caliber', docNumber: 'CC-88231', date: '2026-03-12', amount: 18500, currency: 'USD', category: 'Purchase invoice', notes: 'Rolex Daytona acquired for stock.', fileName: 'CC-88231.pdf', fileType: 'application/pdf', fileSize: 747, data: SAMPLE_PDF, createdAt: Date.now() },
    { id: uid(), companyId: c1, supplier: 'DHL Express', docNumber: 'INV-DHL-5521', date: '2026-03-20', amount: 142.5, currency: 'EUR', category: 'Shipping', notes: 'Insured shipment Lisbon to Milan.', fileName: 'dhl-5521.pdf', fileType: 'application/pdf', fileSize: 747, data: SAMPLE_PDF, createdAt: Date.now() },
    { id: uid(), companyId: c2, supplier: 'Chronoexpert FZ', docNumber: '2026/0442', date: '2026-02-28', amount: 36000, currency: 'AED', category: 'Purchase invoice', notes: 'AP Royal Oak supplier invoice.', fileName: 'chronoexpert-0442.pdf', fileType: 'application/pdf', fileSize: 747, data: SAMPLE_PDF, createdAt: Date.now() },
  ];
  return {
    companies, clients, products, documents, incoming,
    settings: { currency: 'EUR', defaultCompanyId: c1, defaultTemplate: 'classico' },
  };
}

// ============================================================================
//  STORAGE WRAPPER (window.storage → localStorage → in-memory fallback)
// ============================================================================
const _mem = {};
const Store = {
  async get(key) {
    try { if (window.storage && window.storage.get) { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : null; } }
    catch (e) { /* fallthrough */ }
    try { const s = localStorage.getItem(key); if (s != null) return JSON.parse(s); } catch (e) { /* */ }
    try { return _mem[key] != null ? JSON.parse(_mem[key]) : null; } catch (e) { return null; }
  },
  async set(key, obj) {
    const s = JSON.stringify(obj);
    _mem[key] = s;
    let persisted = false;
    try { localStorage.setItem(key, s); persisted = true; } catch (e) { /* quota exceeded */ }
    try { if (window.storage && window.storage.set) { await window.storage.set(key, s); persisted = true; } } catch (e) { /* noop */ }
    return persisted;
  },
};

// Raw-string storage for binary attachments (PDFs/images): kept OUT of the main JSON blob
// (5 MB/key limit), each file under its own key, loaded on demand.
const _fmem = {};
const FileStore = {
  async get(key) {
    try { if (window.storage && window.storage.get) { const r = await window.storage.get(key); if (r && r.value != null) return r.value; } } catch (e) { /* */ }
    try { const v = localStorage.getItem('_f_' + key); if (v != null) return v; } catch (e) { /* */ }
    return _fmem[key] != null ? _fmem[key] : null;
  },
  async set(key, val) {
    _fmem[key] = val;
    let persisted = false;
    try { localStorage.setItem('_f_' + key, val); persisted = true; } catch (e) { /* oversize */ }
    try { if (window.storage && window.storage.set) { await window.storage.set(key, val); persisted = true; } } catch (e) { /* */ }
    return persisted;
  },
  async del(key) {
    delete _fmem[key];
    try { localStorage.removeItem('_f_' + key); } catch (e) { /* */ }
    try { if (window.storage && window.storage.delete) { await window.storage.delete(key); } } catch (e) { /* */ }
  },
};

// -------------------------------------------------------- Storage / data layer ---
function sanitizeHTML(html) {
  let out = String(html ?? '');
  out = out.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  out = out.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '');
  out = out.replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '');
  out = out.replace(/<embed\b[^>]*\/?>/gi, '');
  out = out.replace(/\s(on\w+|formaction|xmlns)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  out = out.replace(/javascript:/gi, '');
  out = out.replace(/data:(?!image\/)[^"'\\s>]*/gi, '');
  return out;
}

function safeImageSrc(url) {
  const s = String(url ?? '').trim();
  if (!s) return '';
  if (/^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,/i.test(s)) return s.replace(/"/g, '');
  if (/^https?:\/\//i.test(s)) return s.replace(/"/g, '');
  return '';
}

function validateUploadFile(file, { maxBytes = MAX_UPLOAD_BYTES, mimes = ALLOWED_UPLOAD_MIMES } = {}) {
  if (!file) return 'No file selected.';
  if (file.size > maxBytes) return `File is too large (max ${Math.round(maxBytes / (1024 * 1024))} MB).`;
  const mime = (file.type || '').toLowerCase();
  if (mime && !mimes.includes(mime)) return `File type not allowed (${mime || 'unknown'}).`;
  return '';
}

function collectFileKeys(store) {
  const keys = new Set();
  for (const c of store.clients || []) {
    for (const a of c.attachments || []) { if (a.fileKey) keys.add(a.fileKey); }
  }
  for (const r of store.incoming || []) { if (r.fileKey) keys.add(r.fileKey); }
  return [...keys];
}

async function purgeFileKeys(keys) {
  for (const key of keys) { try { await FileStore.del(key); } catch (e) { /* */ } }
}

async function collectReferencedFileKeys(store) {
  return new Set(collectFileKeys(store));
}

async function purgeOrphanFiles(store) {
  const referenced = await collectReferencedFileKeys(store);
  const orphans = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('_f_fg_file_')) {
      const fk = k.slice(3);
      if (!referenced.has(fk)) orphans.push(fk);
    }
  }
  await purgeFileKeys(orphans);
  return orphans.length;
}

function applyAutoStatuses(store) {
  const today = todayISO();
  const documents = (store.documents || []).map((d) => {
    if (d.type !== 'fattura') return d;
    if (!['emessa', 'inviata'].includes(d.status)) return d;
    if (d.dueDate && d.dueDate < today) return { ...d, status: 'scaduta' };
    return d;
  });
  return { ...store, documents };
}

function normalizeStore(raw) {
  if (!raw || typeof raw !== 'object') return applyAutoStatuses(seedStore());
  const s = {
    companies: Array.isArray(raw.companies) ? raw.companies : [],
    clients: Array.isArray(raw.clients) ? raw.clients : [],
    products: Array.isArray(raw.products) ? raw.products : [],
    documents: Array.isArray(raw.documents) ? raw.documents : [],
    incoming: Array.isArray(raw.incoming) ? raw.incoming : [],
    settings: raw.settings && typeof raw.settings === 'object'
      ? { currency: 'EUR', defaultTemplate: 'classico', ...raw.settings }
      : { currency: 'EUR', defaultTemplate: 'classico' },
  };
  if (s.settings.defaultCompanyId && !s.companies.some((c) => c.id === s.settings.defaultCompanyId)) {
    s.settings.defaultCompanyId = s.companies[0] ? s.companies[0].id : '';
  }
  return applyAutoStatuses(s);
}

function validateBackupPayload(data) {
  if (!data || typeof data !== 'object') return 'Invalid backup: not an object.';
  const core = data.store || data;
  if (!Array.isArray(core.companies)) return 'Invalid backup: missing companies array.';
  if (core.clients != null && !Array.isArray(core.clients)) return 'Invalid backup: clients must be an array.';
  if (core.documents != null && !Array.isArray(core.documents)) return 'Invalid backup: documents must be an array.';
  if (data.files != null && (typeof data.files !== 'object' || Array.isArray(data.files))) return 'Invalid backup: files must be an object.';
  return '';
}

function findDuplicateDocNumber(documents, doc, excludeId = '') {
  const label = String(doc.number || formatDocNumber(doc.type, doc.seq, doc.year)).trim().toLowerCase();
  if (!label) return null;
  return (documents || []).find((d) => (
    d.id !== excludeId
    && d.companyId === doc.companyId
    && String(d.number || formatDocNumber(d.type, d.seq, d.year)).trim().toLowerCase() === label
  )) || null;
}

function companyDocCount(store, companyId) {
  return (store.documents || []).filter((d) => d.companyId === companyId).length;
}

function clientDocCount(store, clientId) {
  return (store.documents || []).filter((d) => d.clientId === clientId).length;
}

async function buildBackupBlob(store) {
  const normalized = normalizeStore(store);
  const fileKeys = collectFileKeys(normalized);
  const files = {};
  for (const key of fileKeys) {
    try { const data = await FileStore.get(key); if (data) files[key] = data; } catch (e) { /* */ }
  }
  return JSON.stringify({ version: BACKUP_VERSION, exportedAt: Date.now(), store: normalized, files }, null, 2);
}

async function restoreBackupPayload(data) {
  const err = validateBackupPayload(data);
  if (err) throw new Error(err);
  const normalized = normalizeStore(data.store || data);
  const files = data.files && typeof data.files === 'object' ? data.files : {};
  for (const [key, val] of Object.entries(files)) {
    if (typeof val === 'string' && key.startsWith('fg_file_')) await FileStore.set(key, val);
  }
  await Store.set(STORE_KEY, normalized);
  await purgeOrphanFiles(normalized);
  return normalized;
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(r.error || new Error('read failed')); r.readAsDataURL(file); });
}
function dataURLToBlob(dataurl) {
  const i = String(dataurl).indexOf(','); const head = dataurl.slice(0, i); const b64 = dataurl.slice(i + 1);
  const mime = (head.match(/data:([^;]+)/) || [])[1] || 'application/octet-stream';
  const bin = atob(b64); const len = bin.length; const arr = new Uint8Array(len);
  for (let k = 0; k < len; k++) arr[k] = bin.charCodeAt(k);
  return new Blob([arr], { type: mime });
}

// ============================================================================
//  UI PRIMITIVES
// ============================================================================
const cx = (...a) => a.filter(Boolean).join(' ');

function useMedia(maxWidth = 860) {
  const [m, setM] = useState(typeof window !== 'undefined' ? window.innerWidth <= maxWidth : false);
  useEffect(() => {
    const on = () => setM(window.innerWidth <= maxWidth);
    window.addEventListener('resize', on); return () => window.removeEventListener('resize', on);
  }, [maxWidth]);
  return m;
}

function Field({ label, hint, children, full, style }) {
  return (
    <label className={cx('fld', full && 'full')} style={style}>
      {label && <span className="fld-lab">{label}</span>}
      {children}
      {hint && <span className="fld-hint">{hint}</span>}
    </label>
  );
}
function TextInput({ value, onChange, placeholder, type = 'text', mono, ...rest }) {
  return <input className={cx('inp', mono && 'mono')} type={type} value={value ?? ''} placeholder={placeholder}
    onChange={(e) => onChange && onChange(e.target.value)} {...rest} />;
}
function NumberInput({ value, onChange, placeholder, step = 'any', min, max, suffix }) {
  return (
    <span className="numwrap">
      <input className="inp mono" type="number" inputMode="decimal" step={step} min={min} max={max}
        value={value ?? ''} placeholder={placeholder}
        onChange={(e) => onChange && onChange(e.target.value === '' ? '' : e.target.value)} />
      {suffix && <span className="numsuffix">{suffix}</span>}
    </span>
  );
}
function TextArea({ value, onChange, placeholder, rows = 3 }) {
  return <textarea className="inp ta" rows={rows} value={value ?? ''} placeholder={placeholder}
    onChange={(e) => onChange && onChange(e.target.value)} />;
}
function Select({ value, onChange, options, placeholder }) {
  return (
    <span className="selwrap">
      <select className="inp sel" value={value ?? ''} onChange={(e) => onChange && onChange(e.target.value)}>
        {placeholder != null && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const val = typeof o === 'object' ? o.value : o;
          const lab = typeof o === 'object' ? o.label : o;
          return <option key={String(val)} value={val}>{lab}</option>;
        })}
      </select>
      <ChevronDown size={15} className="selcaret" />
    </span>
  );
}
function Btn({ children, onClick, variant = 'primary', size, icon: Icon, disabled, title, type }) {
  return (
    <button type={type || 'button'} className={cx('btn', `btn-${variant}`, size && `btn-${size}`)} onClick={onClick} disabled={disabled} title={title}>
      {Icon && <Icon size={size === 'sm' ? 14 : 16} />}{children && <span>{children}</span>}
    </button>
  );
}
function IconBtn({ icon: Icon, onClick, title, danger, active }) {
  return <button className={cx('iconbtn', danger && 'danger', active && 'active')} onClick={onClick} title={title} aria-label={title}><Icon size={16} /></button>;
}
function Badge({ status }) {
  const s = STATUSES[status] || STATUSES.bozza;
  return <span className="badge" style={{ color: s.color, background: s.color + '1c', borderColor: s.color + '40' }}>{s.label}</span>;
}
function Toggle({ checked, onChange, label }) {
  return (
    <button type="button" className={cx('toggle', checked && 'on')} onClick={() => onChange(!checked)} role="switch" aria-checked={checked}>
      <span className="knob" />{label && <span className="tlbl">{label}</span>}
    </button>
  );
}
function Segmented({ value, onChange, options }) {
  return (
    <div className="seg">
      {options.map((o) => {
        const val = typeof o === 'object' ? o.value : o;
        const lab = typeof o === 'object' ? o.label : o;
        return <button key={String(val)} className={cx('seg-i', value === val && 'on')} onClick={() => onChange(val)}>{lab}</button>;
      })}
    </div>
  );
}
function ColorField({ value, onChange }) {
  return (
    <div className="colorfield">
      <div className="swatches">
        {ACCENT_SWATCHES.map((c) => (
          <button key={c} className={cx('sw', value === c && 'on')} style={{ background: c }} onClick={() => onChange(c)} aria-label={c} />
        ))}
      </div>
      <label className="customcolor">
        <input type="color" value={value || '#1f6feb'} onChange={(e) => onChange(e.target.value)} />
        <span className="mono">{value}</span>
      </label>
    </div>
  );
}
function Modal({ open, onClose, title, children, wide, footer }) {
  useEffect(() => {
    if (!open) return;
    const on = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}>
      <div className={cx('modal', wide && 'wide')} role="dialog" aria-modal="true">
        <div className="modal-head"><h3>{title}</h3><IconBtn icon={X} onClick={onClose} title="Close" /></div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}
function EmptyState({ icon: Icon, title, sub, action }) {
  return (
    <div className="empty-state">
      {Icon && <div className="es-icon"><Icon size={26} /></div>}
      <div className="es-title">{title}</div>
      {sub && <div className="es-sub">{sub}</div>}
      {action}
    </div>
  );
}

// Document preview scaled to A4 (single source = buildDocumentHTML)
function DocPreview({ html, stampTheme, onStampMove, interactiveStamp }) {
  const wrapRef = useRef(null);
  const frameRef = useRef(null);
  const dragRef = useRef(null);
  const [scale, setScale] = useState(0.6);
  const [docH, setDocH] = useState(1123);
  const A4W = 794;
  const stampSrc = stampTheme && stampTheme.showStamp ? resolveStampImageSrc(stampTheme) : '';
  const showDragStamp = interactiveStamp && stampSrc;
  const stampXY = stampTheme ? getStampXY(stampTheme) : { x: 84, y: 88 };
  const stampOpacity = stampTheme && stampTheme.stampOpacity != null ? stampTheme.stampOpacity : 0.85;

  useEffect(() => {
    const fit = () => { if (wrapRef.current) { const w = wrapRef.current.clientWidth; setScale(Math.min(1, Math.max(0.2, w / A4W))); } };
    fit();
    window.addEventListener('resize', fit);
    const id = setTimeout(fit, 60);
    return () => { window.removeEventListener('resize', fit); clearTimeout(id); };
  }, []);

  const onLoad = () => {
    try { const d = frameRef.current.contentDocument; const h = Math.max(1123, d.body.scrollHeight + 24); setDocH(h); } catch (e) { /* noop */ }
  };

  const moveStampFromEvent = (e) => {
    if (!onStampMove || !wrapRef.current) return;
    const layer = wrapRef.current.querySelector('.preview-stamp-layer');
    if (!layer) return;
    const rect = layer.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = clamp(((e.clientX - rect.left) / rect.width) * 100, 3, 97);
    const y = clamp(((e.clientY - rect.top) / rect.height) * 100, 3, 97);
    onStampMove({ stampPosition: 'custom', stampPosX: Math.round(x * 10) / 10, stampPosY: Math.round(y * 10) / 10 });
  };

  const onStampPointerDown = (e) => {
    if (!onStampMove) return;
    e.preventDefault();
    dragRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    moveStampFromEvent(e);
  };
  const onStampPointerMove = (e) => {
    if (!dragRef.current) return;
    moveStampFromEvent(e);
  };
  const onStampPointerUp = (e) => {
    dragRef.current = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) { /* noop */ }
  };

  const frameW = A4W * scale;
  const frameH = docH * scale;

  return (
    <div className="preview-wrap" ref={wrapRef}>
      <div className="preview-scaler" style={{ height: frameH, width: frameW, margin: '0 auto', position: 'relative' }}>
        <iframe ref={frameRef} title="Document preview" srcDoc={html} onLoad={onLoad}
          style={{ width: A4W, height: docH, border: 'none', transform: `scale(${scale})`, transformOrigin: 'top left', background: '#fff', display: 'block' }} />
        {showDragStamp && (
          <div className="preview-stamp-layer" style={{ position: 'absolute', top: 0, left: 0, width: frameW, height: frameH, pointerEvents: 'none' }}>
            <img
              src={stampSrc}
              alt=""
              className="preview-stamp-handle"
              draggable={false}
              style={{
                position: 'absolute',
                left: `${stampXY.x}%`,
                top: `${stampXY.y}%`,
                transform: 'translate(-50%, -50%)',
                width: `${(55 / 210) * 100}%`,
                opacity: stampOpacity,
                mixBlendMode: 'multiply',
                pointerEvents: 'auto',
                cursor: onStampMove ? 'grab' : 'default',
                touchAction: 'none',
              }}
              onPointerDown={onStampPointerDown}
              onPointerMove={onStampPointerMove}
              onPointerUp={onStampPointerUp}
              onPointerCancel={onStampPointerUp}
            />
          </div>
        )}
      </div>
      {showDragStamp && onStampMove && <p className="preview-stamp-hint">Drag the stamp on the preview to reposition it.</p>}
    </div>
  );
}

function DocumentStampBar({ theme, company, onChange, onLoadCompanyDefault, onSaveCompanyDefault }) {
  const set = (sub) => onChange(sub);
  const onUploadStamp = async (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const err = validateUploadFile(f, { mimes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'] });
    if (err) return;
    try {
      const url = await fileToScaledDataURL(f, 360);
      const safe = safeImageSrc(url) || url;
      set({ showStamp: true, stampImage: safe, stampTemplate: '', stampPosition: 'custom', stampPosX: theme.stampPosX ?? 84, stampPosY: theme.stampPosY ?? 88 });
    } catch (err) { /* noop */ }
    e.target.value = '';
  };
  const companyHasStamp = company && (company.theme || {}).showStamp;

  return (
    <div className="doc-stamp-bar">
      <div className="doc-stamp-bar-head">
        <Toggle checked={!!theme.showStamp} onChange={(v) => set({ showStamp: v })} label="Stamp on this invoice" />
        <div className="doc-stamp-bar-actions">
          {companyHasStamp && (
            <button type="button" className="link-btn" onClick={onLoadCompanyDefault}>Use company default</button>
          )}
          {onSaveCompanyDefault && (
            <button type="button" className="link-btn" onClick={onSaveCompanyDefault}>Save as company default</button>
          )}
        </div>
      </div>
      {theme.showStamp && (
        <>
          <div className="stamp-preset-grid stamp-bar-grid">
            <button type="button" className={cx('stamp-preset-btn', !theme.stampImage && !theme.stampTemplate && 'on')} onClick={() => set({ stampTemplate: '', stampImage: '', showStamp: false })}>
              <span className="stamp-none">—</span>
              <span className="stamp-preset-name">None</span>
            </button>
            {STAMP_PRESETS.map((preset) => (
              <button key={preset.id} type="button" className={cx('stamp-preset-btn', !theme.stampImage && theme.stampTemplate === preset.id && 'on')} onClick={() => {
                const xy = getStampXY({ ...theme, stampPosition: theme.stampPosition || 'bottom-right' });
                set({ showStamp: true, stampTemplate: preset.id, stampImage: '', stampPosition: theme.stampPosition || 'bottom-right', stampPosX: xy.x, stampPosY: xy.y });
              }}>
                <img src={stampPresetToDataUrl(preset)} alt={preset.label} />
                <span className="stamp-preset-name">{preset.label}</span>
              </button>
            ))}
          </div>
          <div className="stamp-upload-row">
            <label className="btn btn-subtle btn-sm filebtn">
              <Upload size={13} />
              <span>Upload stamp</span>
              <input type="file" accept="image/*" onChange={onUploadStamp} hidden />
            </label>
            {theme.stampImage && (
              <>
                <img src={theme.stampImage} className="stamp-custom-preview" alt="custom stamp" />
                <Btn variant="ghost" size="sm" icon={Trash2} onClick={() => set({ stampImage: '', stampTemplate: '' })}>Remove</Btn>
              </>
            )}
          </div>
          <div className="stamp-controls stamp-bar-controls">
            <Field label="Quick position">
              <Segmented
                value={theme.stampPosition === 'custom' ? 'custom' : (theme.stampPosition || 'bottom-right')}
                onChange={(v) => {
                  if (v === 'custom') {
                    const xy = getStampXY(theme);
                    set({ stampPosition: 'custom', stampPosX: xy.x, stampPosY: xy.y });
                  } else {
                    const xy = stampPresetXY(v);
                    set({ stampPosition: v, stampPosX: xy.x, stampPosY: xy.y });
                  }
                }}
                options={[
                  { value: 'bottom-right', label: 'Bottom right' },
                  { value: 'bottom-left', label: 'Bottom left' },
                  { value: 'center', label: 'Center' },
                  { value: 'custom', label: 'Custom' },
                ]}
              />
            </Field>
            <Field label="Opacity">
              <div className="stamp-opacity-row">
                <input type="range" min="0.2" max="1" step="0.05" value={theme.stampOpacity != null ? theme.stampOpacity : 0.85} onChange={(e) => set({ stampOpacity: parseFloat(e.target.value) })} />
                <span className="mono stamp-opacity-val">{Math.round((theme.stampOpacity != null ? theme.stampOpacity : 0.85) * 100)}%</span>
              </div>
            </Field>
          </div>
          <p className="hint-block" style={{ margin: 0 }}>Stamp settings are saved with this invoice. Use &ldquo;Save as company default&rdquo; to apply the same stamp to future {company ? company.name : 'company'} documents.</p>
        </>
      )}
    </div>
  );
}

// ============================================================================
//  VIEWS — shared utilities
// ============================================================================
function companyById(store, id) { return (store.companies || []).find((c) => c.id === id) || null; }
function clientById(store, id) { return (store.clients || []).find((c) => c.id === id) || null; }
function docNumberLabel(doc) { return doc.number || formatDocNumber(doc.type, doc.seq, doc.year); }
function docNetTotal(doc) { const meta = DOC_TYPES[doc.type]; if (!meta || !meta.money) return null; return computeTotals(doc).nettoAPagare; }
function sumByCurrency(docs) {
  const m = {};
  for (const d of docs) { const meta = DOC_TYPES[d.type]; if (!meta || !meta.money) continue; const c = d.currency || 'EUR'; m[c] = (m[c] || 0) + computeTotals(d).nettoAPagare; }
  return m;
}
function moneyMapText(m) { const ks = Object.keys(m); if (!ks.length) return money(0); return ks.map((k) => money(m[k], k)).join('   ·   '); }
function sortDocs(docs) { return [...docs].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0)); }

function ViewHead({ title, sub, actions }) {
  return (
    <div className="view-head">
      <div><div className="vh-title">{title}</div>{sub && <div className="vh-sub">{sub}</div>}</div>
      {actions && <div className="vh-actions">{actions}</div>}
    </div>
  );
}
function Collapsible({ title, icon: Icon, defaultOpen = false, right, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={cx('collap', open && 'open')}>
      <button type="button" className="collap-head" onClick={() => setOpen((o) => !o)}>
        {Icon && <Icon size={15} />}
        <span className="collap-title">{title}</span>
        {right && <span className="collap-right" onClick={(e) => e.stopPropagation()}>{right}</span>}
        <ChevronDown size={16} className={cx('collap-caret', open && 'open')} />
      </button>
      {open && <div className="collap-body">{children}</div>}
    </div>
  );
}
function TypeTag({ type }) {
  const meta = DOC_TYPES[type] || DOC_TYPES.fattura; const Icon = meta.icon;
  return <span className="typetag"><Icon size={13} />{meta.short}</span>;
}

// ============================================================================
//  DASHBOARD
// ============================================================================
function Dashboard({ store, onNew, onView, onGo }) {
  const docs = store.documents || [];
  const fatture = docs.filter((d) => d.type === 'fattura');
  const daIncassare = sumByCurrency(fatture.filter((d) => ['emessa', 'inviata'].includes(d.status)));
  const incassato = sumByCurrency(fatture.filter((d) => d.status === 'pagata'));
  const scaduto = sumByCurrency(fatture.filter((d) => d.status === 'scaduta'));
  const recent = sortDocs(docs).slice(0, 7);
  const byType = DOC_ORDER.map((t) => ({ t, n: docs.filter((d) => d.type === t).length })).filter((x) => x.n > 0);

  return (
    <div className="view">
      <ViewHead title="Dashboard" sub={`${store.companies.length} companies · ${docs.length} documents · ${store.clients.length} clients`}
        actions={<Btn icon={Plus} onClick={onNew}>New document</Btn>} />

      <div className="stat-grid">
        <div className="stat"><div className="stat-k">Total documents</div><div className="stat-v">{docs.length}</div><div className="stat-sub">{fatture.length} invoices</div></div>
        <div className="stat"><div className="stat-k">To collect</div><div className="stat-v">{moneyMapText(daIncassare)}</div><div className="stat-sub">open invoices</div></div>
        <div className="stat ok"><div className="stat-k">Collected</div><div className="stat-v">{moneyMapText(incassato)}</div><div className="stat-sub">paid invoices</div></div>
        <div className={cx('stat', Object.keys(scaduto).length && 'alert')}><div className="stat-k">Overdue</div><div className="stat-v">{moneyMapText(scaduto)}</div><div className="stat-sub">to chase</div></div>
      </div>

      {byType.length > 0 && (
        <div className="chips">
          {byType.map(({ t, n }) => (
            <button key={t} className="chip" onClick={onGo}><TypeTag type={t} /><span className="chip-n">{n}</span></button>
          ))}
        </div>
      )}

      <div className="panel">
        <div className="panel-head"><span className="panel-title">Recent documents</span><Btn variant="ghost" size="sm" onClick={onGo}>View all</Btn></div>
        {recent.length === 0 ? (
          <EmptyState icon={FileText} title="No documents" sub="Create your first document to get started." action={<Btn icon={Plus} onClick={onNew}>New document</Btn>} />
        ) : (
          <div className="tbl-wrap">
            <table className="dtable">
              <thead><tr><th>Type</th><th>Number</th><th>Date</th><th>Client</th><th>Company</th><th className="r">Total</th><th>Status</th></tr></thead>
              <tbody>
                {recent.map((d) => {
                  const cl = clientById(store, d.clientId); const co = companyById(store, d.companyId); const tot = docNetTotal(d);
                  return (
                    <tr key={d.id} className="clickrow" onClick={() => onView(d)}>
                      <td><TypeTag type={d.type} /></td>
                      <td className="mono">{docNumberLabel(d)}</td>
                      <td className="mono dim">{dateFmt(d.date)}</td>
                      <td>{cl ? cl.name : <span className="dim">—</span>}</td>
                      <td className="dim">{co ? co.name : '—'}</td>
                      <td className="r mono">{tot == null ? '—' : money(tot, d.currency)}</td>
                      <td><Badge status={d.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
//  DOCUMENTS LIST
// ============================================================================
function StatusModal({ open, doc, onClose, onPick }) {
  return (
    <Modal open={open} onClose={onClose} title="Change status">
      <div className="statuslist">
        {STATUS_ORDER.map((s) => (
          <button key={s} className={cx('statusrow', doc && doc.status === s && 'on')} onClick={() => { onPick(s); onClose(); }}>
            <Badge status={s} />
            {doc && doc.status === s && <Check size={16} className="acc" />}
          </button>
        ))}
      </div>
    </Modal>
  );
}

function DocumentsList({ store, onNew, onEdit, onView, onDuplicate, onDelete, onStatus, defaultCompanyId }) {
  const [q, setQ] = useState('');
  const [fType, setFType] = useState('');
  const [fCompany, setFCompany] = useState(defaultCompanyId || '');
  const [fStatus, setFStatus] = useState('');
  const [statusFor, setStatusFor] = useState(null);
  const [delFor, setDelFor] = useState(null);

  useEffect(() => {
    if (defaultCompanyId && !fCompany) setFCompany(defaultCompanyId);
  }, [defaultCompanyId]);

  const rows = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return sortDocs((store.documents || []).filter((d) => {
      if (fType && d.type !== fType) return false;
      if (fCompany && d.companyId !== fCompany) return false;
      if (fStatus && d.status !== fStatus) return false;
      if (ql) {
        const cl = clientById(store, d.clientId); const co = companyById(store, d.companyId);
        const hay = `${docNumberLabel(d)} ${cl ? cl.name : ''} ${co ? co.name : ''} ${(d.lines || []).map((l) => l.desc).join(' ')}`.toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      return true;
    }));
  }, [store, q, fType, fCompany, fStatus]);

  return (
    <div className="view">
      <ViewHead title="Documents" sub={`${rows.length} results`} actions={<Btn icon={Plus} onClick={onNew}>New document</Btn>} />

      <div className="filterbar">
        <span className="searchwrap"><Search size={15} className="searchic" /><input className="inp" placeholder="Search number, client, item…" value={q} onChange={(e) => setQ(e.target.value)} /></span>
        <Select value={fType} onChange={setFType} placeholder="All types" options={DOC_ORDER.map((t) => ({ value: t, label: DOC_TYPES[t].label }))} />
        <Select value={fCompany} onChange={setFCompany} placeholder="All companies" options={store.companies.map((c) => ({ value: c.id, label: c.name }))} />
        <Select value={fStatus} onChange={setFStatus} placeholder="All statuses" options={STATUS_ORDER.map((s) => ({ value: s, label: STATUSES[s].label }))} />
        {(q || fType || fCompany || fStatus) && <Btn variant="subtle" size="sm" icon={X} onClick={() => { setQ(''); setFType(''); setFCompany(''); setFStatus(''); }}>Clear</Btn>}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Filter} title="No documents found" sub="Adjust the filters or create a new document." action={<Btn icon={Plus} onClick={onNew}>New document</Btn>} />
      ) : (
        <div className="tbl-wrap">
          <table className="dtable">
            <thead><tr><th>Type</th><th>Number</th><th>Date</th><th>Client</th><th>Company</th><th className="r">Total</th><th>Status</th><th className="r">Actions</th></tr></thead>
            <tbody>
              {rows.map((d) => {
                const cl = clientById(store, d.clientId); const co = companyById(store, d.companyId); const tot = docNetTotal(d);
                return (
                  <tr key={d.id}>
                    <td><TypeTag type={d.type} /></td>
                    <td className="mono clickcell" onClick={() => onView(d)}>{docNumberLabel(d)}</td>
                    <td className="mono dim">{dateFmt(d.date)}</td>
                    <td>{cl ? cl.name : <span className="dim">—</span>}</td>
                    <td className="dim">{co ? co.name : '—'}</td>
                    <td className="r mono">{tot == null ? '—' : money(tot, d.currency)}</td>
                    <td><button className="badge-btn" onClick={() => setStatusFor(d)} title="Change status"><Badge status={d.status} /></button></td>
                    <td>
                      <div className="row-actions">
                        <IconBtn icon={Eye} title="Preview" onClick={() => onView(d)} />
                        <IconBtn icon={Pencil} title="Edit" onClick={() => onEdit(d)} />
                        <IconBtn icon={Copy} title="Duplicate" onClick={() => onDuplicate(d)} />
                        <IconBtn icon={Printer} title="Print / PDF" onClick={() => { const co2 = companyById(store, d.companyId); const cl2 = clientById(store, d.clientId); printHTML(buildDocumentHTML(d, co2, cl2, store.settings)); }} />
                        <IconBtn icon={Trash2} title="Delete" danger onClick={() => setDelFor(d)} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <StatusModal open={!!statusFor} doc={statusFor} onClose={() => setStatusFor(null)} onPick={(s) => onStatus(statusFor, s)} />
      <Modal open={!!delFor} onClose={() => setDelFor(null)} title="Delete document"
        footer={<><Btn variant="ghost" onClick={() => setDelFor(null)}>Cancel</Btn><Btn variant="danger" icon={Trash2} onClick={() => { onDelete(delFor); setDelFor(null); }}>Delete</Btn></>}>
        {delFor && <p>Permanently delete <strong>{docNumberLabel(delFor)}</strong>? This action cannot be undone.</p>}
      </Modal>
    </div>
  );
}

// ============================================================================
//  DOCUMENT VIEWER
// ============================================================================
function DocumentViewer({ open, doc, store, onClose, onEdit }) {
  const html = useMemo(() => {
    if (!doc) return '';
    return buildDocumentHTML(doc, companyById(store, doc.companyId), clientById(store, doc.clientId), store.settings);
  }, [doc, store]);
  const fileName = doc ? `${docNumberLabel(doc).replace(/[^\w\-]+/g, '_')}.html` : 'document.html';
  return (
    <Modal open={open} onClose={onClose} wide title={doc ? `${DOC_TYPES[doc.type].label} · ${docNumberLabel(doc)}` : 'Document'}
      footer={doc && (
        <>
          <Btn variant="ghost" icon={Pencil} onClick={() => onEdit(doc)}>Edit</Btn>
          <Btn variant="subtle" icon={FileDown} onClick={() => downloadBlob(fileName, html)}>Download HTML</Btn>
          <Btn icon={Printer} onClick={() => printHTML(html)}>Print / PDF</Btn>
        </>
      )}>
      {doc && <DocPreview html={html} />}
    </Modal>
  );
}

// ============================================================================
//  EDITOR — draft construction helpers
// ============================================================================
function blankLine() { return { id: uid(), desc: '', qty: 1, um: 'pcs', price: 0, iva: 22, discount: 0, note: '' }; }
function freshDoc(store, type) {
  const s = store.settings || {};
  const companyId = (s.defaultCompanyId && companyById(store, s.defaultCompanyId)) ? s.defaultCompanyId : ((store.companies[0] && store.companies[0].id) || '');
  const co = companyById(store, companyId);
  const year = yearOf(todayISO());
  const seq = nextSeq(store.documents, companyId, type, year);
  return {
    id: uid(), companyId, clientId: (store.clients[0] && store.clients[0].id) || '', type, status: 'bozza',
    date: todayISO(), dueDate: addDays(todayISO(), 30), validUntil: addDays(todayISO(), 30), refDoc: '',
    subject: '', contactPerson: '',
    currency: (co && co.currency) || s.currency || 'EUR', number: formatDocNumber(type, seq, year), seq, year,
    lines: [blankLine()], notes: '', causaleFiscale: (co && co.regime === 'Margin scheme' && co.causaleFiscale) ? co.causaleFiscale : '',
    cassa: { enabled: false, rate: 4, iva: 22 },
    ritenuta: { enabled: false, rate: 20, base: 'imponibile' },
    bollo: { enabled: false, amount: 2 },
    payment: { method: 'Bank transfer', iban: (co && co.iban) || '', terms: '' },
    transport: { causale: '', aspetto: '', colli: '', peso: '', vettore: '', porto: '', date: todayISO(), time: '', annotazioni: '' },
    themeOverride: {}, createdAt: Date.now(),
  };
}
const SAMPLE_CLIENT = { type: 'azienda', name: 'Sample Client Ltd', forma: 'Ltd', piva: '01234567890', cf: '01234567890', address: 'Via Roma 1', cap: '20100', city: 'Milan', prov: 'MI', country: 'Italy', email: 'cliente@esempio.it', sdi: 'ABCDE12' };
function sampleDocForCompany(co) {
  const y = yearOf(todayISO());
  return {
    id: 'sample', companyId: co.id, clientId: 'sample', type: 'fattura', status: 'emessa',
    date: todayISO(), dueDate: addDays(todayISO(), 30), validUntil: '', refDoc: '', currency: 'EUR',
    number: formatDocNumber('fattura', 42, y), seq: 42, year: y,
    lines: [
      { id: 'l1', desc: 'Rolex Submariner Date ref. 126610LN', qty: 1, um: 'pcs', price: 12800, iva: 22, discount: 0, note: 'Full set, 2024 warranty.' },
      { id: 'l2', desc: 'Full movement service', qty: 1, um: 'pcs', price: 350, iva: 22, discount: 0, note: '' },
    ],
    notes: 'Thank you for your business.', causaleFiscale: '',
    cassa: { enabled: false, rate: 4, iva: 22 }, ritenuta: { enabled: false, rate: 20, base: 'imponibile' }, bollo: { enabled: false, amount: 2 },
    payment: { method: 'Bank transfer', iban: co.iban || '', terms: 'Payment within 30 days of invoice date.' },
    transport: {}, themeOverride: {}, createdAt: Date.now(),
  };
}

// ============================================================================
//  EDITOR — reusable sections
// ============================================================================
function ThemeEditor({ value, onChange }) {
  const set = (sub) => onChange({ ...value, ...sub });
  const onUploadHtml = async (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    try { const txt = sanitizeHTML(await f.text()); set({ customHTML: txt, template: 'custom' }); } catch (err) { /* noop */ }
    e.target.value = '';
  };
  const onUploadStamp = async (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const err = validateUploadFile(f, { mimes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'] });
    if (err) return;
    try {
      const url = await fileToScaledDataURL(f, 360);
      const safe = safeImageSrc(url) || url;
      set({ stampImage: safe, stampTemplate: '' });
    } catch (err) { /* noop */ }
    e.target.value = '';
  };
  return (
    <div className="theme-editor">
      <Field label="Template" full><Segmented value={value.template} onChange={(v) => set({ template: v })} options={TEMPLATE_ORDER.map((t) => ({ value: t, label: TEMPLATES[t].label }))} /></Field>
      <Field label="Font" full><Segmented value={value.font} onChange={(v) => set({ font: v })} options={Object.keys(FONTS).map((f) => ({ value: f, label: FONTS[f].label }))} /></Field>
      <Field label="Accent color" full><ColorField value={value.accent} onChange={(v) => set({ accent: v })} /></Field>
      <Field label="Text color"><label className="inkfield"><input type="color" value={value.ink || '#14181f'} onChange={(e) => set({ ink: e.target.value })} /><span className="mono">{value.ink}</span></label></Field>
      <Field label="Accent style"><Segmented value={value.accentStyle} onChange={(v) => set({ accentStyle: v })} options={[{ value: 'band', label: 'Band' }, { value: 'line', label: 'Line' }, { value: 'soft', label: 'Soft' }]} /></Field>
      <Field label="Logo position" full><Segmented value={value.logoPosition} onChange={(v) => set({ logoPosition: v })} options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]} /></Field>
      <div className="toggle-grid full">
        <Toggle checked={value.showLogo} onChange={(v) => set({ showLogo: v })} label="Show logo" />
        <Toggle checked={value.showPaymentBox} onChange={(v) => set({ showPaymentBox: v })} label="Payment box" />
        <Toggle checked={value.showNotes} onChange={(v) => set({ showNotes: v })} label="Footer notes" />
        <Toggle checked={value.showSignature} onChange={(v) => set({ showSignature: v })} label="Signature space" />
        <Toggle checked={!!value.showStamp} onChange={(v) => set({ showStamp: v })} label="Stamp overlay" />
      </div>

      {value.showStamp && (
        <div className="stamp-editor full">
          <div className="stamp-editor-label">Pre-made stamps</div>
          <div className="stamp-preset-grid">
            <button type="button" className={cx('stamp-preset-btn', !value.stampImage && !value.stampTemplate && 'on')} onClick={() => set({ stampTemplate: '', stampImage: '' })}>
              <span className="stamp-none">—</span>
              <span className="stamp-preset-name">None</span>
            </button>
            {STAMP_PRESETS.map((preset) => (
              <button key={preset.id} type="button" className={cx('stamp-preset-btn', !value.stampImage && value.stampTemplate === preset.id && 'on')} onClick={() => {
                const xy = getStampXY({ ...value, stampPosition: value.stampPosition || 'bottom-right' });
                set({ stampTemplate: preset.id, stampImage: '', stampPosition: value.stampPosition || 'bottom-right', stampPosX: xy.x, stampPosY: xy.y });
              }}>
                <img src={stampPresetToDataUrl(preset)} alt={preset.label} />
                <span className="stamp-preset-name">{preset.label}</span>
              </button>
            ))}
          </div>
          <div className="stamp-upload-row">
            <label className="btn btn-subtle btn-sm filebtn">
              <Upload size={13} />
              <span>Upload custom stamp</span>
              <input type="file" accept="image/*" onChange={onUploadStamp} hidden />
            </label>
            {value.stampImage && (
              <>
                <img src={value.stampImage} className="stamp-custom-preview" alt="custom stamp" />
                <Btn variant="ghost" size="sm" icon={Trash2} onClick={() => set({ stampImage: '', stampTemplate: '' })}>Remove</Btn>
              </>
            )}
            <span className="hint">PNG with transparency recommended</span>
          </div>
          <div className="stamp-controls">
            <Field label="Position">
              <Segmented
                value={value.stampPosition === 'custom' ? 'custom' : (value.stampPosition || 'bottom-right')}
                onChange={(v) => {
                  if (v === 'custom') {
                    const xy = getStampXY(value);
                    set({ stampPosition: 'custom', stampPosX: xy.x, stampPosY: xy.y });
                  } else {
                    const xy = stampPresetXY(v);
                    set({ stampPosition: v, stampPosX: xy.x, stampPosY: xy.y });
                  }
                }}
                options={[
                  { value: 'bottom-right', label: 'Bottom right' },
                  { value: 'bottom-left', label: 'Bottom left' },
                  { value: 'center', label: 'Center' },
                  { value: 'custom', label: 'Custom' },
                ]}
              />
            </Field>
            <Field label="Opacity">
              <div className="stamp-opacity-row">
                <input type="range" min="0.2" max="1" step="0.05" value={value.stampOpacity != null ? value.stampOpacity : 0.85} onChange={(e) => set({ stampOpacity: parseFloat(e.target.value) })} />
                <span className="mono stamp-opacity-val">{Math.round((value.stampOpacity != null ? value.stampOpacity : 0.85) * 100)}%</span>
              </div>
            </Field>
          </div>
        </div>
      )}

      {value.template === 'custom' && (
        <div className="custom-tpl full">
          <p className="hint-block" style={{ marginBottom: 4 }}>
            The custom template controls the whole layout from your own HTML. Accent / text color / "show logo" still feed the tokens below.
            Paste a full HTML document, or just body content — fragments are auto-wrapped and the ready-made blocks like <code>{'{{{items_table}}}'}</code> are styled for you.
          </p>
          <div className="ct-head">
            <span className="ct-title">Custom template (HTML)</span>
            <div className="ct-actions">
              <button type="button" className="link-btn" onClick={() => set({ customHTML: CUSTOM_STARTER })}>Load starter</button>
              <label className="filebtn link-btn" style={{ textDecoration: 'none' }}><Upload size={13} /> Upload .html<input type="file" accept=".html,.htm,text/html" onChange={onUploadHtml} hidden /></label>
              {value.customHTML ? <button type="button" className="link-btn" onClick={() => set({ customHTML: '' })}>Clear</button> : null}
            </div>
          </div>
          <textarea
            className="inp ta code" rows={16} spellCheck={false}
            value={value.customHTML || ''}
            placeholder={'Paste your HTML invoice template here, or click "Load starter".\nUse {{tokens}} for values \u2014 e.g. {{company.name}}, {{number}}, {{totals.total}}.'}
            onChange={(e) => set({ customHTML: e.target.value })}
          />
          <Collapsible title="Available tokens" icon={Hash}>
            <div className="token-ref">
              <div>
                <h5>Document</h5>
                <ul>
                  <li><code>{'{{type_label}}'}</code> <span className="td">e.g. Invoice</span></li>
                  <li><code>{'{{number}}'}</code> · <code>{'{{date}}'}</code></li>
                  <li><code>{'{{due_date}}'}</code> · <code>{'{{valid_until}}'}</code></li>
                  <li><code>{'{{ref}}'}</code> · <code>{'{{currency}}'}</code> · <code>{'{{status_label}}'}</code></li>
                  <li><code>{'{{notes}}'}</code> · <code>{'{{tax_notes}}'}</code></li>
                </ul>
              </div>
              <div>
                <h5>Company / Client</h5>
                <ul>
                  <li><code>{'{{company.name}}'}</code> · <code>{'{{client.name}}'}</code></li>
                  <li><code>{'{{company.address}}'}</code> · <code>{'{{company.city}}'}</code></li>
                  <li><code>{'{{company.vat}}'}</code> · <code>{'{{company.taxcode}}'}</code></li>
                  <li><code>{'{{company.iban}}'}</code> · <code>{'{{company.bank}}'}</code></li>
                  <li className="td">…also cap, prov, country, email, phone, sdi, pec, rea, capital, logo</li>
                </ul>
              </div>
              <div>
                <h5>Totals</h5>
                <ul>
                  <li><code>{'{{totals.taxable}}'}</code> · <code>{'{{totals.vat}}'}</code></li>
                  <li><code>{'{{totals.total}}'}</code> · <code>{'{{totals.net}}'}</code></li>
                  <li><code>{'{{totals.withholding}}'}</code> · <code>{'{{totals.stamp}}'}</code> · <code>{'{{totals.fund}}'}</code></li>
                </ul>
              </div>
              <div>
                <h5>Line items (loop)</h5>
                <ul>
                  <li><code>{'{{#items}}'}…<code>{'{{/items}}'}</code></code></li>
                  <li><code>{'{{n}}'}</code> <code>{'{{desc}}'}</code> <code>{'{{note}}'}</code> <code>{'{{qty}}'}</code></li>
                  <li><code>{'{{unit}}'}</code> <code>{'{{price}}'}</code> <code>{'{{discount}}'}</code> <code>{'{{vat}}'}</code> <code>{'{{amount}}'}</code></li>
                </ul>
              </div>
              <div>
                <h5>Ready-made blocks (raw)</h5>
                <ul>
                  <li><code>{'{{{items_table}}}'}</code> · <code>{'{{{totals_block}}}'}</code></li>
                  <li><code>{'{{{company_block}}}'}</code> · <code>{'{{{client_block}}}'}</code></li>
                  <li><code>{'{{{logo}}}'}</code> · <code>{'{{{payment_block}}}'}</code> · <code>{'{{{notes_block}}}'}</code></li>
                  <li><code>{'{{{stamp_block}}}'}</code> <span className="td">stamp overlay (when enabled)</span></li>
                  <li className="td">triple braces = raw HTML, not escaped</li>
                </ul>
              </div>
              <div>
                <h5>Conditionals</h5>
                <ul>
                  <li><code>{'{{#has_logo}}'}…<code>{'{{/has_logo}}'}</code></code></li>
                  <li><code>{'{{^has_logo}}'}…<code>{'{{/has_logo}}'}</code></code> <span className="td">(if empty)</span></li>
                  <li className="td">has_due, has_withholding, has_stamp, has_payment, has_notes, has_transport, is_goods</li>
                </ul>
              </div>
            </div>
          </Collapsible>
        </div>
      )}
    </div>
  );
}

function LineItems({ lines, currency, products, onAdd, onAddProduct, onUpdate, onRemove, onMove }) {
  const [pick, setPick] = useState(false);
  return (
    <div className="lines">
      {(lines || []).map((l, i) => (
        <div className="linecard" key={l.id}>
          <div className="lc-top">
            <span className="lc-idx">{i + 1}</span>
            <input className="inp lc-desc" placeholder="Item or service description" value={l.desc || ''} onChange={(e) => onUpdate(l.id, { desc: e.target.value })} />
            <div className="lc-tools">
              <IconBtn icon={ChevronUp} title="Move up" onClick={() => onMove(l.id, -1)} />
              <IconBtn icon={ChevronDown} title="Move down" onClick={() => onMove(l.id, 1)} />
              <IconBtn icon={Trash2} danger title="Remove row" onClick={() => onRemove(l.id)} />
            </div>
          </div>
          <div className="lc-grid">
            <Field label="Qty"><NumberInput value={l.qty} onChange={(v) => onUpdate(l.id, { qty: v })} /></Field>
            <Field label="Unit"><Select value={l.um} onChange={(v) => onUpdate(l.id, { um: v })} options={UM_PRESETS} /></Field>
            <Field label="Price"><NumberInput value={l.price} onChange={(v) => onUpdate(l.id, { price: v })} suffix={currency} /></Field>
            <Field label="VAT"><Select value={String(l.iva)} onChange={(v) => onUpdate(l.id, { iva: num(v) })} options={IVA_PRESETS.map((r) => ({ value: String(r), label: r + '%' }))} /></Field>
            <Field label="Discount"><NumberInput value={l.discount} onChange={(v) => onUpdate(l.id, { discount: v })} suffix="%" /></Field>
            <Field label="Amount"><div className="lc-amount mono">{money(lineImponibile(l), currency)}</div></Field>
          </div>
          <input className="inp lc-note" placeholder="Row notes (optional)" value={l.note || ''} onChange={(e) => onUpdate(l.id, { note: e.target.value })} />
        </div>
      ))}
      <div className="lines-actions">
        <Btn variant="ghost" icon={Plus} onClick={onAdd}>Add row</Btn>
        {products && products.length > 0 && <Btn variant="subtle" icon={Package} onClick={() => setPick(true)}>Add from catalog</Btn>}
      </div>
      <Modal open={pick} onClose={() => setPick(false)} title="Add from catalog">
        <div className="picklist">
          {(products || []).map((p) => (
            <button key={p.id} className="pickrow" onClick={() => { onAddProduct(p); setPick(false); }}>
              <span className="pr-desc">{p.desc}</span>
              <span className="pr-meta mono">{money(p.price, currency)} · VAT {p.iva}% · {p.um}</span>
            </button>
          ))}
          {(!products || products.length === 0) && <div className="dim">No items in catalog.</div>}
        </div>
      </Modal>
    </div>
  );
}

function ClientFields({ c, set }) {
  return (
    <div className="form-grid">
      <Field label="Type" full><Segmented value={c.type} onChange={(v) => set('type', v)} options={[{ value: 'azienda', label: 'Company' }, { value: 'privato', label: 'Individual' }]} /></Field>
      <Field label="Name / Legal name" full><TextInput value={c.name} onChange={(v) => set('name', v)} placeholder="e.g. Gioielleria Aurora Ltd" /></Field>
      {c.type === 'azienda' && <Field label="Legal form"><Select value={c.forma} onChange={(v) => set('forma', v)} placeholder="—" options={FORME_GIURIDICHE} /></Field>}
      <Field label="VAT No."><TextInput value={c.piva} onChange={(v) => set('piva', v)} mono /></Field>
      <Field label="Tax code"><TextInput value={c.cf} onChange={(v) => set('cf', v)} mono /></Field>
      <Field label="SDI code"><TextInput value={c.sdi} onChange={(v) => set('sdi', v)} mono placeholder="0000000" /></Field>
      <Field label="Address" full><TextInput value={c.address} onChange={(v) => set('address', v)} /></Field>
      <Field label="Postal code"><TextInput value={c.cap} onChange={(v) => set('cap', v)} mono /></Field>
      <Field label="City"><TextInput value={c.city} onChange={(v) => set('city', v)} /></Field>
      <Field label="State/Prov."><TextInput value={c.prov} onChange={(v) => set('prov', v)} /></Field>
      <Field label="Country"><TextInput value={c.country} onChange={(v) => set('country', v)} /></Field>
      <Field label="Email"><TextInput value={c.email} onChange={(v) => set('email', v)} type="email" /></Field>
      <Field label="Phone"><TextInput value={c.phone} onChange={(v) => set('phone', v)} /></Field>
    </div>
  );
}
function QuickClientModal({ open, onClose, onCreate }) {
  const [c, setC] = useState(() => ({ id: uid(), type: 'azienda', name: '', forma: '', piva: '', cf: '', address: '', cap: '', city: '', prov: '', country: 'Italy', email: '', phone: '', sdi: '' }));
  useEffect(() => { if (open) setC({ id: uid(), type: 'azienda', name: '', forma: '', piva: '', cf: '', address: '', cap: '', city: '', prov: '', country: 'Italy', email: '', phone: '', sdi: '' }); }, [open]);
  const set = (k, v) => setC((o) => ({ ...o, [k]: v }));
  const create = () => { if (!c.name.trim()) return; onCreate(c); onClose(); };
  return (
    <Modal open={open} onClose={onClose} title="New client"
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn icon={Check} onClick={create} disabled={!c.name.trim()}>Add client</Btn></>}>
      <ClientFields c={c} set={set} />
    </Modal>
  );
}

// ============================================================================
//  DOCUMENT EDITOR
// ============================================================================
function DocumentEditor({ store, editingId, draftType, onSave, onCancel, onUpsertClient, onAddClientFile, onDeleteClientFile, onUpdateCompany, onNotify }) {
  const existing = editingId ? (store.documents || []).find((d) => d.id === editingId) : null;
  const [draft, setDraft] = useState(() => (existing ? JSON.parse(JSON.stringify(existing)) : freshDoc(store, draftType || 'fattura')));
  const [numTouched, setNumTouched] = useState(!!existing);
  const [quickClient, setQuickClient] = useState(false);
  const [sellerDocsOpen, setSellerDocsOpen] = useState(false);
  const [tab, setTab] = useState('form');
  const isMobile = useMedia(980);

  const patch = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const patchObj = (k, sub) => setDraft((d) => ({ ...d, [k]: { ...d[k], ...sub } }));

  useEffect(() => {
    if (numTouched) return;
    const y = yearOf(draft.date);
    const seq = nextSeq((store.documents || []).filter((d) => d.id !== draft.id), draft.companyId, draft.type, y);
    setDraft((d) => ({ ...d, seq, year: y, number: formatDocNumber(d.type, seq, y) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.companyId, draft.type, draft.date, numTouched]);

  const patchTheme = (sub) => patch('themeOverride', { ...(draft.themeOverride || {}), ...sub });

  const company = companyById(store, draft.companyId);
  const client = clientById(store, draft.clientId);
  const meta = DOC_TYPES[draft.type] || DOC_TYPES.fattura;
  const totals = meta.money ? computeTotals(draft) : null;
  const themeVal = effectiveTheme(company, draft);
  const html = useMemo(() => buildDocumentHTML(draft, company, client, store.settings), [draft, company, client, store.settings]);
  const previewHtml = useMemo(() => {
    const stampActive = themeVal.showStamp && resolveStampImageSrc(themeVal);
    return buildDocumentHTML(draft, company, client, store.settings, { omitStamp: stampActive });
  }, [draft, company, client, store.settings, themeVal.showStamp, themeVal.stampTemplate, themeVal.stampImage, themeVal.stampPosition, themeVal.stampPosX, themeVal.stampPosY]);

  const loadCompanyStamp = () => {
    if (!company) return;
    const coTheme = { ...DEFAULT_THEME, ...(company.theme || {}) };
    patchTheme(pickStampTheme(coTheme));
  };
  const saveCompanyStamp = () => {
    if (!company || !onUpdateCompany) return;
    onUpdateCompany({ ...company, theme: { ...DEFAULT_THEME, ...(company.theme || {}), ...pickStampTheme(themeVal) } });
    if (onNotify) onNotify(`Stamp saved as default for ${company.name}.`, 'warn');
  };

  const setLines = (lines) => patch('lines', lines);
  const addLine = () => setLines([...(draft.lines || []), blankLine()]);
  const addProduct = (p) => setLines([...(draft.lines || []), { id: uid(), desc: p.desc, qty: 1, um: p.um || 'pcs', price: p.price || 0, iva: p.iva == null ? 22 : p.iva, discount: 0, note: '' }]);
  const updLine = (id, sub) => setLines((draft.lines || []).map((l) => (l.id === id ? { ...l, ...sub } : l)));
  const delLine = (id) => setLines((draft.lines || []).filter((l) => l.id !== id));
  const moveLine = (id, dir) => { const arr = [...(draft.lines || [])]; const i = arr.findIndex((l) => l.id === id); const j = i + dir; if (i < 0 || j < 0 || j >= arr.length) return; const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp; setLines(arr); };

  const regenNumber = () => { const y = yearOf(draft.date); const seq = nextSeq((store.documents || []).filter((d) => d.id !== draft.id), draft.companyId, draft.type, y); setNumTouched(true); setDraft((d) => ({ ...d, seq, year: y, number: formatDocNumber(d.type, seq, y) })); };
  const save = () => {
    const d = { ...draft };
    if (!d.number) d.number = formatDocNumber(d.type, d.seq, d.year);
    const ps = parseInt(d.seq); if (!isNaN(ps)) d.seq = ps;
    const dup = findDuplicateDocNumber(store.documents, d, d.id);
    if (dup) { if (onNotify) onNotify(`Document number "${docNumberLabel(d)}" is already used by another document for this company.`, 'error'); return; }
    onSave(d);
  };

  const showForm = !isMobile || tab === 'form';
  const showPrev = !isMobile || tab === 'preview';

  return (
    <div className="editor">
      <div className="editor-bar">
        <button className="iconbtn" onClick={onCancel} title="Cancel" aria-label="Cancel"><ArrowLeft size={18} /></button>
        <div className="eb-title">{existing ? `Edit · ${docNumberLabel(draft)}` : 'New document'}</div>
        <div className="eb-actions">
          <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
          <Btn icon={Save} onClick={save}>Save</Btn>
        </div>
      </div>

      {isMobile && (
        <div className="editor-tabs">
          <Segmented value={tab} onChange={setTab} options={[{ value: 'form', label: 'Fill in' }, { value: 'preview', label: 'Preview' }]} />
        </div>
      )}

      <div className="editor-cols">
        {showForm && (
          <div className="editor-form">
            <div className="panel">
              <div className="panel-title sec">Type & header</div>
              <Field label="Document type"><Segmented value={draft.type} onChange={(v) => patch('type', v)} options={DOC_ORDER.map((t) => ({ value: t, label: DOC_TYPES[t].label }))} /></Field>
              <div className="form-grid">
                <Field label="Issuing company"><Select value={draft.companyId} onChange={(v) => patch('companyId', v)} options={store.companies.map((c) => ({ value: c.id, label: c.name }))} placeholder={store.companies.length ? null : '—'} /></Field>
                <Field label="Client"><div className="inline">
                  <Select value={draft.clientId} onChange={(v) => patch('clientId', v)} options={store.clients.map((c) => ({ value: c.id, label: c.name }))} placeholder="Select client" />
                  <IconBtn icon={Plus} title="New client" onClick={() => setQuickClient(true)} />
                </div></Field>
                <Field label="Status"><Select value={draft.status} onChange={(v) => patch('status', v)} options={STATUS_ORDER.map((s) => ({ value: s, label: STATUSES[s].label }))} /></Field>
                <Field label="Currency"><Select value={draft.currency} onChange={(v) => patch('currency', v)} options={CURRENCIES} /></Field>
                <Field label="Subject / heading" full hint="Optional title line shown on the document"><TextInput value={draft.subject || ''} onChange={(v) => patch('subject', v)} placeholder="e.g. Rolex Daytona | Cartier" /></Field>
                <Field label="Contact person"><TextInput value={draft.contactPerson || ''} onChange={(v) => patch('contactPerson', v)} /></Field>
              </div>
              <DocumentStampBar
                theme={themeVal}
                company={company}
                onChange={patchTheme}
                onLoadCompanyDefault={loadCompanyStamp}
                onSaveCompanyDefault={company && onUpdateCompany ? saveCompanyStamp : null}
              />
            </div>

            {draft.type === 'acquisto' && (
              <div className="panel">
                <div className="panel-title sec">Seller documents (ID / KYC)</div>
                {!client ? (
                  <p className="dim" style={{ margin: 0 }}>Select the seller above to attach their identity documents (ID card, passport).</p>
                ) : (
                  <>
                    <p className="dim" style={{ margin: '0 0 10px' }}>{(client.attachments || []).length} document(s) on file for {client.name}.</p>
                    <Btn variant="ghost" icon={Paperclip} onClick={() => setSellerDocsOpen(true)}>Manage seller documents</Btn>
                  </>
                )}
                <ClientDocsModal open={sellerDocsOpen} client={client} onClose={() => setSellerDocsOpen(false)} onAdd={onAddClientFile} onDelete={onDeleteClientFile} />
              </div>
            )}

            <div className="panel">
              <div className="panel-title sec">Numbering & dates</div>
              <div className="form-grid">
                <Field label="Number" hint="Auto-generated, editable"><div className="inline">
                  <TextInput value={draft.number} onChange={(v) => { setNumTouched(true); patch('number', v); }} mono />
                  <IconBtn icon={RefreshCw} title="Regenerate number" onClick={regenNumber} />
                </div></Field>
                <Field label="Document date"><input className="inp mono" type="date" value={draft.date || ''} onChange={(e) => patch('date', e.target.value)} /></Field>
                {meta.money && draft.type !== 'preventivo' && (
                  <Field label="Due date"><div className="inline">
                    <input className="inp mono" type="date" value={draft.dueDate || ''} onChange={(e) => patch('dueDate', e.target.value)} />
                    <div className="mini-chips">
                      <button type="button" className="mini" onClick={() => patch('dueDate', addDays(draft.date, 30))}>+30</button>
                      <button type="button" className="mini" onClick={() => patch('dueDate', addDays(draft.date, 60))}>+60</button>
                      <button type="button" className="mini" onClick={() => patch('dueDate', addDays(draft.date, 90))}>+90</button>
                    </div>
                  </div></Field>
                )}
                {draft.type === 'preventivo' && <Field label="Valid until"><input className="inp mono" type="date" value={draft.validUntil || ''} onChange={(e) => patch('validUntil', e.target.value)} /></Field>}
                {draft.type === 'nota_credito' && <Field label="Ref. document"><TextInput value={draft.refDoc} onChange={(v) => patch('refDoc', v)} mono placeholder="e.g. INV 12/2025" /></Field>}
              </div>
            </div>

            <div className="panel">
              <div className="panel-title sec">Document items</div>
              <LineItems lines={draft.lines} currency={draft.currency} products={store.products} onAdd={addLine} onAddProduct={addProduct} onUpdate={updLine} onRemove={delLine} onMove={moveLine} />
            </div>

            {meta.money && (
              <Collapsible title="Taxes & contributions" icon={Banknote}>
                <div className="subsec">
                  <div className="subsec-head"><Toggle checked={draft.cassa.enabled} onChange={(v) => patchObj('cassa', { enabled: v })} label="Pension fund" /></div>
                  {draft.cassa.enabled && <div className="form-grid">
                    <Field label="Fund rate"><NumberInput value={draft.cassa.rate} onChange={(v) => patchObj('cassa', { rate: v })} suffix="%" /></Field>
                    <Field label="VAT on fund"><Select value={String(draft.cassa.iva)} onChange={(v) => patchObj('cassa', { iva: num(v) })} options={IVA_PRESETS.map((r) => ({ value: String(r), label: r + '%' }))} /></Field>
                  </div>}
                </div>
                <div className="subsec">
                  <div className="subsec-head"><Toggle checked={draft.ritenuta.enabled} onChange={(v) => patchObj('ritenuta', { enabled: v })} label="Withholding tax" /></div>
                  {draft.ritenuta.enabled && <div className="form-grid">
                    <Field label="Withholding rate"><NumberInput value={draft.ritenuta.rate} onChange={(v) => patchObj('ritenuta', { rate: v })} suffix="%" /></Field>
                    <Field label="Calculation base"><Segmented value={draft.ritenuta.base} onChange={(v) => patchObj('ritenuta', { base: v })} options={[{ value: 'imponibile', label: 'Taxable base' }, { value: 'imponibile_cassa', label: 'Taxable + fund' }]} /></Field>
                  </div>}
                </div>
                <div className="subsec">
                  <div className="subsec-head"><Toggle checked={draft.bollo.enabled} onChange={(v) => patchObj('bollo', { enabled: v })} label="Stamp duty" /></div>
                  {draft.bollo.enabled && <div className="form-grid">
                    <Field label="Stamp duty amount"><NumberInput value={draft.bollo.amount} onChange={(v) => patchObj('bollo', { amount: v })} suffix="€" /></Field>
                  </div>}
                </div>
              </Collapsible>
            )}

            {meta.money && (
              <Collapsible title="Payment" icon={CreditCard}>
                <div className="form-grid">
                  <Field label="Method"><Select value={draft.payment.method} onChange={(v) => patchObj('payment', { method: v })} options={PAYMENT_METHODS} /></Field>
                  <Field label="IBAN"><div className="inline">
                    <TextInput value={draft.payment.iban} onChange={(v) => patchObj('payment', { iban: v })} mono placeholder="IT00 0000 0000 0000 0000 0000 000" />
                    {company && company.iban && <Btn variant="subtle" size="sm" onClick={() => patchObj('payment', { iban: company.iban })}>From company</Btn>}
                  </div></Field>
                  <Field label="Payment terms" full><TextArea value={draft.payment.terms} onChange={(v) => patchObj('payment', { terms: v })} rows={2} /></Field>
                </div>
              </Collapsible>
            )}

            {meta.goods && (
              <div className="panel">
                <div className="panel-title sec">Transport (DDT)</div>
                <div className="form-grid">
                  <Field label="Reason for transport"><Select value={draft.transport.causale} onChange={(v) => patchObj('transport', { causale: v })} options={DDT_CAUSALI} placeholder="—" /></Field>
                  <Field label="Appearance of goods"><Select value={draft.transport.aspetto} onChange={(v) => patchObj('transport', { aspetto: v })} options={DDT_ASPETTO} placeholder="—" /></Field>
                  <Field label="Number of packages"><TextInput value={draft.transport.colli} onChange={(v) => patchObj('transport', { colli: v })} mono /></Field>
                  <Field label="Weight"><TextInput value={draft.transport.peso} onChange={(v) => patchObj('transport', { peso: v })} placeholder="e.g. 0.4 kg" /></Field>
                  <Field label="Carrier"><TextInput value={draft.transport.vettore} onChange={(v) => patchObj('transport', { vettore: v })} /></Field>
                  <Field label="Carriage"><Select value={draft.transport.porto} onChange={(v) => patchObj('transport', { porto: v })} options={PORTO} placeholder="—" /></Field>
                  <Field label="Transport date"><input className="inp mono" type="date" value={draft.transport.date || ''} onChange={(e) => patchObj('transport', { date: e.target.value })} /></Field>
                  <Field label="Time"><input className="inp mono" type="time" value={draft.transport.time || ''} onChange={(e) => patchObj('transport', { time: e.target.value })} /></Field>
                  <Field label="Remarks" full><TextArea value={draft.transport.annotazioni} onChange={(v) => patchObj('transport', { annotazioni: v })} rows={2} /></Field>
                </div>
              </div>
            )}

            <div className="panel">
              <div className="panel-title sec">Notes</div>
              <div className="form-grid">
                <Field label="Notes / message to client" full><TextArea value={draft.notes} onChange={(v) => patch('notes', v)} rows={2} /></Field>
                <Field label="Reason / tax notes" full hint="e.g. non-taxable transaction, scheme, legal references"><TextArea value={draft.causaleFiscale} onChange={(v) => patch('causaleFiscale', v)} rows={2} /></Field>
              </div>
            </div>

            <Collapsible title="Document theme" icon={Palette} right={<button type="button" className="link-btn" onClick={() => patch('themeOverride', {})}>Reset to company theme</button>}>
              <p className="hint-block">Customize the design for this document only. Changes override the company theme.</p>
              <ThemeEditor value={themeVal} onChange={(next) => patch('themeOverride', next)} />
            </Collapsible>
          </div>
        )}

        {showPrev && (
          <div className="editor-preview">
            {totals && (
              <div className="totals-card">
                <div className="tc-row"><span>Taxable</span><span className="mono">{money(totals.totImponibile, draft.currency)}</span></div>
                {totals.cassaAmount > 0 && <div className="tc-row dim"><span>of which fund</span><span className="mono">{money(totals.cassaAmount, draft.currency)}</span></div>}
                {totals.totIva > 0 && <div className="tc-row"><span>VAT</span><span className="mono">{money(totals.totIva, draft.currency)}</span></div>}
                {totals.bollo > 0 && <div className="tc-row"><span>Stamp duty</span><span className="mono">{money(totals.bollo, draft.currency)}</span></div>}
                <div className="tc-row grand"><span>Document total</span><span className="mono">{money(totals.totaleDocumento, draft.currency)}</span></div>
                {totals.ritenuta > 0 && <><div className="tc-row neg"><span>Withholding</span><span className="mono">− {money(totals.ritenuta, draft.currency)}</span></div><div className="tc-row grand"><span>Net payable</span><span className="mono">{money(totals.nettoAPagare, draft.currency)}</span></div></>}
              </div>
            )}
            <div className="preview-actions">
              <Btn variant="subtle" size="sm" icon={Printer} onClick={() => printHTML(html)}>Print / PDF</Btn>
              <Btn variant="subtle" size="sm" icon={FileDown} onClick={() => downloadBlob(`${docNumberLabel(draft).replace(/[^\w\-]+/g, '_')}.html`, html)}>HTML</Btn>
            </div>
            <DocPreview html={previewHtml} stampTheme={themeVal} interactiveStamp onStampMove={patchTheme} />
          </div>
        )}
      </div>

      <QuickClientModal open={quickClient} onClose={() => setQuickClient(false)} onCreate={(cl) => { onUpsertClient(cl); patch('clientId', cl.id); }} />
    </div>
  );
}

// ============================================================================
//  COMPANIES
// ============================================================================
function blankCompany() { return { id: uid(), name: '', forma: '', regime: 'Standard', piva: '', cf: '', address: '', cap: '', city: '', prov: '', country: '', email: '', phone: '', pec: '', sdi: '', rea: '', capitale: '', bank: '', iban: '', swift: '', bankInfo: '', currency: 'EUR', causaleFiscale: '', acqSellerDecl: '', acqBuyerNote: '', acqVatNote: '', footerText: '', logo: '', theme: { ...DEFAULT_THEME } }; }
function CompaniesView({ store, onNew, onEdit, onDelete, onSetDefault, onNotify }) {
  const [delFor, setDelFor] = useState(null);
  const docCount = delFor ? companyDocCount(store, delFor.id) : 0;
  return (
    <div className="view">
      <ViewHead title="Companies" sub={`${store.companies.length} issuing companies`} actions={<Btn icon={Plus} onClick={onNew}>New company</Btn>} />
      {store.companies.length === 0 ? (
        <EmptyState icon={Building2} title="No companies" sub="Add your first issuing company." action={<Btn icon={Plus} onClick={onNew}>New company</Btn>} />
      ) : (
        <div className="card-grid">
          {store.companies.map((co) => {
            const isDef = (store.settings || {}).defaultCompanyId === co.id;
            const t = co.theme || DEFAULT_THEME;
            return (
              <div className="ent-card" key={co.id}>
                <div className="ent-top">
                  <div className="ent-logo" style={{ borderColor: t.accent }}>{co.logo && safeImageSrc(co.logo) ? <img src={safeImageSrc(co.logo)} alt="" /> : <Building2 size={20} style={{ color: t.accent }} />}</div>
                  <div className="ent-main">
                    <div className="ent-name">{co.name}{co.forma && <span className="ent-forma">{co.forma}</span>}</div>
                    <div className="ent-sub">{[co.city, co.regime].filter(Boolean).join(' · ')}</div>
                  </div>
                  {isDef && <span className="pill">Default</span>}
                </div>
                <div className="ent-rows">
                  <div><span className="k">VAT No.</span><span className="mono">{co.piva || '—'}</span></div>
                  <div><span className="k">SDI</span><span className="mono">{co.sdi || '—'}</span></div>
                  <div><span className="k">Theme</span><span><span className="theme-dot" style={{ background: t.accent }} />{TEMPLATES[t.template] ? TEMPLATES[t.template].label : t.template}</span></div>
                </div>
                <div className="ent-actions">
                  <Btn variant="ghost" size="sm" icon={Pencil} onClick={() => onEdit(co)}>Edit</Btn>
                  {!isDef && <Btn variant="subtle" size="sm" icon={Check} onClick={() => onSetDefault(co.id)}>Set default</Btn>}
                  <IconBtn icon={Trash2} danger title="Delete" onClick={() => setDelFor(co)} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Modal open={!!delFor} onClose={() => setDelFor(null)} title="Delete company"
        footer={<><Btn variant="ghost" onClick={() => setDelFor(null)}>Cancel</Btn><Btn variant="danger" icon={Trash2} disabled={docCount > 0} onClick={() => { if (docCount > 0) { if (onNotify) onNotify(`Cannot delete: ${docCount} document(s) still reference this company.`, 'error'); return; } onDelete(delFor); setDelFor(null); }}>Delete</Btn></>}>
        {delFor && (docCount > 0
          ? <p><strong>{delFor.name}</strong> cannot be deleted because {docCount} document(s) still reference it. Reassign or delete those documents first.</p>
          : <p>Delete <strong>{delFor.name}</strong>? This cannot be undone.</p>)}
      </Modal>
    </div>
  );
}

function CompanyEditor({ store, editingId, onSave, onCancel }) {
  const existing = editingId ? (store.companies || []).find((c) => c.id === editingId) : null;
  const [co, setCo] = useState(() => (existing ? JSON.parse(JSON.stringify(existing)) : blankCompany()));
  const [tab, setTab] = useState('form');
  const isMobile = useMedia(980);
  const set = (k, v) => setCo((o) => ({ ...o, [k]: v }));
  const onLogo = async (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const err = validateUploadFile(f, { mimes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'] });
    if (err) return;
    try { const url = await fileToScaledDataURL(f, 440); set('logo', safeImageSrc(url) || url); } catch (err) { /* noop */ }
    e.target.value = '';
  };
  const previewDoc = useMemo(() => sampleDocForCompany(co), [co]);
  const html = useMemo(() => buildDocumentHTML(previewDoc, co, SAMPLE_CLIENT, store.settings), [previewDoc, co, store.settings]);
  const save = () => { if (!co.name.trim()) return; onSave(co); };
  const showForm = !isMobile || tab === 'form';
  const showPrev = !isMobile || tab === 'preview';

  return (
    <div className="editor">
      <div className="editor-bar">
        <button className="iconbtn" onClick={onCancel} title="Cancel" aria-label="Cancel"><ArrowLeft size={18} /></button>
        <div className="eb-title">{existing ? `Edit company · ${existing.name}` : 'New company'}</div>
        <div className="eb-actions"><Btn variant="ghost" onClick={onCancel}>Cancel</Btn><Btn icon={Save} onClick={save} disabled={!co.name.trim()}>Save</Btn></div>
      </div>
      {isMobile && <div className="editor-tabs"><Segmented value={tab} onChange={setTab} options={[{ value: 'form', label: 'Details' }, { value: 'preview', label: 'Preview' }]} /></div>}
      <div className="editor-cols">
        {showForm && (
          <div className="editor-form">
            <div className="panel">
              <div className="panel-title sec">Logo</div>
              <div className="logo-row">
                <div className="logo-box">{co.logo ? <img src={co.logo} alt="logo" /> : <ImageIcon size={28} />}</div>
                <div className="logo-actions">
                  <label className="btn btn-subtle btn-sm filebtn"><Upload size={14} /><span>Upload logo</span><input type="file" accept="image/*" onChange={onLogo} hidden /></label>
                  {co.logo && <Btn variant="ghost" size="sm" icon={Trash2} onClick={() => set('logo', '')}>Remove</Btn>}
                  <div className="hint">PNG/JPG, resized automatically.</div>
                </div>
              </div>
            </div>
            <div className="panel">
              <div className="panel-title sec">Company & tax details</div>
              <div className="form-grid">
                <Field label="Legal name" full><TextInput value={co.name} onChange={(v) => set('name', v)} placeholder="e.g. Orologeria Lombarda" /></Field>
                <Field label="Legal form"><Select value={co.forma} onChange={(v) => set('forma', v)} options={FORME_GIURIDICHE} /></Field>
                <Field label="Tax scheme"><Select value={co.regime} onChange={(v) => set('regime', v)} options={REGIMI} /></Field>
                <Field label="VAT No."><TextInput value={co.piva} onChange={(v) => set('piva', v)} mono /></Field>
                <Field label="Tax code"><TextInput value={co.cf} onChange={(v) => set('cf', v)} mono /></Field>
                <Field label="Address" full><TextInput value={co.address} onChange={(v) => set('address', v)} /></Field>
                <Field label="Postal code"><TextInput value={co.cap} onChange={(v) => set('cap', v)} mono /></Field>
                <Field label="City"><TextInput value={co.city} onChange={(v) => set('city', v)} /></Field>
                <Field label="State/Prov."><TextInput value={co.prov} onChange={(v) => set('prov', v)} /></Field>
                <Field label="Country"><TextInput value={co.country} onChange={(v) => set('country', v)} /></Field>
                <Field label="Email"><TextInput value={co.email} onChange={(v) => set('email', v)} type="email" /></Field>
                <Field label="Phone"><TextInput value={co.phone} onChange={(v) => set('phone', v)} /></Field>
                <Field label="PEC"><TextInput value={co.pec} onChange={(v) => set('pec', v)} /></Field>
                <Field label="SDI code"><TextInput value={co.sdi} onChange={(v) => set('sdi', v)} mono /></Field>
                <Field label="REA"><TextInput value={co.rea} onChange={(v) => set('rea', v)} mono /></Field>
                <Field label="Share capital"><TextInput value={co.capitale} onChange={(v) => set('capitale', v)} /></Field>
                <Field label="Bank"><TextInput value={co.bank} onChange={(v) => set('bank', v)} /></Field>
                <Field label="SWIFT / BIC"><TextInput value={co.swift || ''} onChange={(v) => set('swift', v)} mono /></Field>
                <Field label="IBAN" full><TextInput value={co.iban} onChange={(v) => set('iban', v)} mono /></Field>
                <Field label="Default currency"><Select value={co.currency || 'EUR'} onChange={(v) => set('currency', v)} options={CURRENCIES} /></Field>
                <Field label="Bank details block" full hint="Multi-line; shown on the document via {{{company.bank_info}}}"><TextArea value={co.bankInfo || ''} onChange={(v) => set('bankInfo', v)} rows={3} /></Field>
                <Field label="Default tax / legal note" full hint="Auto-fills new documents (e.g. margin scheme statement)"><TextArea value={co.causaleFiscale || ''} onChange={(v) => set('causaleFiscale', v)} rows={2} /></Field>
                <Field label="Purchase note — Seller declaration" full hint="Acquisition note (purchase invoice): shown above the seller signature"><TextArea value={co.acqSellerDecl || ''} onChange={(v) => set('acqSellerDecl', v)} rows={2} /></Field>
                <Field label="Purchase note — Buyer note" full hint="Acquisition note: buyer / compliance note"><TextArea value={co.acqBuyerNote || ''} onChange={(v) => set('acqBuyerNote', v)} rows={2} /></Field>
                <Field label="Purchase note — VAT margin note" full hint="Acquisition note: VAT margin-scheme statement"><TextArea value={co.acqVatNote || ''} onChange={(v) => set('acqVatNote', v)} rows={2} /></Field>
                <Field label="Footer text" full hint="Shown at the bottom of documents"><TextArea value={co.footerText} onChange={(v) => set('footerText', v)} rows={2} /></Field>
              </div>
            </div>
            <div className="panel">
              <div className="panel-title sec">Default theme</div>
              <p className="hint-block">This theme applies to all of the company's documents. You can still customize each individual document.</p>
              <ThemeEditor value={{ ...DEFAULT_THEME, ...(co.theme || {}) }} onChange={(next) => set('theme', next)} />
            </div>
          </div>
        )}
        {showPrev && (
          <div className="editor-preview">
            <div className="preview-label">Preview — sample invoice</div>
            <DocPreview html={html} />
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
//  CLIENTS
// ============================================================================
function newClient() { return { id: uid(), type: 'azienda', name: '', forma: '', piva: '', cf: '', address: '', cap: '', city: '', prov: '', country: 'Italy', email: '', phone: '', sdi: '', attachments: [] }; }
function ClientFormModal({ open, client, onClose, onSave }) {
  const [c, setC] = useState(() => (client ? { ...client } : newClient()));
  useEffect(() => { if (open) setC(client ? { ...client } : newClient()); }, [open, client]);
  const set = (k, v) => setC((o) => ({ ...o, [k]: v }));
  const save = () => { if (!c.name.trim()) return; onSave(c); };
  return (
    <Modal open={open} onClose={onClose} title={client ? 'Edit client' : 'New client'}
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn icon={Save} onClick={save} disabled={!c.name.trim()}>Save</Btn></>}>
      <ClientFields c={c} set={set} />
    </Modal>
  );
}
function ClientsView({ store, onSave, onDelete, onAddFile, onDeleteFile, onNotify }) {
  const [editing, setEditing] = useState(null); // client object or 'new'
  const [delFor, setDelFor] = useState(null);
  const [docsFor, setDocsFor] = useState(null);
  const open = editing !== null;
  const linkedDocs = delFor ? clientDocCount(store, delFor.id) : 0;
  return (
    <div className="view">
      <ViewHead title="Clients" sub={`${store.clients.length} records`} actions={<Btn icon={Plus} onClick={() => setEditing('new')}>New client</Btn>} />
      {store.clients.length === 0 ? (
        <EmptyState icon={Users} title="No clients" sub="Add your first client record." action={<Btn icon={Plus} onClick={() => setEditing('new')}>New client</Btn>} />
      ) : (
        <div className="tbl-wrap">
          <table className="dtable">
            <thead><tr><th>Client</th><th>Type</th><th>VAT / Tax code</th><th>City</th><th>Country</th><th className="r">Actions</th></tr></thead>
            <tbody>
              {store.clients.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}{c.forma && <span className="dim"> {c.forma}</span>}{(c.attachments && c.attachments.length) ? <span className="dim" style={{ marginLeft: 6, fontSize: 11 }}>&middot; {c.attachments.length} doc</span> : null}</td>
                  <td className="dim">{c.type === 'privato' ? 'Individual' : 'Company'}</td>
                  <td className="mono dim">{c.piva || c.cf || '—'}</td>
                  <td>{c.city || <span className="dim">—</span>}</td>
                  <td className="dim">{c.country || '—'}</td>
                  <td><div className="row-actions"><IconBtn icon={Paperclip} title="Documents" onClick={() => setDocsFor(c.id)} /><IconBtn icon={Pencil} title="Edit" onClick={() => setEditing(c)} /><IconBtn icon={Trash2} danger title="Delete" onClick={() => setDelFor(c)} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ClientFormModal open={open} client={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSave={(c) => { onSave(c); setEditing(null); }} />
      <ClientDocsModal open={!!docsFor} client={docsFor ? store.clients.find((x) => x.id === docsFor) : null} onClose={() => setDocsFor(null)} onAdd={onAddFile} onDelete={onDeleteFile} />
      <Modal open={!!delFor} onClose={() => setDelFor(null)} title="Delete client"
        footer={<><Btn variant="ghost" onClick={() => setDelFor(null)}>Cancel</Btn><Btn variant="danger" icon={Trash2} disabled={linkedDocs > 0} onClick={() => { if (linkedDocs > 0) { if (onNotify) onNotify(`Cannot delete: ${linkedDocs} document(s) reference this client.`, 'error'); return; } onDelete(delFor); setDelFor(null); }}>Delete</Btn></>}>
        {delFor && (linkedDocs > 0
          ? <p><strong>{delFor.name}</strong> cannot be deleted because {linkedDocs} document(s) reference them.</p>
          : <p>Delete <strong>{delFor.name}</strong> and any stored attachment files?</p>)}
      </Modal>
    </div>
  );
}

// ============================================================================
//  CATALOG (PRODUCTS)
// ============================================================================
function newProduct() { return { id: uid(), desc: '', um: 'pcs', price: 0, iva: 22 }; }
function ProductFormModal({ open, product, onClose, onSave }) {
  const [p, setP] = useState(() => (product ? { ...product } : newProduct()));
  useEffect(() => { if (open) setP(product ? { ...product } : newProduct()); }, [open, product]);
  const set = (k, v) => setP((o) => ({ ...o, [k]: v }));
  const save = () => { if (!p.desc.trim()) return; onSave(p); };
  return (
    <Modal open={open} onClose={onClose} title={product ? 'Edit item' : 'New item'}
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn icon={Save} onClick={save} disabled={!p.desc.trim()}>Save</Btn></>}>
      <div className="form-grid">
        <Field label="Description" full><TextInput value={p.desc} onChange={(v) => set('desc', v)} placeholder="e.g. Rolex Submariner 126610LN" /></Field>
        <Field label="Unit of measure"><Select value={p.um} onChange={(v) => set('um', v)} options={UM_PRESETS} /></Field>
        <Field label="Price"><NumberInput value={p.price} onChange={(v) => set('price', num(v))} suffix="€" /></Field>
        <Field label="VAT"><Select value={String(p.iva)} onChange={(v) => set('iva', num(v))} options={IVA_PRESETS.map((r) => ({ value: String(r), label: r + '%' }))} /></Field>
      </div>
    </Modal>
  );
}
function ProductsView({ store, onSave, onDelete }) {
  const [editing, setEditing] = useState(null);
  const [delFor, setDelFor] = useState(null);
  const open = editing !== null;
  return (
    <div className="view">
      <ViewHead title="Catalog" sub={`${store.products.length} items`} actions={<Btn icon={Plus} onClick={() => setEditing('new')}>New item</Btn>} />
      {store.products.length === 0 ? (
        <EmptyState icon={Package} title="Empty catalog" sub="Add recurring items or services to insert them quickly into documents." action={<Btn icon={Plus} onClick={() => setEditing('new')}>New item</Btn>} />
      ) : (
        <div className="tbl-wrap">
          <table className="dtable">
            <thead><tr><th>Description</th><th>Unit</th><th className="r">Price</th><th className="c">VAT</th><th className="r">Actions</th></tr></thead>
            <tbody>
              {store.products.map((p) => (
                <tr key={p.id}>
                  <td>{p.desc}</td>
                  <td className="dim">{p.um}</td>
                  <td className="r mono">{money(p.price)}</td>
                  <td className="c mono">{p.iva}%</td>
                  <td><div className="row-actions"><IconBtn icon={Pencil} title="Edit" onClick={() => setEditing(p)} /><IconBtn icon={Trash2} danger title="Delete" onClick={() => setDelFor(p)} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ProductFormModal open={open} product={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSave={(p) => { onSave(p); setEditing(null); }} />
      <Modal open={!!delFor} onClose={() => setDelFor(null)} title="Delete item"
        footer={<><Btn variant="ghost" onClick={() => setDelFor(null)}>Cancel</Btn><Btn variant="danger" icon={Trash2} onClick={() => { onDelete(delFor); setDelFor(null); }}>Delete</Btn></>}>
        {delFor && <p>Delete <strong>{delFor.desc}</strong> from the catalog?</p>}
      </Modal>
    </div>
  );
}

// ============================================================================
//  SETTINGS
// ============================================================================
function SettingsView({ store, onUpdateSettings, onExport, onImport, onReset, onNotify }) {
  const s = store.settings || {};
  const [resetOpen, setResetOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fileRef = useRef(null);
  const onFile = (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        onImport(data);
      } catch (err) {
        if (onNotify) onNotify('Invalid file: unable to read the backup.', 'error');
      }
    };
    r.readAsText(f); e.target.value = '';
  };
  const doExport = async () => {
    setExporting(true);
    try { await onExport(); } catch (e) { if (onNotify) onNotify('Export failed.', 'error'); }
    setExporting(false);
  };
  return (
    <div className="view">
      <ViewHead title="Settings" sub="Preferences and data management" />
      <div className="panel">
        <div className="panel-title sec">Default preferences</div>
        <div className="form-grid">
          <Field label="Default company"><Select value={s.defaultCompanyId || ''} onChange={(v) => onUpdateSettings({ defaultCompanyId: v })} options={store.companies.map((c) => ({ value: c.id, label: c.name }))} placeholder="—" /></Field>
          <Field label="Default currency"><Select value={s.currency || 'EUR'} onChange={(v) => onUpdateSettings({ currency: v })} options={CURRENCIES} /></Field>
        </div>
      </div>
      <div className="panel">
        <div className="panel-title sec">Default template</div>
        <p className="hint-block">Style applied to new companies and documents as a starting point.</p>
        <div className="tpl-gallery">
          {TEMPLATE_ORDER.map((t) => (
            <button key={t} className={cx('tpl-mini', `tpl-${t}`, s.defaultTemplate === t && 'on')} onClick={() => onUpdateSettings({ defaultTemplate: t })}>
              <span className="tm-bar" /><span className="tm-line a" /><span className="tm-line" /><span className="tm-line short" />
              <span className="tm-name">{TEMPLATES[t].label}{s.defaultTemplate === t && <Check size={13} />}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="panel">
        <div className="panel-title sec">Data management</div>
        <p className="hint-block">Data is saved locally on your device. Export includes inbox files and client attachments.</p>
        <div className="data-actions">
          <Btn variant="subtle" icon={Download} onClick={doExport} disabled={exporting}>{exporting ? 'Exporting…' : 'Export backup (JSON)'}</Btn>
          <Btn variant="subtle" icon={Upload} onClick={() => fileRef.current && fileRef.current.click()}>Import backup</Btn>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFile} hidden />
          <Btn variant="danger" icon={AlertTriangle} onClick={() => setResetOpen(true)}>Restore sample data</Btn>
        </div>
      </div>
      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Restore sample data"
        footer={<><Btn variant="ghost" onClick={() => setResetOpen(false)}>Cancel</Btn><Btn variant="danger" icon={RefreshCw} onClick={() => { onReset(); setResetOpen(false); }}>Restore</Btn></>}>
        <p>All current data (companies, clients, documents, catalog) will be replaced with the sample data. This action cannot be undone.</p>
      </Modal>
    </div>
  );
}

// ============================================================================
//  APP STYLES (dark chrome, gold accent) — injected at runtime
// ============================================================================
const APP_CSS = `
@import url('${GOOGLE_FONTS}');

.fg{
  --bg:#0d0e11; --bg-1:#101216; --bg-2:#15171d; --bg-3:#1b1e26; --bg-4:#22262f;
  --line:#262a33; --line-2:#333845; --line-3:#3f4655;
  --ink:#ece9e1; --ink-2:#b8bcc6; --ink-3:#8b909c; --ink-4:#646a77;
  --gold:#c9a44c; --gold-2:#dcbd6e; --gold-3:#8c722f;
  --gold-soft:rgba(201,164,76,.14); --gold-line:rgba(201,164,76,.38);
  --danger:#e0556b; --danger-soft:rgba(224,85,107,.14);
  --ok:#4bb480;
  --radius:14px; --radius-sm:10px; --radius-lg:20px;
  --ui:'Hanken Grotesk', system-ui, -apple-system, sans-serif;
  --display:'Fraunces', Georgia, serif;
  --mono:'IBM Plex Mono', ui-monospace, monospace;
  --shadow:0 18px 50px -22px rgba(0,0,0,.7);
  color-scheme:dark;
  font-family:var(--ui);
  color:var(--ink);
  background:var(--bg);
  min-height:100vh;
  -webkit-font-smoothing:antialiased;
  letter-spacing:.005em;
}
.fg *{box-sizing:border-box;}
.fg ::-webkit-scrollbar{width:11px;height:11px;}
.fg ::-webkit-scrollbar-thumb{background:var(--line-2);border-radius:8px;border:3px solid transparent;background-clip:content-box;}
.fg ::-webkit-scrollbar-thumb:hover{background:var(--line-3);background-clip:content-box;}
.fg ::selection{background:var(--gold-soft);}
.fg button{font-family:inherit;cursor:pointer;color:inherit;}
.fg input,.fg textarea,.fg select{font-family:inherit;}
.fg h1,.fg h2,.fg h3,.fg h4{margin:0;font-weight:600;}
.fg p{margin:0;}
.fg img{display:block;max-width:100%;}

/* ---------- boot ---------- */
.fg.boot{display:grid;place-items:center;}
.boot-card{display:flex;flex-direction:column;align-items:center;gap:16px;color:var(--ink-3);font-size:14px;}
.boot-card .brand-mark{width:52px;height:52px;border-radius:16px;}

.app-notice{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;margin:0 0 12px;border-radius:10px;border:1px solid var(--line-2);background:var(--bg-2);font-size:13px;color:var(--ink-2);}
.app-notice.err{border-color:rgba(224,85,107,.45);background:rgba(224,85,107,.12);color:#f0a8b4;}
.app-notice.warn{border-color:rgba(216,162,74,.45);background:rgba(216,162,74,.12);color:#e8c98a;}
.app-notice-x{background:none;border:none;color:inherit;opacity:.7;padding:4px;cursor:pointer;display:grid;place-items:center;}

/* ---------- layout ---------- */
.fg.app{display:flex;align-items:stretch;}
.sidebar{
  width:256px;flex:0 0 256px;min-height:100vh;position:sticky;top:0;align-self:flex-start;
  background:linear-gradient(180deg,var(--bg-1),var(--bg));
  border-right:1px solid var(--line);
  display:flex;flex-direction:column;gap:8px;padding:22px 16px 18px;
}
.main{flex:1 1 auto;min-width:0;min-height:100vh;}
.main-inner{max-width:1200px;margin:0 auto;padding:34px 40px 80px;}

.brand{display:flex;align-items:center;gap:12px;padding:4px 8px 12px;}
.brand-mark{
  width:38px;height:38px;border-radius:11px;display:grid;place-items:center;color:#1a1408;flex:0 0 auto;
  background:linear-gradient(150deg,var(--gold-2),var(--gold) 55%,var(--gold-3));
  box-shadow:0 6px 18px -8px rgba(201,164,76,.6),inset 0 1px 0 rgba(255,255,255,.4);
}
.brand-tt{display:flex;flex-direction:column;line-height:1.05;}
.brand-name{font-family:var(--display);font-size:21px;font-weight:600;letter-spacing:.01em;}
.brand-sub{font-size:10.5px;text-transform:uppercase;letter-spacing:.22em;color:var(--ink-4);margin-top:3px;}

.company-switch{
  display:flex;align-items:center;gap:11px;width:100%;text-align:left;
  background:var(--bg-2);border:1px solid var(--line);border-radius:var(--radius-sm);
  padding:10px 11px;margin-bottom:6px;transition:border-color .15s,background .15s;
}
.company-switch:hover{border-color:var(--line-3);background:var(--bg-3);}
.cs-logo{width:32px;height:32px;border-radius:8px;flex:0 0 auto;display:grid;place-items:center;background:var(--bg-4);border:1.5px solid var(--gold-line);color:var(--gold-2);overflow:hidden;}
.cs-logo img{width:100%;height:100%;object-fit:contain;background:#fff;}
.cs-text{display:flex;flex-direction:column;min-width:0;flex:1;}
.cs-label{font-size:9.5px;text-transform:uppercase;letter-spacing:.16em;color:var(--ink-4);}
.cs-name{font-size:13.5px;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;}
.cs-caret{color:var(--ink-4);flex:0 0 auto;}

.nav{display:flex;flex-direction:column;gap:2px;margin-top:4px;}
.nav-i{
  display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;border:1px solid transparent;
  background:transparent;color:var(--ink-3);font-size:14px;font-weight:500;transition:all .14s;text-align:left;
}
.nav-i svg{flex:0 0 auto;color:var(--ink-4);transition:color .14s;}
.nav-i:hover{background:var(--bg-2);color:var(--ink);}
.nav-i:hover svg{color:var(--ink-2);}
.nav-i.on{background:var(--gold-soft);color:var(--gold-2);border-color:var(--gold-line);}
.nav-i.on svg{color:var(--gold);}
.side-foot{margin-top:auto;padding:14px 10px 2px;border-top:1px solid var(--line);color:var(--ink-4);font-size:11.5px;font-family:var(--mono);}

/* ---------- mobile chrome ---------- */
.topbar{display:none;}
.hamburger{display:none;}
.drawer-overlay{display:none;}
.drawer{display:none;}

@media(max-width:900px){
  .fg.app{flex-direction:column;}
  .sidebar{display:none;}
  .main{min-height:0;}
  .main-inner{padding:18px 16px 96px;}
  .topbar{
    display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:30;
    padding:11px 14px;background:rgba(13,14,17,.86);backdrop-filter:blur(12px);
    border-bottom:1px solid var(--line);
  }
  .tb-title{flex:1;font-family:var(--display);font-size:18px;font-weight:600;}
  .tb-brand{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;color:#1a1408;background:linear-gradient(150deg,var(--gold-2),var(--gold) 55%,var(--gold-3));}
  .hamburger{display:flex;flex-direction:column;justify-content:center;gap:4px;width:38px;height:38px;border-radius:10px;border:1px solid var(--line);background:var(--bg-2);padding:0 9px;}
  .hamburger span{display:block;height:2px;border-radius:2px;background:var(--ink-2);}
  .hamburger span:nth-child(2){width:70%;}
  .drawer-overlay{display:block;position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(2px);z-index:60;animation:fgFade .18s ease;}
  .drawer{
    display:flex;flex-direction:column;gap:8px;position:fixed;top:0;left:0;bottom:0;width:280px;max-width:84vw;z-index:61;
    background:linear-gradient(180deg,var(--bg-1),var(--bg));border-right:1px solid var(--line);
    padding:18px 16px;box-shadow:var(--shadow);animation:fgSlide .22s cubic-bezier(.2,.7,.3,1);
  }
  .drawer-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-bottom:8px;}
}
@keyframes fgFade{from{opacity:0;}to{opacity:1;}}
@keyframes fgSlide{from{transform:translateX(-18px);opacity:.4;}to{transform:translateX(0);opacity:1;}}
@keyframes fgPop{from{transform:translateY(8px) scale(.985);opacity:0;}to{transform:translateY(0) scale(1);opacity:1;}}

/* ---------- view head ---------- */
.view{animation:fgPop .22s ease;}
.view-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:24px;flex-wrap:wrap;}
.vh-title{font-family:var(--display);font-size:30px;font-weight:600;letter-spacing:.01em;line-height:1;}
.vh-sub{margin-top:7px;color:var(--ink-3);font-size:13.5px;}
.vh-actions{display:flex;gap:9px;flex-wrap:wrap;}

/* ---------- stat cards ---------- */
.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:22px;}
.stat{background:linear-gradient(165deg,var(--bg-2),var(--bg-1));border:1px solid var(--line);border-radius:var(--radius);padding:17px 18px;position:relative;overflow:hidden;}
.stat::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--line-2);}
.stat.ok::before{background:var(--ok);}
.stat.alert::before{background:var(--danger);}
.stat-k{font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:var(--ink-4);}
.stat-v{font-size:22px;font-weight:600;margin-top:9px;font-variant-numeric:tabular-nums;line-height:1.15;word-break:break-word;}
.stat.ok .stat-v{color:var(--ok);}
.stat.alert .stat-v{color:var(--danger);}
.stat-sub{font-size:11.5px;color:var(--ink-4);margin-top:5px;}

/* ---------- chips ---------- */
.chips{display:flex;flex-wrap:wrap;gap:9px;margin-bottom:22px;}
.chip{display:inline-flex;align-items:center;gap:9px;background:var(--bg-2);border:1px solid var(--line);border-radius:999px;padding:6px 7px 6px 12px;transition:border-color .14s,background .14s;}
.chip:hover{border-color:var(--line-3);background:var(--bg-3);}
.chip-n{min-width:22px;height:22px;padding:0 6px;border-radius:999px;display:grid;place-items:center;background:var(--gold-soft);color:var(--gold-2);font-size:12px;font-weight:600;font-family:var(--mono);}

/* ---------- panel ---------- */
.panel{background:var(--bg-1);border:1px solid var(--line);border-radius:var(--radius);padding:20px;margin-bottom:16px;}
.panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;}
.panel-title{font-family:var(--display);font-size:18px;font-weight:600;}
.panel-title.sec{font-family:var(--ui);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.15em;color:var(--ink-3);margin-bottom:15px;display:block;}

/* ---------- tables ---------- */
.tbl-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:var(--radius);background:var(--bg-1);}
.dtable{width:100%;border-collapse:collapse;font-size:13.5px;min-width:560px;}
.dtable thead th{text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.12em;color:var(--ink-4);font-weight:600;padding:13px 16px;border-bottom:1px solid var(--line);white-space:nowrap;background:var(--bg-2);}
.dtable tbody td{padding:13px 16px;border-bottom:1px solid var(--line);vertical-align:middle;}
.dtable tbody tr:last-child td{border-bottom:none;}
.dtable tbody tr:hover td{background:var(--bg-2);}
.dtable .r{text-align:right;}
.dtable .c{text-align:center;}
.dtable .k{color:var(--ink-4);}
.clickrow{cursor:pointer;}
.clickcell{cursor:pointer;color:var(--gold-2);font-weight:500;}
.clickcell:hover{text-decoration:underline;text-underline-offset:2px;}
.mono{font-family:var(--mono);font-variant-numeric:tabular-nums;}
.dim{color:var(--ink-4);}
.acc{color:var(--gold);}

/* ---------- filter bar ---------- */
.filterbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:20px;}
.searchwrap{position:relative;flex:1;min-width:220px;display:flex;align-items:center;}
.searchic{position:absolute;left:13px;color:var(--ink-4);pointer-events:none;}
.searchwrap .inp{padding-left:38px;width:100%;}

/* ---------- badges ---------- */
.badge{display:inline-flex;align-items:center;font-size:11.5px;font-weight:600;padding:3px 10px;border-radius:999px;border:1px solid transparent;white-space:nowrap;}
.badge-btn{background:none;border:none;padding:0;}

/* ---------- row actions ---------- */
.row-actions{display:flex;gap:4px;justify-content:flex-end;}

/* ---------- buttons ---------- */
.btn{
  display:inline-flex;align-items:center;justify-content:center;gap:8px;
  border:1px solid transparent;border-radius:10px;padding:10px 15px;font-size:13.5px;font-weight:600;
  transition:all .14s;white-space:nowrap;line-height:1;
}
.btn:disabled{opacity:.45;cursor:not-allowed;}
.btn svg{flex:0 0 auto;}
.btn-primary{background:linear-gradient(155deg,var(--gold-2),var(--gold) 60%,var(--gold-3));color:#1a1408;box-shadow:0 8px 20px -10px rgba(201,164,76,.65),inset 0 1px 0 rgba(255,255,255,.35);}
.btn-primary:hover:not(:disabled){filter:brightness(1.06);}
.btn-primary:active:not(:disabled){transform:translateY(1px);}
.btn-ghost{background:transparent;border-color:var(--line-2);color:var(--ink-2);}
.btn-ghost:hover:not(:disabled){border-color:var(--line-3);color:var(--ink);background:var(--bg-2);}
.btn-subtle{background:var(--bg-3);border-color:var(--line);color:var(--ink-2);}
.btn-subtle:hover:not(:disabled){background:var(--bg-4);color:var(--ink);}
.btn-danger{background:var(--danger-soft);border-color:rgba(224,85,107,.4);color:var(--danger);}
.btn-danger:hover:not(:disabled){background:rgba(224,85,107,.22);}
.btn-sm{padding:7px 11px;font-size:12.5px;border-radius:8px;}
.filebtn{cursor:pointer;}

.iconbtn{display:inline-grid;place-items:center;width:34px;height:34px;border-radius:9px;border:1px solid var(--line);background:var(--bg-2);color:var(--ink-3);transition:all .14s;}
.iconbtn:hover{border-color:var(--line-3);color:var(--ink);background:var(--bg-3);}
.iconbtn.active{border-color:var(--gold-line);color:var(--gold-2);background:var(--gold-soft);}
.iconbtn.danger:hover{border-color:rgba(224,85,107,.45);color:var(--danger);background:var(--danger-soft);}
.link-btn{background:none;border:none;color:var(--gold-2);font-size:12.5px;font-weight:600;padding:0;text-decoration:underline;text-underline-offset:2px;}
.link-btn:hover{color:var(--gold);}

/* ---------- toggle ---------- */
.toggle{display:inline-flex;align-items:center;gap:9px;background:none;border:none;padding:0;font-size:13px;color:var(--ink-2);}
.toggle .knob{position:relative;width:38px;height:22px;border-radius:999px;background:var(--bg-4);border:1px solid var(--line-2);transition:all .16s;flex:0 0 auto;}
.toggle .knob::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:var(--ink-3);transition:all .16s;}
.toggle.on .knob{background:var(--gold-soft);border-color:var(--gold-line);}
.toggle.on .knob::after{transform:translateX(16px);background:var(--gold);}
.tlbl{user-select:none;}

/* ---------- segmented ---------- */
.seg{display:inline-flex;background:var(--bg-3);border:1px solid var(--line);border-radius:10px;padding:3px;gap:3px;flex-wrap:wrap;}
.seg-i{border:none;background:transparent;color:var(--ink-3);padding:7px 13px;border-radius:7px;font-size:12.5px;font-weight:600;transition:all .14s;}
.seg-i:hover{color:var(--ink);}
.seg-i.on{background:var(--gold-soft);color:var(--gold-2);box-shadow:inset 0 0 0 1px var(--gold-line);}

/* ---------- color field ---------- */
.colorfield{display:flex;flex-direction:column;gap:11px;}
.swatches{display:flex;flex-wrap:wrap;gap:8px;}
.sw{width:28px;height:28px;border-radius:8px;border:2px solid var(--line-2);padding:0;transition:transform .12s,border-color .12s;}
.sw:hover{transform:scale(1.08);}
.sw.on{border-color:var(--ink);box-shadow:0 0 0 2px var(--bg-1),0 0 0 4px var(--gold-line);}
.customcolor{display:inline-flex;align-items:center;gap:9px;background:var(--bg-2);border:1px solid var(--line);border-radius:9px;padding:5px 11px 5px 5px;width:fit-content;}
.customcolor input[type=color],.inkfield input[type=color]{width:30px;height:30px;border:none;background:none;border-radius:7px;padding:0;cursor:pointer;}
.customcolor input[type=color]::-webkit-color-swatch-wrapper{padding:0;}
.customcolor input[type=color]::-webkit-color-swatch{border:1px solid var(--line-2);border-radius:7px;}
.inkfield input[type=color]::-webkit-color-swatch-wrapper{padding:0;}
.inkfield input[type=color]::-webkit-color-swatch{border:1px solid var(--line-2);border-radius:7px;}
.customcolor .mono,.inkfield .mono{font-size:12px;color:var(--ink-3);text-transform:uppercase;}
.inkfield{display:inline-flex;align-items:center;gap:9px;background:var(--bg-2);border:1px solid var(--line);border-radius:9px;padding:5px 11px 5px 5px;width:fit-content;}

/* ---------- inputs / fields ---------- */
.fld{display:flex;flex-direction:column;gap:6px;}
.fld-lab{font-size:11.5px;font-weight:600;color:var(--ink-3);letter-spacing:.02em;}
.fld-hint{font-size:11px;color:var(--ink-4);}
.inp{
  width:100%;background:var(--bg-2);border:1px solid var(--line-2);border-radius:9px;
  padding:9px 12px;font-size:13.5px;color:var(--ink);transition:border-color .14s,box-shadow .14s,background .14s;
}
.inp::placeholder{color:var(--ink-4);}
.inp:focus{outline:none;border-color:var(--gold-line);box-shadow:0 0 0 3px var(--gold-soft);background:var(--bg-1);}
.inp:hover:not(:focus){border-color:var(--line-3);}
.inp.mono{font-family:var(--mono);}
.inp.ta{resize:vertical;min-height:60px;line-height:1.5;}
.inp[type=date]{cursor:text;}
.inp[type=date]::-webkit-calendar-picker-indicator{filter:invert(.7);cursor:pointer;}
.numwrap{position:relative;display:flex;align-items:center;}
.numwrap .inp{padding-right:38px;}
.numsuffix{position:absolute;right:12px;font-size:12px;color:var(--ink-4);font-family:var(--mono);pointer-events:none;}
.selwrap{position:relative;display:flex;align-items:center;}
.inp.sel{appearance:none;-webkit-appearance:none;padding-right:34px;cursor:pointer;background-image:none;}
.selcaret{position:absolute;right:11px;color:var(--ink-4);pointer-events:none;}
.fg select.inp option{background:var(--bg-2);color:var(--ink);}
.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;}
.fld.full{grid-column:1/-1;}
.inline{display:flex;align-items:center;gap:8px;}
.inline .selwrap,.inline .numwrap{flex:1;}
.inline > .inp{flex:1;}
.mini-chips{display:flex;gap:4px;}
.mini{border:1px solid var(--line-2);background:var(--bg-3);color:var(--ink-3);border-radius:7px;padding:6px 8px;font-size:11.5px;font-weight:600;font-family:var(--mono);transition:all .12s;}
.mini:hover{border-color:var(--gold-line);color:var(--gold-2);}

.hint{font-size:11.5px;color:var(--ink-4);}
.hint-block{font-size:12.5px;color:var(--ink-3);line-height:1.55;margin-bottom:14px;}
.subsec{padding:2px 0;}
.subsec-head{margin-bottom:13px;}

/* ---------- collapsible ---------- */
.collap{border:1px solid var(--line);border-radius:var(--radius);background:var(--bg-1);margin-bottom:16px;overflow:hidden;}
.collap-head{display:flex;align-items:center;gap:10px;width:100%;background:transparent;border:none;padding:15px 18px;color:var(--ink);font-size:13.5px;font-weight:600;text-align:left;}
.collap-head svg{color:var(--ink-3);}
.collap.open .collap-head{border-bottom:1px solid var(--line);}
.collap-title{flex:1;}
.collap-right{margin-right:6px;}
.collap-caret{color:var(--ink-4);transition:transform .18s;}
.collap-caret.open{transform:rotate(180deg);}
.collap-body{padding:18px;}

/* ---------- type tag ---------- */
.typetag{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;color:var(--ink-2);background:var(--bg-3);border:1px solid var(--line);border-radius:7px;padding:4px 9px;white-space:nowrap;}
.typetag svg{color:var(--gold-2);}

/* ---------- empty state ---------- */
.empty-state{display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;padding:48px 22px;}
.es-icon{width:58px;height:58px;border-radius:16px;display:grid;place-items:center;background:var(--bg-3);border:1px solid var(--line);color:var(--ink-3);}
.es-title{font-family:var(--display);font-size:18px;font-weight:600;}
.es-sub{font-size:13px;color:var(--ink-3);max-width:340px;line-height:1.55;}
.empty-state .btn{margin-top:8px;}

/* ---------- modal ---------- */
.overlay{position:fixed;inset:0;z-index:80;background:rgba(8,9,11,.66);backdrop-filter:blur(4px);display:flex;align-items:flex-start;justify-content:center;padding:40px 18px;overflow-y:auto;animation:fgFade .16s ease;}
.modal{width:100%;max-width:540px;background:var(--bg-1);border:1px solid var(--line-2);border-radius:var(--radius-lg);box-shadow:var(--shadow);margin:auto;animation:fgPop .2s ease;overflow:hidden;}
.modal.wide{max-width:920px;}
.modal-head{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:18px 20px;border-bottom:1px solid var(--line);}
.modal-head h3{font-family:var(--display);font-size:18px;font-weight:600;}
.modal-body{padding:20px;max-height:min(70vh,720px);overflow-y:auto;}
.modal-foot{display:flex;justify-content:flex-end;gap:10px;padding:15px 20px;border-top:1px solid var(--line);flex-wrap:wrap;}
.modal-body p{font-size:13.5px;color:var(--ink-2);line-height:1.6;}

/* ---------- picklist / status list ---------- */
.picklist{display:flex;flex-direction:column;gap:7px;}
.pickrow{display:flex;align-items:center;justify-content:space-between;gap:14px;background:var(--bg-2);border:1px solid var(--line);border-radius:10px;padding:12px 14px;text-align:left;transition:all .14s;}
.pickrow:hover{border-color:var(--gold-line);background:var(--bg-3);}
.pickrow.on{border-color:var(--gold-line);background:var(--gold-soft);}
.pr-desc{font-size:13.5px;font-weight:500;color:var(--ink);}
.pr-meta{font-size:11.5px;color:var(--ink-4);white-space:nowrap;}
.statuslist{display:flex;flex-direction:column;gap:7px;}
.statusrow{display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--bg-2);border:1px solid var(--line);border-radius:10px;padding:11px 14px;transition:all .14s;}
.statusrow:hover{border-color:var(--line-3);background:var(--bg-3);}
.statusrow.on{border-color:var(--gold-line);background:var(--gold-soft);}

/* ---------- editor ---------- */
.editor{min-height:100vh;display:flex;flex-direction:column;}
.editor-bar{
  position:sticky;top:0;z-index:40;display:flex;align-items:center;gap:14px;
  padding:14px 26px;background:rgba(13,14,17,.9);backdrop-filter:blur(12px);border-bottom:1px solid var(--line);
}
.eb-title{flex:1;font-family:var(--display);font-size:19px;font-weight:600;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.eb-actions{display:flex;gap:9px;}
.editor-tabs{padding:14px 26px 0;display:flex;justify-content:center;}
.editor-tabs .seg{width:100%;max-width:420px;}
.editor-tabs .seg-i{flex:1;text-align:center;}
.editor-cols{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,440px);gap:26px;padding:26px;align-items:start;max-width:1480px;margin:0 auto;width:100%;}
.editor-form{min-width:0;}
.editor-preview{position:sticky;top:84px;display:flex;flex-direction:column;gap:14px;}

/* ---------- line items ---------- */
.lines{display:flex;flex-direction:column;gap:12px;}
.linecard{background:var(--bg-2);border:1px solid var(--line);border-radius:var(--radius-sm);padding:14px;}
.lc-top{display:flex;align-items:center;gap:10px;margin-bottom:12px;}
.lc-idx{width:24px;height:24px;border-radius:7px;flex:0 0 auto;display:grid;place-items:center;background:var(--gold-soft);color:var(--gold-2);font-size:12px;font-weight:600;font-family:var(--mono);}
.lc-desc{flex:1;}
.lc-tools{display:flex;gap:4px;}
.lc-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin-bottom:11px;}
.lc-amount{display:flex;align-items:center;height:100%;padding:9px 0;font-weight:600;color:var(--gold-2);font-size:13.5px;}
.lc-note{font-size:12.5px;}
.lines-actions{display:flex;gap:9px;margin-top:4px;flex-wrap:wrap;}

/* ---------- totals card ---------- */
.totals-card{background:linear-gradient(165deg,var(--bg-2),var(--bg-1));border:1px solid var(--line);border-radius:var(--radius);padding:16px 18px;}
.tc-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:6px 0;font-size:13.5px;color:var(--ink-2);}
.tc-row .mono{font-variant-numeric:tabular-nums;color:var(--ink);}
.tc-row.dim{font-size:12px;color:var(--ink-4);padding:2px 0 6px;}
.tc-row.dim .mono{color:var(--ink-4);}
.tc-row.neg{color:var(--danger);}
.tc-row.neg .mono{color:var(--danger);}
.tc-row.grand{border-top:1px solid var(--line);margin-top:5px;padding-top:11px;font-size:15px;font-weight:600;color:var(--ink);}
.tc-row.grand .mono{color:var(--gold-2);font-size:16px;}

/* ---------- preview ---------- */
.preview-actions{display:flex;gap:9px;}
.preview-label{font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:var(--ink-4);}
.preview-wrap{width:100%;border:1px solid var(--line);border-radius:var(--radius);background:#33363d;padding:12px;overflow:hidden;}
.preview-scaler{position:relative;width:100%;overflow:hidden;}

/* ---------- entity cards ---------- */
.card-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:16px;}
.ent-card{background:var(--bg-1);border:1px solid var(--line);border-radius:var(--radius);padding:18px;display:flex;flex-direction:column;gap:15px;transition:border-color .14s;}
.ent-card:hover{border-color:var(--line-2);}
.ent-top{display:flex;align-items:flex-start;gap:13px;}
.ent-logo{width:46px;height:46px;border-radius:11px;flex:0 0 auto;display:grid;place-items:center;background:var(--bg-3);border:1.5px solid var(--line-2);overflow:hidden;}
.ent-logo img{width:100%;height:100%;object-fit:contain;background:#fff;}
.ent-main{flex:1;min-width:0;}
.ent-name{font-size:15.5px;font-weight:600;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;}
.ent-forma{font-size:11px;font-weight:500;color:var(--ink-4);background:var(--bg-3);border:1px solid var(--line);border-radius:6px;padding:2px 7px;}
.ent-sub{font-size:12.5px;color:var(--ink-3);margin-top:4px;}
.pill{font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--gold-2);background:var(--gold-soft);border:1px solid var(--gold-line);border-radius:999px;padding:3px 9px;white-space:nowrap;flex:0 0 auto;}
.ent-rows{display:flex;flex-direction:column;gap:8px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:13px 0;}
.ent-rows > div{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:12.5px;}
.ent-rows .k{color:var(--ink-4);text-transform:uppercase;letter-spacing:.08em;font-size:10.5px;}
.ent-rows .mono{color:var(--ink-2);}
.theme-dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:7px;vertical-align:-1px;}
.ent-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.ent-actions .iconbtn{margin-left:auto;}

/* ---------- logo row (company editor) ---------- */
.logo-row{display:flex;align-items:center;gap:16px;flex-wrap:wrap;}
.logo-box{width:84px;height:84px;border-radius:var(--radius-sm);flex:0 0 auto;display:grid;place-items:center;background:#fff;border:1px solid var(--line-2);overflow:hidden;color:#9aa0ab;}
.logo-box img{width:100%;height:100%;object-fit:contain;padding:6px;}
.logo-actions{display:flex;flex-direction:column;gap:8px;}
.logo-actions .hint{margin-top:2px;}

/* ---------- theme editor ---------- */
.theme-editor{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px;}
.theme-editor .fld.full{grid-column:1/-1;}
.custom-tpl{grid-column:1/-1;display:flex;flex-direction:column;gap:10px;border-top:1px solid var(--line);padding-top:14px;margin-top:2px;}
.custom-tpl .hint-block code{font-family:var(--mono);font-size:11px;background:var(--bg-3);border:1px solid var(--line);border-radius:5px;padding:1px 5px;color:var(--ink-2);}
.ct-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;}
.ct-title{font-size:11px;font-weight:600;color:var(--ink-3);text-transform:uppercase;letter-spacing:.1em;}
.ct-actions{display:flex;align-items:center;gap:16px;flex-wrap:wrap;}
.ct-actions .link-btn{display:inline-flex;align-items:center;gap:5px;}
.inp.ta.code{font-family:var(--mono);font-size:12px;line-height:1.55;min-height:300px;white-space:pre-wrap;tab-size:2;resize:vertical;}
.token-ref{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px 20px;}
.token-ref h5{margin:0 0 7px;font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:var(--gold-2);font-weight:700;}
.token-ref ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:5px;}
.token-ref li{font-size:11.5px;color:var(--ink-2);line-height:1.5;}
.token-ref code{font-family:var(--mono);font-size:10.5px;color:var(--ink-2);background:var(--bg-3);border:1px solid var(--line);border-radius:5px;padding:1px 5px;}
.token-ref .td{color:var(--ink-4);}
.toggle-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px;padding-top:4px;}
.toggle-grid.full{grid-column:1/-1;}
.stamp-editor{grid-column:1/-1;display:flex;flex-direction:column;gap:12px;border-top:1px solid var(--line);padding-top:14px;margin-top:2px;}
.stamp-editor-label{font-size:11px;font-weight:600;color:var(--ink-3);text-transform:uppercase;letter-spacing:.1em;}
.stamp-preset-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}
.stamp-preset-btn{background:var(--bg-2);border:1.5px solid var(--line);border-radius:var(--radius-sm);padding:8px 6px 6px;display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;transition:border-color .15s,background .15s;}
.stamp-preset-btn:hover{border-color:var(--line-2);background:var(--bg-4);}
.stamp-preset-btn.on{border-color:var(--gold);background:var(--gold-soft);}
.stamp-preset-btn img{width:44px;height:44px;object-fit:contain;}
.stamp-none{width:44px;height:44px;display:grid;place-items:center;font-size:20px;color:var(--ink-4);}
.stamp-preset-name{font-size:10px;color:var(--ink-3);white-space:nowrap;}
.stamp-preset-btn.on .stamp-preset-name{color:var(--gold-2);}
.stamp-upload-row{display:flex;flex-wrap:wrap;align-items:center;gap:10px;}
.stamp-custom-preview{height:48px;width:auto;max-width:80px;object-fit:contain;border-radius:6px;border:1px solid var(--line);background:#fff;padding:4px;}
.stamp-controls{display:flex;flex-direction:column;gap:12px;}
.stamp-opacity-row{display:flex;align-items:center;gap:10px;}
.stamp-opacity-row input[type=range]{flex:1;accent-color:var(--gold);}
.stamp-opacity-val{min-width:36px;text-align:right;font-size:12px;color:var(--ink-2);}
.doc-stamp-bar{margin-top:14px;padding-top:14px;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:12px;}
.doc-stamp-bar-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;}
.doc-stamp-bar-actions{display:flex;flex-wrap:wrap;gap:12px;}
.stamp-bar-grid{grid-template-columns:repeat(auto-fill,minmax(58px,1fr));}
.stamp-bar-controls{grid-template-columns:1fr;}
.preview-stamp-hint{margin:8px 0 0;font-size:11px;color:var(--ink-4);text-align:center;}
.preview-stamp-handle:active{cursor:grabbing !important;}

/* ---------- settings ---------- */
.data-actions{display:flex;gap:10px;flex-wrap:wrap;}
.tpl-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:13px;}
.tpl-mini{position:relative;background:#fff;border:2px solid var(--line-2);border-radius:11px;padding:14px 13px 12px;display:flex;flex-direction:column;gap:7px;min-height:108px;transition:border-color .14s,transform .12s;overflow:hidden;}
.tpl-mini:hover{transform:translateY(-2px);border-color:var(--gold-line);}
.tpl-mini.on{border-color:var(--gold);box-shadow:0 0 0 2px var(--bg-1),0 0 0 4px var(--gold-line);}
.tm-bar{height:9px;width:46px;border-radius:3px;background:#c9a44c;}
.tm-line{height:5px;border-radius:3px;background:#d7dae0;width:100%;}
.tm-line.a{background:#9aa3b2;width:64%;}
.tm-line.short{width:40%;}
.tm-name{margin-top:auto;display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:12px;font-weight:600;color:#1a1d24;}
.tm-name svg{color:#c9a44c;}
.tpl-moderno .tm-bar{width:100%;height:13px;border-radius:4px;}
.tpl-minimale .tm-bar{width:30px;height:3px;background:#1a1d24;}
.tpl-elegante{align-items:center;text-align:center;}
.tpl-elegante .tm-bar{width:54px;height:3px;background:#1a1d24;}
.tpl-elegante .tm-line{margin:0 auto;}
.tpl-elegante .tm-line.a{width:50%;}
.tpl-elegante .tm-name{justify-content:center;}

@media(max-width:1180px){
  .stat-grid{grid-template-columns:repeat(2,1fr);}
}
@media(max-width:980px){
  .editor-cols{grid-template-columns:minmax(0,1fr);}
  .editor-preview{position:static;}
  .editor-bar,.editor-tabs,.editor-cols{padding-left:16px;padding-right:16px;}
}
@media(max-width:680px){
  .vh-title{font-size:25px;}
  .stat-grid{grid-template-columns:1fr 1fr;gap:11px;}
  .form-grid{grid-template-columns:1fr;}
  .theme-editor{grid-template-columns:1fr;}
  .lc-grid{grid-template-columns:repeat(3,1fr);}
  .toggle-grid{grid-template-columns:1fr;}
  .panel{padding:16px;}
  .modal-foot{flex-direction:column-reverse;}
  .modal-foot .btn{width:100%;}
}
@media(max-width:420px){
  .stat-grid{grid-template-columns:1fr;}
  .lc-grid{grid-template-columns:repeat(2,1fr);}
}
`;

// ============================================================================
//  APP — shell, routing, persistence, CRUD
// ============================================================================
const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'documenti', label: 'Documents', icon: FileText },
  { id: 'aziende', label: 'Companies', icon: Building2 },
  { id: 'clienti', label: 'Clients', icon: Users },
  { id: 'listino', label: 'Catalog', icon: Package },
  { id: 'ricevute', label: 'Inbox', icon: Inbox },
  { id: 'impostazioni', label: 'Settings', icon: SettingsIcon },
];

function AppNotice({ notice, onDismiss }) {
  if (!notice) return null;
  return (
    <div className={cx('app-notice', notice.type === 'error' && 'err', notice.type === 'warn' && 'warn')}>
      <span>{notice.text}</span>
      <button type="button" className="app-notice-x" onClick={onDismiss} aria-label="Dismiss"><X size={14} /></button>
    </div>
  );
}

const INBOX_CATEGORIES = ['Purchase invoice', 'Expense', 'Service', 'Customs / duty', 'Shipping', 'Commission', 'Other'];
const CUR_SYM = { EUR: '\u20ac', USD: 'US$', GBP: '\u00a3', CHF: 'CHF', AED: 'AED', HKD: 'HK$' };

function IncomingViewer({ open, rec, onClose }) {
  const [url, setUrl] = useState('');
  const [kind, setKind] = useState('pdf');
  const [loading, setLoading] = useState(false);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let alive = true; let made = '';
    if (open && rec) {
      setLoading(true); setUrl(''); setMissing(false);
      (async () => {
        let data = rec.data || '';
        if (!data && rec.fileKey) { try { data = await FileStore.get(rec.fileKey); } catch (e) { data = ''; } }
        if (!alive) return;
        if (!data) { setMissing(true); setLoading(false); return; }
        const isImg = (rec.fileType || '').indexOf('image/') === 0 || /^data:image\//.test(data);
        setKind(isImg ? 'img' : 'pdf');
        if (isImg) { setUrl(data); }
        else { try { const blob = dataURLToBlob(data); made = URL.createObjectURL(blob); setUrl(made); } catch (e) { setUrl(data); } }
        setLoading(false);
      })();
    }
    return () => { alive = false; if (made) URL.revokeObjectURL(made); };
  }, [open, rec]);
  const download = () => { if (!rec) return; const a = document.createElement('a'); a.href = url || rec.data || ''; a.download = rec.fileName || 'document.pdf'; document.body.appendChild(a); a.click(); a.remove(); };
  return (
    <Modal open={open} onClose={onClose} wide title={rec ? (rec.supplier || rec.fileName || 'Document') : 'Document'}
      footer={<><Btn variant="ghost" onClick={onClose}>Close</Btn>{url ? <Btn variant="ghost" icon={ExternalLink} onClick={() => window.open(url, '_blank')}>Open</Btn> : null}<Btn icon={Download} onClick={download} disabled={!url && !(rec && rec.data)}>Download</Btn></>}>
      {loading ? <div className="dim" style={{ padding: '48px', textAlign: 'center' }}>Loading the file...</div>
        : missing ? <div className="dim" style={{ padding: '48px', textAlign: 'center' }}>The stored file is not available.</div>
        : kind === 'img' ? <div style={{ textAlign: 'center' }}><img src={url} alt="" style={{ maxWidth: '100%', borderRadius: 8 }} /></div>
        : <iframe title="document" src={url} style={{ width: '100%', height: '72vh', border: '1px solid var(--line)', borderRadius: 8, background: '#fff' }} />}
    </Modal>
  );
}

function IncomingEditor({ open, state, store, onClose, onAdd, onUpdate }) {
  const companies = store.companies || [];
  const existing = state && state.rec ? state.rec : null;
  const seedFile = state && state.file ? state.file : null;
  const mk = () => {
    if (existing) return { ...existing, amount: existing.amount == null ? '' : existing.amount };
    return { id: uid(), companyId: (store.settings && store.settings.defaultCompanyId) || (companies[0] && companies[0].id) || '', supplier: '', docNumber: '', date: todayISO(), amount: '', currency: (companies[0] && companies[0].currency) || 'EUR', category: 'Purchase invoice', notes: '', fileName: seedFile ? seedFile.name : '', fileType: seedFile ? seedFile.type : '', fileSize: seedFile ? seedFile.size : 0 };
  };
  const [f, setF] = useState(mk);
  const [file, setFile] = useState(seedFile);
  const [warn, setWarn] = useState('');
  const fileRef = useRef(null);
  useEffect(() => { if (open) { setF(mk()); setFile(seedFile); setWarn(seedFile && seedFile.size > 4 * 1024 * 1024 ? 'Large file (>4 MB) may not be saved permanently.' : ''); } }, [open]);
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }));
  const onReplace = (e) => {
    const x = e.target.files && e.target.files[0]; e.target.value = ''; if (!x) return;
    const err = validateUploadFile(x);
    if (err) { setWarn(err); return; }
    setFile(x); setF((o) => ({ ...o, fileName: x.name, fileType: x.type, fileSize: x.size })); setWarn(x.size > 4 * 1024 * 1024 ? 'Large file (>4 MB) may not be saved permanently.' : '');
  };
  const save = () => { const meta = { ...f, amount: f.amount === '' ? '' : num(f.amount) }; if (existing) onUpdate(meta, file); else onAdd(meta, file); };
  const sym = CUR_SYM[f.currency] || f.currency;
  return (
    <Modal open={open} onClose={onClose} title={existing ? 'Edit document' : 'File a received document'}
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn icon={Save} onClick={save} disabled={!f.companyId}>Save</Btn></>}>
      <div className="form-grid">
        <Field label="File" full hint={warn || 'PDF or image, stored on this device for your records'}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px' }}>
            <Paperclip size={14} />
            <span className="mono" style={{ flex: 1, minWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.fileName || '(no file attached)'}</span>
            {f.fileSize ? <span className="dim">{(f.fileSize / 1024).toFixed(0)} KB</span> : null}
            <button onClick={() => fileRef.current && fileRef.current.click()} style={{ background: 'none', border: '1px solid var(--line-2)', color: '#c6a161', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>{f.fileName ? 'Replace' : 'Attach'}</button>
            <input ref={fileRef} type="file" accept="application/pdf,image/*" style={{ display: 'none' }} onChange={onReplace} />
          </div>
        </Field>
        <Field label="Company (archive)" full><Select value={f.companyId} onChange={(v) => set('companyId', v)} options={companies.map((c) => ({ value: c.id, label: c.name }))} /></Field>
        <Field label="Supplier / sender" full><TextInput value={f.supplier} onChange={(v) => set('supplier', v)} placeholder="e.g. Rolex SA, or a private seller" /></Field>
        <Field label="Document number"><TextInput value={f.docNumber} onChange={(v) => set('docNumber', v)} mono /></Field>
        <Field label="Document date"><TextInput value={f.date} onChange={(v) => set('date', v)} type="date" /></Field>
        <Field label="Amount"><NumberInput value={f.amount} onChange={(v) => set('amount', v)} suffix={sym} /></Field>
        <Field label="Currency"><Select value={f.currency} onChange={(v) => set('currency', v)} options={CURRENCIES} /></Field>
        <Field label="Category" full><Select value={f.category} onChange={(v) => set('category', v)} options={INBOX_CATEGORIES} /></Field>
        <Field label="Notes" full><TextArea value={f.notes} onChange={(v) => set('notes', v)} rows={2} /></Field>
      </div>
    </Modal>
  );
}

function IncomingView({ store, onAdd, onUpdate, onDelete, onNotify }) {
  const companies = store.companies || [];
  const items = store.incoming || [];
  const [coFilter, setCoFilter] = useState('all');
  const [q, setQ] = useState('');
  const [editor, setEditor] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [del, setDel] = useState(null);
  const fileRef = useRef(null);
  const coName = (id) => { const c = companies.find((x) => x.id === id); return c ? c.name : '\u2014'; };
  const filtered = items
    .filter((r) => (coFilter === 'all' || r.companyId === coFilter))
    .filter((r) => { if (!q) return true; const t = [r.supplier, r.docNumber, r.fileName, r.category, coName(r.companyId)].filter(Boolean).join(' ').toLowerCase(); return t.indexOf(q.toLowerCase()) >= 0; })
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const sums = {}; filtered.forEach((r) => { const c = r.currency || 'EUR'; const v = parseFloat(r.amount); if (isFinite(v)) sums[c] = (sums[c] || 0) + v; });
  const onPick = (e) => {
    const x = e.target.files && e.target.files[0]; e.target.value = '';
    if (!x) return;
    const err = validateUploadFile(x);
    if (err) { if (onNotify) onNotify(err, 'error'); return; }
    setEditor({ file: x });
  };
  return (
    <div className="view">
      <ViewHead title="Inbox" sub="Invoices and purchase documents you received, filed per company for your accounting." actions={<Btn icon={Upload} onClick={() => fileRef.current && fileRef.current.click()}>Upload PDF</Btn>} />
      <input ref={fileRef} type="file" accept="application/pdf,image/*" style={{ display: 'none' }} onChange={onPick} />
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', margin: '0 0 14px' }}>
        <div style={{ minWidth: 220 }}><Select value={coFilter} onChange={setCoFilter} options={[{ value: 'all', label: 'All companies' }].concat(companies.map((c) => ({ value: c.id, label: c.name })))} /></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 8, padding: '7px 12px', flex: 1, minWidth: 160 }}>
          <Search size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search supplier, number, file..." style={{ background: 'none', border: 'none', outline: 'none', color: 'inherit', width: '100%', fontSize: 13 }} />
        </div>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={Inbox} title="Nothing filed yet" sub="Upload a PDF you received (a supplier or purchase invoice) to keep it here for your accounting." action={<Btn icon={Upload} onClick={() => fileRef.current && fileRef.current.click()}>Upload PDF</Btn>} />
      ) : (
        <>
          {Object.keys(sums).length > 0 ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '0 0 12px' }}>
              {Object.keys(sums).map((c) => (
                <span key={c} style={{ background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 999, padding: '5px 12px', fontSize: 12 }}>
                  {filtered.filter((r) => (r.currency || 'EUR') === c).length} docs &middot; <strong>{money(sums[c], c)}</strong>
                </span>
              ))}
            </div>
          ) : null}
          <div className="tbl-wrap">
            <table className="dtable">
              <thead><tr><th>Document</th><th>Company</th><th>Number</th><th>Date</th><th className="r">Amount</th><th className="r">Actions</th></tr></thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Paperclip size={13} />{r.supplier || r.fileName || 'Document'}</span>{r.category ? <span className="dim"> &middot; {r.category}</span> : null}</td>
                    <td className="dim">{coName(r.companyId)}</td>
                    <td className="mono dim">{r.docNumber || '\u2014'}</td>
                    <td className="dim">{r.date ? dateFmt(r.date) : '\u2014'}</td>
                    <td className="r">{(r.amount !== '' && r.amount != null && isFinite(parseFloat(r.amount))) ? money(parseFloat(r.amount), r.currency || 'EUR') : <span className="dim">\u2014</span>}</td>
                    <td><div className="row-actions"><IconBtn icon={Eye} title="View" onClick={() => setViewer(r)} /><IconBtn icon={Pencil} title="Edit" onClick={() => setEditor({ rec: r })} /><IconBtn icon={Trash2} danger title="Delete" onClick={() => setDel(r)} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <IncomingEditor open={!!editor} state={editor} store={store} onClose={() => setEditor(null)} onAdd={(meta, file) => { onAdd(meta, file); setEditor(null); }} onUpdate={(meta, file) => { onUpdate(meta, file); setEditor(null); }} />
      <IncomingViewer open={!!viewer} rec={viewer} onClose={() => setViewer(null)} />
      <Modal open={!!del} onClose={() => setDel(null)} title="Delete document"
        footer={<><Btn variant="ghost" onClick={() => setDel(null)}>Cancel</Btn><Btn variant="danger" icon={Trash2} onClick={() => { onDelete(del); setDel(null); }}>Delete</Btn></>}>
        {del ? <p>Remove <strong>{del.supplier || del.fileName || 'this document'}</strong> from the archive? This also deletes the stored file.</p> : null}
      </Modal>
    </div>
  );
}

const ID_DOC_CATEGORIES = ['ID card', 'Passport', 'Driving licence', 'Proof of address', 'Tax / fiscal code', 'Other'];

function ClientDocsModal({ open, client, onClose, onAdd, onDelete }) {
  const [cat, setCat] = useState('ID card');
  const [viewer, setViewer] = useState(null);
  const [delId, setDelId] = useState(null);
  const fileRef = useRef(null);
  const atts = (client && client.attachments) || [];
  const onPick = (e) => {
    const x = e.target.files && e.target.files[0]; e.target.value = '';
    if (!x || !client) return;
    const err = validateUploadFile(x);
    if (err) return;
    onAdd(client.id, { category: cat, label: '' }, x);
  };
  return (
    <Modal open={open} onClose={onClose} wide title={client ? ('Documents \u2014 ' + client.name) : 'Documents'}
      footer={<Btn variant="ghost" onClick={onClose}>Close</Btn>}>
      {client && client.type === 'privato' ? <p className="dim" style={{ margin: '0 0 12px' }}>Keep the seller's identity document on file for purchases from private individuals (AML / KYC records).</p> : null}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', margin: '0 0 14px' }}>
        <div style={{ minWidth: 190 }}><Select value={cat} onChange={setCat} options={ID_DOC_CATEGORIES} /></div>
        <Btn icon={Upload} onClick={() => fileRef.current && fileRef.current.click()} disabled={!client}>Add document</Btn>
        <input ref={fileRef} type="file" accept="application/pdf,image/*" style={{ display: 'none' }} onChange={onPick} />
      </div>
      {atts.length === 0 ? (
        <EmptyState icon={Paperclip} title="No documents on file" sub="Upload an ID card, passport or other document for this person." />
      ) : (
        <div className="tbl-wrap">
          <table className="dtable">
            <thead><tr><th>Type</th><th>File</th><th>Added</th><th className="r">Actions</th></tr></thead>
            <tbody>
              {atts.map((a) => (
                <tr key={a.id}>
                  <td>{a.category || 'Document'}</td>
                  <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Paperclip size={13} />{a.fileName || '\u2014'}</span>{a.fileSize ? <span className="dim"> &middot; {(a.fileSize / 1024).toFixed(0)} KB</span> : null}</td>
                  <td className="dim">{a.addedAt ? dateFmt(new Date(a.addedAt).toISOString().slice(0, 10)) : '\u2014'}</td>
                  <td><div className="row-actions"><IconBtn icon={Eye} title="View" onClick={() => setViewer(a)} /><IconBtn icon={Trash2} danger title="Delete" onClick={() => setDelId(a.id)} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <IncomingViewer open={!!viewer} rec={viewer} onClose={() => setViewer(null)} />
      <Modal open={!!delId} onClose={() => setDelId(null)} title="Delete document"
        footer={<><Btn variant="ghost" onClick={() => setDelId(null)}>Cancel</Btn><Btn variant="danger" icon={Trash2} onClick={() => { if (client) onDelete(client.id, delId); setDelId(null); }}>Delete</Btn></>}>
        <p>Remove this document from the record? This deletes the stored file.</p>
      </Modal>
    </Modal>
  );
}

export default function App() {
  const [store, setStore] = useState(null);
  const storeRef = useRef(null);
  const [notice, setNotice] = useState(null);
  const [view, setView] = useState('dashboard');
  const [docEditor, setDocEditor] = useState(null);
  const [companyEditor, setCompanyEditor] = useState(null);
  const [viewerDoc, setViewerDoc] = useState(null);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useMedia(900);

  const notify = (text, type = 'warn') => setNotice({ text, type });

  const persist = async (updater) => {
    const prev = storeRef.current;
    if (!prev) return null;
    const next = normalizeStore(typeof updater === 'function' ? updater(prev) : updater);
    storeRef.current = next;
    setStore(next);
    const ok = await Store.set(STORE_KEY, next);
    if (!ok) notify('Could not save to disk (storage full or unavailable). Changes are kept in memory until you reload.', 'error');
    return next;
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      let s = await Store.get(STORE_KEY);
      if (!s || !s.companies) { s = seedStore(); await Store.set(STORE_KEY, s); }
      else s = normalizeStore(s);
      if (alive) { storeRef.current = s; setStore(s); }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const onStorage = async (e) => {
      if (e.key !== STORE_KEY && e.key !== null) return;
      const remote = await Store.get(STORE_KEY);
      if (!remote) return;
      const normalized = normalizeStore(remote);
      storeRef.current = normalized;
      setStore(normalized);
      notify('Data was updated in another browser tab.', 'warn');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => { setDrawerOpen(false); }, [view]);

  if (!store) {
    return (
      <div className="fg boot">
        <style>{APP_CSS}</style>
        <div className="boot-card"><span className="brand-mark"><Receipt size={22} /></span><span>Loading…</span></div>
      </div>
    );
  }

  const defaultCompanyId = (store.settings || {}).defaultCompanyId || '';

  // ---- documents ----
  const upsertDoc = async (doc) => {
    await persist((s) => {
      const docs = s.documents || [];
      const exists = docs.some((d) => d.id === doc.id);
      return { ...s, documents: exists ? docs.map((d) => (d.id === doc.id ? doc : d)) : [...docs, doc] };
    });
    setDocEditor(null);
    setView('documenti');
  };
  const deleteDoc = (doc) => persist((s) => ({ ...s, documents: (s.documents || []).filter((d) => d.id !== doc.id) }));
  const duplicateDoc = async (doc) => {
    const y = yearOf(todayISO());
    const seq = nextSeq(storeRef.current.documents, doc.companyId, doc.type, y);
    const copy = { ...JSON.parse(JSON.stringify(doc)), id: uid(), status: 'bozza', date: todayISO(), seq, year: y, number: formatDocNumber(doc.type, seq, y), createdAt: Date.now() };
    await persist((s) => ({ ...s, documents: [...(s.documents || []), copy] }));
    setDocEditor({ id: copy.id });
  };
  const setDocStatus = (doc, status) => persist((s) => ({ ...s, documents: (s.documents || []).map((d) => (d.id === doc.id ? { ...d, status } : d)) }));

  // ---- companies ----
  const upsertCompany = async (co) => {
    await persist((s) => {
      const arr = s.companies || [];
      const exists = arr.some((c) => c.id === co.id);
      let settings = s.settings || {};
      if (!exists && !settings.defaultCompanyId) settings = { ...settings, defaultCompanyId: co.id };
      return { ...s, companies: exists ? arr.map((c) => (c.id === co.id ? co : c)) : [...arr, co], settings };
    });
    setCompanyEditor(null);
    setView('aziende');
  };
  const deleteCompany = (co) => persist((s) => {
    const companies = (s.companies || []).filter((c) => c.id !== co.id);
    let settings = s.settings || {};
    if (settings.defaultCompanyId === co.id) settings = { ...settings, defaultCompanyId: companies[0] ? companies[0].id : '' };
    return { ...s, companies, settings };
  });
  const setDefaultCompany = (id) => persist((s) => ({ ...s, settings: { ...(s.settings || {}), defaultCompanyId: id } }));

  // ---- clients / catalog ----
  const upsertClient = (cl) => persist((s) => {
    const arr = s.clients || [];
    const exists = arr.some((c) => c.id === cl.id);
    return { ...s, clients: exists ? arr.map((c) => (c.id === cl.id ? cl : c)) : [...arr, cl] };
  });
  const deleteClient = async (cl) => {
    for (const a of cl.attachments || []) {
      if (a.fileKey) { try { await FileStore.del(a.fileKey); } catch (e) { /* */ } }
    }
    await persist((s) => ({ ...s, clients: (s.clients || []).filter((c) => c.id !== cl.id) }));
  };
  const addClientFile = async (clientId, meta, file) => {
    if (!file) return;
    const err = validateUploadFile(file);
    if (err) { notify(err, 'error'); return; }
    const id = uid();
    let att = { id, category: (meta && meta.category) || 'Document', label: (meta && meta.label) || '', fileName: file.name, fileType: file.type || 'application/octet-stream', fileSize: file.size, fileKey: '', addedAt: Date.now() };
    try {
      const dataUrl = await readFileAsDataURL(file);
      const key = 'fg_file_' + id;
      const fileOk = await FileStore.set(key, dataUrl);
      if (!fileOk) notify('Attachment saved in memory only (storage limit reached).', 'warn');
      att.fileKey = key;
    } catch (e) {
      notify('Could not read the uploaded file.', 'error');
      return;
    }
    await persist((s) => ({ ...s, clients: (s.clients || []).map((c) => (c.id === clientId ? { ...c, attachments: [...((c.attachments) || []), att] } : c)) }));
  };
  const deleteClientFile = async (clientId, fileId) => {
    const c = (storeRef.current.clients || []).find((x) => x.id === clientId);
    const att = c && (c.attachments || []).find((a) => a.id === fileId);
    if (att && att.fileKey) { try { await FileStore.del(att.fileKey); } catch (e) { /* */ } }
    await persist((s) => ({ ...s, clients: (s.clients || []).map((x) => (x.id === clientId ? { ...x, attachments: (x.attachments || []).filter((a) => a.id !== fileId) } : x)) }));
  };
  const upsertProduct = (p) => persist((s) => {
    const arr = s.products || [];
    const exists = arr.some((x) => x.id === p.id);
    return { ...s, products: exists ? arr.map((x) => (x.id === p.id ? p : x)) : [...arr, p] };
  });
  const deleteProduct = (p) => persist((s) => ({ ...s, products: (s.products || []).filter((x) => x.id !== p.id) }));
  const addIncoming = async (meta, file) => {
    const id = meta.id || uid();
    let rec = { ...meta, id, fileKey: meta.fileKey || '', createdAt: Date.now() };
    if (file) {
      const err = validateUploadFile(file);
      if (err) { notify(err, 'error'); return; }
      rec.fileName = file.name; rec.fileType = file.type || 'application/pdf'; rec.fileSize = file.size;
      try {
        const dataUrl = await readFileAsDataURL(file);
        const key = 'fg_file_' + id;
        const fileOk = await FileStore.set(key, dataUrl);
        if (!fileOk) notify('File saved in memory only (storage limit reached).', 'warn');
        rec.fileKey = key; rec.data = '';
      } catch (e) { notify('Could not read the uploaded file.', 'error'); return; }
    }
    await persist((s) => ({ ...s, incoming: [...(s.incoming || []), rec] }));
  };
  const updateIncoming = async (meta, file) => {
    let patch = { ...meta };
    if (file) {
      const err = validateUploadFile(file);
      if (err) { notify(err, 'error'); return; }
      patch.fileName = file.name; patch.fileType = file.type || 'application/pdf'; patch.fileSize = file.size;
      try {
        const dataUrl = await readFileAsDataURL(file);
        const key = meta.fileKey || ('fg_file_' + meta.id);
        const fileOk = await FileStore.set(key, dataUrl);
        if (!fileOk) notify('File saved in memory only (storage limit reached).', 'warn');
        patch.fileKey = key; patch.data = '';
      } catch (e) { notify('Could not read the uploaded file.', 'error'); return; }
    }
    await persist((s) => ({ ...s, incoming: (s.incoming || []).map((r) => (r.id === meta.id ? { ...r, ...patch } : r)) }));
  };
  const deleteIncoming = async (rec) => {
    if (rec.fileKey) { try { await FileStore.del(rec.fileKey); } catch (e) { /* */ } }
    await persist((s) => ({ ...s, incoming: (s.incoming || []).filter((r) => r.id !== rec.id) }));
  };

  // ---- settings ----
  const updateSettings = (partial) => persist((s) => ({ ...s, settings: { ...(s.settings || {}), ...partial } }));
  const exportBackup = async () => {
    const json = await buildBackupBlob(storeRef.current);
    downloadBlob(`fatture-backup-${todayISO()}.json`, json, 'application/json;charset=utf-8');
  };
  const importBackup = async (data) => {
    try {
      const normalized = await restoreBackupPayload(data);
      storeRef.current = normalized;
      setStore(normalized);
      notify('Backup restored successfully.', 'warn');
      setView('dashboard');
    } catch (e) {
      notify(e.message || 'Import failed.', 'error');
    }
  };
  const resetSeed = async () => {
    const keys = collectFileKeys(storeRef.current);
    await purgeFileKeys(keys);
    const seeded = seedStore();
    storeRef.current = seeded;
    setStore(seeded);
    await Store.set(STORE_KEY, seeded);
    setView('dashboard');
  };

  // ---- chrome ----
  const defCo = companyById(store, (store.settings || {}).defaultCompanyId) || (store.companies || [])[0] || null;
  const defCoLogo = defCo && safeImageSrc(defCo.logo);
  const editorMode = !!docEditor || !!companyEditor;

  const navList = (
    <nav className="nav">
      {NAV.map((n) => {
        const Icon = n.icon;
        return (
          <button key={n.id} className={cx('nav-i', view === n.id && 'on')} onClick={() => setView(n.id)}>
            <Icon size={18} /><span>{n.label}</span>
          </button>
        );
      })}
    </nav>
  );
  const brand = (
    <div className="brand">
      <span className="brand-mark"><Receipt size={19} /></span>
      <span className="brand-tt"><span className="brand-name">Invoices</span><span className="brand-sub">Business documents</span></span>
    </div>
  );
  const companySwitch = (
    <button className="company-switch" onClick={() => setSwitchOpen(true)} title="Switch active company">
      <span className="cs-logo">{defCoLogo ? <img src={defCoLogo} alt="" /> : <Building2 size={16} />}</span>
      <span className="cs-text"><span className="cs-label">Active company</span><span className="cs-name">{defCo ? defCo.name : 'No company'}</span></span>
      <ChevronDown size={15} className="cs-caret" />
    </button>
  );

  let editorNode = null;
  if (docEditor) editorNode = <DocumentEditor store={store} editingId={docEditor.id} draftType={docEditor.draftType} onSave={upsertDoc} onCancel={() => setDocEditor(null)} onUpsertClient={upsertClient} onAddClientFile={addClientFile} onDeleteClientFile={deleteClientFile} onUpdateCompany={upsertCompany} onNotify={notify} />;
  else if (companyEditor) editorNode = <CompanyEditor store={store} editingId={companyEditor.id} onSave={upsertCompany} onCancel={() => setCompanyEditor(null)} />;

  let viewNode = null;
  if (view === 'dashboard') viewNode = <Dashboard store={store} onNew={() => setDocEditor({ draftType: 'fattura' })} onView={(d) => setViewerDoc(d)} onGo={() => setView('documenti')} />;
  else if (view === 'documenti') viewNode = <DocumentsList store={store} defaultCompanyId={defaultCompanyId} onNew={() => setDocEditor({ draftType: 'fattura' })} onEdit={(d) => setDocEditor({ id: d.id })} onView={(d) => setViewerDoc(d)} onDuplicate={duplicateDoc} onDelete={deleteDoc} onStatus={setDocStatus} />;
  else if (view === 'aziende') viewNode = <CompaniesView store={store} onNew={() => setCompanyEditor({})} onEdit={(co) => setCompanyEditor({ id: co.id })} onDelete={deleteCompany} onSetDefault={setDefaultCompany} onNotify={notify} />;
  else if (view === 'clienti') viewNode = <ClientsView store={store} onSave={upsertClient} onDelete={deleteClient} onAddFile={addClientFile} onDeleteFile={deleteClientFile} onNotify={notify} />;
  else if (view === 'listino') viewNode = <ProductsView store={store} onSave={upsertProduct} onDelete={deleteProduct} />;
  else if (view === 'ricevute') viewNode = <IncomingView store={store} onAdd={addIncoming} onUpdate={updateIncoming} onDelete={deleteIncoming} onNotify={notify} />;
  else if (view === 'impostazioni') viewNode = <SettingsView store={store} onUpdateSettings={updateSettings} onExport={exportBackup} onImport={importBackup} onReset={resetSeed} onNotify={notify} />;

  return (
    <div className={cx('fg', !editorMode && 'app')}>
      <style>{APP_CSS}</style>

      {editorMode ? editorNode : (
        <>
          {isMobile ? (
            <header className="topbar">
              <button className="hamburger" onClick={() => setDrawerOpen(true)} aria-label="Menu"><span /><span /><span /></button>
              <span className="tb-title">{(NAV.find((n) => n.id === view) || {}).label || 'Invoices'}</span>
              <span className="tb-brand"><Receipt size={17} /></span>
            </header>
          ) : (
            <aside className="sidebar">
              {brand}
              {companySwitch}
              {navList}
              <div className="side-foot">{(store.companies || []).length} companies · {(store.documents || []).length} documents</div>
            </aside>
          )}

          {isMobile && drawerOpen && (
            <>
              <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />
              <aside className="drawer">
                <div className="drawer-head">{brand}<IconBtn icon={X} title="Close" onClick={() => setDrawerOpen(false)} /></div>
                {companySwitch}
                {navList}
              </aside>
            </>
          )}

          <main className="main"><div className="main-inner"><AppNotice notice={notice} onDismiss={() => setNotice(null)} />{viewNode}</div></main>
        </>
      )}

      <DocumentViewer open={!!viewerDoc} doc={viewerDoc} store={store} onClose={() => setViewerDoc(null)} onEdit={(d) => { setViewerDoc(null); setDocEditor({ id: d.id }); }} />

      <Modal open={switchOpen} onClose={() => setSwitchOpen(false)} title="Active company">
        <p className="hint-block">The active company is used as the default issuer for new documents and filters the document list.</p>
        <div className="picklist">
          {(store.companies || []).map((co) => {
            const on = (store.settings || {}).defaultCompanyId === co.id;
            return (
              <button key={co.id} className={cx('pickrow', on && 'on')} onClick={() => { setDefaultCompany(co.id); setSwitchOpen(false); setView('documenti'); }}>
                <span className="pr-desc">{co.name}</span>
                <span className="pr-meta mono">{[co.city, co.regime].filter(Boolean).join(' · ')}{on ? ' · active' : ''}</span>
              </button>
            );
          })}
          {(store.companies || []).length === 0 && <div className="dim">No companies. Add one in the Companies section.</div>}
        </div>
      </Modal>
    </div>
  );
}
