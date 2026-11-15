// Språk (2026-11-15): sv eller en, sparat i sn.lang. Ej valt → välkomstrutan frågar; tills dess gissas från telefonen.
// t(key) slår upp i ordlistan; saknas en engelsk text visas den svenska.
const KEY = 'sn.lang';
export const LANGS = { sv: 'Svenska', en: 'English' };
const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
export const langChosen = () => read() in LANGS;
export const guessLang = () => (/^sv\b/i.test(navigator.language || '') ? 'sv' : 'en');
export const lang = () => (langChosen() ? read() : guessLang());
export function setLang(l) {
  if (!(l in LANGS)) return;
  try { localStorage.setItem(KEY, l); } catch { /* blocked: gäller ändå denna gång via html lang */ }
  document.documentElement.lang = l;
}
const DICT = {
  sv: {
    'wl.title': 'Välkommen!',
    'wl.lang': 'Språk',
    'wl.text': 'Välj ett lösenord som skyddar dina backup-filer. Spara det i din lösenordshanterare – utan det går en backup inte att läsa in.',
    'wl.small': 'Allt stannar på din enhet. Använd ett nytt lösenord – det sparas här.',
    'wl.pick': 'Välj lösenord',
    'wl.import': 'Jag har en backup-fil',
    'wl.readErr': 'Kunde inte läsa filen.',
  },
  en: {
    'wl.title': 'Welcome!',
    'wl.lang': 'Language',
    'wl.text': 'Choose a password that protects your backup files. Keep it in your password manager – without it a backup cannot be restored.',
    'wl.small': 'Everything stays on your device. Use a new password – it is stored here.',
    'wl.pick': 'Choose password',
    'wl.import': 'I have a backup file',
    'wl.readErr': 'Could not read the file.',
  },
};
export const t = (key) => DICT[lang()]?.[key] ?? DICT.sv[key] ?? key;
