/* TRACE — AI-powered fraud incident evidence organizer (hackathon prototype)
 * Static SPA, no backend, no build step. Plain browser script (file:// compatible).
 * Runs AFTER js/data.js which sets window.TRACE_DATA.
 * This file contains ALL application logic: state, router, redaction, views.
 */
(function () {
'use strict';

/* If the data contract is missing we fail loudly but gracefully. */
if (!window.TRACE_DATA) {
  document.addEventListener('DOMContentLoaded', function () {
    var app = document.getElementById('app');
    if (app) app.innerHTML = '<div class="empty-state" style="padding:80px 24px;text-align:center">'
      + '<h2>EVIDENCE DATA NOT LOADED</h2>'
      + '<p>js/data.js must load before js/app.js and set <span class="mono">window.TRACE_DATA</span>.</p></div>';
  });
  return;
}
var TD = window.TRACE_DATA;

/* ============================== UTILITIES ============================== */

function $(sel, root) { return (root || document).querySelector(sel); }
function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '&gt;': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtINR(n) {
  if (n == null || n === '' || isNaN(Number(n))) return '—';
  return '₹' + Number(n).toLocaleString('en-IN');
}

/* Timestamps are ISO with +05:30 offset; format the literal local wall-clock. */
function fmtTime(iso) {
  if (!iso) return '—';
  var m = /T(\d{2}):(\d{2})/.exec(String(iso));
  if (!m) return '—';
  var h = parseInt(m[1], 10), ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return h + ':' + m[2] + ' ' + ap;
}
function fmtDate(iso) {
  if (!iso) return '—';
  var m = /(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  if (!m) return '—';
  return parseInt(m[3], 10) + ' ' + MONTHS[parseInt(m[2], 10) - 1] + ' ' + m[1];
}
function fmtDateTime(iso) { return fmtDate(iso) + ' · ' + fmtTime(iso); }

/* Current wall-clock as ISO with +05:30 offset (for in-session imports). */
function nowISO() {
  var d = new Date(Date.now() + 19800000); /* +5.5h */
  return d.toISOString().slice(0, 19) + '+05:30';
}

function confPct(c) {
  if (c == null) return '—';
  var v = Number(c);
  if (isNaN(v)) return '—';
  return Math.round(v > 1 ? v : v * 100) + '%';
}

/* ============================== SESSION STATE ============================== */

var S = {
  authed: (function () { try { return sessionStorage.getItem('trace_auth') === '1'; } catch (e) { return false; } })(),
  evidence: structuredClone(TD.evidence),
  schema: structuredClone(TD.schemaMappings),
  privacy: { phones: true, emails: true, txnIds: true, upi: true, accounts: true, urls: true },
  notes: {},          /* evId -> [{text, ts}] */
  flagged: {},        /* evId -> true */
  reviewed: {},       /* evId -> true */
  dupRes: {},         /* DG id -> 'confirmed' | 'kept-both' */
  missRes: {},        /* MS id -> 'resolved' */
  confRes: {},        /* CF id -> 'reviewed' | 'escalated' | 'dismissed' */
  filter: { type: 'all', sort: 'chrono', q: '', tlStatus: 'all' },
  drawerId: null,
  caseName: TD.caseFile.name,
  chat: [],           /* assistant transcript */
  otpSent: false,
  impKind: 'note',    /* import form selector */
  schemaEdit: -1,     /* schema row being edited */
  missEdit: null,     /* MS id with inline add-info form open */
  tlExpanded: null,   /* timeline expanded event */
  caseRename: false
};

/* Async seam for a future backend — currently served from session state. */
var API = {
  listEvidence: async function () { return S.evidence; },
  getEvidence: async function (id) { return S.evidence.find(function (e) { return e.id === id; }) || null; },
  listContradictions: async function () { return TD.contradictions || []; },
  listDuplicates: async function () { return TD.duplicates || []; },
  listMissing: async function () { return TD.missing || []; },
  listAssumptions: async function () { return TD.assumptions || []; },
  listUnresolved: async function () { return TD.unresolved || []; },
  listSchema: async function () { return S.schema; },
  getMetrics: async function () { return computeMetrics(); }
};

function getEv(id) { return S.evidence.find(function (e) { return e.id === id; }) || null; }

var _evCounter = 0;
function nextEvId() {
  if (!_evCounter) {
    _evCounter = S.evidence.reduce(function (mx, e) {
      var m = /EV-(\d+)/.exec(e.id || '');
      return Math.max(mx, m ? parseInt(m[1], 10) : 0);
    }, 0);
  }
  _evCounter++;
  return 'EV-' + String(_evCounter).padStart(3, '0');
}

function makeEvidence(o) {
  return Object.assign({
    id: nextEvId(), fileName: '', kind: 'note', label: 'Untitled record',
    timestamp: nowISO(), source: 'Manual import', eventType: 'Manual entry',
    description: '', phone: '', email: '', url: '', transactionId: '',
    amount: null, currency: 'INR',
    entities: { phones: [], urls: [], amounts: [], txnIds: [], emails: [] },
    relatedIds: [], confidence: 60, status: 'needs-review',
    duplicateGroup: null, conflictIds: [], missingFields: [], notes: ''
  }, o || {});
}

/* ============================== REDACTION ENGINE ============================== */

var MASK = {
  phones: function (p) {
    var d = String(p).replace(/\D/g, '');
    if (!d) return '';
    var sub = d.slice(-10);
    var cc = d.length > 10 ? '+' + d.slice(0, -10) + ' ' : '';
    return cc + sub.slice(0, 2) + 'XXXXXX' + sub.slice(-2);
  },
  emails: function (e) {
    var s = String(e), at = s.indexOf('@');
    if (at < 0) return '••••';
    return s.slice(0, 2) + '••••' + s.slice(at);
  },
  txnIds: function (t) {
    var s = String(t);
    var digits = s.replace(/\D/g, '');
    var last4 = (digits || s).slice(-4);
    return 'TXN-••••-' + last4;
  },
  upi: function (u) { return String(u).slice(0, 2) + '••••@upi'; },
  accounts: function (a) { return '••••••••' + String(a).replace(/\D/g, '').slice(-4); },
  urls: function (u) {
    var s = String(u).replace(/^https?:\/\//i, '');
    var host = s.split('/')[0];
    var parts = host.split('.');
    if (parts.length < 2) return 'https://' + host.slice(0, 4) + '••••';
    return 'https://' + parts[0].slice(0, 4) + '••••.' + parts[parts.length - 1];
  }
};

/* R(val, type) — applies the mask only when the matching privacy toggle is ON. */
function R(val, type) {
  if (val == null || val === '') return '';
  return S.privacy[type] ? MASK[type](String(val)) : String(val);
}

/* scrubText(s) — masks PII patterns inside free text (labels, descriptions, notes),
   respecting the same privacy toggles as R(). Use anywhere identifiers may leak. */
function scrubText(s) {
  if (s == null) return '';
  var out = String(s);
  if (S.privacy.urls) out = out.replace(/https?:\/\/[^\s"'<>]+/gi, function (m) { return MASK.urls(m); });
  if (S.privacy.emails) out = out.replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, function (m) { return MASK.emails(m); });
  if (S.privacy.txnIds) out = out.replace(/\bTXN-[A-Za-z0-9-]+\b/g, function (m) { return MASK.txnIds(m); });
  if (S.privacy.upi) out = out.replace(/[\w.+-]{2,}@(?:novapay|quicksettle|upi)\b/gi, function (m) { return MASK.upi(m); });
  if (S.privacy.phones) out = out.replace(/\b(\+91[\s-]?)?([6-9]\d{4})[\s-]?(\d{5})\b/g, function (m, cc, a, b) {
    return (cc ? '+91 ' : '') + a.slice(0, 2) + 'XXXXXX' + b.slice(-2);
  });
  if (S.privacy.accounts) out = out.replace(/\b\d{11,18}\b/g, function (m) { return MASK.accounts(m); });
  return out;
}

/* ============================== METRICS ============================== */

function computeMetrics() {
  var ev = S.evidence;
  var txns = ev.filter(function (e) { return e.kind === 'transaction'; });
  var phones = {};
  ev.forEach(function (e) {
    if (e.phone) phones[e.phone] = 1;
    ((e.entities && e.entities.phones) || []).forEach(function (p) { if (p) phones[p] = 1; });
  });
  var ts = ev.map(function (e) { return e.timestamp ? new Date(e.timestamp).getTime() : NaN; })
             .filter(function (t) { return !isNaN(t); });
  var span = '—';
  if (ts.length > 1) {
    var diff = Math.max.apply(null, ts) - Math.min.apply(null, ts);
    var h = Math.floor(diff / 3600000), m = Math.round((diff % 3600000) / 60000);
    span = (h ? h + 'h ' : '') + m + 'm';
  } else if (ts.length === 1) { span = '0m'; }
  return {
    total: ev.length,
    events: ev.filter(function (e) { return !!e.timestamp; }).length,
    txnCount: txns.length,
    totalAmount: txns.reduce(function (a, e) { return a + (Number(e.amount) || 0); }, 0),
    contacts: Object.keys(phones).length,
    flagged: ev.filter(function (e) { return e.status === 'needs-review' || e.status === 'conflict'; }).length,
    dupCount: ev.filter(function (e) { return !!e.duplicateGroup; }).length,
    incomplete: ev.filter(function (e) { return (e.missingFields || []).length > 0; }).length,
    conflicts: (TD.contradictions || []).length,
    timeSpan: span
  };
}

function conflictIdSet() {
  var set = {};
  (TD.contradictions || []).forEach(function (c) { set[c.evidenceA] = 1; set[c.evidenceB] = 1; });
  S.evidence.forEach(function (e) { if (e.status === 'conflict') set[e.id] = 1; });
  return set;
}

/* ============================== SHARED SNIPPETS ============================== */

var KIND_ICON = { message: '💬', screenshot: '📸', transaction: '💳', url: '🔗', document: '📄', image: '🖼️', calllog: '📞', email: '✉️', note: '📝' };
var KIND_LABEL = { message: 'Message', screenshot: 'Screenshot', transaction: 'Transaction', url: 'URL', document: 'Document', image: 'Image', calllog: 'Call Log', email: 'Email', note: 'Note' };
var KIND_COLOR = { message: '#22D3EE', screenshot: '#FBBF24', transaction: '#34D399', url: '#8B5CF6', document: '#94A3B8', image: '#F472B6', calllog: '#60A5FA', email: '#A3E635', note: '#9CA3AF' };

function kindIcon(kind) { return KIND_ICON[kind] || '📁'; }
function kindLabel(kind) { return KIND_LABEL[kind] || kind; }

function statusBadge(ev) {
  if (S.reviewed[ev.id]) return '<span class="badge b-verified">VERIFIED</span>';
  if (S.flagged[ev.id]) return '<span class="badge b-flag">FLAGGED · REVIEW</span>';
  var map = {
    'verified': ['b-verified', 'VERIFIED'],
    'needs-review': ['b-review', 'REQUIRES REVIEW'],
    'incomplete': ['b-incomplete', 'INCOMPLETE RECORD'],
    'conflict': ['b-conflict', 'POTENTIAL CONFLICT']
  };
  var m = map[ev.status] || ['b-review', String(ev.status || 'UNKNOWN').toUpperCase()];
  return '<span class="badge ' + m[0] + '">' + m[1] + '</span>';
}

function confBar(c) {
  var v = c == null ? 0 : Number(c);
  if (isNaN(v)) v = 0;
  var pct = v > 1 ? v : v * 100;
  return '<div class="tr-bar" role="img" aria-label="Confidence ' + Math.round(pct) + ' percent">'
    + '<div class="tr-bar-fill" style="width:' + Math.max(0, Math.min(100, pct)) + '%"></div></div>'
    + '<span class="mono dim">' + confPct(c) + '</span>';
}

/* Clickable evidence-ID chip (opens the drawer). */
function evChip(id) {
  var e = getEv(id);
  var label = e ? e.id : id;
  return '<button type="button" class="ev-chip mono" data-action="open-drawer" data-id="' + esc(id) + '" aria-label="Open evidence ' + esc(label) + '">' + esc(label) + '</button>';
}

/* ============================== TOAST ============================== */

function toast(msg, type) {
  var root = document.getElementById('toast-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'toast-root';
    root.className = 'tr-toasts';
    root.setAttribute('aria-live', 'polite');
    document.body.appendChild(root);
  }
  var t = document.createElement('div');
  t.className = 'tr-toast ' + (type || 'info');
  t.setAttribute('role', 'status');
  t.textContent = msg;
  root.appendChild(t);
  setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 350); }, 3200);
}

/* ============================== ESSENTIAL CSS (unlisted components) ============================== */
/* Only structural styles for components the spec does not name; all visual
   theming comes from styles.css. Prefixed tr- to avoid collisions. */
(function injectCSS() {
  var css = ''
    + '.tr-toasts{position:fixed;bottom:84px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:min(360px,90vw)}'
    + '.tr-toast{background:#141B26;border:1px solid #22D3EE;color:#E5E7EB;padding:12px 16px;border-radius:10px;font-size:13px;box-shadow:0 8px 30px rgba(0,0,0,.5);transition:opacity .3s,transform .3s}'
    + '.tr-toast.warn{border-color:#FBBF24}.tr-toast.err{border-color:#F87171}.tr-toast.ok{border-color:#34D399}'
    + '.tr-toast.out{opacity:0;transform:translateY(8px)}'
    + '.tr-drawer-overlay{position:fixed;inset:0;background:rgba(3,5,8,.72);z-index:9000;backdrop-filter:blur(2px)}'
    + '.tr-drawer{position:fixed;top:0;right:0;bottom:0;width:min(480px,94vw);background:#0C1118;border-left:1px solid #1E293B;z-index:9001;display:flex;flex-direction:column;box-shadow:-20px 0 60px rgba(0,0,0,.5);animation:trSlideIn .22s ease-out}'
    + '@keyframes trSlideIn{from{transform:translateX(40px);opacity:0}to{transform:none;opacity:1}}'
    + '.tr-drawer-head{display:flex;align-items:flex-start;gap:12px;padding:18px 20px;border-bottom:1px solid #1E293B}'
    + '.tr-drawer-body{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:16px}'
    + '.tr-drawer-foot{display:flex;flex-wrap:wrap;gap:8px;padding:14px 20px;border-top:1px solid #1E293B}'
    + '.tr-sec{font-size:11px;letter-spacing:.12em;color:#8B5CF6;font-weight:700;margin-bottom:6px}'
    + '.tr-kv{display:grid;grid-template-columns:110px 1fr;gap:6px 12px;font-size:13px}'
    + '.tr-kv dt{color:#9CA3AF}.tr-kv dd{margin:0;color:#E5E7EB;word-break:break-word}'
    + '.tr-bar{height:6px;background:#1E293B;border-radius:99px;overflow:hidden;min-width:80px;display:inline-block;vertical-align:middle}'
    + '.tr-bar-fill{height:100%;background:linear-gradient(90deg,#22D3EE,#8B5CF6);border-radius:99px}'
    + '.ev-chip{background:#141B26;border:1px solid #8B5CF6;color:#C4B5FD;border-radius:6px;padding:2px 8px;font-size:12px;cursor:pointer;margin:2px}'
    + '.ev-chip:hover{background:#1E1B2E;border-color:#A78BFA}'
    + '.ent-chip{display:inline-block;background:#101722;border:1px solid #334155;color:#CBD5E1;border-radius:99px;padding:3px 10px;font-size:12px;margin:2px}'
    + '.tr-dropdown{position:absolute;top:calc(100% + 6px);left:0;right:0;background:#0C1118;border:1px solid #334155;border-radius:12px;z-index:8000;max-height:340px;overflow-y:auto;box-shadow:0 18px 50px rgba(0,0,0,.55)}'
    + '.tr-sr{display:flex;gap:10px;align-items:center;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid #141B26;color:#E5E7EB;padding:10px 14px;cursor:pointer;font-size:13px}'
    + '.tr-sr:hover{background:#141B26}.tr-sr small{color:#9CA3AF;display:block}'
    + '.mono{font-family:"JetBrains Mono",ui-monospace,monospace}.dim{color:#9CA3AF}'
    + '.btn{display:inline-flex;align-items:center;gap:8px;border-radius:10px;padding:10px 18px;font-weight:600;font-size:14px;cursor:pointer;border:1px solid transparent;text-decoration:none}'
    + '.btn-primary{background:linear-gradient(135deg,#22D3EE,#8B5CF6);color:#07090D;border:0}'
    + '.btn-ghost{background:transparent;border-color:#334155;color:#E5E7EB}'
    + '.btn-danger-ghost{background:transparent;border-color:#7F1D1D;color:#FCA5A5}'
    + '.btn-sm{padding:6px 12px;font-size:12px;border-radius:8px}'
    + '.field{width:100%;background:#0C1118;border:1px solid #334155;color:#E5E7EB;border-radius:10px;padding:10px 12px;font-size:14px}'
    + '.field:focus{outline:2px solid #22D3EE;border-color:#22D3EE}'
    + 'label.lbl{display:block;font-size:12px;color:#9CA3AF;margin:0 0 6px;letter-spacing:.04em}'
    + '.shake{animation:trShake .4s}'
    + '@keyframes trShake{0%,100%{transform:none}25%{transform:translateX(-6px)}50%{transform:translateX(6px)}75%{transform:translateX(-4px)}}'
    + '.obs-label,.inf-label{display:inline-block;font-size:10px;font-weight:800;letter-spacing:.1em;border-radius:6px;padding:3px 8px}'
    + '.obs-label{background:rgba(52,211,153,.14);color:#34D399;border:1px solid rgba(52,211,153,.4)}'
    + '.inf-label{background:rgba(139,92,246,.14);color:#A78BFA;border:1px solid rgba(139,92,246,.4)}'
    + '.otp-row{display:flex;gap:10px;justify-content:center;margin:18px 0}'
    + '.otp-box{width:46px;height:54px;text-align:center;font-size:22px;background:#0C1118;border:1px solid #334155;color:#E5E7EB;border-radius:10px;font-family:"JetBrains Mono",monospace}'
    + '.otp-box:focus{outline:2px solid #8B5CF6;border-color:#8B5CF6}';
  var st = document.createElement('style');
  st.id = 'trace-essential-css';
  st.textContent = css;
  document.head.appendChild(st);
})();

/* ============================== DRAWER (global) ============================== */

var _lastFocus = null;

function openDrawer(id) {
  _lastFocus = document.activeElement;
  S.drawerId = id;
  renderDrawer();
  document.addEventListener('keydown', drawerKey);
}
function closeDrawer() {
  S.drawerId = null;
  var r = document.getElementById('drawer-root');
  if (r) r.innerHTML = '';
  document.removeEventListener('keydown', drawerKey);
  if (_lastFocus && _lastFocus.focus) { try { _lastFocus.focus(); } catch (e) {} }
  _lastFocus = null;
}
function drawerKey(e) { if (e.key === 'Escape') closeDrawer(); }

function entityChips(ev) {
  var out = [];
  var ent = ev.entities || {};
  (ent.phones || []).forEach(function (p) { out.push('<span class="ent-chip" title="Phone">📞 ' + esc(R(p, 'phones')) + '</span>'); });
  (ent.emails || []).forEach(function (e) { out.push('<span class="ent-chip" title="Email">✉️ ' + esc(R(e, 'emails')) + '</span>'); });
  (ent.txnIds || []).forEach(function (t) { out.push('<span class="ent-chip" title="Transaction ID">🏦 ' + esc(R(t, 'txnIds')) + '</span>'); });
  (ent.urls || []).forEach(function (u) { out.push('<span class="ent-chip" title="URL">🔗 ' + esc(R(u, 'urls')) + '</span>'); });
  (ent.amounts || []).forEach(function (a) { out.push('<span class="ent-chip" title="Amount">💰 ' + esc(fmtINR(a)) + '</span>'); });
  return out.length ? out.join('') : '<span class="dim">No extracted entities.</span>';
}

function keyFieldsHTML(ev) {
  var rows = [];
  if (ev.amount != null) rows.push(['AMOUNT', fmtINR(ev.amount) + ' ' + esc(ev.currency || 'INR')]);
  if (ev.transactionId) rows.push(['TRANSACTION ID', '<span class="mono">' + esc(R(ev.transactionId, 'txnIds')) + '</span>']);
  if (ev.phone) rows.push(['PHONE', '<span class="mono">' + esc(R(ev.phone, 'phones')) + '</span>']);
  if (ev.email) rows.push(['EMAIL', '<span class="mono">' + esc(R(ev.email, 'emails')) + '</span>']);
  if (ev.url) rows.push(['URL', '<span class="mono">' + esc(R(ev.url, 'urls')) + '</span>']);
  if (!rows.length) return '<span class="dim">No key identifiers on this record.</span>';
  return '<dl class="tr-kv">' + rows.map(function (r) {
    return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>';
  }).join('') + '</dl>';
}

function renderDrawer() {
  var root = document.getElementById('drawer-root');
  if (!root) return;
  var ev = S.drawerId ? getEv(S.drawerId) : null;
  if (!ev) { root.innerHTML = ''; return; }

  var notes = S.notes[ev.id] || [];
  var others = S.evidence.filter(function (e) { return e.id !== ev.id; });
  var linkOpts = others.map(function (e) {
    return '<option value="' + esc(e.id) + '">' + esc(e.id) + ' — ' + esc(e.label).slice(0, 40) + '</option>';
  }).join('');

  var conflicts = (TD.contradictions || []).filter(function (c) { return c.evidenceA === ev.id || c.evidenceB === ev.id; });
  var dup = (TD.duplicates || []).find(function (d) { return (d.evidenceIds || []).indexOf(ev.id) >= 0; });

  var html = ''
    + '<div class="tr-drawer-overlay" data-action="close-drawer" aria-hidden="true"></div>'
    + '<aside class="tr-drawer" role="dialog" aria-modal="true" aria-label="Evidence detail ' + esc(ev.id) + '">'
    + '<div class="tr-drawer-head">'
    +   '<div style="font-size:30px" aria-hidden="true">' + kindIcon(ev.kind) + '</div>'
    +   '<div style="flex:1;min-width:0">'
    +     '<div class="mono" style="color:#22D3EE;font-size:13px">' + esc(ev.id) + '</div>'
    +     '<div style="font-weight:600;margin:2px 0">' + esc(ev.fileName || ev.label) + '</div>'
    +     '<div>' + statusBadge(ev) + ' <span class="dim" style="font-size:12px">' + esc(kindLabel(ev.kind)) + '</span></div>'
    +   '</div>'
    +   '<button type="button" class="btn btn-ghost btn-sm" data-action="close-drawer" aria-label="Close evidence drawer">✕</button>'
    + '</div>'
    + '<div class="tr-drawer-body">'
    +   '<div><div class="tr-sec">RECORD</div>'
    +   '<dl class="tr-kv">'
    +   '<dt>TIMESTAMP</dt><dd class="mono">' + esc(ev.timestamp ? fmtDateTime(ev.timestamp) : 'Not identified') + '</dd>'
    +   '<dt>SOURCE</dt><dd>' + esc(scrubText(ev.source || '—')) + '</dd>'
    +   '<dt>EVENT TYPE</dt><dd>' + esc(ev.eventType || '—') + '</dd>'
    +   '<dt>CONFIDENCE</dt><dd>' + confBar(ev.confidence) + '</dd>'
    +   '</dl></div>'
    +   (ev.description ? '<div><div class="tr-sec">DESCRIPTION</div><p style="font-size:13px;color:#D1D5DB;margin:0">' + esc(scrubText(ev.description)) + '</p></div>' : '')
    +   '<div><div class="tr-sec">EXTRACTED ENTITIES</div><div>' + entityChips(ev) + '</div></div>'
    +   '<div><div class="tr-sec">KEY FIELDS</div>' + keyFieldsHTML(ev) + '</div>'
    +   '<div><div class="tr-sec">RELATED EVIDENCE</div><div>'
    +     ((ev.relatedIds || []).length ? ev.relatedIds.map(evChip).join('') : '<span class="dim">No linked records yet.</span>')
    +   '</div></div>'
    +   (conflicts.length
        ? '<div><div class="tr-sec" style="color:#F87171">POTENTIAL INCONSISTENCIES</div>'
          + conflicts.map(function (c) {
              return '<div style="font-size:13px;margin-bottom:6px">⚠️ <span class="mono">' + esc(c.id) + '</span> — ' + esc(c.title)
                + ' <a href="#/flags" style="color:#22D3EE">View in Flags →</a></div>';
            }).join('') + '</div>'
        : '')
    +   (dup ? '<div><div class="tr-sec" style="color:#FBBF24">POSSIBLE DUPLICATE</div><div style="font-size:13px">Grouped in <span class="mono">' + esc(dup.id) + '</span> (' + esc(String(dup.similarity)) + '% similarity). <a href="#/duplicates" style="color:#22D3EE">Review →</a></div></div>' : '')
    +   ((ev.missingFields || []).length
        ? '<div><div class="tr-sec" style="color:#FBBF24">MISSING FIELDS</div><div style="font-size:13px">' + ev.missingFields.map(function (f) { return '<span class="ent-chip">◌ ' + esc(f) + '</span>'; }).join('') + '</div></div>'
        : '')
    +   '<div><div class="tr-sec">PRIVACY STATUS</div><div style="font-size:13px;color:#D1D5DB">🔒 Identifiers masked per Privacy settings · <strong>PRIVATE CASE</strong></div></div>'
    +   '<div><div class="tr-sec">INVESTIGATOR NOTES</div>'
    +     '<div id="drawer-notes">' + (notes.length ? notes.map(function (n) {
          return '<div style="background:#101722;border:1px solid #1E293B;border-radius:8px;padding:8px 10px;margin-bottom:6px;font-size:13px">' + esc(scrubText(n.text)) + '<div class="dim" style="font-size:11px;margin-top:4px">' + esc(n.ts) + '</div></div>';
        }).join('') : '<div class="dim" style="font-size:13px">No notes yet.</div>') + '</div>'
    +     '<form data-form="drawer-note" data-id="' + esc(ev.id) + '" style="display:flex;gap:8px;margin-top:8px">'
    +       '<input id="drawer-note-input" class="field" name="note" placeholder="Add an investigator note…" aria-label="Add an investigator note" maxlength="500">'
    +       '<button type="submit" class="btn btn-ghost btn-sm">ADD</button>'
    +     '</form></div>'
    +   '<div id="link-row" hidden><div class="tr-sec">LINK EVIDENCE</div>'
    +     '<div style="display:flex;gap:8px"><select id="link-select" class="field" aria-label="Select evidence to link">' + linkOpts + '</select>'
    +     '<button type="button" class="btn btn-primary btn-sm" data-action="link-confirm" data-id="' + esc(ev.id) + '">LINK</button></div></div>'
    + '</div>'
    + '<div class="tr-drawer-foot">'
    +   '<button type="button" class="btn btn-ghost btn-sm" data-action="view-original">VIEW ORIGINAL</button>'
    +   '<button type="button" class="btn btn-ghost btn-sm" data-action="link-ev">LINK EVIDENCE</button>'
    +   '<button type="button" class="btn btn-ghost btn-sm" data-action="flag-toggle" data-id="' + esc(ev.id) + '">' + (S.flagged[ev.id] ? 'UNFLAG' : 'FLAG') + '</button>'
    +   '<button type="button" class="btn btn-ghost btn-sm" data-action="focus-note">ADD NOTE</button>'
    +   '<button type="button" class="btn btn-primary btn-sm" data-action="mark-reviewed" data-id="' + esc(ev.id) + '">MARK REVIEWED</button>'
    + '</div>'
    + '</aside>';

  root.innerHTML = html;
  var panel = root.querySelector('.tr-drawer');
  if (panel) { panel.setAttribute('tabindex', '-1'); try { panel.focus({ preventScroll: true }); } catch (e) {} }
}

/* ---- Traceability drawer: "where did this number come from?" ---- */

function evLine(e, detail) {
  return '<div style="display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid #141B26">'
    + '<span style="font-size:20px" aria-hidden="true">' + kindIcon(e.kind) + '</span>'
    + '<div style="flex:1;min-width:0"><div>' + evChip(e.id) + ' <span class="dim" style="font-size:12px">' + esc(e.fileName || '') + '</span></div>'
    + '<div style="font-size:13px;margin-top:2px">' + esc(e.label) + '</div>'
    + '<div class="dim mono" style="font-size:11px;margin-top:2px">SOURCE: ' + esc(scrubText(e.source || '—')) + (e.timestamp ? ' · ' + esc(fmtDateTime(e.timestamp)) : '') + '</div>'
    + (detail ? '<div style="font-size:12px;color:#A78BFA;margin-top:4px">' + detail + '</div>' : '')
    + '</div></div>';
}

function openTrace(key) {
  var m = computeMetrics();
  var title = '', sub = '', body = '';
  var ev = S.evidence;

  function rowsFor(list, detailFn) {
    return list.map(function (e) { return evLine(e, detailFn ? detailFn(e) : ''); }).join('')
      || '<div class="empty-state"><p>No records in this group.</p></div>';
  }

  if (key === 'total') {
    title = 'TOTAL EVIDENCE'; sub = m.total + ' records in the case file. Every record below is a source that feeds this metric.';
    body = rowsFor(ev);
  } else if (key === 'events') {
    title = 'TIMESTAMPED EVENTS'; sub = m.events + ' records carry a usable timestamp and appear on the timeline.';
    body = rowsFor(ev.filter(function (e) { return !!e.timestamp; }), function (e) { return 'TIMESTAMP <span class="mono">' + esc(fmtDateTime(e.timestamp)) + '</span>'; });
  } else if (key === 'transactions' || key === 'amount') {
    title = key === 'amount' ? 'TOTAL AMOUNT' : 'TRANSACTIONS';
    sub = m.txnCount + ' transaction records totalling ' + fmtINR(m.totalAmount) + '. Original and normalized values shown per record.';
    body = ev.filter(function (e) { return e.kind === 'transaction'; }).map(function (e) {
      return evLine(e, 'SOURCE RECORD <span class="mono">' + esc(e.fileName || '—') + '</span> · EVIDENCE ID <span class="mono">' + esc(e.id) + '</span><br>'
        + 'ORIGINAL VALUE <strong>' + esc(fmtINR(e.amount)) + '</strong> · NORMALIZED VALUE <strong>' + esc(fmtINR(e.amount)) + '</strong> ' + esc(e.currency || 'INR')
        + (e.transactionId ? ' · TXN <span class="mono">' + esc(R(e.transactionId, 'txnIds')) + '</span>' : ''));
    }).join('') || '<div class="empty-state"><p>No transaction records.</p></div>';
  } else if (key === 'contacts') {
    title = 'CONTACTS'; sub = m.contacts + ' unique phone identifiers referenced across the evidence.';
    var map = {};
    ev.forEach(function (e) {
      var ps = [];
      if (e.phone) ps.push(e.phone);
      ((e.entities && e.entities.phones) || []).forEach(function (p) { if (p) ps.push(p); });
      ps.forEach(function (p) { (map[p] = map[p] || []).push(e); });
    });
    body = Object.keys(map).map(function (p) {
      return '<div style="padding:10px 0;border-bottom:1px solid #141B26"><div class="mono" style="color:#22D3EE">' + esc(R(p, 'phones')) + '</div>'
        + '<div style="margin-top:4px">' + map[p].map(function (e) { return evChip(e.id); }).join('') + '</div></div>';
    }).join('') || '<div class="empty-state"><p>No contacts referenced.</p></div>';
  } else if (key === 'flagged') {
    title = 'FLAGGED RECORDS'; sub = m.flagged + ' records currently require investigator review.';
    body = rowsFor(ev.filter(function (e) { return e.status === 'needs-review' || e.status === 'conflict'; }), function (e) { return 'STATUS ' + (e.status === 'conflict' ? 'POTENTIAL CONFLICT' : 'REQUIRES REVIEW'); });
  } else if (key === 'duplicates') {
    title = 'DUPLICATE RECORDS'; sub = m.dupCount + ' records sit in possible-duplicate groups. Originals are always preserved.';
    body = rowsFor(ev.filter(function (e) { return !!e.duplicateGroup; }), function (e) { return 'GROUP <span class="mono">' + esc(e.duplicateGroup) + '</span>'; });
  } else if (key === 'incomplete') {
    title = 'INCOMPLETE RECORDS'; sub = m.incomplete + ' records are missing expected fields.';
    body = rowsFor(ev.filter(function (e) { return (e.missingFields || []).length; }), function (e) { return 'MISSING ' + esc(e.missingFields.join(', ')); });
  } else if (key === 'conflicts') {
    title = 'CONTRADICTIONS'; sub = m.conflicts + ' potential inconsistencies detected. Each requires investigator review — the system does not decide which side is correct.';
    body = (TD.contradictions || []).map(function (c) {
      return '<div style="padding:10px 0;border-bottom:1px solid #141B26"><div class="mono" style="color:#F87171">' + esc(c.id) + '</div>'
        + '<div style="font-size:13px;margin:4px 0">' + esc(c.title) + '</div>'
        + '<div>' + evChip(c.evidenceA) + ' <span class="dim">vs</span> ' + evChip(c.evidenceB) + ' <a href="#/flags" style="color:#22D3EE;font-size:12px">Open in Flags →</a></div></div>';
    }).join('') || '<div class="empty-state"><p>No contradictions.</p></div>';
  } else if (key === 'timespan') {
    title = 'TIME SPAN'; sub = 'Incident window covered by timestamped evidence: ' + esc(m.timeSpan) + '.';
    var withTs = ev.filter(function (e) { return !!e.timestamp; }).sort(function (a, b) { return new Date(a.timestamp) - new Date(b.timestamp); });
    body = withTs.length ? evLine(withTs[0], 'EARLIEST RECORD') + evLine(withTs[withTs.length - 1], 'LATEST RECORD') : '<div class="empty-state"><p>No timestamped records.</p></div>';
  } else {
    title = 'METRIC'; sub = ''; body = '<div class="empty-state"><p>Unknown metric.</p></div>';
  }

  var root = document.getElementById('drawer-root');
  _lastFocus = document.activeElement;
  S.drawerId = '__trace__';
  root.innerHTML = ''
    + '<div class="tr-drawer-overlay" data-action="close-drawer" aria-hidden="true"></div>'
    + '<aside class="tr-drawer" role="dialog" aria-modal="true" aria-label="Metric traceability">'
    + '<div class="tr-drawer-head"><div style="flex:1"><div class="tr-sec">METRIC TRACEABILITY</div>'
    + '<div style="font-weight:700;font-size:16px">' + esc(title) + '</div>'
    + '<div class="dim" style="font-size:13px;margin-top:4px">' + esc(sub) + '</div></div>'
    + '<button type="button" class="btn btn-ghost btn-sm" data-action="close-drawer" aria-label="Close traceability panel">✕</button></div>'
    + '<div class="tr-drawer-body">' + body + '</div>'
    + '</aside>';
  document.addEventListener('keydown', drawerKey);
}

/* ============================== ROUTER + CHROME ============================== */

var NAV = [
  ['/overview', 'Overview', '▦', 'Overview'],
  ['/import', 'Import Evidence', '⤒', 'Import'],
  ['/evidence', 'Evidence', '🗂', 'Evidence'],
  ['/schema', 'Schema Mapping', '⇄', 'Schema'],
  ['/timeline', 'Timeline', '◷', 'Timeline'],
  ['/graph', 'Evidence Graph', '✦', 'Graph'],
  ['/flags', 'Flags', '⚑', 'Flags'],
  ['/missing', 'Missing Data', '◌', 'Missing'],
  ['/privacy', 'Privacy', '🔒', 'Privacy'],
  ['/assumptions', 'Assumptions', '💭', 'Assumptions'],
  ['/assistant', 'Ask Trace', '✉', 'Ask'],
  ['/report', 'Report', '📄', 'Report']
];

function currentRoute() {
  var h = (location.hash || '#/').replace(/^#/, '');
  return h || '/';
}

function logoSVG() {
  return '<svg width="30" height="30" viewBox="0 0 28 28" aria-hidden="true">'
    + '<circle cx="14" cy="14" r="12" fill="none" stroke="#22D3EE" stroke-width="2"/>'
    + '<circle cx="14" cy="14" r="4" fill="#8B5CF6"/>'
    + '<circle cx="14" cy="5.5" r="2" fill="#22D3EE"/>'
    + '<line x1="14" y1="7.5" x2="14" y2="10" stroke="#22D3EE" stroke-width="1.5"/></svg>';
}

function chrome(viewHTML, active) {
  var cf = TD.caseFile;
  var nav = NAV.map(function (n) {
    return '<li><a href="#' + n[0] + '" class="nav-link' + (active === n[0] ? ' active' : '') + '" aria-label="' + esc(n[1]) + '"'
      + (active === n[0] ? ' aria-current="page"' : '') + '>'
      + '<span class="nav-ic" aria-hidden="true">' + n[2] + '</span><span>' + esc(n[1]) + '</span></a></li>';
  }).join('');
  var mnav = NAV.map(function (n) {
    return '<a href="#' + n[0] + '" class="mnav-link' + (active === n[0] ? ' active' : '') + '" aria-label="' + esc(n[1]) + '">'
      + '<span class="mnav-ic" aria-hidden="true">' + n[2] + '</span><span>' + esc(n[3]) + '</span></a>';
  }).join('');

  return '<div class="app-shell">'
    + '<aside class="sidebar" aria-label="Primary navigation">'
    + '<div class="brand">' + logoSVG() + '<span>TRACE</span></div>'
    + '<nav aria-label="Case sections"><ul class="nav-list">' + nav + '</ul></nav>'
    + '<div class="case-card"><div class="cc-label">CASE ID</div>'
    + '<div class="cc-id mono">' + esc(cf.id) + '</div>'
    + '<div class="cc-row"><span class="cc-status">UNDER INVESTIGATION</span></div>'
    + '<div class="cc-priv">🔒 PRIVATE</div></div>'
    + '</aside>'
    + '<div class="shell-main">'
    + '<header class="topbar">'
    + '<div class="search-wrap"><input id="global-search" type="search" aria-label="Search evidence across the case file" placeholder="Search evidence…" autocomplete="off">'
    + '<div id="search-results" class="tr-dropdown" hidden></div></div>'
    + '<div class="privacy-pill" title="Private case — identifiers are masked by default">🔒 PRIVATE CASE</div>'
    + '</header>'
    + '<main class="main" id="view">' + viewHTML + '</main>'
    + '</div>'
    + '<nav class="mobile-nav" aria-label="Mobile navigation">' + mnav + '</nav>'
    + '</div>';
}

function bindChrome() {
  var inp = document.getElementById('global-search');
  var box = document.getElementById('search-results');
  if (!inp || !box) return;
  inp.addEventListener('input', function () {
    var q = inp.value.trim();
    if (q.length < 2) { box.hidden = true; return; }
    var res = searchEvidence(q);
    if (!res.length) {
      box.innerHTML = '<div class="tr-sr" style="cursor:default"><div><strong>No matches</strong><small>Try an evidence ID, file name, transaction ID or phone.</small></div></div>';
    } else {
      var html = res.slice(0, 8).map(function (e) {
        return '<button type="button" class="tr-sr" data-action="open-drawer" data-id="' + esc(e.id) + '">'
          + '<span style="font-size:20px" aria-hidden="true">' + kindIcon(e.kind) + '</span>'
          + '<div style="flex:1;min-width:0"><strong class="mono">' + esc(e.id) + '</strong> · ' + esc(e.label).slice(0, 48)
          + '<small>SOURCE FILE ' + esc(e.fileName || '—') + ' · ' + esc(scrubText(e.source || '')) + '</small></div>'
          + '<span class="dim" style="font-size:11px">' + esc(kindLabel(e.kind)).toUpperCase() + '</span></button>';
      }).join('');
      if (res.length > 8) html += '<div class="tr-sr" style="cursor:default"><div><small>AMBIGUOUS MATCH — ' + res.length + ' records match. Showing top 8; press Enter to see all.</small></div></div>';
      box.innerHTML = html;
    }
    box.hidden = false;
  });
  inp.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { S.filter.q = inp.value.trim(); box.hidden = true; location.hash = '#/evidence'; }
    if (e.key === 'Escape') { box.hidden = true; inp.blur(); }
  });
}

function searchEvidence(q) {
  q = String(q || '').toLowerCase();
  if (!q) return [];
  return S.evidence.filter(function (e) {
    var notes = (S.notes[e.id] || []).map(function (n) { return n.text; }).join(' ');
    var hay = [e.id, e.fileName, e.label, e.description, e.transactionId, e.phone, e.email, e.url, e.source, e.eventType, notes].join(' ').toLowerCase();
    return hay.indexOf(q) >= 0;
  });
}

function render(preserveDrawer) {
  if (!preserveDrawer) { S.drawerId = null; var dr = document.getElementById('drawer-root'); if (dr) dr.innerHTML = ''; }
  var app = document.getElementById('app');
  var r = currentRoute();
  var PUBLIC = ['/', '/auth'];

  if (!S.authed && PUBLIC.indexOf(r) < 0) { location.hash = '#/auth'; return; }
  if (!VIEWS[r]) { location.hash = S.authed ? '#/overview' : '#/'; return; }

  var html = VIEWS[r]();
  if (S.authed && PUBLIC.indexOf(r) < 0) {
    app.innerHTML = chrome(html, r);
    bindChrome();
  } else {
    app.innerHTML = html;
  }
  document.title = 'TRACE — ' + (TITLES[r] || 'Incident Evidence');
  if (S.drawerId && S.drawerId !== '__trace__') renderDrawer();
  if (MOUNTS[r]) MOUNTS[r]();
  try { window.scrollTo(0, 0); } catch (e) {}
}

var TITLES = {
  '/': 'From scattered evidence to one traceable incident',
  '/auth': 'Investigator sign in',
  '/case': 'Case file',
  '/import': 'Import evidence',
  '/processing': 'Processing pipeline',
  '/schema': 'Schema mapping',
  '/overview': 'Incident overview',
  '/evidence': 'Evidence vault',
  '/timeline': 'Chronological timeline',
  '/graph': 'Evidence graph',
  '/flags': 'Flags & contradictions',
  '/missing': 'Missing information',
  '/duplicates': 'Possible duplicates',
  '/privacy': 'Privacy & redaction',
  '/assumptions': 'Assumptions & unresolved issues',
  '/assistant': 'Ask TRACE',
  '/report': 'Incident report'
};

window.addEventListener('hashchange', function () { render(false); });

/* ============================== VIEW: LANDING ============================== */

function vLanding() {
  var steps = ['IMPORT', 'PARSE', 'NORMALIZE', 'SCHEMA', 'LINK', 'TIMELINE', 'REPORT'];
  return '<div class="landing">'
    + '<section class="hero">'
    + '<div class="hero-art" aria-hidden="true">'
    + '<svg id="constellation" viewBox="0 0 800 380" width="100%" height="100%" preserveAspectRatio="xMidYMid meet"></svg>'
    + '<div id="morph" hidden><svg id="morph-svg" viewBox="0 0 800 380" width="100%" height="100%"></svg></div>'
    + '<div class="caption" id="hero-caption">Scattered signals…</div>'
    + '</div>'
    + '<h1 class="hero-title">TRACE</h1>'
    + '<p class="tagline">From scattered evidence to one traceable incident.</p>'
    + '<p class="hero-sub">After an incident, evidence is scattered across chats, screenshots, payment alerts, '
    + 'bank records, emails, URLs, phone numbers and call logs. TRACE pulls every fragment into one private, '
    + 'traceable case file — flagging potential inconsistencies without ever judging guilt.</p>'
    + '<div class="hero-cta">'
    + '<a class="btn btn-primary" href="#/auth">START INVESTIGATION</a>'
    + '<button type="button" class="btn btn-ghost" data-action="demo">EXPLORE DEMO</button>'
    + '</div>'
    + '</section>'
    + '<section class="feature-strip">'
    + '<div class="feature"><div class="f-ic">🗂</div><h3>Evidence vault</h3><p>Every message, screenshot, transaction and URL normalized into one searchable record.</p></div>'
    + '<div class="feature"><div class="f-ic">⚑</div><h3>Contradiction radar</h3><p>Conflicting amounts, times and duplicates surface as review flags — never verdicts.</p></div>'
    + '<div class="feature"><div class="f-ic">🔒</div><h3>Privacy-first redaction</h3><p>Phones, emails, transaction IDs and URLs masked by default in a private case.</p></div>'
    + '<div class="feature"><div class="f-ic">📄</div><h3>Traceable reporting</h3><p>Every metric links back to its source records, from summary to evidence ID.</p></div>'
    + '</section>'
    + '<section class="pipeline-strip" aria-label="Pipeline"><div class="pipe-steps">'
    + steps.map(function (s, i) {
        return (i ? '<span class="pipe-arrow" aria-hidden="true">→</span>' : '') + '<span class="pipe-step">' + s + '</span>';
      }).join('')
    + '</div></section>'
    + '<p class="landing-foot dim">TRACE is an organizing assistant. It flags potential inconsistencies for human investigators; it does not declare fraud or assign guilt.</p>'
    + '</div>';
}

function mountLanding() {
  var svg = document.getElementById('constellation');
  if (!svg) return;
  var token = (S._landToken = (S._landToken || 0) + 1);
  var NS = 'http://www.w3.org/2000/svg';
  var kinds = ['message', 'screenshot', 'transaction', 'url', 'document'];
  var seed = 42;
  function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
  var nodes = [];
  for (var i = 0; i < 14; i++) {
    nodes.push({ x: 60 + rnd() * 680, y: 50 + rnd() * 280, k: kinds[i % kinds.length], r: 5 + rnd() * 4, d: 7 + rnd() * 5 });
  }
  var edges = [];
  for (var j = 0; j < nodes.length; j++) {
    edges.push([j, (j + 1) % nodes.length]);
    if (j % 3 === 0) edges.push([j, (j + 5) % nodes.length]);
  }
  var g;
  edges.forEach(function (e) {
    var a = nodes[e[0]], b = nodes[e[1]];
    var ln = document.createElementNS(NS, 'line');
    ln.setAttribute('x1', a.x); ln.setAttribute('y1', a.y);
    ln.setAttribute('x2', b.x); ln.setAttribute('y2', b.y);
    ln.setAttribute('stroke', '#1E293B'); ln.setAttribute('stroke-width', '1');
    svg.appendChild(ln);
  });
  nodes.forEach(function (n) {
    g = document.createElementNS(NS, 'g');
    var dx = (rnd() * 16 - 8).toFixed(1), dy = (rnd() * 16 - 8).toFixed(1);
    var at = document.createElementNS(NS, 'animateTransform');
    at.setAttribute('attributeName', 'transform'); at.setAttribute('type', 'translate');
    at.setAttribute('values', '0 0; ' + dx + ' ' + dy + '; ' + (-dx) + ' ' + (-dy) + '; 0 0');
    at.setAttribute('dur', n.d + 's'); at.setAttribute('repeatCount', 'indefinite');
    g.appendChild(at);
    var c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', n.x); c.setAttribute('cy', n.y); c.setAttribute('r', n.r);
    c.setAttribute('fill', KIND_COLOR[n.k]); c.setAttribute('opacity', '0.9');
    g.appendChild(c);
    svg.appendChild(g);
  });

  /* Morph: constellation -> timeline with a pulsing contradiction. */
  setTimeout(function () {
    if (token !== S._landToken) return;
    var con = document.getElementById('constellation');
    var morph = document.getElementById('morph');
    var cap = document.getElementById('hero-caption');
    if (!con || !morph) return;
    con.style.transition = 'opacity .8s'; con.style.opacity = '0';
    morph.hidden = false;
    morph.style.opacity = '0'; morph.style.transition = 'opacity .8s';
    requestAnimationFrame(function () { morph.style.opacity = '1'; });
    if (cap) cap.textContent = 'One traceable incident.';

    var ms = document.getElementById('morph-svg');
    var events = S.evidence.filter(function (e) { return !!e.timestamp; })
      .sort(function (a, b) { return new Date(a.timestamp) - new Date(b.timestamp); }).slice(0, 6);
    var line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', 80); line.setAttribute('y1', 190); line.setAttribute('x2', 720); line.setAttribute('y2', 190);
    line.setAttribute('stroke', '#334155'); line.setAttribute('stroke-width', '2');
    ms.appendChild(line);
    events.forEach(function (e, i) {
      setTimeout(function () {
        if (token !== S._landToken) return;
        var x = 110 + i * 116;
        var dot = document.createElementNS(NS, 'circle');
        dot.setAttribute('cx', x); dot.setAttribute('cy', 190); dot.setAttribute('r', 0);
        var isConflict = i === 3;
        dot.setAttribute('fill', isConflict ? '#F87171' : '#22D3EE');
        ms.appendChild(dot);
        var anim = document.createElementNS(NS, 'animate');
        anim.setAttribute('attributeName', 'r'); anim.setAttribute('from', '0'); anim.setAttribute('to', isConflict ? '10' : '7');
        anim.setAttribute('dur', '.4s'); anim.setAttribute('fill', 'freeze');
        dot.appendChild(anim);
        var t = document.createElementNS(NS, 'text');
        t.setAttribute('x', x); t.setAttribute('y', 225); t.setAttribute('text-anchor', 'middle');
        t.setAttribute('fill', '#9CA3AF'); t.setAttribute('font-size', '11');
        t.setAttribute('font-family', 'JetBrains Mono, monospace');
        t.textContent = fmtTime(e.timestamp);
        ms.appendChild(t);
        if (isConflict) {
          var pulse = document.createElementNS(NS, 'circle');
          pulse.setAttribute('cx', x); pulse.setAttribute('cy', 190); pulse.setAttribute('r', '10');
          pulse.setAttribute('fill', 'none'); pulse.setAttribute('stroke', '#F87171'); pulse.setAttribute('stroke-width', '2');
          var pa = document.createElementNS(NS, 'animate');
          pa.setAttribute('attributeName', 'r'); pa.setAttribute('values', '10;22;10');
          pa.setAttribute('dur', '1.6s'); pa.setAttribute('repeatCount', 'indefinite');
          pulse.appendChild(pa);
          var po = document.createElementNS(NS, 'animate');
          po.setAttribute('attributeName', 'opacity'); po.setAttribute('values', '1;.2;1');
          po.setAttribute('dur', '1.6s'); po.setAttribute('repeatCount', 'indefinite');
          pulse.appendChild(po);
          ms.appendChild(pulse);
          var lab = document.createElementNS(NS, 'text');
          lab.setAttribute('x', x); lab.setAttribute('y', 150); lab.setAttribute('text-anchor', 'middle');
          lab.setAttribute('fill', '#F87171'); lab.setAttribute('font-size', '12'); lab.setAttribute('font-weight', 'bold');
          lab.textContent = 'Potential contradiction detected';
          ms.appendChild(lab);
        }
      }, 400 * i);
    });
  }, 3000);
}

/* ============================== VIEW: AUTH ============================== */

function vAuth() {
  var otp = '';
  if (S.otpSent) {
    otp = '<div class="auth-card" id="otp-card">'
      + '<h2>ENTER VERIFICATION CODE</h2>'
      + '<p class="dim">A one-time code was sent to your phone. <strong>Prototype — no real SMS sent.</strong></p>'
      + '<div class="demo-hint">Demo OTP: <span class="mono">123456</span></div>'
      + '<form data-form="auth-otp" id="otp-form">'
      + '<div class="otp-row" role="group" aria-label="Six digit verification code">'
      + [0, 1, 2, 3, 4, 5].map(function (i) {
          return '<input class="otp-box" inputmode="numeric" pattern="[0-9]*" maxlength="1" aria-label="Digit ' + (i + 1) + '"' + (i === 0 ? ' autofocus' : '') + '>';
        }).join('')
      + '</div>'
      + '<div id="otp-error" class="form-error" role="alert" hidden>Incorrect code. Try 123456.</div>'
      + '<button type="submit" class="btn btn-primary" style="width:100%;justify-content:center">VERIFY &amp; CONTINUE</button>'
      + '</form></div>';
  }
  return '<div class="auth-wrap"><div class="auth-card">'
    + '<div class="brand" style="justify-content:center">' + logoSVG() + '<span>TRACE</span></div>'
    + '<h2>INVESTIGATOR SIGN IN</h2>'
    + '<p class="dim">Case files are private. Sign in with your phone number to open the case workspace.</p>'
    + '<form data-form="auth-phone">'
    + '<label class="lbl" for="auth-phone-input">PHONE NUMBER</label>'
    + '<input id="auth-phone-input" class="field mono" name="phone" placeholder="+91 98XXXXXXXX" autocomplete="tel" aria-label="Phone number">'
    + '<div id="phone-error" class="form-error" role="alert" hidden>Enter a valid 10-digit phone number.</div>'
    + '<button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:12px">SEND OTP</button>'
    + '</form></div>' + otp + '</div>';
}

function setAuthed() {
  try { sessionStorage.setItem('trace_auth', '1'); } catch (e) {}
  S.authed = true;
}

function mountAuth() {
  $all('.otp-box').forEach(function (box, i, boxes) {
    box.addEventListener('input', function () {
      box.value = box.value.replace(/\D/g, '').slice(0, 1);
      if (box.value && boxes[i + 1]) boxes[i + 1].focus();
    });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace' && !box.value && boxes[i - 1]) boxes[i - 1].focus();
    });
  });
}

/* ============================== VIEW: CASE ============================== */

function vCase() {
  var cf = TD.caseFile;
  return '<div class="page-head"><h1>CASE FILE</h1><p class="dim">Create a new investigation or open the existing case.</p></div>'
    + '<div class="card-grid">'
    + '<div class="panel"><h3>CREATE CASE</h3>'
    + '<form data-form="case-create"><label class="lbl" for="case-name">CASE NAME</label>'
    + '<input id="case-name" class="field" name="name" placeholder="e.g. UPI fraud — March incident" maxlength="80" aria-label="New case name">'
    + '<button type="submit" class="btn btn-primary" style="margin-top:12px">CREATE CASE</button></form></div>'
    + '<div class="panel"><h3>OPEN CASE</h3>'
    + '<dl class="tr-kv"><dt>CASE ID</dt><dd class="mono" style="color:#22D3EE">' + esc(cf.id) + '</dd>'
    + '<dt>NAME</dt><dd>' + esc(S.caseName) + '</dd>'
    + '<dt>STATUS</dt><dd><span class="badge b-review">UNDER INVESTIGATION</span></dd>'
    + '<dt>PRIVACY</dt><dd>🔒 PRIVATE</dd>'
    + '<dt>INVESTIGATOR</dt><dd>' + esc(cf.investigator || '—') + '</dd></dl>'
    + '<a class="btn btn-primary" href="#/overview" style="margin-top:12px">OPEN CASE</a></div>'
    + '<div class="panel"><h3>RENAME CASE</h3>'
    + (S.caseRename
      ? '<form data-form="case-rename"><label class="lbl" for="case-rename-input">NEW NAME</label>'
        + '<input id="case-rename-input" class="field" name="name" value="' + esc(S.caseName) + '" maxlength="80" aria-label="Rename case">'
        + '<div style="display:flex;gap:8px;margin-top:12px"><button type="submit" class="btn btn-primary btn-sm">SAVE</button>'
        + '<button type="button" class="btn btn-ghost btn-sm" data-action="case-rename-cancel">CANCEL</button></div></form>'
      : '<p class="dim">Current name: <strong style="color:#E5E7EB">' + esc(S.caseName) + '</strong></p>'
        + '<button type="button" class="btn btn-ghost" data-action="case-rename-open">RENAME</button>')
    + '</div></div>';
}

/* ============================== VIEW: IMPORT ============================== */

var IMP_KINDS = [
  ['note', 'Paste Text', '📝'],
  ['url', 'Add URL', '🔗'],
  ['transaction', 'Add Transaction', '💳'],
  ['message', 'Add Message', '💬'],
  ['calllog', 'Add Call Log', '📞']
];
var EXT_KIND = { png: 'image', jpg: 'image', jpeg: 'image', pdf: 'document', csv: 'transaction', txt: 'note', json: 'document' };

function vImport() {
  var chips = IMP_KINDS.map(function (k) {
    return '<button type="button" class="chip' + (S.impKind === k[0] ? ' active' : '') + '" data-action="imp-chip" data-kind="' + k[0] + '" aria-pressed="' + (S.impKind === k[0]) + '">' + k[2] + ' ' + k[1] + '</button>';
  }).join('');

  var forms = '';
  if (S.impKind === 'note') {
    forms = '<form data-form="imp-note" class="panel"><h3>PASTE TEXT</h3>'
      + '<label class="lbl" for="imp-note-text">TEXT / NOTE CONTENT</label>'
      + '<textarea id="imp-note-text" class="field" name="text" rows="4" placeholder="Paste a chat excerpt, statement, or field note…"></textarea>'
      + '<button type="submit" class="btn btn-primary" style="margin-top:12px">ADD NOTE</button></form>';
  } else if (S.impKind === 'url') {
    forms = '<form data-form="imp-url" class="panel"><h3>ADD URL</h3>'
      + '<label class="lbl" for="imp-url-u">URL</label><input id="imp-url-u" class="field mono" name="url" placeholder="https://example.com/…" inputmode="url">'
      + '<label class="lbl" for="imp-url-l" style="margin-top:10px">LABEL</label><input id="imp-url-l" class="field" name="label" placeholder="e.g. Payment link from message">'
      + '<button type="submit" class="btn btn-primary" style="margin-top:12px">ADD URL</button></form>';
  } else if (S.impKind === 'transaction') {
    forms = '<form data-form="imp-txn" class="panel"><h3>ADD TRANSACTION</h3>'
      + '<label class="lbl" for="imp-txn-a">AMOUNT (INR)</label><input id="imp-txn-a" class="field mono" name="amount" placeholder="5000" inputmode="decimal">'
      + '<label class="lbl" for="imp-txn-t" style="margin-top:10px">TRANSACTION ID</label><input id="imp-txn-t" class="field mono" name="txnid" placeholder="TXN-7842">'
      + '<label class="lbl" for="imp-txn-l" style="margin-top:10px">LABEL</label><input id="imp-txn-l" class="field" name="label" placeholder="e.g. UPI debit alert">'
      + '<button type="submit" class="btn btn-primary" style="margin-top:12px">ADD TRANSACTION</button></form>';
  } else if (S.impKind === 'message') {
    forms = '<form data-form="imp-msg" class="panel"><h3>ADD MESSAGE</h3>'
      + '<label class="lbl" for="imp-msg-p">PHONE</label><input id="imp-msg-p" class="field mono" name="phone" placeholder="+91 98XXXXXXXX">'
      + '<label class="lbl" for="imp-msg-m" style="margin-top:10px">MESSAGE TEXT</label><textarea id="imp-msg-m" class="field" name="text" rows="3" placeholder="Message content…"></textarea>'
      + '<button type="submit" class="btn btn-primary" style="margin-top:12px">ADD MESSAGE</button></form>';
  } else {
    forms = '<form data-form="imp-call" class="panel"><h3>ADD CALL LOG</h3>'
      + '<label class="lbl" for="imp-call-p">PHONE</label><input id="imp-call-p" class="field mono" name="phone" placeholder="+91 98XXXXXXXX">'
      + '<label class="lbl" for="imp-call-d" style="margin-top:10px">DURATION (MINUTES)</label><input id="imp-call-d" class="field mono" name="duration" placeholder="4" inputmode="numeric">'
      + '<label class="lbl" for="imp-call-l" style="margin-top:10px">LABEL</label><input id="imp-call-l" class="field" name="label" placeholder="e.g. Call with unknown number">'
      + '<button type="submit" class="btn btn-primary" style="margin-top:12px">ADD CALL LOG</button></form>';
  }

  return '<div class="page-head"><h1>ADD EVIDENCE</h1>'
    + '<p class="dim">Drop files or add records manually. Everything lands in the private case vault.</p></div>'
    + '<div class="panel"><div id="dropzone" class="dropzone" role="button" tabindex="0" aria-label="Drop files here or click to browse">'
    + '<div style="font-size:34px" aria-hidden="true">⤒</div>'
    + '<p><strong>Drop files here</strong> or click to browse</p>'
    + '<p class="dim" style="font-size:12px">Supported: PNG, JPG, PDF, CSV, TXT, JSON</p>'
    + '<input type="file" id="file-input" multiple hidden aria-hidden="true" tabindex="-1">'
    + '</div><div id="imp-error"></div>'
    + '<div class="dim mono" style="font-size:12px;margin-top:8px"><span id="imp-count">' + S.evidence.length + '</span> records in case</div></div>'
    + '<div class="chip-row" role="group" aria-label="Evidence entry type">' + chips + '</div>'
    + forms
    + '<div style="margin-top:20px"><a class="btn btn-primary" href="#/processing">RUN PIPELINE →</a></div>';
}

function mountImport() {
  var dz = document.getElementById('dropzone');
  var fi = document.getElementById('file-input');
  if (!dz || !fi) return;
  dz.addEventListener('click', function () { fi.click(); });
  dz.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fi.click(); } });
  ['dragenter', 'dragover'].forEach(function (ev) {
    dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('dragover'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('dragover'); });
  });
  dz.addEventListener('drop', function (e) { handleFiles(e.dataTransfer.files); });
  fi.addEventListener('change', function () { handleFiles(fi.files); fi.value = ''; });
}

function handleFiles(files) {
  var errBox = document.getElementById('imp-error');
  Array.prototype.forEach.call(files, function (f) {
    var name = f.name || 'unnamed';
    var ext = (name.split('.').pop() || '').toLowerCase();
    if (!EXT_KIND[ext]) {
      if (errBox) errBox.innerHTML = '<div class="error-state" role="alert"><h3>UNSUPPORTED FORMAT</h3>'
        + '<p><span class="mono">' + esc(name) + '</span> could not be imported. Supported formats: PNG, JPG, PDF, CSV, TXT, JSON.</p></div>';
      toast('Unsupported format: ' + name, 'err');
      return;
    }
    var kind = EXT_KIND[ext];
    var ev = makeEvidence({
      fileName: name, kind: kind,
      label: name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '),
      source: 'File import', eventType: 'File import',
      description: 'Imported file ' + name + ' (' + kindLabel(kind).toLowerCase() + '). Awaiting extraction review.',
      missingFields: kind === 'transaction' ? ['transactionId', 'amount'] : []
    });
    if (kind === 'transaction') ev.status = 'incomplete';
    S.evidence.push(ev);
    toast('Evidence added: ' + ev.id, 'ok');
  });
  var c = document.getElementById('imp-count');
  if (c) c.textContent = S.evidence.length;
}

/* ============================== VIEW: PROCESSING ============================== */

var PIPE_STAGES = [
  ['Import', 'Importing'], ['Parse', 'Parsing'], ['Normalize', 'Normalizing'],
  ['Schema Match', 'Matching schema'], ['Extract Entities', 'Extracting entities'],
  ['Deduplicate', 'Scanning duplicates'], ['Check Completeness', 'Checking completeness'],
  ['Detect Conflicts', 'Detecting conflicts'], ['Link Evidence', 'Linking evidence'],
  ['Build Timeline', 'Building timeline'], ['Apply Redaction', 'Applying redaction'],
  ['Generate Report', 'Generating report']
];

function vProcessing() {
  return '<div class="page-head"><h1>PROCESSING PIPELINE</h1>'
    + '<p class="dim">Running the evidence pipeline over <strong class="mono">' + S.evidence.length + '</strong> records.</p></div>'
    + '<div class="panel"><div id="pipe-list">'
    + PIPE_STAGES.map(function (s, i) {
        return '<div class="pipe-row" id="pipe-' + i + '"><span class="pipe-ic" aria-hidden="true">○</span>'
          + '<span class="pipe-name">' + s[0] + '</span>'
          + '<span class="pipe-count mono dim" id="pipe-count-' + i + '"></span></div>';
      }).join('')
    + '</div><div class="dim" style="font-size:12px;margin-top:12px">Do not close this tab. Results stream into Schema Mapping automatically.</div></div>';
}

function mountProcessing() {
  var token = (S._procToken = (S._procToken || 0) + 1);
  var total = S.evidence.length;
  var per = Math.max(280, Math.floor(6000 / PIPE_STAGES.length));

  function runStage(i) {
    if (token !== S._procToken) return;
    if (i >= PIPE_STAGES.length) {
      setTimeout(function () { if (token === S._procToken) location.hash = '#/schema'; }, 400);
      return;
    }
    var row = document.getElementById('pipe-' + i);
    var cnt = document.getElementById('pipe-count-' + i);
    if (!row) return;
    row.classList.add('active');
    row.querySelector('.pipe-ic').textContent = '◐';
    var verb = PIPE_STAGES[i][1];
    var t0 = performance.now();
    function tick(now) {
      if (token !== S._procToken) return;
      var p = Math.min(1, (now - t0) / per);
      var n = Math.floor(p * total);
      if (cnt) cnt.textContent = verb + '… ' + n + '/' + total;
      if (p < 1) { requestAnimationFrame(tick); return; }
      if (cnt) cnt.textContent = verb.replace(/ing$/, 'ed') + ' ' + total + '/' + total;
      row.classList.remove('active'); row.classList.add('done');
      row.querySelector('.pipe-ic').textContent = '●';
      setTimeout(function () { runStage(i + 1); }, 60);
    }
    requestAnimationFrame(tick);
  }
  runStage(0);
}

/* ============================== VIEW: SCHEMA ============================== */

var TRACE_FIELDS = ['timestamp', 'transactionAmount', 'phone', 'transactionId', 'url', 'eventType', 'source'];
var DATASET_LABELS = { A: 'transaction_04.csv', B: 'bank_export.csv', C: 'manual_notes.csv' };

function vSchema() {
  var mapped = S.schema.filter(function (r) { return r.status !== 'ignored'; }).length;
  var rows = S.schema.map(function (r, i) {
    var ds = '<span class="mono" title="' + esc(DATASET_LABELS[r.dataset] || r.dataset) + '">DATASET ' + esc(r.dataset) + '</span>'
      + '<div class="dim" style="font-size:11px">' + esc(DATASET_LABELS[r.dataset] || '') + '</div>';
    var traceCell;
    if (S.schemaEdit === i) {
      traceCell = '<select id="schema-field-edit" class="field" aria-label="Trace field for ' + esc(r.sourceField) + '">'
        + TRACE_FIELDS.map(function (f) { return '<option value="' + f + '"' + (r.traceField === f ? ' selected' : '') + '>' + f + '</option>'; }).join('')
        + '</select>';
    } else {
      traceCell = '<span class="mono" style="color:#22D3EE">' + esc(r.traceField) + '</span>';
    }
    var stBadge = r.status === 'ignored' ? '<span class="badge b-incomplete">IGNORED</span>'
      : r.status === 'accepted' ? '<span class="badge b-verified">ACCEPTED</span>'
      : r.status === 'edited' ? '<span class="badge b-review">EDITED</span>'
      : '<span class="badge b-flag">SUGGESTED</span>';
    var actions;
    if (S.schemaEdit === i) {
      actions = '<button type="button" class="btn btn-primary btn-sm" data-action="schema-save" data-idx="' + i + '">SAVE</button> '
        + '<button type="button" class="btn btn-ghost btn-sm" data-action="schema-cancel" data-idx="' + i + '">CANCEL</button>';
    } else {
      actions = '<button type="button" class="btn btn-ghost btn-sm" data-action="schema-accept" data-idx="' + i + '">ACCEPT</button> '
        + '<button type="button" class="btn btn-ghost btn-sm" data-action="schema-edit" data-idx="' + i + '">EDIT</button> '
        + '<button type="button" class="btn btn-danger-ghost btn-sm" data-action="schema-ignore" data-idx="' + i + '">IGNORE</button>';
    }
    return '<tr><td>' + ds + '</td><td class="mono">' + esc(r.sourceField) + '</td>'
      + '<td>' + traceCell + '</td><td>' + confBar(r.confidence) + '</td>'
      + '<td>' + stBadge + '</td><td style="white-space:nowrap">' + actions + '</td></tr>';
  }).join('');

  return '<div class="page-head"><h1>SCHEMA MAPPING</h1>'
    + '<p class="dim"><strong>' + mapped + ' of ' + S.schema.length + ' auto-mapped.</strong> '
    + 'Source columns are aligned to TRACE fields. Review each suggestion before continuing.</p></div>'
    + '<div class="panel table-wrap"><table class="data-table" aria-label="Schema mappings">'
    + '<thead><tr><th>DATASET</th><th>SOURCE FIELD</th><th>TRACE FIELD</th><th>CONFIDENCE</th><th>STATUS</th><th>ACTIONS</th></tr></thead>'
    + '<tbody>' + rows + '</tbody></table></div>'
    + '<div style="margin-top:20px"><a class="btn btn-primary" href="#/overview">CONTINUE TO OVERVIEW →</a></div>';
}

/* ============================== VIEW: OVERVIEW ============================== */

function vOverview() {
  var m = computeMetrics();
  var cards = [
    ['total', 'TOTAL EVIDENCE', String(m.total)],
    ['events', 'TIMESTAMPED EVENTS', String(m.events)],
    ['transactions', 'TRANSACTIONS', String(m.txnCount)],
    ['amount', 'TOTAL AMOUNT', fmtINR(m.totalAmount)],
    ['contacts', 'CONTACTS', String(m.contacts)],
    ['flagged', 'FLAGGED', String(m.flagged)],
    ['duplicates', 'DUPLICATE RECORDS', String(m.dupCount)],
    ['incomplete', 'INCOMPLETE', String(m.incomplete)],
    ['conflicts', 'CONTRADICTIONS', String(m.conflicts)],
    ['timespan', 'TIME SPAN', m.timeSpan]
  ].map(function (c) {
    return '<button type="button" class="stat-card" data-action="trace" data-key="' + c[0] + '" aria-label="' + c[1] + ': ' + esc(c[2]) + '. Open traceability.">'
      + '<div class="stat-val">' + esc(c[2]) + '</div><div class="stat-lbl">' + c[1] + '</div>'
      + '<div class="stat-trace">TRACE →</div></button>';
  }).join('');

  var summary = 'The case file holds <strong>' + m.total + ' evidence records</strong> spanning <strong>' + esc(m.timeSpan) + '</strong>. '
    + '<strong>' + m.txnCount + ' transactions</strong> total <strong>' + esc(fmtINR(m.totalAmount)) + '</strong> across '
    + '<strong>' + m.contacts + ' contacts</strong>. The pipeline surfaced <strong>' + m.conflicts + ' potential contradictions</strong>, '
    + '<strong>' + (TD.duplicates || []).length + ' possible-duplicate groups</strong> and <strong>' + m.incomplete + ' incomplete records</strong>. '
    + 'No conclusions have been drawn — every flag requires investigator review.';

  var alerts = [];
  (TD.contradictions || []).slice(0, 2).forEach(function (c) {
    alerts.push('<a class="alert alert-conflict" href="#/flags"><span class="a-ic">⚠️</span><div><strong>POTENTIAL CONTRADICTION · <span class="mono">' + esc(c.id) + '</span></strong><div class="dim">' + esc(c.title) + ' — requires investigator review.</div></div><span class="a-go">→</span></a>');
  });
  (TD.missing || []).slice(0, 3).forEach(function (ms) {
    if (S.missRes[ms.id] === 'resolved') return;
    alerts.push('<a class="alert alert-missing" href="#/missing"><span class="a-ic">◌</span><div><strong>MISSING INFORMATION · <span class="mono">' + esc(ms.id) + '</span></strong><div class="dim">' + esc(ms.label) + '</div></div><span class="a-go">→</span></a>');
  });

  var recent = S.evidence.filter(function (e) { return !!e.timestamp; })
    .sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); }).slice(0, 5)
    .map(function (e) {
      return '<button type="button" class="recent-row" data-action="open-drawer" data-id="' + esc(e.id) + '">'
        + '<span style="font-size:22px" aria-hidden="true">' + kindIcon(e.kind) + '</span>'
        + '<div style="flex:1;min-width:0"><div><span class="mono" style="color:#22D3EE;font-size:12px">' + esc(e.id) + '</span> <span style="font-size:13px">' + esc(e.label).slice(0, 60) + '</span></div>'
        + '<div class="dim mono" style="font-size:11px">' + esc(fmtDateTime(e.timestamp)) + ' · ' + esc(scrubText(e.source || '')) + '</div></div>'
        + statusBadge(e) + '</button>';
    }).join('');

  return '<div class="page-head"><h1>INCIDENT OVERVIEW</h1><p class="dim">' + esc(S.caseName) + ' · Case <span class="mono">' + esc(TD.caseFile.id) + '</span></p></div>'
    + '<div class="panel ai-panel"><div class="tr-sec">AI INCIDENT SUMMARY <span class="inf-label">SYSTEM INFERENCE</span></div>'
    + '<p>' + summary + '</p></div>'
    + '<div class="stat-grid">' + cards + '</div>'
    + (alerts.length ? '<div class="panel"><div class="tr-sec" style="color:#FBBF24">INVESTIGATION ALERTS</div><div class="alert-list">' + alerts.join('') + '</div></div>' : '')
    + '<div class="panel"><div class="tr-sec">RECENT EVIDENCE</div><div>' + recent + '</div>'
    + '<a href="#/evidence" style="color:#22D3EE;font-size:13px">Open full evidence vault →</a></div>';
}

/* ============================== VIEW: EVIDENCE ============================== */

var EV_TYPES = [
  ['all', 'All'], ['message', 'Messages'], ['screenshot', 'Screenshots'],
  ['transaction', 'Transactions'], ['url', 'URLs'], ['document', 'Documents'],
  ['image', 'Images'], ['calllog', 'Call Logs']
];

function vEvidence() {
  var chips = EV_TYPES.map(function (t) {
    return '<button type="button" class="chip' + (S.filter.type === t[0] ? ' active' : '') + '" data-action="ev-type" data-t="' + t[0] + '" aria-pressed="' + (S.filter.type === t[0]) + '">' + t[1] + '</button>';
  }).join('');
  return '<div class="page-head"><h1>EVIDENCE VAULT</h1><p class="dim">Every record in the case file. Click a card for the full trace.</p></div>'
    + '<div class="toolbar"><input id="ev-q" class="field" type="search" aria-label="Search evidence" placeholder="Search ID, file, label, transaction, phone…" value="' + esc(S.filter.q) + '">'
    + '<select class="field" data-change="ev-sort" aria-label="Sort evidence" style="max-width:220px">'
    + [['chrono', 'Chronological'], ['newest', 'Newest first'], ['oldest', 'Oldest first'], ['confidence', 'Confidence'], ['review', 'Requires review']].map(function (o) {
        return '<option value="' + o[0] + '"' + (S.filter.sort === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
      }).join('') + '</select></div>'
    + '<div class="chip-row" role="group" aria-label="Filter by evidence type">' + chips + '</div>'
    + '<div class="ev-grid" id="ev-grid"></div>';
}

function filteredEvidence() {
  var q = S.filter.q.trim().toLowerCase();
  var list = S.evidence.filter(function (e) {
    if (S.filter.type !== 'all' && e.kind !== S.filter.type) return false;
    if (!q) return true;
    var notes = (S.notes[e.id] || []).map(function (n) { return n.text; }).join(' ');
    var hay = [e.id, e.fileName, e.label, e.description, e.transactionId, e.phone, e.email, e.url, e.source, e.eventType, notes].join(' ').toLowerCase();
    return hay.indexOf(q) >= 0;
  });
  var byTs = function (e) { return e.timestamp ? new Date(e.timestamp).getTime() : Infinity; };
  var rank = function (e) { return e.status === 'conflict' ? 0 : e.status === 'needs-review' ? 1 : e.status === 'incomplete' ? 2 : 3; };
  if (S.filter.sort === 'newest') list.sort(function (a, b) { return byTs(b) - byTs(a); });
  else if (S.filter.sort === 'oldest') list.sort(function (a, b) { return (a.timestamp ? new Date(a.timestamp).getTime() : Infinity) - (b.timestamp ? new Date(b.timestamp).getTime() : Infinity); });
  else if (S.filter.sort === 'confidence') list.sort(function (a, b) { return (Number(b.confidence) || 0) - (Number(a.confidence) || 0); });
  else if (S.filter.sort === 'review') list.sort(function (a, b) { return rank(a) - rank(b) || byTs(a) - byTs(b); });
  else list.sort(function (a, b) { return byTs(a) - byTs(b); });
  return list;
}

function evCard(e) {
  var keys = [];
  if (e.amount != null) keys.push('<span class="k">💰 ' + esc(fmtINR(e.amount)) + '</span>');
  if (e.transactionId) keys.push('<span class="k mono">' + esc(R(e.transactionId, 'txnIds')) + '</span>');
  if (e.phone) keys.push('<span class="k mono">' + esc(R(e.phone, 'phones')) + '</span>');
  if (e.url) keys.push('<span class="k mono">' + esc(R(e.url, 'urls')) + '</span>');
  return '<button type="button" class="ev-card" data-action="open-drawer" data-id="' + esc(e.id) + '" aria-label="Open evidence ' + esc(e.id) + '">'
    + '<div class="ev-card-top"><span class="ev-kind" aria-hidden="true">' + kindIcon(e.kind) + '</span>' + statusBadge(e) + '</div>'
    + '<div class="mono ev-id">' + esc(e.id) + '</div>'
    + '<div class="ev-label">' + esc(e.label).slice(0, 70) + '</div>'
    + (keys.length ? '<div class="ev-keys">' + keys.join(' ') + '</div>' : '')
    + '<div class="ev-meta dim mono">' + esc(e.timestamp ? fmtDateTime(e.timestamp) : 'No timestamp') + '</div>'
    + '<div class="ev-meta dim">' + esc(scrubText(e.fileName || e.source || '')) + '</div>'
    + '</button>';
}

function renderEvGrid() {
  var grid = document.getElementById('ev-grid');
  if (!grid) return;
  var list = filteredEvidence();
  grid.innerHTML = list.length ? list.map(evCard).join('')
    : '<div class="empty-state"><h3>NO EVIDENCE FOUND</h3><p>No records match the current search and filters. Try clearing the search or choosing a different type.</p></div>';
}

function mountEvidence() { renderEvGrid(); }

/* ============================== VIEW: TIMELINE ============================== */

function vTimeline() {
  var st = S.filter.tlStatus;
  var withTs = S.evidence.filter(function (e) { return !!e.timestamp; });
  var noTs = S.evidence.filter(function (e) { return !e.timestamp; });
  if (st !== 'all') withTs = withTs.filter(function (e) { return e.status === st; });
  withTs.sort(function (a, b) { return new Date(a.timestamp) - new Date(b.timestamp); });

  var expanded = S.tlExpanded ? getEv(S.tlExpanded) : null;
  var relSet = {};
  if (expanded) (expanded.relatedIds || []).forEach(function (id) { relSet[id] = 1; });

  var items = withTs.map(function (e) {
    var isX = expanded && expanded.id === e.id;
    var cls = 'tl-event' + (isX ? ' expanded' : '') + (expanded && !isX && !relSet[e.id] ? ' dim' : '') + (expanded && relSet[e.id] ? ' hl' : '');
    var body = '<button type="button" class="' + cls + '" data-action="tl-expand" data-id="' + esc(e.id) + '" aria-expanded="' + !!isX + '" aria-label="Timeline event ' + esc(e.id) + '">'
      + '<div class="tl-time mono">' + esc(fmtTime(e.timestamp)) + '<span class="tl-date">' + esc(fmtDate(e.timestamp)) + '</span></div>'
      + '<div class="tl-body"><div class="tl-row"><span class="et-badge">' + esc((e.eventType || e.kind).toUpperCase()) + '</span>' + statusBadge(e) + '</div>'
      + '<div class="tl-label">' + esc(e.label) + '</div>'
      + '<div class="tl-src dim">' + esc(scrubText(e.source || '')) + ' · <span class="mono">' + esc(e.id) + '</span> · confidence ' + esc(confPct(e.confidence)) + '</div>';
    if (isX) {
      var confs = (TD.contradictions || []).filter(function (c) { return c.evidenceA === e.id || c.evidenceB === e.id; });
      body += '<div class="tl-detail">'
        + (e.description ? '<p>' + esc(scrubText(e.description)) + '</p>' : '')
        + '<div style="margin:6px 0">' + entityChips(e) + '</div>'
        + ((e.relatedIds || []).length ? '<div style="margin:6px 0"><span class="dim" style="font-size:12px">RELATED </span>' + e.relatedIds.map(evChip).join('') + '</div>' : '')
        + (confs.length ? '<div style="margin:6px 0;font-size:13px">⚠️ Potential inconsistency: ' + confs.map(function (c) { return '<span class="mono">' + esc(c.id) + '</span>'; }).join(', ') + ' <a href="#/flags" style="color:#22D3EE">Review in Flags →</a></div>' : '')
        + ((e.missingFields || []).length ? '<div style="margin:6px 0;font-size:13px">◌ Missing: ' + esc(e.missingFields.join(', ')) + '</div>' : '')
        + '<div style="margin-top:8px"><button type="button" class="btn btn-ghost btn-sm" data-action="open-drawer" data-id="' + esc(e.id) + '">OPEN FULL RECORD</button></div>'
        + '</div>';
    }
    return body + '</div></button>';
  }).join('');

  var unplaced = noTs.map(function (e) {
    return '<button type="button" class="tl-event tl-unplaced" data-action="open-drawer" data-id="' + esc(e.id) + '">'
      + '<div class="tl-time mono" style="color:#FBBF24">—</div>'
      + '<div class="tl-body"><div class="tl-label">' + esc(e.label) + '</div>'
      + '<div class="tl-src" style="color:#FBBF24;font-size:12px">INCOMPLETE RECORD — Timestamp could not be identified. <span class="mono">' + esc(e.id) + '</span></div></div></button>';
  }).join('');

  return '<div class="page-head"><h1>CHRONOLOGICAL TIMELINE</h1>'
    + '<p class="dim">Every timestamped record in order. Click an event to expand it; related records highlight.</p></div>'
    + '<div class="toolbar"><select class="field" data-change="tl-status" aria-label="Filter timeline by status" style="max-width:240px">'
    + [['all', 'All statuses'], ['verified', 'Verified'], ['needs-review', 'Requires review'], ['incomplete', 'Incomplete'], ['conflict', 'Potential conflict']].map(function (o) {
        return '<option value="' + o[0] + '"' + (st === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
      }).join('') + '</select>'
    + '<span class="dim mono" style="font-size:12px">' + withTs.length + ' events</span></div>'
    + '<div class="timeline">' + (items || '<div class="empty-state"><h3>NO EVENTS</h3><p>No timestamped records match this filter.</p></div>') + '</div>'
    + (noTs.length ? '<div class="panel" style="margin-top:16px"><div class="tr-sec" style="color:#FBBF24">UNPLACED RECORDS</div>' + unplaced + '</div>' : '');
}

/* ============================== VIEW: GRAPH ============================== */

function curatedByKind(kind, n, mustIds) {
  var out = [], seen = {};
  (mustIds || []).forEach(function (id) {
    var e = getEv(id);
    if (e && e.kind === kind && !seen[id]) { out.push(e); seen[id] = 1; }
  });
  S.evidence.forEach(function (e) {
    if (out.length >= n) return;
    if (e.kind === kind && !seen[e.id]) { out.push(e); seen[e.id] = 1; }
  });
  return out;
}

function vGraph() {
  return '<div class="page-head"><h1>EVIDENCE GRAPH</h1>'
    + '<p class="dim">Nodes are evidence and extracted identifiers. Click a node to trace its neighborhood. <span style="color:#F87171">Red rings mark potential conflicts.</span></p></div>'
    + '<div class="panel"><div id="graph-wrap" style="overflow-x:auto"></div>'
    + '<div class="graph-legend" id="graph-legend"></div>'
    + '<p class="dim" style="font-size:12px;margin-top:8px">Hint: click any node — related records stay lit while the rest dim. Edges pulse as links are traced.</p></div>';
}

function mountGraph() {
  var wrap = document.getElementById('graph-wrap');
  if (!wrap) return;
  var NS = 'http://www.w3.org/2000/svg';
  var W = 800, H = 640, CX = 400, CY = 310;

  var msgs = curatedByKind('message', 6, []);
  var txns = curatedByKind('transaction', 5, ['EV-012']);
  var shots = curatedByKind('screenshot', 3, ['EV-027']);
  var pdfs = S.evidence.filter(function (e) { return e.kind === 'document' && /\.pdf$/i.test(e.fileName || ''); }).slice(0, 2);

  var phoneSet = [], urlSet = [], seenP = {}, seenU = {};
  S.evidence.forEach(function (e) {
    var ps = [];
    if (e.phone) ps.push(e.phone);
    ((e.entities && e.entities.phones) || []).forEach(function (p) { if (p) ps.push(p); });
    ps.forEach(function (p) { if (!seenP[p] && phoneSet.length < 4) { seenP[p] = 1; phoneSet.push(p); } });
    var us = [];
    if (e.url) us.push(e.url);
    ((e.entities && e.entities.urls) || []).forEach(function (u) { if (u) us.push(u); });
    us.forEach(function (u) { if (!seenU[u] && urlSet.length < 3) { seenU[u] = 1; urlSet.push(u); } });
  });

  var evNodes = msgs.concat(txns, shots, pdfs);
  var evIds = {};
  evNodes.forEach(function (e) { evIds[e.id] = 1; });
  var conflicts = conflictIdSet();

  var nodes = [{ nid: 'INCIDENT', kind: '__center__', label: 'INCIDENT', sub: TD.caseFile.id, x: CX, y: CY, r: 26 }];
  var entities = [];
  phoneSet.forEach(function (p, i) { entities.push({ nid: 'PH-' + i, kind: '__phone__', label: R(p, 'phones'), raw: p, sub: 'PHONE', x: 0, y: 0, r: 12 }); });
  urlSet.forEach(function (u, i) { entities.push({ nid: 'URL-' + i, kind: '__url__', label: R(u, 'urls'), raw: u, sub: 'URL', x: 0, y: 0, r: 12 }); });
  entities.forEach(function (n, i) {
    var a = (i / entities.length) * Math.PI * 2 - Math.PI / 2;
    n.x = CX + 150 * Math.cos(a); n.y = CY + 150 * Math.sin(a);
  });
  evNodes.forEach(function (e, i) {
    var a = (i / evNodes.length) * Math.PI * 2 - Math.PI / 2;
    nodes.push({ nid: e.id, kind: e.kind, label: e.id, sub: kindLabel(e.kind), x: CX + 265 * Math.cos(a), y: CY + 265 * Math.sin(a), r: 15, ev: e });
  });
  nodes = nodes.concat(entities);

  var pos = {};
  nodes.forEach(function (n) { pos[n.nid] = n; });

  /* Edges: entity->evidence (shared identifier), evidence->evidence (relatedIds), conflict edge. */
  var edges = [];
  function shares(e, ent) {
    if (ent.kind === '__phone__') {
      if (e.phone === ent.raw) return true;
      return ((e.entities && e.entities.phones) || []).indexOf(ent.raw) >= 0;
    }
    if (e.url === ent.raw) return true;
    return ((e.entities && e.entities.urls) || []).indexOf(ent.raw) >= 0;
  }
  entities.forEach(function (en) {
    evNodes.forEach(function (e) { if (shares(e, en)) edges.push([en.nid, e.id, 'link']); });
  });
  evNodes.forEach(function (e) {
    (e.relatedIds || []).forEach(function (rid) { if (evIds[rid]) edges.push([e.id, rid, 'rel']); });
  });
  var has012 = !!pos['EV-012'], has027 = !!pos['EV-027'];
  if (has012 && has027) edges.push(['EV-012', 'EV-027', 'conflict']);

  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.setAttribute('width', '100%');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Evidence relationship graph');
  svg.style.minWidth = '640px';

  var edgeG = document.createElementNS(NS, 'g');
  var edgeEls = [];
  edges.forEach(function (ed) {
    var a = pos[ed[0]], b = pos[ed[1]];
    if (!a || !b) return;
    var ln = document.createElementNS(NS, 'line');
    ln.setAttribute('x1', a.x); ln.setAttribute('y1', a.y);
    ln.setAttribute('x2', b.x); ln.setAttribute('y2', b.y);
    var col = ed[2] === 'conflict' ? '#F87171' : ed[2] === 'rel' ? '#8B5CF6' : '#334155';
    ln.setAttribute('stroke', col);
    ln.setAttribute('stroke-width', ed[2] === 'conflict' ? '2' : '1.2');
    ln.setAttribute('stroke-dasharray', ed[2] === 'link' ? '3 5' : '6 4');
    ln.setAttribute('data-e1', ed[0]); ln.setAttribute('data-e2', ed[1]);
    ln.setAttribute('opacity', '0.55');
    var an = document.createElementNS(NS, 'animate');
    an.setAttribute('attributeName', 'stroke-dashoffset');
    an.setAttribute('from', '0'); an.setAttribute('to', '-20');
    an.setAttribute('dur', '2.4s'); an.setAttribute('repeatCount', 'indefinite');
    ln.appendChild(an);
    edgeG.appendChild(ln);
    edgeEls.push(ln);
  });
  svg.appendChild(edgeG);

  var nodeG = document.createElementNS(NS, 'g');
  var nodeEls = {};
  nodes.forEach(function (n) {
    var g = document.createElementNS(NS, 'g');
    g.setAttribute('data-action', 'graph-node');
    g.setAttribute('data-node', n.nid);
    g.setAttribute('data-nid', n.nid);
    g.style.cursor = 'pointer';
    g.setAttribute('tabindex', '0');
    g.setAttribute('role', 'button');
    g.setAttribute('aria-label', (n.kind === '__center__' ? 'Incident node' : n.kind === '__phone__' || n.kind === '__url__' ? n.sub + ' node' : 'Evidence node ' + n.nid));
    if (conflicts[n.nid]) {
      var ring = document.createElementNS(NS, 'circle');
      ring.setAttribute('cx', n.x); ring.setAttribute('cy', n.y); ring.setAttribute('r', n.r + 6);
      ring.setAttribute('fill', 'none'); ring.setAttribute('stroke', '#F87171'); ring.setAttribute('stroke-width', '2.5');
      g.appendChild(ring);
    }
    var c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', n.x); c.setAttribute('cy', n.y); c.setAttribute('r', n.r);
    var fill = n.kind === '__center__' ? '#8B5CF6' : n.kind === '__phone__' ? '#22D3EE' : n.kind === '__url__' ? '#FBBF24' : (KIND_COLOR[n.kind] || '#94A3B8');
    c.setAttribute('fill', fill); c.setAttribute('opacity', n.kind === '__center__' ? '1' : '0.92');
    if (n.kind === '__center__') { c.setAttribute('stroke', '#22D3EE'); c.setAttribute('stroke-width', '2'); }
    g.appendChild(c);
    var t = document.createElementNS(NS, 'text');
    t.setAttribute('x', n.x); t.setAttribute('y', n.y + n.r + 14);
    t.setAttribute('text-anchor', 'middle'); t.setAttribute('fill', '#CBD5E1'); t.setAttribute('font-size', '10.5');
    t.setAttribute('font-family', 'JetBrains Mono, monospace');
    var lbl = n.label.length > 18 ? n.label.slice(0, 17) + '…' : n.label;
    t.textContent = lbl;
    g.appendChild(t);
    if (n.sub) {
      var s2 = document.createElementNS(NS, 'text');
      s2.setAttribute('x', n.x); s2.setAttribute('y', n.y + n.r + 27);
      s2.setAttribute('text-anchor', 'middle'); s2.setAttribute('fill', '#64748B'); s2.setAttribute('font-size', '9');
      s2.textContent = n.sub.length > 22 ? n.sub.slice(0, 21) + '…' : n.sub;
      g.appendChild(s2);
    }
    nodeG.appendChild(g);
    nodeEls[n.nid] = g;
  });
  svg.appendChild(nodeG);

  if (has012 && has027) {
    var mx = (pos['EV-012'].x + pos['EV-027'].x) / 2, my = (pos['EV-012'].y + pos['EV-027'].y) / 2 - 18;
    var lab = document.createElementNS(NS, 'text');
    lab.setAttribute('x', mx); lab.setAttribute('y', my); lab.setAttribute('text-anchor', 'middle');
    lab.setAttribute('fill', '#F87171'); lab.setAttribute('font-size', '11'); lab.setAttribute('font-weight', 'bold');
    lab.textContent = 'POTENTIAL CONFLICT';
    svg.appendChild(lab);
  }

  wrap.innerHTML = '';
  wrap.appendChild(svg);

  var legend = document.getElementById('graph-legend');
  if (legend) {
    legend.innerHTML = Object.keys(KIND_COLOR).map(function (k) {
      return '<span class="lg-item"><span class="lg-dot" style="background:' + KIND_COLOR[k] + '"></span>' + kindLabel(k) + '</span>';
    }).join('') + '<span class="lg-item"><span class="lg-ring"></span>Potential conflict</span>';
  }

  /* Click / keyboard neighborhood highlight. Delegated via data-action="graph-node". */
  svg._graphData = { nodes: nodes, pos: pos, edges: edges, nodeEls: nodeEls, edgeEls: edgeEls, evNodes: evNodes, entities: entities };
  wrap._graphData = svg._graphData;
}

function graphNeighborhood(nid) {
  var wrap = document.getElementById('graph-wrap');
  var D = wrap && wrap._graphData;
  if (!D) return null;
  var keep = {};
  keep[nid] = 1;
  var node = D.nodes.find(function (n) { return n.nid === nid; });
  if (node && node.ev) {
    var e = node.ev;
    (e.relatedIds || []).forEach(function (id) { keep[id] = 1; });
    D.evNodes.forEach(function (o) {
      if (o.id === e.id) return;
      var shared = false;
      var ep = [e.phone].concat((e.entities && e.entities.phones) || []).filter(Boolean);
      var op = [o.phone].concat((o.entities && o.entities.phones) || []).filter(Boolean);
      if (ep.some(function (p) { return op.indexOf(p) >= 0; })) shared = true;
      if (e.transactionId && e.transactionId === o.transactionId) shared = true;
      var eu = [e.url].concat((e.entities && e.entities.urls) || []).filter(Boolean);
      var ou = [o.url].concat((o.entities && o.entities.urls) || []).filter(Boolean);
      if (eu.some(function (u) { return ou.indexOf(u) >= 0; })) shared = true;
      if (shared) keep[o.id] = 1;
    });
    D.entities.forEach(function (en) {
      var hit = en.kind === '__phone__'
        ? ([e.phone].concat((e.entities && e.entities.phones) || []).indexOf(en.raw) >= 0)
        : ([e.url].concat((e.entities && e.entities.urls) || []).indexOf(en.raw) >= 0);
      if (hit) keep[en.nid] = 1;
    });
  } else if (node && (node.kind === '__phone__' || node.kind === '__url__')) {
    D.evNodes.forEach(function (o) {
      var hit = node.kind === '__phone__'
        ? ([o.phone].concat((o.entities && o.entities.phones) || []).indexOf(node.raw) >= 0)
        : ([o.url].concat((o.entities && o.entities.urls) || []).indexOf(node.raw) >= 0);
      if (hit) keep[o.id] = 1;
    });
  }
  Object.keys(D.nodeEls).forEach(function (id) {
    D.nodeEls[id].setAttribute('opacity', keep[id] ? '1' : '0.16');
  });
  D.edgeEls.forEach(function (ln) {
    var hot = keep[ln.getAttribute('data-e1')] && keep[ln.getAttribute('data-e2')];
    ln.setAttribute('opacity', hot ? '1' : '0.08');
  });
  return node;
}

/* ============================== VIEW: FLAGS ============================== */

function confStatusBadge(id) {
  var st = S.confRes[id];
  if (st === 'reviewed') return '<span class="badge b-verified">REVIEWED</span>';
  if (st === 'escalated') return '<span class="badge b-flag">ESCALATED</span>';
  if (st === 'dismissed') return '<span class="badge b-incomplete">DISMISSED</span>';
  return '<span class="badge b-conflict">REQUIRES INVESTIGATOR REVIEW</span>';
}

function confPanel(evId) {
  var e = getEv(evId);
  if (!e) return '<div class="conf-side"><div class="dim">Record ' + esc(evId) + ' not found.</div></div>';
  return '<div class="conf-side"><div style="margin-bottom:8px">' + evChip(e.id) + '</div>'
    + '<div class="conf-file mono dim">' + esc(e.fileName || '—') + '</div>'
    + '<dl class="tr-kv" style="margin-top:8px">'
    + (e.amount != null ? '<dt>AMOUNT</dt><dd><strong>' + esc(fmtINR(e.amount)) + '</strong></dd>' : '')
    + '<dt>TIME</dt><dd class="mono">' + esc(e.timestamp ? fmtDateTime(e.timestamp) : '—') + '</dd>'
    + '<dt>SOURCE</dt><dd><button type="button" class="linklike" data-action="open-drawer" data-id="' + esc(e.id) + '">' + esc(scrubText(e.source || 'Open record →')) + '</button></dd>'
    + (e.transactionId ? '<dt>TXN ID</dt><dd class="mono">' + esc(R(e.transactionId, 'txnIds')) + '</dd>' : '')
    + '</dl></div>';
}

function vFlags() {
  var list = TD.contradictions || [];
  var cards = list.map(function (c) {
    return '<div class="panel conf-card"><div class="conf-head"><span class="mono" style="color:#F87171">CONFLICT ID · ' + esc(c.id) + '</span>' + confStatusBadge(c.id) + '</div>'
      + '<h3 style="margin:6px 0">' + esc(c.title) + '</h3>'
      + '<div class="conf-vs">' + confPanel(c.evidenceA)
      + '<div class="conf-mid" aria-hidden="true">VS</div>' + confPanel(c.evidenceB) + '</div>'
      + '<div class="conf-reason"><span class="tr-sec" style="color:#F87171">WHY THIS IS FLAGGED</span><p>' + esc(scrubText(c.reason)) + '</p>'
      + '<p class="dim" style="font-size:12px">The system does not decide which value is correct. Both records are preserved; an investigator must review.</p></div>'
      + '<div class="conf-actions">'
      + '<button type="button" class="btn btn-ghost btn-sm" data-action="conf-reviewed" data-id="' + esc(c.id) + '">MARK REVIEWED</button>'
      + '<button type="button" class="btn btn-ghost btn-sm" data-action="conf-escalate" data-id="' + esc(c.id) + '">ESCALATE</button>'
      + '<button type="button" class="btn btn-danger-ghost btn-sm" data-action="conf-dismiss" data-id="' + esc(c.id) + '">DISMISS</button>'
      + '</div></div>';
  }).join('');

  return '<div class="page-head"><h1>FLAGS &amp; CONTRADICTIONS</h1>'
    + '<p class="dim">Potential inconsistencies detected across the evidence. Each one requires investigator review — TRACE never decides which side is correct.</p></div>'
    + (cards || '<div class="empty-state"><h3>NO CONTRADICTIONS</h3><p>Current evidence contains no detected inconsistencies.</p></div>');
}

/* ============================== VIEW: MISSING ============================== */

function vMissing() {
  var list = TD.missing || [];
  var open = list.filter(function (m) { return S.missRes[m.id] !== 'resolved'; });
  var cards = list.map(function (ms) {
    var resolved = S.missRes[ms.id] === 'resolved';
    var ev = getEv(ms.evidenceId);
    var form = '';
    if (S.missEdit === ms.id && !resolved) {
      form = '<form data-form="miss-info" data-id="' + esc(ms.id) + '" style="display:flex;gap:8px;margin-top:10px">'
        + '<input class="field mono" name="value" placeholder="Enter ' + esc(ms.field) + '…" aria-label="Value for ' + esc(ms.field) + '">'
        + '<button type="submit" class="btn btn-primary btn-sm">SAVE</button></form>';
    }
    return '<div class="panel miss-card"><div class="conf-head"><span class="mono" style="color:#FBBF24">MISSING · ' + esc(ms.id) + '</span>'
      + (resolved ? '<span class="badge b-verified">RESOLVED</span>' : '<span class="badge b-review">OPEN</span>') + '</div>'
      + '<h3 style="margin:6px 0">' + esc(ms.label) + '</h3>'
      + '<dl class="tr-kv"><dt>FIELD</dt><dd class="mono">' + esc(ms.field) + '</dd>'
      + '<dt>EVIDENCE</dt><dd>' + (ev ? evChip(ev.id) + ' <span class="dim">' + esc(ev.fileName || '') + '</span>' : '<span class="dim">' + esc(ms.evidenceId) + '</span>') + '</dd></dl>'
      + '<p style="font-size:13px;color:#D1D5DB"><span class="dim">WHY IT MATTERS — </span>' + esc(ms.why) + '</p>'
      + form
      + '<div class="conf-actions">'
      + (ev ? '<button type="button" class="btn btn-ghost btn-sm" data-action="open-drawer" data-id="' + esc(ev.id) + '">VIEW EVIDENCE</button>' : '')
      + (resolved ? '' : '<button type="button" class="btn btn-ghost btn-sm" data-action="miss-addinfo" data-id="' + esc(ms.id) + '">ADD INFORMATION</button>'
        + '<button type="button" class="btn btn-primary btn-sm" data-action="miss-resolve" data-id="' + esc(ms.id) + '">MARK RESOLVED</button>')
      + '</div></div>';
  }).join('');

  return '<div class="page-head"><h1>MISSING INFORMATION</h1>'
    + '<p class="dim"><strong>' + open.length + ' of ' + list.length + ' open.</strong> Gaps that weaken the incident picture. Fill them or mark them resolved.</p></div>'
    + (cards || '<div class="empty-state"><h3>NO MISSING INFORMATION</h3><p>Every record currently carries its expected fields.</p></div>');
}

/* ============================== VIEW: DUPLICATES ============================== */

function vDuplicates() {
  var list = TD.duplicates || [];
  var cards = list.map(function (d) {
    var res = S.dupRes[d.id];
    var stBadge = res === 'confirmed' ? '<span class="badge b-review">MARKED DUPLICATE</span>'
      : res === 'kept-both' ? '<span class="badge b-verified">KEPT BOTH</span>'
      : '<span class="badge b-flag">NEEDS DECISION</span>';
    var sim = Number(d.similarity) || 0;
    var sides = (d.evidenceIds || []).map(function (id) {
      var e = getEv(id);
      if (!e) return '<div class="conf-side"><span class="mono">' + esc(id) + '</span></div>';
      return '<div class="conf-side"><button type="button" class="linklike" data-action="open-drawer" data-id="' + esc(e.id) + '" style="text-align:left">'
        + '<span class="mono" style="color:#22D3EE">' + esc(e.id) + '</span><br>'
        + '<span style="font-size:13px;color:#E5E7EB">' + esc(e.label).slice(0, 60) + '</span><br>'
        + '<span class="dim mono" style="font-size:11px">' + esc(e.fileName || '') + ' · ' + esc(scrubText(e.source || '')) + '</span></button></div>';
    }).join('<div class="conf-mid" aria-hidden="true">≈</div>');
    return '<div class="panel conf-card"><div class="conf-head"><span class="mono" style="color:#FBBF24">DUPLICATE GROUP · ' + esc(d.id) + '</span>' + stBadge + '</div>'
      + '<div style="margin:10px 0"><div class="tr-sec">SIMILARITY</div><div class="tr-bar" style="width:100%" role="img" aria-label="Similarity ' + sim + ' percent"><div class="tr-bar-fill" style="width:' + sim + '%"></div></div> <span class="mono">' + sim + '%</span></div>'
      + '<div class="conf-vs">' + sides + '</div>'
      + '<p class="dim" style="font-size:12px">Possible duplicate — originals are always preserved. Nothing is auto-deleted.</p>'
      + '<div class="conf-actions">'
      + '<button type="button" class="btn btn-ghost btn-sm" data-action="dup-review" data-id="' + esc(d.id) + '">REVIEW</button>'
      + '<button type="button" class="btn btn-ghost btn-sm" data-action="dup-confirm" data-id="' + esc(d.id) + '">MARK DUPLICATE</button>'
      + '<button type="button" class="btn btn-primary btn-sm" data-action="dup-keepboth" data-id="' + esc(d.id) + '">KEEP BOTH</button>'
      + '</div></div>';
  }).join('');

  return '<div class="page-head"><h1>POSSIBLE DUPLICATES</h1>'
    + '<p class="dim">Records that look alike. Confirm a duplicate or keep both — the decision is always yours.</p></div>'
    + (cards || '<div class="empty-state"><h3>NO DUPLICATES</h3><p>No possible-duplicate groups were detected.</p></div>');
}

/* ============================== VIEW: PRIVACY ============================== */

var PRIVACY_ROWS = [
  ['phones', 'Phone numbers', '+91 9812345621', 'Masks the middle digits of phone numbers.'],
  ['emails', 'Email addresses', 'dsharma@example.com', 'Keeps the first two characters and the domain.'],
  ['txnIds', 'Transaction IDs', 'TXN-7842', 'Hides all but the last four characters.'],
  ['upi', 'UPI handles', 'dsharma@upi', 'Keeps the first two characters, masks the rest.'],
  ['accounts', 'Account numbers', '501000123456', 'Shows only the last four digits.'],
  ['urls', 'URLs', 'https://fastpay-collect.in/pay/abc123', 'Shows a fragment of the host, drops the path.']
];

function vPrivacy() {
  var rows = PRIVACY_ROWS.map(function (r) {
    var on = S.privacy[r[0]];
    var sample = on ? MASK[r[0]](r[2]) : r[2];
    return '<div class="priv-row"><div class="priv-info"><div class="priv-name">🔒 ' + r[1] + '</div>'
      + '<div class="dim" style="font-size:12px">' + r[3] + '</div>'
      + '<div class="mono priv-sample">' + esc(sample) + '</div></div>'
      + '<label class="switch" aria-label="Mask ' + r[1] + '"><input type="checkbox" data-change="privacy" data-key="' + r[0] + '"' + (on ? ' checked' : '') + '><span class="slider"></span></label></div>';
  }).join('');

  return '<div class="page-head"><h1>🔒 PRIVACY &amp; REDACTION</h1>'
    + '<p class="dim"><strong>MASKED BY DEFAULT · PRIVATE CASE.</strong> Identifiers are redacted everywhere — evidence, timeline, graph, assistant and the exported report. Toggle a category to preview unmasked values.</p></div>'
    + '<div class="panel">' + rows + '</div>'
    + '<p class="dim" style="font-size:12px">Extracted identifier fields and free-text descriptions are scanned and masked according to the toggles above. Turn a toggle off to reveal that category.</p>';
}

/* ============================== VIEW: ASSUMPTIONS ============================== */

function vAssumptions() {
  var aCards = (TD.assumptions || []).map(function (a) {
    return '<div class="panel"><div class="conf-head"><span class="mono dim">ASSUMPTION · ' + esc(a.id) + '</span>'
      + '<span><span class="inf-label">SYSTEM INFERENCE</span> <span class="badge b-verified">LOGGED</span></span></div>'
      + '<h3 style="margin:8px 0">' + esc(scrubText(a.text)) + '</h3>'
      + '<p style="font-size:13px;color:#D1D5DB"><span class="dim">REASON — </span>' + esc(scrubText(a.reason)) + '</p>'
      + '<div style="margin:8px 0"><span class="dim" style="font-size:12px">AFFECTED EVIDENCE </span>' + (a.evidenceIds || []).map(evChip).join('') + '</div>'
      + '<div>' + confBar(a.confidence) + '</div></div>';
  }).join('');

  var uCards = (TD.unresolved || []).map(function (u) {
    return '<div class="panel"><div class="conf-head"><span class="mono" style="color:#FBBF24">UNRESOLVED · ' + esc(u.id) + '</span>'
      + '<span class="badge b-review">NEEDS HUMAN REVIEW</span></div>'
      + '<h3 style="margin:8px 0">' + esc(scrubText(u.text)) + '</h3>'
      + '<div style="margin:8px 0"><span class="dim" style="font-size:12px">EVIDENCE </span>' + (u.evidenceIds || []).map(evChip).join('') + '</div></div>';
  }).join('');

  return '<div class="page-head"><h1>ASSUMPTIONS &amp; UNRESOLVED ISSUES</h1>'
    + '<p class="dim">Everything the system inferred on its own is logged here — labelled, reasoned and open to challenge.</p></div>'
    + '<div class="tr-sec">SYSTEM INFERENCES</div>' + (aCards || '<div class="empty-state"><p>No assumptions logged.</p></div>')
    + '<div class="tr-sec" style="margin-top:20px">UNRESOLVED ISSUES</div>' + (uCards || '<div class="empty-state"><p>No unresolved issues.</p></div>');
}

/* ============================== VIEW: ASSISTANT ============================== */

var ASK_SUGGESTIONS = [
  'What happened chronologically?',
  'Show all transactions.',
  'Why is this record flagged?',
  'What information is missing?',
  'Which evidence references this transaction?',
  'Show conflicting amounts.',
  'Which records are duplicates?',
  'Summarize the incident.'
];

function answerAsk(q) {
  var l = q.toLowerCase();
  var txns = S.evidence.filter(function (e) { return e.kind === 'transaction'; });

  if (/duplicat/.test(l)) {
    var ds = TD.duplicates || [];
    return ds.length
      ? 'Possible-duplicate groups detected:<br>' + ds.map(function (d) {
          return '• <span class="mono">' + esc(d.id) + '</span> (' + esc(String(d.similarity)) + '% similarity): ' + (d.evidenceIds || []).map(evChip).join(' ');
        }).join('<br>') + '<br><span class="dim">Originals are always preserved — nothing is auto-deleted.</span>'
      : 'No possible-duplicate groups were detected.';
  }
  if (/conflict/.test(l)) {
    var cs = (TD.contradictions || []).filter(function (c) { return /amount/i.test(c.field || ''); });
    var c0 = cs[0] || (TD.contradictions || [])[0];
    if (!c0) return 'No contradictions are currently on file.';
    return 'Contradiction <span class="mono">' + esc(c0.id) + '</span> — ' + esc(c0.title) + ':<br>'
      + '• ' + evChip(c0.evidenceA) + ' records <strong>' + esc(scrubText(c0.valueA)) + '</strong><br>'
      + '• ' + evChip(c0.evidenceB) + ' records <strong>' + esc(scrubText(c0.valueB)) + '</strong><br>'
      + '<span class="dim">' + esc(c0.reason) + ' Requires investigator review — the system does not decide which value is correct.</span>';
  }
  if (/missing|incomplete|gap/.test(l)) {
    var ms = TD.missing || [];
    var open = ms.filter(function (m) { return S.missRes[m.id] !== 'resolved'; });
    return open.length
      ? 'Open information gaps:<br>' + open.map(function (m) {
          return '• <span class="mono">' + esc(m.id) + '</span> — ' + esc(m.label) + ' (' + evChip(m.evidenceId) + ')';
        }).join('<br>') + '<br><a href="#/missing" style="color:#22D3EE">Open Missing Data →</a>'
      : 'No open information gaps. All missing items are resolved.';
  }
  if (/flag/.test(l)) {
    var e = getEv('EV-012');
    if (!e) return 'No flagged reference record found.';
    var cf = (TD.contradictions || []).find(function (c) { return c.evidenceA === 'EV-012' || c.evidenceB === 'EV-012'; });
    var dg = (TD.duplicates || []).find(function (d) { return (d.evidenceIds || []).indexOf('EV-012') >= 0; });
    return evChip('EV-012') + ' is flagged as a <strong>potential inconsistency</strong>:<br>'
      + '• Status: POTENTIAL CONFLICT — requires investigator review.<br>'
      + '• Recorded amount ' + esc(fmtINR(e.amount)) + (e.transactionId ? ' (<span class="mono">' + esc(R(e.transactionId, 'txnIds')) + '</span>)' : '')
      + ' differs from the amount visible in the related screenshot ' + evChip('EV-027') + '.<br>'
      + (cf ? '• Contradiction <span class="mono">' + esc(cf.id) + '</span>: ' + esc(cf.reason) + '<br>' : '')
      + (dg ? '• Also grouped as a possible duplicate (<span class="mono">' + esc(dg.id) + '</span>, ' + esc(String(dg.similarity)) + '% similarity).<br>' : '')
      + '<span class="dim">No conclusion has been drawn. ' + evChip('EV-012') + ' remains under review.</span>';
  }
  if (/txn-7842|this transaction/.test(l)) {
    var refs = S.evidence.filter(function (e) {
      return (e.transactionId && e.transactionId.indexOf('7842') >= 0) ||
        ((e.entities && e.entities.txnIds) || []).some(function (t) { return String(t).indexOf('7842') >= 0; });
    });
    return refs.length
      ? 'Transaction <span class="mono">' + esc(R('TXN-7842', 'txnIds')) + '</span> is referenced by:<br>'
        + refs.map(function (r) { return '• ' + evChip(r.id) + ' <span class="dim">' + esc(r.label).slice(0, 60) + '</span>'; }).join('<br>')
      : 'No evidence currently references TXN-7842.';
  }
  if (/summar/.test(l)) {
    var m = computeMetrics();
    return 'Neutral incident summary: the case file contains <strong>' + m.total + ' evidence records</strong> spanning <strong>' + esc(m.timeSpan) + '</strong>. '
      + '<strong>' + m.txnCount + ' transactions</strong> total <strong>' + esc(fmtINR(m.totalAmount)) + '</strong>. '
      + '<strong>' + m.conflicts + ' potential contradictions</strong>, <strong>' + (TD.duplicates || []).length + ' possible-duplicate groups</strong> and '
      + '<strong>' + m.incomplete + ' incomplete records</strong> are open for review. '
      + '<span class="dim">These are observations only — TRACE draws no conclusions about wrongdoing.</span>';
  }
  if (/chronolog|what happened|timeline/.test(l)) {
    var evs = S.evidence.filter(function (e) { return !!e.timestamp; })
      .sort(function (a, b) { return new Date(a.timestamp) - new Date(b.timestamp); }).slice(0, 6);
    return 'Key events in chronological order:<br>' + evs.map(function (e) {
      return '• <span class="mono">' + esc(fmtTime(e.timestamp)) + '</span> — ' + esc(e.label).slice(0, 60) + ' ' + evChip(e.id);
    }).join('<br>') + '<br><a href="#/timeline" style="color:#22D3EE">Open full timeline →</a>';
  }
  if (/transaction/.test(l)) {
    return txns.length
      ? 'Transactions on file:<br>' + txns.map(function (t) {
          return '• ' + evChip(t.id) + ' <strong>' + esc(fmtINR(t.amount)) + '</strong>'
            + (t.transactionId ? ' <span class="mono">' + esc(R(t.transactionId, 'txnIds')) + '</span>' : '')
            + ' <span class="dim">' + esc(t.timestamp ? fmtDateTime(t.timestamp) : 'no timestamp') + '</span>';
        }).join('<br>')
      : 'No transaction records on file.';
  }
  return 'I can answer from the evidence index — try one of the suggestions.';
}

function vAssistant() {
  var chips = ASK_SUGGESTIONS.map(function (s, i) {
    return '<button type="button" class="chip" data-action="ask" data-i="' + i + '">' + esc(s) + '</button>';
  }).join('');
  var log = S.chat.map(function (m) {
    return '<div class="ask-q"><span class="dim" style="font-size:11px">YOU</span><div>' + esc(m.q) + '</div></div>'
      + '<div class="ask-a"><span class="dim" style="font-size:11px">TRACE</span><div>' + m.a + '</div></div>';
  }).join('');

  return '<div class="page-head"><h1>ASK TRACE</h1>'
    + '<p class="dim">Answers come only from the evidence index. Every cited record opens its full trace.</p></div>'
    + '<div class="panel"><div class="tr-sec">ASK TRACE</div>'
    + '<div class="chip-row" style="margin-bottom:12px">' + chips + '</div>'
    + '<form data-form="ask" style="display:flex;gap:8px"><input id="ask-input" class="field" name="q" placeholder="Ask about the evidence…" aria-label="Ask a question about the evidence" autocomplete="off">'
    + '<button type="submit" class="btn btn-primary">ASK</button></form>'
    + '<div id="ask-log" style="margin-top:16px">' + (log || '<p class="dim">No questions yet — pick a suggestion or type your own.</p>') + '</div></div>';
}

function mountAssistant() {
  var i = document.getElementById('ask-input');
  if (i) i.focus();
}

/* ============================== VIEW: REPORT ============================== */

function vReport() {
  var m = computeMetrics();
  var cf = TD.caseFile;
  var openConf = (TD.contradictions || []).filter(function (c) { return S.confRes[c.id] !== 'dismissed'; }).length;
  var openMiss = (TD.missing || []).filter(function (ms) { return S.missRes[ms.id] !== 'resolved'; }).length;
  var openDup = (TD.duplicates || []).filter(function (d) { return !S.dupRes[d.id]; }).length;

  function sec(title, inner, inf) {
    return '<section class="rep-sec"><h2>' + title + ' ' + (inf ? '<span class="inf-label">SYSTEM INFERENCE</span>' : '<span class="obs-label">OBSERVED</span>') + '</h2>' + inner + '</section>';
  }

  var banner = '<div class="rep-attention" role="alert"><strong>ATTENTION REQUIRED</strong> — '
    + openConf + ' potential contradiction' + (openConf === 1 ? '' : 's') + ', '
    + openMiss + ' missing item' + (openMiss === 1 ? '' : 's') + ', '
    + openDup + ' possible-duplicate group' + (openDup === 1 ? '' : 's')
    + ' await investigator review. Figures computed from the current case file.</div>';

  var caseInfo = '<dl class="tr-kv">'
    + '<dt>CASE ID</dt><dd class="mono">' + esc(cf.id) + '</dd>'
    + '<dt>CASE NAME</dt><dd>' + esc(S.caseName) + '</dd>'
    + '<dt>TYPE</dt><dd>' + esc(cf.type || '—') + '</dd>'
    + '<dt>INVESTIGATOR</dt><dd>' + esc(cf.investigator || '—') + '</dd>'
    + '<dt>CREATED</dt><dd class="mono">' + esc(cf.created || '—') + '</dd>'
    + '<dt>STATUS</dt><dd>UNDER INVESTIGATION</dd>'
    + '<dt>PRIVACY</dt><dd>🔒 PRIVATE — identifiers redacted</dd></dl>';

  var execSum = '<p>The case file consolidates <strong>' + m.total + ' evidence records</strong> spanning <strong>' + esc(m.timeSpan) + '</strong>. '
    + '<strong>' + m.txnCount + ' transactions</strong> totalling <strong>' + esc(fmtINR(m.totalAmount)) + '</strong> were recorded across '
    + '<strong>' + m.contacts + ' contacts</strong>. Automated checks surfaced <strong>' + m.conflicts + ' potential contradictions</strong>, '
    + '<strong>' + (TD.duplicates || []).length + ' possible-duplicate groups</strong> and <strong>' + m.incomplete + ' incomplete records</strong>. '
    + 'All flagged items require human review. <strong>TRACE draws no conclusions about wrongdoing and assigns no guilt.</strong></p>';

  var metrics = '<div class="rep-metrics">'
    + [['Total evidence', m.total], ['Timestamped events', m.events], ['Transactions', m.txnCount],
       ['Total amount', fmtINR(m.totalAmount)], ['Contacts', m.contacts], ['Flagged', m.flagged],
       ['Duplicate records', m.dupCount], ['Incomplete', m.incomplete],
       ['Contradictions', m.conflicts], ['Time span', m.timeSpan]]
      .map(function (x) { return '<div class="rep-metric"><div class="rm-v">' + esc(String(x[1])) + '</div><div class="rm-l">' + x[0] + '</div></div>'; }).join('')
    + '</div>';

  var invRows = S.evidence.map(function (e) {
    return '<tr><td class="mono">' + esc(e.id) + '</td><td>' + esc(e.fileName || '—') + '</td>'
      + '<td>' + esc(kindLabel(e.kind)) + '</td><td class="mono">' + esc(e.timestamp ? fmtDateTime(e.timestamp) : '—') + '</td>'
      + '<td>' + esc(scrubText(e.source || '—')) + '</td><td>' + esc((e.status || '').toUpperCase()) + '</td></tr>';
  }).join('');
  var inventory = '<div class="table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>FILE</th><th>TYPE</th><th>TIMESTAMP</th><th>SOURCE</th><th>STATUS</th></tr></thead><tbody>' + invRows + '</tbody></table></div>';

  var tlRows = S.evidence.filter(function (e) { return !!e.timestamp; })
    .sort(function (a, b) { return new Date(a.timestamp) - new Date(b.timestamp); })
    .map(function (e) {
      return '<div class="rep-tl-row"><span class="mono">' + esc(fmtDateTime(e.timestamp)) + '</span> <span class="mono" style="color:#22D3EE">' + esc(e.id) + '</span> ' + esc(scrubText(e.label).slice(0, 80)) + '</div>';
    }).join('');

  var txnRows = S.evidence.filter(function (e) { return e.kind === 'transaction'; }).map(function (e) {
    return '<tr><td class="mono">' + esc(e.id) + '</td><td><strong>' + esc(fmtINR(e.amount)) + '</strong></td>'
      + '<td class="mono">' + esc(e.transactionId ? R(e.transactionId, 'txnIds') : '—') + '</td>'
      + '<td class="mono">' + esc(e.timestamp ? fmtDateTime(e.timestamp) : '—') + '</td><td>' + esc((e.status || '').toUpperCase()) + '</td></tr>';
  }).join('');
  var txnTable = txnRows ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>AMOUNT</th><th>TRANSACTION ID</th><th>TIMESTAMP</th><th>STATUS</th></tr></thead><tbody>' + txnRows + '</tbody></table></div>' : '<p class="dim">No transaction records.</p>';

  var dupRows = (TD.duplicates || []).map(function (d) {
    return '<div class="rep-item"><span class="mono" style="color:#FBBF24">' + esc(d.id) + '</span> — '
      + (d.evidenceIds || []).map(function (id) { return '<span class="mono">' + esc(id) + '</span>'; }).join(' · ')
      + ' <span class="dim">(' + esc(String(d.similarity)) + '% similarity)</span></div>';
  }).join('');

  var confRows = (TD.contradictions || []).map(function (c) {
    var st = S.confRes[c.id];
    return '<div class="rep-item"><span class="mono" style="color:#F87171">' + esc(c.id) + '</span> <strong>' + esc(c.title) + '</strong><br>'
      + '<span class="mono">' + esc(c.evidenceA) + '</span> (' + esc(scrubText(c.valueA)) + ') vs <span class="mono">' + esc(c.evidenceB) + '</span> (' + esc(scrubText(c.valueB)) + ')<br>'
      + '<span class="dim">' + esc(scrubText(c.reason)) + '</span> — <strong>' + (st ? st.toUpperCase() : 'REQUIRES INVESTIGATOR REVIEW') + '</strong></div>';
  }).join('');

  var missRows = (TD.missing || []).map(function (ms) {
    return '<div class="rep-item"><span class="mono" style="color:#FBBF24">' + esc(ms.id) + '</span> — ' + esc(ms.label)
      + ' <span class="dim">(field: <span class="mono">' + esc(ms.field) + '</span>, evidence <span class="mono">' + esc(ms.evidenceId) + '</span>)</span><br>'
      + '<span class="dim">' + esc(ms.why) + '</span> — <strong>' + (S.missRes[ms.id] === 'resolved' ? 'RESOLVED' : 'OPEN') + '</strong></div>';
  }).join('');

  var assRows = (TD.assumptions || []).map(function (a) {
    return '<div class="rep-item"><span class="inf-label">SYSTEM INFERENCE</span> <span class="mono dim">' + esc(a.id) + '</span> — ' + esc(scrubText(a.text))
      + '<br><span class="dim">Reason: ' + esc(scrubText(a.reason)) + ' · Confidence ' + esc(confPct(a.confidence)) + ' · Status: logged</span></div>';
  }).join('');

  var unrRows = (TD.unresolved || []).map(function (u) {
    return '<div class="rep-item"><span class="mono" style="color:#FBBF24">' + esc(u.id) + '</span> — ' + esc(scrubText(u.text))
      + ' <span class="dim">— needs human review</span></div>';
  }).join('');

  var privRows = PRIVACY_ROWS.map(function (r) {
    return '<div class="rep-item">🔒 ' + r[1] + ' — <strong>' + (S.privacy[r[0]] ? 'MASKED' : 'VISIBLE') + '</strong></div>';
  }).join('');

  var noteItems = [];
  Object.keys(S.notes).forEach(function (id) {
    (S.notes[id] || []).forEach(function (n) { noteItems.push({ id: id, n: n }); });
  });
  var notesHtml = noteItems.length
    ? noteItems.map(function (x) {
        return '<div class="rep-item"><span class="mono" style="color:#22D3EE">' + esc(x.id) + '</span> — ' + esc(scrubText(x.n.text)) + ' <span class="dim">(' + esc(x.n.ts) + ')</span></div>';
      }).join('')
    : '<p class="dim">No investigator notes recorded.</p>';

  var traceRows = S.evidence.map(function (e) {
    return '<div class="rep-item"><span class="mono" style="color:#22D3EE">' + esc(e.id) + '</span> ← source file <span class="mono">' + esc(e.fileName || 'ingested record') + '</span> <span class="dim">(' + esc(scrubText(e.source || '')) + ')</span></div>';
  }).join('');

  return '<div class="page-head no-print"><h1>INCIDENT REPORT</h1>'
    + '<p class="dim">Generated from the live case file. Identifiers are redacted; no raw PII appears in this report.</p>'
    + '<div style="display:flex;gap:10px;margin-top:12px"><button type="button" class="btn btn-primary" data-action="export-pdf">EXPORT PDF</button>'
    + '<button type="button" class="btn btn-ghost" data-action="export-csv">EXPORT CSV</button></div></div>'
    + '<div id="report-doc" class="panel">'
    + '<div class="rep-header"><div style="display:flex;align-items:center;gap:12px">' + logoSVG() + '<span class="rep-brand">TRACE</span></div>'
    + '<h1>DIGITAL INCIDENT REPORT</h1><div class="dim">Case <span class="mono">' + esc(cf.id) + '</span> · Generated ' + esc(fmtDateTime(nowISO())) + ' · <span class="obs-label">OBSERVED</span></div></div>'
    + banner
    + sec('CASE INFORMATION', caseInfo, false)
    + sec('EXECUTIVE SUMMARY', execSum, true)
    + sec('SUMMARY METRICS', metrics, false)
    + sec('EVIDENCE INVENTORY', inventory, false)
    + sec('CHRONOLOGICAL TIMELINE', '<div>' + tlRows + '</div>', false)
    + sec('TRANSACTIONS', txnTable, false)
    + sec('POSSIBLE DUPLICATES', dupRows || '<p class="dim">None detected.</p>', false)
    + sec('CONTRADICTIONS', confRows || '<p class="dim">None detected.</p>', false)
    + sec('MISSING INFORMATION', missRows || '<p class="dim">None open.</p>', false)
    + sec('ASSUMPTIONS', assRows || '<p class="dim">None logged.</p>', true)
    + sec('UNRESOLVED ISSUES', unrRows || '<p class="dim">None.</p>', false)
    + sec('PRIVACY / REDACTION', '<p>All identifier categories are masked by default in this private case. Current export state:</p>' + privRows, false)
    + sec('INVESTIGATION NOTES', notesHtml, false)
    + sec('SOURCE TRACEABILITY', '<div>' + traceRows + '</div>', false)
    + '<p class="dim rep-foot">TRACE organizes evidence and flags potential inconsistencies for human investigators. It does not declare fraud, assign guilt, or replace investigator judgment.</p>'
    + '</div>';
}

function csvCell(v) {
  var s = String(v == null ? '' : v);
  return '"' + s.replace(/"/g, '""') + '"';
}

function exportCSV() {
  var head = ['Evidence ID', 'Timestamp', 'Event Type', 'Description', 'Amount', 'Currency', 'Transaction ID', 'Phone', 'URL', 'Source', 'Evidence Type', 'Status', 'Confidence', 'Duplicate Status', 'Conflict Status', 'Missing Fields', 'Privacy Status'];
  var lines = [head.map(csvCell).join(',')];
  S.evidence.forEach(function (e) {
    lines.push([
      e.id, e.timestamp || '', e.eventType || '', scrubText(e.description || ''),
      e.amount != null ? e.amount : '', e.currency || 'INR',
      e.transactionId ? R(e.transactionId, 'txnIds') : '',
      e.phone ? R(e.phone, 'phones') : '',
      e.url ? R(e.url, 'urls') : '',
      scrubText(e.source || ''), kindLabel(e.kind), (e.status || '').toUpperCase(),
      confPct(e.confidence), e.duplicateGroup || '—',
      (e.conflictIds || []).length || (e.status === 'conflict') ? 'Potential conflict' : '—',
      (e.missingFields || []).join('; '), 'Masked'
    ].map(csvCell).join(','));
  });
  var blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'trace-evidence-export.csv';
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  toast('CSV exported: trace-evidence-export.csv', 'ok');
}

/* ============================== EVENT DELEGATION ============================== */

function doAsk(q) {
  q = String(q || '').trim();
  if (!q) return;
  S.chat.push({ q: q, a: answerAsk(q) });
  render(false);
}

var ACTIONS = {
  'demo': function () { setAuthed(); location.hash = '#/overview'; },
  'open-drawer': function (el) { openDrawer(el.dataset.id); },
  'close-drawer': function () { closeDrawer(); },
  'view-original': function () { toast('Original preserved in case vault (demo)'); },
  'link-ev': function () { var r = document.getElementById('link-row'); if (r) r.hidden = !r.hidden; },
  'link-confirm': function (el) {
    var sel = document.getElementById('link-select');
    var a = getEv(el.dataset.id), b = sel && getEv(sel.value);
    if (!a || !b) { toast('Select a record to link.', 'warn'); return; }
    if (a.relatedIds.indexOf(b.id) < 0) a.relatedIds.push(b.id);
    if (b.relatedIds.indexOf(a.id) < 0) b.relatedIds.push(a.id);
    toast('Evidence linked: ' + a.id + ' ↔ ' + b.id, 'ok');
    renderDrawer();
  },
  'flag-toggle': function (el) {
    var id = el.dataset.id;
    S.flagged[id] = !S.flagged[id];
    toast(S.flagged[id] ? id + ' flagged for review.' : id + ' unflagged.', S.flagged[id] ? 'warn' : 'info');
    renderDrawer();
  },
  'focus-note': function () { var i = document.getElementById('drawer-note-input'); if (i) i.focus(); },
  'mark-reviewed': function (el) {
    S.reviewed[el.dataset.id] = true;
    toast(el.dataset.id + ' marked as reviewed.', 'ok');
    renderDrawer();
  },
  'trace': function (el) { openTrace(el.dataset.key); },
  'ev-type': function (el) { S.filter.type = el.dataset.t; render(false); },
  'tl-expand': function (el) {
    var id = el.dataset.id;
    S.tlExpanded = (S.tlExpanded === id) ? null : id;
    render(false);
  },
  'graph-node': function (el) {
    var nid = el.dataset.node;
    var node = graphNeighborhood(nid);
    if (!node) return;
    if (node.ev) { openDrawer(node.ev.id); return; }
    if (node.kind === '__phone__' || node.kind === '__url__') {
      var wrap = document.getElementById('graph-wrap');
      var D = wrap && wrap._graphData;
      var linked = D ? D.evNodes.filter(function (o) {
        return node.kind === '__phone__'
          ? ([o.phone].concat((o.entities && o.entities.phones) || []).indexOf(node.raw) >= 0)
          : ([o.url].concat((o.entities && o.entities.urls) || []).indexOf(node.raw) >= 0);
      }) : [];
      _lastFocus = document.activeElement;
      S.drawerId = '__trace__';
      var root = document.getElementById('drawer-root');
      root.innerHTML = '<div class="tr-drawer-overlay" data-action="close-drawer" aria-hidden="true"></div>'
        + '<aside class="tr-drawer" role="dialog" aria-modal="true" aria-label="Identifier traceability">'
        + '<div class="tr-drawer-head"><div style="flex:1"><div class="tr-sec">IDENTIFIER TRACEABILITY</div>'
        + '<div class="mono" style="font-size:15px;color:#22D3EE">' + esc(node.label) + '</div>'
        + '<div class="dim" style="font-size:13px;margin-top:4px">' + linked.length + ' evidence record(s) reference this ' + node.sub.toLowerCase() + '.</div></div>'
        + '<button type="button" class="btn btn-ghost btn-sm" data-action="close-drawer" aria-label="Close panel">✕</button></div>'
        + '<div class="tr-drawer-body">' + (linked.map(function (e) { return evLine(e, ''); }).join('') || '<div class="empty-state"><p>No linked records.</p></div>') + '</div></aside>';
      document.addEventListener('keydown', drawerKey);
    }
  },
  'conf-reviewed': function (el) { S.confRes[el.dataset.id] = 'reviewed'; toast(el.dataset.id + ' marked as reviewed.', 'ok'); render(false); },
  'conf-escalate': function (el) { S.confRes[el.dataset.id] = 'escalated'; toast(el.dataset.id + ' escalated to a senior investigator.', 'warn'); render(false); },
  'conf-dismiss': function (el) { S.confRes[el.dataset.id] = 'dismissed'; toast(el.dataset.id + ' dismissed. The flag is hidden from the attention banner.', 'info'); render(false); },
  'miss-addinfo': function (el) { var id = el.dataset.id; S.missEdit = (S.missEdit === id) ? null : id; render(false); },
  'miss-resolve': function (el) { S.missRes[el.dataset.id] = 'resolved'; toast(el.dataset.id + ' marked as resolved.', 'ok'); render(false); },
  'dup-review': function (el) {
    var d = (TD.duplicates || []).find(function (x) { return x.id === el.dataset.id; });
    if (d && d.evidenceIds && d.evidenceIds[0]) openDrawer(d.evidenceIds[0]);
  },
  'dup-confirm': function (el) { S.dupRes[el.dataset.id] = 'confirmed'; toast(el.dataset.id + ' marked as a potential duplicate. Originals preserved.', 'warn'); render(false); },
  'dup-keepboth': function (el) { S.dupRes[el.dataset.id] = 'kept-both'; toast('Both records kept in ' + el.dataset.id + '.', 'ok'); render(false); },
  'schema-accept': function (el) { S.schema[+el.dataset.idx].status = 'accepted'; toast('Mapping accepted.', 'ok'); render(false); },
  'schema-edit': function (el) { S.schemaEdit = +el.dataset.idx; render(false); },
  'schema-cancel': function () { S.schemaEdit = -1; render(false); },
  'schema-save': function (el) {
    var idx = +el.dataset.idx;
    var sel = document.getElementById('schema-field-edit');
    if (sel) S.schema[idx].traceField = sel.value;
    S.schema[idx].status = 'edited';
    S.schemaEdit = -1;
    toast('Mapping updated.', 'ok');
    render(false);
  },
  'ask': function (el) { doAsk(ASK_SUGGESTIONS[+el.dataset.i]); },
  'export-pdf': function () { toast('Opening print view — use "Save as PDF".'); window.print(); },
  'export-csv': function () { exportCSV(); },
  'imp-chip': function (el) { S.impKind = el.dataset.kind; render(false); },
  'case-rename-open': function () { S.caseRename = true; render(false); },
  'case-rename-cancel': function () { S.caseRename = false; render(false); }
};

var FORMS = {
  'auth-phone': function (f) {
    var raw = (f.phone.value || '').replace(/\D/g, '');
    if (raw.length === 12 && raw.indexOf('91') === 0) raw = raw.slice(2);
    var err = document.getElementById('phone-error');
    if (raw.length !== 10) {
      if (err) err.hidden = false;
      var card = f.closest('.auth-card');
      if (card) { card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); }
      return;
    }
    S.otpSent = true;
    render(false);
    toast('Verification code sent (demo).');
  },
  'auth-otp': function (f) {
    var code = $all('.otp-box', f).map(function (b) { return b.value; }).join('');
    var err = document.getElementById('otp-error');
    if (code === '123456') {
      setAuthed();
      S.otpSent = false;
      location.hash = '#/case';
    } else {
      if (err) err.hidden = false;
      var card = document.getElementById('otp-card');
      if (card) { card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); }
    }
  },
  'case-create': function (f) {
    var name = (f.name.value || '').trim();
    if (!name) { toast('Give the case a name first.', 'warn'); return; }
    S.caseName = name;
    toast('Case created: ' + name, 'ok');
    render(false);
  },
  'case-rename': function (f) {
    var name = (f.name.value || '').trim();
    if (name) S.caseName = name;
    S.caseRename = false;
    toast('Case renamed.', 'ok');
    render(false);
  },
  'imp-note': function (f) {
    var text = (f.text.value || '').trim();
    if (!text) { toast('Paste some text first.', 'warn'); return; }
    var ev = makeEvidence({ kind: 'note', label: text.slice(0, 60), description: text, source: 'Pasted text', eventType: 'Note' });
    S.evidence.push(ev);
    toast('Evidence added: ' + ev.id, 'ok');
    render(false);
  },
  'imp-url': function (f) {
    var url = (f.url.value || '').trim();
    if (!url) { toast('Enter a URL first.', 'warn'); return; }
    var label = (f.label.value || '').trim() || url;
    var ev = makeEvidence({ kind: 'url', label: label, url: url, fileName: '', source: 'Manual URL', eventType: 'URL capture', description: 'Manually added URL: ' + url, entities: { phones: [], urls: [url], amounts: [], txnIds: [], emails: [] } });
    S.evidence.push(ev);
    toast('Evidence added: ' + ev.id, 'ok');
    render(false);
  },
  'imp-txn': function (f) {
    var amt = parseFloat((f.amount.value || '').replace(/[^0-9.]/g, ''));
    var txnid = (f.txnid.value || '').trim();
    var label = (f.label.value || '').trim() || 'Manual transaction';
    var ev = makeEvidence({ kind: 'transaction', label: label, amount: isNaN(amt) ? null : amt, transactionId: txnid, source: 'Manual entry', eventType: 'Transaction', description: label + (txnid ? ' · ' + txnid : ''), entities: { phones: [], urls: [], amounts: isNaN(amt) ? [] : [amt], txnIds: txnid ? [txnid] : [], emails: [] }, status: (isNaN(amt) || !txnid) ? 'incomplete' : 'needs-review', missingFields: (isNaN(amt) || !txnid) ? ['amount', 'transactionId'].filter(function (k, i) { return i === 0 ? isNaN(amt) : !txnid; }) : [] });
    S.evidence.push(ev);
    toast('Evidence added: ' + ev.id, 'ok');
    render(false);
  },
  'imp-msg': function (f) {
    var phone = (f.phone.value || '').trim();
    var text = (f.text.value || '').trim();
    if (!text) { toast('Enter the message text.', 'warn'); return; }
    var ev = makeEvidence({ kind: 'message', label: text.slice(0, 60), phone: phone, description: text, source: 'Manual message', eventType: 'Message', entities: { phones: phone ? [phone] : [], urls: [], amounts: [], txnIds: [], emails: [] } });
    S.evidence.push(ev);
    toast('Evidence added: ' + ev.id, 'ok');
    render(false);
  },
  'imp-call': function (f) {
    var phone = (f.phone.value || '').trim();
    var dur = (f.duration.value || '').trim();
    var label = (f.label.value || '').trim() || 'Call log';
    var ev = makeEvidence({ kind: 'calllog', label: label, phone: phone, source: 'Manual call log', eventType: 'Call', description: label + (phone ? ' · ' + phone : '') + (dur ? ' · ' + dur + ' min' : ''), entities: { phones: phone ? [phone] : [], urls: [], amounts: [], txnIds: [], emails: [] } });
    S.evidence.push(ev);
    toast('Evidence added: ' + ev.id, 'ok');
    render(false);
  },
  'drawer-note': function (f) {
    var id = f.dataset.id;
    var text = (f.note.value || '').trim();
    if (!text) { toast('Write a note first.', 'warn'); return; }
    (S.notes[id] = S.notes[id] || []).push({ text: text, ts: fmtDateTime(nowISO()) });
    toast('Note added to ' + id + '.', 'ok');
    renderDrawer();
  },
  'miss-info': function (f) {
    var ms = (TD.missing || []).find(function (x) { return x.id === f.dataset.id; });
    var ev = ms && getEv(ms.evidenceId);
    var val = (f.value.value || '').trim();
    if (!ms || !ev) { toast('Record not found.', 'err'); return; }
    if (!val) { toast('Enter a value first.', 'warn'); return; }
    ev[ms.field] = (ms.field === 'amount') ? (parseFloat(val.replace(/[^0-9.]/g, '')) || 0) : val;
    ev.missingFields = (ev.missingFields || []).filter(function (x) { return x !== ms.field; });
    if (!ev.missingFields.length && ev.status === 'incomplete') ev.status = 'needs-review';
    S.missRes[ms.id] = 'resolved';
    S.missEdit = null;
    toast('Information added — record updated.', 'ok');
    render(false);
  },
  'ask': function (f) {
    var q = f.q.value || '';
    doAsk(q);
  }
};

document.addEventListener('click', function (e) {
  var box = document.getElementById('search-results');
  if (box && !box.hidden && !e.target.closest('.search-wrap')) box.hidden = true;
  var el = e.target.closest ? e.target.closest('[data-action]') : null;
  if (!el) return;
  var fn = ACTIONS[el.dataset.action];
  if (fn) fn(el, e);
});

document.addEventListener('submit', function (e) {
  var f = e.target.closest ? e.target.closest('form[data-form]') : null;
  if (!f) return;
  e.preventDefault();
  var fn = FORMS[f.dataset.form];
  if (fn) fn(f);
});

document.addEventListener('change', function (e) {
  var el = e.target.closest ? e.target.closest('[data-change]') : null;
  if (!el) return;
  var kind = el.dataset.change;
  if (kind === 'privacy') {
    S.privacy[el.dataset.key] = el.checked;
    render(true);
  } else if (kind === 'ev-sort') {
    S.filter.sort = el.value;
    renderEvGrid();
  } else if (kind === 'tl-status') {
    S.filter.tlStatus = el.value;
    render(false);
  }
});

document.addEventListener('input', function (e) {
  if (e.target && e.target.id === 'ev-q') {
    S.filter.q = e.target.value;
    renderEvGrid();
  }
});

document.addEventListener('keydown', function (e) {
  if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.matches) {
    var g = e.target.matches('g[data-action="graph-node"]') ? e.target : null;
    var rb = e.target.matches('[role="button"][data-action]') ? e.target : null;
    var t = g || rb;
    if (t) {
      e.preventDefault();
      var fn = ACTIONS[t.dataset.action];
      if (fn) fn(t, e);
    }
  }
});

/* ============================== VIEW REGISTRY + INIT ============================== */

var VIEWS = {
  '/': vLanding, '/auth': vAuth, '/case': vCase, '/import': vImport,
  '/processing': vProcessing, '/schema': vSchema, '/overview': vOverview,
  '/evidence': vEvidence, '/timeline': vTimeline, '/graph': vGraph,
  '/flags': vFlags, '/missing': vMissing, '/duplicates': vDuplicates,
  '/privacy': vPrivacy, '/assumptions': vAssumptions, '/assistant': vAssistant,
  '/report': vReport
};

var MOUNTS = {
  '/': mountLanding, '/auth': mountAuth, '/import': mountImport,
  '/processing': mountProcessing, '/evidence': mountEvidence,
  '/graph': mountGraph, '/assistant': mountAssistant
};

document.addEventListener('DOMContentLoaded', function () {
  if (!document.getElementById('app')) {
    var d = document.createElement('div');
    d.id = 'app';
    document.body.appendChild(d);
  }
  if (!document.getElementById('drawer-root')) {
    var r = document.createElement('div');
    r.id = 'drawer-root';
    document.body.appendChild(r);
  }
  render(false);
});

})();
