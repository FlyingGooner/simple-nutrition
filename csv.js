// CSV-export (2026-11-15): ett enkelt kalkylark av datan, t.ex. för Excel eller en egen app. Vanligt skript, samma fil i alla appar.
// Svenska: semikolon och decimalkomma (som svenska Excel vill ha); engelska: komma och decimalpunkt.
// Kodning Windows-1252 (2026-11-15): UTF-8 med BOM visade å ä ö fel i Google Kalkylark i mobilen. Tecken utanför 1252 blir ?.
// Text som börjar med = + - @ får en apostrof först, så att kalkylprogrammet aldrig kör en formel ur datan.
// Filen är INTE krypterad – appen säger det vid knappen.
(function () {
  'use strict';
  const sv = () => !self.I18N || self.I18N.lang() !== 'en';
  const tr = (t) => (self.I18N && typeof self.I18N.tr === 'function' ? self.I18N.tr(t) : t);
  function cell(v) {
    if (v == null || v === '') return '';
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) return '';
      const s = String(Math.round(v * 100) / 100);
      return sv() ? s.replace('.', ',') : s;
    }
    let s = String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /["\n\r;,]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  // header: svenska rubriker (översätts), rows: listor med text eller tal.
  function build(header, rows) {
    const sep = sv() ? ';' : ',';
    return [header.map((h) => cell(tr(h))), ...rows.map((r) => r.map(cell))].map((r) => r.join(sep)).join('\r\n') + '\r\n';
  }
  const HI = '€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008dŽ\u008f\u0090‘’“”•–—˜™š›œ\u009džŸ';   // 0x80–0x9F i Windows-1252
  function cp1252(text) {
    const out = new Uint8Array(text.length);
    let n = 0;
    for (const ch of text) {
      const c = ch.codePointAt(0), i = HI.indexOf(ch);
      out[n++] = c < 0x80 || (c >= 0xa0 && c <= 0xff) ? c : i >= 0 ? 0x80 + i : 0x3f;
    }
    return out.subarray(0, n);
  }
  function download(name, text) {
    try {
      const url = URL.createObjectURL(new Blob([cp1252(text)], { type: 'text/csv;charset=windows-1252' }));
      const a = document.createElement('a');
      a.href = url; a.download = name; a.hidden = true;
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return true;
    } catch { return false; }
  }
  self.Csv = Object.freeze({ build, download, tr });
})();
