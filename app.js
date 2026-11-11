// KaffeeApp – Web NFC prototype (Chrome on Android)
// Writes a single NDEF text record with the selected coffee name,
// mirroring the original CoreNFC implementation.

const COFFEES = [
  { id: 'espresso',        name: 'Espresso',        image: 'img/espresso.png' },
  { id: 'kaffee',          name: 'Kaffee',          image: 'img/kaffee.png' },
  { id: 'cappuccino',      name: 'Cappuccino',      image: 'img/cappuccino.png' },
  { id: 'latte_macchiato', name: 'Latte Macchiato', image: 'img/latte_macchiato.png' },
  { id: 'latte',           name: 'Latte',           image: 'img/latte.png' },
  { id: 'weitere',         name: 'Weitere ...',     image: null }
];

const CUP_SVG = `<svg class="cup" viewBox="0 0 24 24" aria-hidden="true">
  <path d="M4 9h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9Z"/>
  <path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/>
  <path d="M8 2.5c-.8 1-.8 1.8 0 2.8s.8 1.8 0 2.8"/>
  <path d="M12 2.5c-.8 1-.8 1.8 0 2.8s.8 1.8 0 2.8"/>
</svg>`;

const grid       = document.getElementById('grid');
const hint       = document.getElementById('hint');
const prepareBtn = document.getElementById('prepare');
const sheet      = document.getElementById('sheet');
const sheetTitle = document.getElementById('sheet-title');
const sheetText  = document.getElementById('sheet-text');
const sheetClose = document.getElementById('sheet-close');
const pulse      = document.getElementById('pulse');

let selection = 'espresso';
let abortController = null;

// --- UI ---------------------------------------------------------------

function renderGrid() {
  for (const coffee of COFFEES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'coffee';
    btn.dataset.id = coffee.id;
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', String(coffee.id === selection));

    const visual = coffee.image
      ? `<img src="${coffee.image}" alt="" loading="lazy">`
      : CUP_SVG;

    btn.innerHTML = `${visual}<span>${coffee.name}</span><span class="check" aria-hidden="true">&#10003;</span>`;
    btn.addEventListener('click', () => select(coffee.id));
    grid.append(btn);
  }
}

function select(id) {
  selection = id;
  for (const btn of grid.children) {
    btn.setAttribute('aria-checked', String(btn.dataset.id === id));
  }
}

function showSheet(state, title, text, closeLabel = 'Abbrechen') {
  pulse.className = `pulse ${state}`;
  sheetTitle.textContent = title;
  sheetText.textContent = text;
  sheetClose.textContent = closeLabel;
  sheet.hidden = false;
}

function hideSheet() {
  sheet.hidden = true;
}

// --- Web NFC ----------------------------------------------------------

const nfcSupported = 'NDEFReader' in window;

async function writeTag(text) {
  abortController = new AbortController();
  showSheet('waiting', 'Bereit zum Schreiben', 'Halten Sie Ihr Smartphone an den NFC-Tag.');

  try {
    const ndef = new NDEFReader();
    await ndef.write(
      { records: [{ recordType: 'text', lang: 'de', data: text }] },
      { signal: abortController.signal }
    );
    showSheet('ok', 'Geschrieben', `\u201E${text}\u201C wurde auf den Tag geschrieben.`, 'Fertig');
    if (navigator.vibrate) navigator.vibrate(60);
  } catch (err) {
    if (err && err.name === 'AbortError') {
      hideSheet();
      return;
    }
    showSheet('fail', 'Schreiben fehlgeschlagen', describeError(err), 'Schließen');
  } finally {
    abortController = null;
  }
}

function describeError(err) {
  switch (err && err.name) {
    case 'NotAllowedError':
      return 'NFC-Zugriff wurde abgelehnt. Bitte erlauben Sie NFC für diese Seite.';
    case 'NotSupportedError':
      return 'Kein kompatibler NFC-Tag gefunden oder NFC ist deaktiviert.';
    case 'NotReadableError':
      return 'Der Tag konnte nicht beschrieben werden (evtl. schreibgeschützt).';
    case 'NetworkError':
      return 'Verbindung zum Tag abgebrochen. Bitte erneut auflegen.';
    default:
      return (err && err.message) || 'Unbekannter Fehler.';
  }
}

// --- Wiring -----------------------------------------------------------

prepareBtn.addEventListener('click', () => {
  const coffee = COFFEES.find(c => c.id === selection);
  if (!coffee) return;
  writeTag(coffee.name);
});

sheetClose.addEventListener('click', () => {
  if (abortController) abortController.abort();
  else hideSheet();
});

if (!nfcSupported) {
  prepareBtn.disabled = true;
  hint.hidden = false;
  hint.textContent = window.isSecureContext
    ? 'Web NFC wird von diesem Browser nicht unterstützt. Bitte Chrome für Android (Version 89+) verwenden und NFC in den Systemeinstellungen aktivieren.'
    : 'Web NFC benötigt eine sichere Verbindung (HTTPS oder localhost).';
}

renderGrid();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* demo: offline support optional */ });
  });
}
