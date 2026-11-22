/* ===================== DualBox core engine ===================== */
/* Runs 100% in the browser: no server, no upload. */
const NS_W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const NS_M = 'http://schemas.openxmlformats.org/officeDocument/2006/math';
const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const NS_V = 'urn:schemas-microsoft-com:vml';

/* ---------------- ZIP (read via DecompressionStream, write via CompressionStream) ---------------- */
async function inflateRaw(u8) {
  const s = new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
async function deflateRaw(u8) {
  const s = new Blob([u8]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
async function unzip(buf) {
  const u8 = new Uint8Array(buf), dv = new DataView(buf);
  let e = u8.length - 22;
  while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('এটি বৈধ .docx (zip) ফাইল নয়');
  const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true);
  const files = {}, td = new TextDecoder();
  for (let k = 0; k < n; k++) {
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
    const nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true);
    const lo = dv.getUint32(p + 42, true);
    const name = td.decode(u8.subarray(p + 46, p + 46 + nl));
    p += 46 + nl + xl + cl;
    const lnl = dv.getUint16(lo + 26, true), lxl = dv.getUint16(lo + 28, true);
    const data = u8.subarray(lo + 30 + lnl + lxl, lo + 30 + lnl + lxl + csize);
    files[name.replace(/^\//, '')] = method === 0 ? data.slice() : await inflateRaw(data);
  }
  return files;
}
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
async function zip(entries) { // entries: [{name, data:Uint8Array|string}]
  const te = new TextEncoder(), chunks = [], central = []; let off = 0;
  for (const en of entries) {
    const raw = typeof en.data === 'string' ? te.encode(en.data) : en.data;
    const comp = await deflateRaw(raw), crc = crc32(raw), nm = te.encode(en.name);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 8, true);
    h.setUint32(14, crc, true); h.setUint32(18, comp.length, true); h.setUint32(22, raw.length, true); h.setUint16(26, nm.length, true);
    chunks.push(new Uint8Array(h.buffer), nm, comp);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 8, true);
    c.setUint32(16, crc, true); c.setUint32(20, comp.length, true); c.setUint32(24, raw.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
    central.push(new Uint8Array(c.buffer), nm);
    off += 30 + nm.length + comp.length;
  }
  const cdSize = central.reduce((s, a) => s + a.length, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, entries.length, true); e.setUint16(10, entries.length, true);
  e.setUint32(12, cdSize, true); e.setUint32(16, off, true);
  return new Blob([...chunks, ...central, new Uint8Array(e.buffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

/* ---------------- Bijoy (SutonnyMJ) → Unicode ---------------- */
const PRE_E = '', PRE_AI = '', PRE_I = '', REPH = '';
const BIJOY_PAIRS = [
  ['i¨', 'র‍্য'], ['ª¨', '্র্য'], ['¯Œ', 'স্ক্র'], ['®Œ', 'ষ্ক্র'], ['š¿', 'ন্ত্র'], ['¯¿', 'স্ত্র'], ['•¶', 'ঙ্ক্ষ'], ['”Q¡', 'চ্ছ্ব'], ['¾¡', 'জ্জ্ব'], ['Ë¡', 'ত্ত্ব'], ['›Ø', 'ন্দ্ব'], ['¤£', 'ম্ভ্র'],
  ['K¡', 'ক্ব'], ['Mœ', 'গ্ন'], ['M¥', 'গ্ম'], ['Mø', 'গ্ল'], ['•L', 'ঙ্খ'], ['•N', 'ঙ্ঘ'], ['”P', 'চ্চ'], ['”Q', 'চ্ছ'], ['”T', 'চ্ঞ'],
  ['R¡', 'জ্ব'], ['U¡', 'ট্ব'], ['U¥', 'ট্ম'], ['Y^', 'ণ্ব'], ['Zœ', 'ত্ন'], ['Z¥', 'ত্ম'], ['Z¡', 'ত্ব'], ['_¡', 'থ্ব'], ['˜M', 'দ্গ'], ['˜N', 'দ্ঘ'], ['˜¡', 'দ্ব'], ['™¢', 'দ্ভ'],
  ['aŸ', 'ধ্ব'], ['a¥', 'ধ্ম'], ['›U', 'ন্ট'], ['š—', 'ন্ত'], ['š‘', 'ন্তু'], ['š’', 'ন্থ'], ['›`', 'ন্দ'], ['bœ', 'ন্ন'], ['š^', 'ন্ব'], ['b¥', 'ন্ম'], ['cœ', 'প্ন'], ['cø', 'প্ল'],
  ['d¬', 'ফ্ল'], ['eŸ', 'ব্ব'], ['eø', 'ব্ল'], ['gœ', 'ম্ন'], ['¤ú', 'ম্প'], ['¤^', 'ম্ব'], ['¤¢', 'ম্ভ'], ['¤§', 'ম্ম'], ['¤ø', 'ম্ল'], ['iæ', 'রু'], ['iƒ', 'রূ'],
  ['j¦', 'ল্ব'], ['j¥', 'ল্ম'], ['jø', 'ল্ল'], ['kœ', 'শ্ন'], ['k¦', 'শ্ব'], ['k¥', 'শ্ম'], ['kø', 'শ্ল'], ['®‹', 'ষ্ক'], ['®ú', 'ষ্প'], ['®§', 'ষ্ম'], ['¯‹', 'স্ক'],
  ['¯—', 'স্ত'], ['¯Í', 'স্ত'], ['¯‘', 'স্তু'], ['¯’', 'স্থ'], ['mœ', 'স্ন'], ['¯ú', 'স্প'], ['¯^', 'স্ব'], ['¯§', 'স্ম'], ['¯ø', 'স্ল'], ['nè', 'হ্ণ'], ['nŸ', 'হ্ব'], ['n¬', 'হ্ল'], ['||', '॥'],
  ['Av', 'আ'], ['A', 'অ'], ['B', 'ই'], ['C', 'ঈ'], ['D', 'উ'], ['E', 'ঊ'], ['F', 'ঋ'], ['G', 'এ'], ['H', 'ঐ'], ['I', 'ও'], ['J', 'ঔ'],
  ['K', 'ক'], ['L', 'খ'], ['M', 'গ'], ['N', 'ঘ'], ['O', 'ঙ'], ['P', 'চ'], ['Q', 'ছ'], ['R', 'জ'], ['S', 'ঝ'], ['T', 'ঞ'], ['U', 'ট'], ['V', 'ঠ'], ['W', 'ড'], ['X', 'ঢ'],
  ['Y', 'ণ'], ['Z', 'ত'], ['_', 'থ'], ['`', 'দ'], ['a', 'ধ'], ['b', 'ন'], ['c', 'প'], ['d', 'ফ'], ['e', 'ব'], ['f', 'ভ'], ['g', 'ম'], ['h', 'য'], ['i', 'র'], ['j', 'ল'],
  ['k', 'শ'], ['l', 'ষ'], ['m', 'স'], ['n', 'হ'], ['o', 'ড়'], ['p', 'ঢ়'], ['q', 'য়'], ['r', 'ৎ'], ['s', 'ং'], ['t', 'ঃ'], ['u', 'ঁ'],
  ['0', '০'], ['1', '১'], ['2', '২'], ['3', '৩'], ['4', '৪'], ['5', '৫'], ['6', '৬'], ['7', '৭'], ['8', '৮'], ['9', '৯'],
  ['v', 'া'], ['w', PRE_I], ['x', 'ী'], ['y', 'ু'], ['z', 'ু'], ['“', 'ু'], ['–', 'ু'], ['~', 'ূ'], ['ƒ', 'ূ'], ['‚', 'ূ'], ['„', 'ৃ'], ['…', 'ৃ'],
  ['†', PRE_E], ['‡', PRE_E], ['ˆ', PRE_AI], ['‰', PRE_AI], ['Š', 'ৗ'], ['|', '।'], ['&', '্‌'], ['^', '্ব'], ['‘', '্তু'], ['’', '্থ'], ['‹', '্ক'], ['Œ', '্ক্র'],
  ['”', 'চ'], ['—', '্ত'], ['Í', '্ত'], ['˜', 'দ'], ['™', 'দ'], ['š', 'ন'], ['›', 'ন'], ['œ', '্ন'], ['Ÿ', '্ব'], ['¡', '্ব'], ['¢', '্ভ'], ['£', '্ভ্র'], ['¤', 'ম'], ['¥', '্ম'],
  ['¦', '্ব'], ['§', '্ম'], ['¨', '্য'], ['©', REPH], ['ª', '্র'], ['«', '্র'], ['¬', '্ল'], ['­', '্ল'], ['®', 'ষ'], ['¯', 'স'], ['°', 'ক্ক'], ['±', 'ক্ট'], ['²', 'ক্ষ্ণ'],
  ['³', 'ক্ত'], ['´', 'ক্ম'], ['µ', 'ক্র'], ['¶', 'ক্ষ'], ['·', 'ক্স'], ['¸', 'গু'], ['¹', 'গ্জ'], ['º', 'গ্দ'], ['»', 'গ্ধ'], ['¼', 'ঙ্ক'], ['½', 'ঙ্গ'], ['¾', 'জ্জ'], ['¿', '্ত্র'],
  ['À', 'জ্ঝ'], ['Á', 'জ্ঞ'], ['Â', 'ঞ্চ'], ['Ã', 'ঞ্ছ'], ['Ä', 'ঞ্জ'], ['Å', 'ঞ্ঝ'], ['Æ', 'ট্ট'], ['Ç', 'ড্ড'], ['È', 'ণ্ট'], ['É', 'ণ্ঠ'], ['Ê', 'ণ্ড'], ['Ë', 'ত্ত'], ['Ì', 'ত্থ'],
  ['Î', 'ত্র'], ['Ï', 'দ্দ'], ['Ð', '-'], ['Ñ', '-'], ['Ò', '“'], ['Ó', '”'], ['Ô', '‘'], ['Õ', '’'], ['Ö', '্র'], ['×', 'দ্ধ'], ['Ø', 'দ্ব'], ['Ù', 'দ্ম'], ['Ú', 'ন্ঠ'], ['Û', 'ন্ড'],
  ['Ü', 'ন্ধ'], ['Ý', 'ন্স'], ['Þ', 'প্ট'], ['ß', 'প্ত'], ['à', 'প্প'], ['á', 'প্স'], ['â', 'ব্জ'], ['ã', 'ব্দ'], ['ä', 'ব্ধ'], ['å', 'ভ্র'], ['æ', 'ু'], ['ç', 'ম্ফ'], ['è', '্ণ'],
  ['é', 'ল্ক'], ['ê', 'ল্গ'], ['ë', 'ল্ট'], ['ì', 'ল্ড'], ['í', 'ল্প'], ['î', 'ল্ফ'], ['ï', 'শু'], ['ð', 'শ্চ'], ['ñ', 'শ্ছ'], ['ò', 'ষ্ণ'], ['ó', 'ষ্ট'], ['ô', 'ষ্ঠ'], ['õ', 'ষ্ফ'],
  ['ö', 'স্খ'], ['÷', 'স্ট'], ['ø', '্ল'], ['ù', 'স্ফ'], ['ú', '্প'], ['û', 'হু'], ['ü', 'হৃ'], ['ý', 'হ্ন'], ['þ', 'হ্ম'], ['ÿ', 'ক্ষ']
];
const BIJOY_MAP = new Map(BIJOY_PAIRS); const BIJOY_MAXLEN = Math.max(...BIJOY_PAIRS.map(p => p[0].length));
const isCons = c => c && ((c >= 'ক' && c <= 'হ') || c === 'ড়' || c === 'ঢ়' || c === 'য়');
const isKar = c => c && ((c >= 'া' && c <= 'ৌ') || c === 'ৗ' || c === 'ৃ');
function bijoyToUnicode(src) {
  let out = [];
  for (let i = 0; i < src.length;) {
    let hit = false;
    for (let L = Math.min(BIJOY_MAXLEN, src.length - i); L >= 1; L--) {
      const v = BIJOY_MAP.get(src.substr(i, L));
      if (v !== undefined) { out.push(...v); i += L; hit = true; break; }
    }
    if (!hit) { out.push(src[i]); i++; }
  }
  // move pre-kars after the following consonant cluster
  for (let i = 0; i < out.length; i++) {
    const m = out[i];
    if (m !== PRE_E && m !== PRE_AI && m !== PRE_I) continue;
    let j = i + 1;
    if (!isCons(out[j])) { out[i] = m === PRE_E ? 'ে' : m === PRE_AI ? 'ৈ' : 'ি'; continue; }
    j++; if (out[j] === '\u09BC') j++;
    while (out[j] === '্' && isCons(out[j + 1])) { j += 2; if (out[j] === '\u09BC') j++; }
    if (out[j] === '‍') j++;
    const cluster = out.slice(i + 1, j);
    let kar = m === PRE_E ? 'ে' : m === PRE_AI ? 'ৈ' : 'ি', extra = 0;
    if (m === PRE_E && out[j] === 'া') { kar = 'ো'; extra = 1; }
    else if (m === PRE_E && out[j] === 'ৗ') { kar = 'ৌ'; extra = 1; }
    out.splice(i, j - i + extra, ...cluster, kar);
    i += cluster.length;
  }
  // reph: move before the consonant cluster it belongs to
  for (let i = 0; i < out.length; i++) {
    if (out[i] !== REPH) continue;
    let j = i - 1;
    while (j >= 0 && (isKar(out[j]) || out[j] === '\u09BC')) j--;
    if (j >= 0 && isCons(out[j])) {
      while (j - 2 >= 0 && out[j - 1] === '্' && isCons(out[j - 2])) j -= 2;
      out.splice(i, 1); out.splice(j, 0, 'র', '্'); i++;
    } else out.splice(i, 1, 'র', '্');
  }
  return out.join('').replace(/([\u09C1-\u09C4])(\u09CD[\u09AF\u09B0])/g, '$2$1').replace(/\u09C7\u09BE/g, '\u09CB').replace(/\u09C7\u09D7/g, '\u09CC').normalize('NFC');
}
const BIJOY_FONT_RE = /MJ\b|MJ$|Sutonny|ANSI|Bijoy/i;
const hasBangla = s => /[ঀ-৿]/.test(s);

/* ---------------- docx → paragraphs of segments ---------------- */
const wAttr = (el, name) => el ? (el.getAttributeNS(NS_W, name) ?? el.getAttribute('w:' + name)) : null;
const kids = (el, ns, name) => Array.from(el ? el.childNodes : []).filter(n => n.nodeType === 1 && n.namespaceURI === ns && (!name || n.localName === name));
const kid = (el, ns, name) => kids(el, ns, name)[0] || null;
const onOff = el => { if (!el) return false; const v = wAttr(el, 'val'); return !(v === '0' || v === 'false' || v === 'off'); };

function readStyles(xmlStr) {
  const res = { def: null, styles: {} };
  if (!xmlStr) return res;
  const d = new DOMParser().parseFromString(xmlStr, 'application/xml');
  const fontOf = rPr => { const f = kid(rPr, NS_W, 'rFonts'); return f ? (wAttr(f, 'ascii') || wAttr(f, 'hAnsi')) : null; };
  const dd = d.getElementsByTagNameNS(NS_W, 'rPrDefault')[0];
  if (dd) res.def = fontOf(kid(dd, NS_W, 'rPr'));
  for (const s of d.getElementsByTagNameNS(NS_W, 'style')) {
    const id = wAttr(s, 'styleId'); const based = kid(s, NS_W, 'basedOn');
    res.styles[id] = { font: fontOf(kid(s, NS_W, 'rPr')), based: based ? wAttr(based, 'val') : null, isDefaultPara: wAttr(s, 'default') === '1' && wAttr(s, 'type') === 'paragraph' };
    if (res.styles[id].isDefaultPara) res.defaultPara = id;
  }
  return res;
}
function styleFont(st, id, depth = 0) { if (!id || depth > 10 || !st.styles[id]) return null; return st.styles[id].font || styleFont(st, st.styles[id].based, depth + 1); }

function relsMap(xmlStr) {
  const m = {}; if (!xmlStr) return m;
  const d = new DOMParser().parseFromString(xmlStr, 'application/xml');
  for (const r of d.getElementsByTagName('Relationship')) m[r.getAttribute('Id')] = { target: r.getAttribute('Target'), type: r.getAttribute('Type') };
  return m;
}

async function readDocx(buf) {
  const files = await unzip(buf); const td = new TextDecoder();
  const get = n => files[n] ? td.decode(files[n]) : null;
  const docXml = get('word/document.xml'); if (!docXml) throw new Error('word/document.xml পাওয়া যায়নি');
  const st = readStyles(get('word/styles.xml')); const rels = relsMap(get('word/_rels/document.xml.rels'));
  const d = new DOMParser().parseFromString(docXml, 'application/xml');
  const body = d.getElementsByTagNameNS(NS_W, 'body')[0];
  const paras = []; const ser = new XMLSerializer(); const warnings = [];
  const media = (rid) => { const r = rels[rid]; if (!r) return null; let t = r.target.replace(/^\//, ''); if (!t.startsWith('word/')) t = 'word/' + t; t = t.replace(/\/[^/]+\/\.\.\//g, '/'); return files[t] ? { name: t.split('/').pop(), data: files[t] } : null; };

  // header text (exam meta)
  const headerTexts = [];
  for (const n of Object.keys(files)) if (/^word\/header\d*\.xml$/.test(n)) {
    const hd = new DOMParser().parseFromString(td.decode(files[n]), 'application/xml');
    for (const p of hd.getElementsByTagNameNS(NS_W, 'p')) { const t = Array.from(p.getElementsByTagNameNS(NS_W, 't')).map(x => x.textContent).join('').trim(); if (t) headerTexts.push(t); }
  }

  for (const p of body.getElementsByTagNameNS(NS_W, 'p')) {
    if (p.parentNode && p.parentNode.namespaceURI === NS_W && p.parentNode.localName === 'txbxContent') continue;
    const pPr = kid(p, NS_W, 'pPr'); const pStyle = kid(pPr, NS_W, 'pStyle');
    const paraFont = styleFont(st, pStyle ? wAttr(pStyle, 'val') : st.defaultPara) || st.def;
    const segs = [];
    const walk = (node) => {
      for (const c of Array.from(node.childNodes)) {
        if (c.nodeType !== 1) continue;
        if (c.namespaceURI === NS_W) {
          if (c.localName === 'r') run(c);
          else if (['hyperlink', 'smartTag', 'ins', 'customXml', 'sdt', 'sdtContent', 'fldSimple', 'bdo', 'dir'].includes(c.localName)) walk(c);
        } else if (c.namespaceURI === NS_M && (c.localName === 'oMath' || c.localName === 'oMathPara')) {
          segs.push({ t: 'math', node: c, text: Array.from(c.getElementsByTagNameNS(NS_M, 't')).map(x => x.textContent).join('') });
        } else if (c.localName === 'AlternateContent') {
          const ch = Array.from(c.childNodes).find(x => x.localName === 'Choice') || Array.from(c.childNodes).find(x => x.localName === 'Fallback');
          if (ch) walk(ch);
        }
      }
    };
    const run = (r) => {
      const rPr = kid(r, NS_W, 'rPr'); const rf = kid(rPr, NS_W, 'rFonts'); const rs = kid(rPr, NS_W, 'rStyle');
      const font = (rf && (wAttr(rf, 'ascii') || wAttr(rf, 'hAnsi'))) || styleFont(st, rs ? wAttr(rs, 'val') : null) || paraFont || '';
      const va = kid(rPr, NS_W, 'vertAlign');
      const fmt = { b: onOff(kid(rPr, NS_W, 'b')), i: onOff(kid(rPr, NS_W, 'i')), u: !!kid(rPr, NS_W, 'u') && wAttr(kid(rPr, NS_W, 'u'), 'val') !== 'none', va: va ? wAttr(va, 'val') : null, hl: !!kid(rPr, NS_W, 'highlight') || !!kid(rPr, NS_W, 'shd') };
      const bij = BIJOY_FONT_RE.test(font);
      for (const c of Array.from(r.childNodes)) {
        if (c.nodeType !== 1) continue;
        const ln = c.localName;
        if (c.namespaceURI === NS_W && (ln === 't')) segs.push({ t: 'text', text: c.textContent, bij: bij && !hasBangla(c.textContent), ...fmt });
        else if (c.namespaceURI === NS_W && ln === 'tab') segs.push({ t: 'text', text: '\t', bij: false, ...fmt });
        else if (c.namespaceURI === NS_W && (ln === 'br' || ln === 'cr')) segs.push({ t: 'br' });
        else if (c.namespaceURI === NS_W && ln === 'sym') { const ch = wAttr(c, 'char'); segs.push({ t: 'text', text: /^F0(FC|D6)$/i.test(ch || '') ? '√' : '', bij: false, ...fmt }); }
        else if ((c.namespaceURI === NS_W && (ln === 'drawing' || ln === 'pict' || ln === 'object')) || ln === 'AlternateContent') {
          const imgs = [];
          for (const b of c.getElementsByTagNameNS(NS_A, 'blip')) { const id = b.getAttributeNS(NS_R, 'embed'); const m = media(id); if (m) imgs.push({ el: b, attr: 'embed', rid: id, m }); }
          for (const b of c.getElementsByTagNameNS(NS_V, 'imagedata')) { const id = b.getAttributeNS(NS_R, 'id'); const m = media(id); if (m) imgs.push({ el: b, attr: 'id', rid: id, m }); }
          if (ln === 'object') warnings.push('একটি OLE object (পুরনো Equation/চিত্র) পাওয়া গেছে — ছবি হিসেবে রাখা হয়েছে, Word-এ যাচাই করুন।');
          segs.push({ t: 'img', node: c, imgs });
        }
      }
    };
    walk(p);
    // math runs written in a Bijoy font → convert in place
    for (const s of segs) if (s.t === 'math') {
      for (const mr of s.node.getElementsByTagNameNS(NS_M, 'r')) {
        const rf = mr.getElementsByTagNameNS(NS_W, 'rFonts')[0]; const f = rf ? (wAttr(rf, 'ascii') || wAttr(rf, 'hAnsi')) : '';
        if (BIJOY_FONT_RE.test(f || '')) for (const t of mr.getElementsByTagNameNS(NS_M, 't')) if (!hasBangla(t.textContent)) t.textContent = bijoyToUnicode(t.textContent);
      }
      s.text = Array.from(s.node.getElementsByTagNameNS(NS_M, 't')).map(x => x.textContent).join('');
    }
    paras.push(convertBijoySegs(segs));
  }
  return { paras, headerTexts, warnings, ser };
}

// Merge consecutive Bijoy runs (so kars split across runs are handled), then convert.
function convertBijoySegs(segs) {
  const out = [];
  const sameFmt = (a, b) => a.b === b.b && a.i === b.i && a.u === b.u && a.va === b.va;
  for (const s of segs) {
    const prev = out[out.length - 1];
    if (s.t === 'text' && s.bij && prev && prev.t === 'text' && prev.bij) {
      const forced = /[†‡ˆ‰w]\s*$/.test(prev.text) || /^[©vxyz~„…Š¨ª«¬]/.test(s.text);
      if (sameFmt(prev, s) || forced) { prev.text += s.text; prev.hl = prev.hl || s.hl; continue; }
    }
    out.push({ ...s });
  }
  for (const s of out) if (s.t === 'text' && s.bij) { s.text = bijoyToUnicode(s.text); s.bij = false; }
  // join adjacent plain runs with identical format to keep output tidy
  const res = [];
  for (const s of out) { const p = res[res.length - 1]; if (s.t === 'text' && p && p.t === 'text' && p.b === s.b && p.i === s.i && p.u === s.u && p.va === s.va && p.hl === s.hl) p.text += s.text; else res.push(s); }
  return res;
}

/* ---------------- segment helpers ---------------- */
const BN_DIG = '০১২৩৪৫৬৭৮৯';
const normDigits = s => s.replace(/[০-৯]/g, d => BN_DIG.indexOf(d));
const segText = segs => segs.map(s => s.t === 'text' ? s.text : s.t === 'math' ? '\uFFFC' : s.t === 'img' ? '\uFFFD' : '\n').join('');
const isEmptyPara = segs => !segs.some(s => (s.t === 'text' && s.text.trim()) || s.t === 'math' || s.t === 'img');
function stripChars(segs, n) { // remove first n characters of text
  const out = []; let left = n;
  for (const s of segs) {
    if (left > 0) {
      if (s.t === 'text') { if (s.text.length <= left) { left -= s.text.length; continue; } out.push({ ...s, text: s.text.slice(left) }); left = 0; continue; }
      left -= 1; continue;
    }
    out.push(s);
  }
  return out;
}
function stripRegex(segs, re) { const m = segText(segs).match(re); return m ? stripChars(segs, m[0].length) : segs; }
function trimSegs(segs) {
  segs = segs.map(s => ({ ...s }));
  while (segs.length && segs[0].t === 'text' && !segs[0].text.trim()) segs.shift();
  if (segs.length && segs[0].t === 'text') segs[0].text = segs[0].text.replace(/^[\s ]+/, '');
  while (segs.length && ((segs[segs.length - 1].t === 'text' && !segs[segs.length - 1].text.trim()) || segs[segs.length - 1].t === 'br')) segs.pop();
  if (segs.length && segs[segs.length - 1].t === 'text') segs[segs.length - 1].text = segs[segs.length - 1].text.replace(/[\s ]+$/, '');
  return segs;
}
const removeTicks = segs => segs.map(s => s.t === 'text' ? { ...s, text: s.text.replace(/[√✓✔✅☑]/g, '') } : s);

/* ---------------- structure parser ---------------- */
const RE_Q = /^[\s ]*(?:Q\.?\s*|প্রশ্ন\s*)?(\d{1,3})\s*[.)।:]\s*/i;
const RE_OPT = /^[\s ]*([√✓✔✅☑]\s*)?[(\[]\s*([a-dA-Dকখগঘ])\s*[)\]]\s*([√✓✔✅☑]\s*)?/;
const RE_OPT2 = /^[\s ]*([√✓✔✅☑]\s*)?([a-dA-Dকখগঘ])\s*[).]\s+([√✓✔✅☑]\s*)?/;
const RE_SOLVE = /^[\s ]*(Solve|Solution|Explanation|Explain|Ans\.?\s*Explanation|ব্যাখ্যা|সমাধান|সমাধানঃ|উত্তর\s*ব্যাখ্যা)\s*[:：ঃ\-–]?\s*/i;
const RE_STEM = /(stem|passage|paragraph|figure|diagram|table|information|উদ্দীপক|অনুচ্ছেদ|চিত্র|সারণি|তথ্য|ছক).{0,60}(question|প্রশ্ন)|(question|প্রশ্ন).{0,60}(stem|passage|figure|উদ্দীপক|অনুচ্ছেদ|চিত্র|তথ্য|ছক)/i;
const OPT_IDX = { a: 0, b: 1, c: 2, d: 3, ক: 0, খ: 1, গ: 2, ঘ: 3 };
const WORD_NUM = { two: 2, three: 3, four: 4, five: 5, 'দুই': 2, 'দুটি': 2, 'দুইটি': 2, 'তিন': 3, 'তিনটি': 3, 'চার': 4, 'চারটি': 4, 'পাঁচ': 5, 'পাঁচটি': 5 };
function stemCount(text) {
  const t = normDigits(text);
  const m = t.match(/(\d+)\s*(?:টি|টা)?\s*(?:question|প্রশ্ন)/i); if (m) return +m[1];
  for (const [w, n] of Object.entries(WORD_NUM)) if (new RegExp('(^|[^a-zঀ-৿])' + w + '($|[^a-zঀ-৿])', 'i').test(t)) return n;
  return 0;
}

function parseStructure(paras) {
  const qs = [], stems = [], notes = [];
  let cur = null, stem = null, state = 'none', last = 0;
  for (const raw of paras) {
    if (isEmptyPara(raw)) continue;
    const txt = normDigits(segText(raw));
    const qm = txt.match(RE_Q);
    const om = txt.match(RE_OPT) || (state === 'question' || state === 'options' ? txt.match(RE_OPT2) : null);
    if (qm && +qm[1] > last && !(state === 'options' && om)) {
      cur = { num: +qm[1], body: [trimSegs(stripChars(raw, qm[0].length))], opts: [], ans: null, hlAns: null, expl: [] };
      if (stem && !stem.firstQ) stem.firstQ = cur.num;
      qs.push(cur); last = cur.num; state = 'question'; continue;
    }
    if (om && cur && (state === 'question' || state === 'options') && cur.opts.length < 4) {
      const idx = OPT_IDX[om[2].toLowerCase()] ?? OPT_IDX[om[2]];
      const ticked = !!(om[1] || om[3]) || /[√✓✔✅☑]\s*$/.test(txt);
      let segs = trimSegs(removeTicks(stripChars(raw, om[0].length)));
      if (ticked) { if (cur.ans !== null && cur.ans !== idx) notes.push(`প্রশ্ন ${cur.num}: একাধিক অপশনে টিক (√) আছে`); cur.ans = idx; }
      if (raw.some(s => s.t === 'text' && s.hl && s.text.trim())) cur.hlAns = idx;
      cur.opts[idx] = segs; state = 'options'; continue;
    }
    const sm = txt.match(RE_SOLVE);
    if (sm && cur && state !== 'stem') {
      const segs = trimSegs(stripChars(raw, sm[0].length));
      if (!isEmptyPara(segs)) cur.expl.push(segs);
      state = 'solve'; continue;
    }
    if (RE_STEM.test(txt) && txt.length < 220) {
      stem = { header: trimSegs(raw), body: [], count: stemCount(txt), firstQ: null };
      stems.push(stem); state = 'stem'; cur = null; continue;
    }
    if (state === 'stem' && stem) { stem.body.push(trimSegs(raw)); continue; }
    if (!cur) continue; // preamble / title lines
    if (state === 'question') cur.body.push(trimSegs(raw));
    else if (state === 'solve') cur.expl.push(trimSegs(raw));
    else if (state === 'options') { notes.push(`প্রশ্ন ${cur.num}: অপশনের পরে "Solve:" ছাড়া লাইন পাওয়া গেছে — ব্যাখ্যা হিসেবে ধরা হয়েছে`); cur.expl.push(trimSegs(raw)); state = 'solve'; }
  }
  for (const q of qs) {
    if (q.ans === null && q.hlAns !== null) { q.ans = q.hlAns; notes.push(`প্রশ্ন ${q.num}: √ চিহ্ন নেই, হাইলাইট দেখে উত্তর ধরা হয়েছে`); }
  }
  for (const s of stems) if (!s.count) s.count = 2;
  return { qs, stems, notes };
}

function parseHeaderMeta(texts) {
  const all = texts.join(' | ');
  const meta = {};
  const cls = texts.find(t => /class/i.test(t) && /program/i.test(t)); if (cls) meta.program = cls;
  const batch = all.match(/(\w+\s+Batch)/i); if (batch) meta.batch = batch[1];
  const exam = texts.find(t => /exam/i.test(t)); if (exam) meta.exam = exam;
  const code = all.match(/Code\s*[:\-]?\s*(\d+)/i); if (code) meta.code = code[1];
  const set = all.match(/Unique\s*Set\s*[:\-]?\s*(\d+)/i); if (set) meta.set = set[1];
  return meta;
}
const SUBJECT_CODES = [[/physics/i, 'PHY'], [/chem/i, 'CHE'], [/bio/i, 'BIO'], [/higher\s*math/i, 'HM'], [/math/i, 'MATH'], [/science/i, 'SCI'], [/english/i, 'ENG'], [/bangla/i, 'BAN'], [/ict/i, 'ICT'], [/geograph/i, 'GEO'], [/(bgs|bangladesh)/i, 'BGS'], [/religio|islam/i, 'REL'], [/account/i, 'ACC'], [/agri/i, 'AGR']];
const guessSubject = s => { for (const [re, c] of SUBJECT_CODES) if (re.test(s || '')) return c; return 'SCI'; };

/* ---------------- pairing + validation ---------------- */
function pairVersions(bn, en) {
  const issues = [], items = [];
  const bnMap = new Map(bn.qs.map(q => [q.num, q])), enMap = new Map(en.qs.map(q => [q.num, q]));
  const nums = [...new Set([...bnMap.keys(), ...enMap.keys()])].sort((a, b) => a - b);
  const L = ['A', 'B', 'C', 'D'];
  for (const n of nums) {
    const b = bnMap.get(n), e = enMap.get(n);
    const it = { num: n, bn: b, en: e, problems: [], answer: null };
    if (!b) it.problems.push('বাংলা ভার্সনে এই প্রশ্ন নেই');
    if (!e) it.problems.push('English ভার্সনে এই প্রশ্ন নেই');
    for (const [v, q] of [['বাংলা', b], ['English', e]]) if (q) {
      const c = [0, 1, 2, 3].filter(i => q.opts[i]).length;
      if (c !== 4) it.problems.push(`${v}: ${c}টি অপশন পাওয়া গেছে (৪টি হওয়ার কথা)`);
      if (q.ans === null) it.problems.push(`${v}: সঠিক উত্তর (√) পাওয়া যায়নি`);
    }
    const ba = b ? b.ans : null, ea = e ? e.ans : null;
    if (ba !== null && ea !== null && ba !== ea) it.problems.push(`উত্তর মিলছে না — বাংলা: ${L[ba]}, English: ${L[ea]}`);
    it.answer = ea !== null ? ea : ba;
    if (b && e && !!b.expl.length !== !!e.expl.length) it.warn = 'শুধু এক ভার্সনে ব্যাখ্যা আছে';
    items.push(it);
  }
  const stemPairs = [];
  const enStems = new Map(en.stems.map(s => [s.firstQ, s]));
  for (const s of bn.stems) {
    const e = enStems.get(s.firstQ); if (!e) issues.push(`প্রশ্ন ${s.firstQ}-এর আগের উদ্দীপক English ভার্সনে পাওয়া যায়নি`);
    stemPairs.push({ firstQ: s.firstQ, bn: s, en: e || null, count: (e && e.count) || s.count });
    if (e) enStems.delete(s.firstQ);
  }
  for (const e of enStems.values()) { issues.push(`প্রশ্ন ${e.firstQ}-এর আগের উদ্দীপক বাংলা ভার্সনে পাওয়া যায়নি`); stemPairs.push({ firstQ: e.firstQ, bn: null, en: e, count: e.count }); }
  if (bn.qs.length !== en.qs.length) issues.push(`প্রশ্ন সংখ্যা ভিন্ন — বাংলা: ${bn.qs.length}, English: ${en.qs.length}`);
  return { items, stemPairs, issues };
}


/* simple OMML (runs, sub/superscripts) → plain text segments; returns null if too complex */
const MATH_OK = new Set(['oMath', 'oMathPara', 'oMathParaPr', 'r', 't', 'rPr', 'sty', 'scr', 'nor', 'sSub', 'sSup', 'sSubSup', 'sSubPr', 'sSupPr', 'sSubSupPr', 'e', 'sub', 'sup', 'ctrlPr', 'jc', 'argPr', 'lit']);
function mathToSegs(node) {
  for (const el of node.getElementsByTagName('*')) if (el.namespaceURI === NS_M && !MATH_OK.has(el.localName)) return null;
  const segs = [];
  const walk = (n, va) => {
    for (const c of Array.from(n.childNodes)) {
      if (c.nodeType !== 1 || c.namespaceURI !== NS_M) continue;
      if (c.localName === 't') segs.push({ t: 'text', text: c.textContent, b: false, i: false, u: false, va });
      else if (c.localName === 'sub') walk(c, 'subscript');
      else if (c.localName === 'sup') walk(c, 'superscript');
      else walk(c, va);
    }
  };
  walk(node, null); return segs;
}

/* ---------------- Box docx writer ---------------- */
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const RE_BN_CHUNK = /([ঀ-৿‌‍]+(?:[\s ,.;:?!।\-–()'"“”‘’]*[ঀ-৿‌‍]+)*)/;
class BoxWriter {
  constructor() { this.media = []; this.rid = 100; this.docPr = 1000; this.ser = new XMLSerializer(); this.mediaByKey = new Map(); }
  rPr(s, font, size = 20) {
    let x = `<w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/>`;
    if (s.b) x += '<w:b/><w:bCs/>'; if (s.i) x += '<w:i/><w:iCs/>'; if (s.u) x += '<w:u w:val="single"/>';
    if (s.va === 'subscript' || s.va === 'superscript') x += `<w:vertAlign w:val="${s.va}"/>`;
    return `<w:rPr>${x}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr>`;
  }
  tRun(text, s, font) {
    return text.split('\t').map((part, k) => (k ? `<w:r>${this.rPr(s, font)}<w:tab/></w:r>` : '') + (part ? `<w:r>${this.rPr(s, font)}<w:t xml:space="preserve">${esc(part)}</w:t></w:r>` : '')).join('');
  }
  runs(segs, extra = {}) {
    let x = '';
    for (const s0 of segs) {
      const s = { ...s0, b: s0.b || extra.b };
      if (s.t === 'text') {
        const parts = s.text.split(RE_BN_CHUNK);
        parts.forEach((part, k) => { if (part) x += this.tRun(part, s, k % 2 ? 'SolaimanLipi' : 'Times New Roman'); });
      } else if (s.t === 'br') x += '<w:r><w:br/></w:r>';
      else if (s.t === 'math' && this.flatMath && mathToSegs(s.node)) x += this.runs(mathToSegs(s.node), extra);
      else if (s.t === 'math') {
        let m = this.ser.serializeToString(s.node);
        m = m.replace(/<w:sz w:val="\d+"\s*\/>/g, '<w:sz w:val="20"/>').replace(/<w:szCs w:val="\d+"\s*\/>/g, '<w:szCs w:val="20"/>');
        x += m;
      } else if (s.t === 'img') {
        for (const im of s.imgs) {
          const key = im.m.name + ':' + im.m.data.length;
          let rid = this.mediaByKey.get(key);
          if (!rid) { rid = 'rIdImg' + (this.rid++); const ext = (im.m.name.split('.').pop() || 'png').toLowerCase(); this.media.push({ rid, name: `image${this.rid}.${ext}`, ext, data: im.m.data }); this.mediaByKey.set(key, rid); }
          im.el.setAttributeNS(NS_R, 'r:' + im.attr, rid);
        }
        for (const dp of s.node.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing', 'docPr')) dp.setAttribute('id', String(this.docPr++));
        x += `<w:r>${this.ser.serializeToString(s.node)}</w:r>`;
      }
    }
    return x;
  }
  para(segs, extra) { return `<w:p><w:pPr><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr>${segs ? this.runs(segs, extra) : ''}</w:p>`; }
  plainPara(t) { return `<w:p><w:pPr/><w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r></w:p>`; }
  cell(inner, w = 2310) { return `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/></w:tcPr>${inner || this.para(null)}</w:tc>`; }
  paras(list, extra) { return (list && list.length) ? list.map(p => this.para(p, extra)).join('') : this.para(null); }
  row(a, b, w, cant) { return `<w:tr>${cant ? '<w:trPr><w:cantSplit/></w:trPr>' : ''}${this.cell(a, w)}${this.cell(b, w)}</w:tr>`; }
  tbl(rows, mar) { return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="5000" w:type="auto"/><w:jc w:val="left"/><w:tblCellMar>${mar}</w:tblCellMar><w:tblLook w:val="04A0"/></w:tblPr><w:tblGrid><w:gridCol w:w="2310"/><w:gridCol w:w="2310"/></w:tblGrid>${rows}</w:tbl>`; }
  gap() { return '<w:p><w:pPr><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr></w:p><w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>'; }
  question(it, subj, marks, displayNum) {
    const b = it.bn || {}, e = it.en || {};
    let r = this.row(this.plainPara(String(displayNum)), this.plainPara(subj), 4500, true);
    r += this.row(this.paras(b.body), this.paras(e.body));
    for (let i = 0; i < 4; i++) r += this.row(this.paras(b.opts && b.opts[i] ? [b.opts[i]] : null), this.paras(e.opts && e.opts[i] ? [e.opts[i]] : null));
    r += this.row(this.paras(b.expl), this.paras(e.expl));
    r += this.row(this.plainPara(it.answer === null ? '' : 'ABCD'[it.answer]), this.plainPara(String(marks)));
    return this.tbl(r, '<w:top w:w="2" w:type="dxa"/><w:left w:w="2" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:right w:w="2" w:type="dxa"/>') + this.gap();
  }
  stem(sp) {
    const side = s => s ? this.para(s.header, { b: true }) + s.body.map(p => this.para(p)).join('') : this.para(null);
    let r = this.row(side(sp.bn), side(sp.en), 4500, true);
    r += this.row(this.plainPara(String(sp.count)), this.plainPara('0'));
    return this.tbl(r, '<w:top w:w="10" w:type="dxa"/><w:left w:w="2" w:type="dxa"/><w:bottom w:w="2" w:type="dxa"/><w:right w:w="5" w:type="dxa"/>') + this.gap();
  }
  title(t) { return `<w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="SolaimanLipi"/><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r></w:p>`; }
}

async function buildBoxDocx(pair, opt) {
  const w = new BoxWriter(); w.flatMath = !!opt.flatMath;
  let body = '';
  if (opt.title1) body += w.title(opt.title1);
  if (opt.title2) body += w.title(opt.title2);
  if (opt.title1 || opt.title2) body += '<w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr></w:p>';
  const stemAt = new Map(pair.stemPairs.map(s => [s.firstQ, s]));
  pair.items.forEach((it, k) => {
    if (stemAt.has(it.num)) body += w.stem(stemAt.get(it.num));
    body += w.question(it, opt.subject || 'SCI', opt.marks ?? 1, opt.renumber ? k + 1 : it.num);
  });
  const doc = `<?xml version="1.0" encoding="utf-8" standalone="yes"?><w:document xmlns:ve="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="${NS_R}" xmlns:m="${NS_M}" xmlns:v="${NS_V}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="${NS_W}" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:a="${NS_A}" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="400" w:right="1000" w:bottom="600" w:left="800" w:header="708" w:footer="708" w:gutter="0"/><w:cols w:space="708"/><w:docGrid w:linePitch="360"/></w:sectPr></w:body></w:document>`;
  const styles = `<?xml version="1.0" encoding="utf-8" standalone="yes"?><w:styles xmlns:w="${NS_W}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:eastAsiaTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorBidi"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-US" w:eastAsia="en-US" w:bidi="bn-BD"/></w:rPr></w:rPrDefault><w:pPrDefault/></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style><w:style w:type="character" w:default="1" w:styleId="DefaultParagraphFont"><w:name w:val="Default Paragraph Font"/><w:uiPriority w:val="1"/><w:semiHidden/><w:unhideWhenUsed/></w:style><w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:uiPriority w:val="99"/><w:semiHidden/><w:unhideWhenUsed/><w:qFormat/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style><w:style w:type="numbering" w:default="1" w:styleId="NoList"><w:name w:val="No List"/><w:uiPriority w:val="99"/><w:semiHidden/><w:unhideWhenUsed/></w:style><w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:basedOn w:val="TableNormal"/><w:uiPriority w:val="59"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tblBorders><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>`;
  const settings = `<?xml version="1.0" encoding="utf-8" standalone="yes"?><w:settings xmlns:w="${NS_W}" xmlns:m="${NS_M}"><w:zoom w:percent="100"/><w:defaultTabStop w:val="720"/><w:characterSpacingControl w:val="doNotCompress"/><m:mathPr><m:mathFont m:val="Cambria Math"/><m:brkBin m:val="before"/><m:brkBinSub m:val="--"/><m:smallFrac m:val="off"/><m:dispDef/><m:lMargin m:val="0"/><m:rMargin m:val="0"/><m:defJc m:val="centerGroup"/><m:wrapIndent m:val="1440"/><m:intLim m:val="subSup"/><m:naryLim m:val="undOvr"/></m:mathPr><w:themeFontLang w:val="en-US" w:bidi="bn-BD"/></w:settings>`;
  const ctMap = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', emf: 'image/x-emf', wmf: 'image/x-wmf', tif: 'image/tiff', tiff: 'image/tiff', svg: 'image/svg+xml' };
  const exts = [...new Set(w.media.map(m => m.ext))];
  const ct = `<?xml version="1.0" encoding="utf-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>${exts.map(e => `<Default Extension="${e}" ContentType="${ctMap[e] || 'application/octet-stream'}"/>`).join('')}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/></Types>`;
  const rootRels = `<?xml version="1.0" encoding="utf-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  const docRels = `<?xml version="1.0" encoding="utf-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdS1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdS2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>${w.media.map(m => `<Relationship Id="${m.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${m.name}"/>`).join('')}</Relationships>`;
  return zip([
    { name: '[Content_Types].xml', data: ct }, { name: '_rels/.rels', data: rootRels },
    { name: 'word/document.xml', data: doc }, { name: 'word/styles.xml', data: styles }, { name: 'word/settings.xml', data: settings },
    { name: 'word/_rels/document.xml.rels', data: docRels },
    ...w.media.map(m => ({ name: 'word/media/' + m.name, data: m.data }))
  ]);
}

async function analyse(bnBuf, enBuf) {
  let [bnD, enD] = await Promise.all([readDocx(bnBuf), readDocx(enBuf)]);
  const bnCount = d => d.paras.reduce((n, p) => n + (segText(p).match(/[\u0980-\u09FF]/g) || []).length, 0);
  let swapped = false;
  if (bnCount(bnD) < bnCount(enD)) { [bnD, enD] = [enD, bnD]; swapped = true; }
  const bn = parseStructure(bnD.paras), en = parseStructure(enD.paras);
  const pair = pairVersions(bn, en);
  pair.notes = [...bn.notes.map(n => 'বাংলা — ' + n), ...en.notes.map(n => 'English — ' + n), ...bnD.warnings, ...enD.warnings];
  if (swapped) pair.notes.unshift('ফাইল দুটি উল্টো ঘরে দেওয়া হয়েছিল — স্বয়ংক্রিয়ভাবে ঠিক করে নেওয়া হয়েছে।');
  pair.swapped = swapped;
  pair.meta = parseHeaderMeta(enD.headerTexts.length ? enD.headerTexts : bnD.headerTexts);
  return pair;
}
