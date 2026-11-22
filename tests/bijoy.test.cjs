const fs = require('fs');
const src = fs.readFileSync(require('path').join(__dirname,'..','src','core.js'),'utf8').split('/* ---------------- docx → paragraphs')[0].replace(/^[\s\S]*?\/\* ---------------- Bijoy/, '/* Bijoy');
const f = new Function(src + '; return bijoyToUnicode;')();
const tests = [['wb‡`©k','নির্দেশ'],['Kvh©','কার্য'],['†Kv‡bv','কোনো'],['ˆZwi','তৈরি'],['e¨vL¨v','ব্যাখ্যা'],['kxl©','শীর্ষ'],['cÖkœ','প্রশ্ন'],['†gŠwjK','মৌলিক'],['DËi','উত্তর'],['mwVK','সঠিক'],['we`y¨r','বিদ্যুৎ'],['ˆ`wbK','দৈনিক'],['¯^v¯’¨','স্বাস্থ্য'],['Kw¤úDUvi','কম্পিউটার'],['M‡e©i','গর্বের'],['c„w_ex','পৃথিবী'],['evsjv‡`k','বাংলাদেশ'],['wkÿv_©x','শিক্ষার্থী'],['Dc‡ii','উপরের'],['†hŠ‡Mi','যৌগের']];
for (const [k,v] of tests) { const r = f(k); console.log(r===v.normalize('NFC')?'OK ':'BAD', k, '→', r, r===v.normalize('NFC')?'':'(want '+v+')'); }
const bad = tests.filter(([k, v]) => f(k) !== v.normalize('NFC')).length;
console.log(bad ? `\n${bad} test(s) failed` : `\nAll ${tests.length} tests passed`);
process.exit(bad ? 1 : 0);
