// Backup as a text file (U5, see ../.claude/agents/granskning.md). Classic script: sets self.Backup.
// Identical copy in every U5 project – the original is template/backup.js, spread with tools/sync-shared.ps1.
// Do not edit a project's copy; check.ps1 compares the hash. No network, no dependencies.
// The file holds exactly the app's export text, so it can always be opened, copied and pasted into the text import.
(() => {
  'use strict';
  const NAME_RE = /^[a-z0-9-]{1,40}$/;
  const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

  // File name only from a fixed app slug and the date – never from data or input.
  function fileName(slug, today) {
    if (!NAME_RE.test(slug) || !DAY_RE.test(today)) throw new Error('Backup.fileName: ogiltigt namn');
    return `${slug}-${today}.txt`;
  }

  // Inside a claude.ai artifact the host saves the file (the viewer confirms); elsewhere window.claude is missing.
  // window.claude is untrusted: only its presence and the save outcome are used.
  let hostDl = null;
  function host() {
    if (!hostDl) {
      hostDl = typeof self.claude?.use === 'function'
        ? Promise.resolve().then(() => self.claude.use('downloads')).then((d) => (d && typeof d.save === 'function' ? d : null), () => null)
        : Promise.resolve(null);
    }
    return hostDl;
  }
  host();   // resolve early: use() never prompts, the confirmation comes with save()

  function blobSave(name, text) {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;   // check:ok blob URL of the app's own export text (U5), never data or input
    a.download = name;
    a.hidden = true;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);   // at once can cancel the download in Safari
  }

  // → 'saved' (host saved it) | 'declined' (viewer said no) | 'busy' (a prompt is already open)
  //   | 'fallback' (browser download started) | 'error'
  async function save({ slug, today, text }) {
    if (typeof text !== 'string' || !text) return 'error';
    const name = fileName(slug, today);
    const dl = await host();
    if (dl) {
      try { await dl.save({ filename: name, data: text }); return 'saved'; } catch (e) {
        const code = e && e.code;
        if (code === 'declined') return 'declined';
        if (code === 'rate_limited') return 'busy';
        // unavailable, not_granted and the rest: try the ordinary download
      }
    }
    try { blobSave(name, text); return 'fallback'; } catch { return 'error'; }
  }

  // Reads one chosen file as strict UTF-8 text. → { text } | { error }. Name and MIME type are ignored.
  async function read(file, maxChars) {
    if (!file || typeof file.size !== 'number' || typeof file.arrayBuffer !== 'function') return { error: 'Ingen fil vald.' };
    if (file.size === 0) return { error: 'Filen är tom.' };
    if (file.size > maxChars * 4) return { error: 'Filen är för stor för en backup.' };   // before reading: 4 bytes per char at most
    let text;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()); } catch {
      return { error: 'Filen är ingen textfil (fel teckenkodning).' };
    }
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    if (text.length > maxChars) return { error: 'Filen är för stor för en backup.' };
    if (!text.trim()) return { error: 'Filen är tom.' };
    return { text };
  }

  self.Backup = Object.freeze({ fileName, save, read });
})();
