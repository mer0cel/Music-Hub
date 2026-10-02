// Работает внутри страниц YouTube Music / Яндекс Музыки / Spotify: ловит клик по сердечку
const { ipcRenderer } = require('electron');
const h = location.hostname;
const service = h.includes('youtube') ? 'YouTube' : h.includes('yandex') ? 'Яндекс' : h.includes('spotify') ? 'Spotify' : '';
const q = (s) => document.querySelector(s);

function currentTrack() {
  const md = navigator.mediaSession && navigator.mediaSession.metadata;
  const title = (md && md.title) || document.title;
  const artist = (md && md.artist) || '';
  let url = location.href;
  const a = q('[data-testid="context-item-link"]') || q('a[href*="/track/"]');
  if (a && a.href) url = a.href;
  return { title: artist ? `${title} — ${artist}` : title, url, service };
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('button,[role=button],ytmusic-like-button-renderer');
  if (!b) return;
  const label = [b.getAttribute('aria-label'), b.getAttribute('title'), b.getAttribute('data-testid'), b.id].join(' ').toLowerCase();
  if (!/like|нрав|heart|your library|медиатек|лайк/.test(label) || /dislike|не нрав/.test(label)) return;
  setTimeout(() => {
    const el = b.closest('ytmusic-like-button-renderer') || b;
    const s = [el.getAttribute('like-status'), el.getAttribute('aria-pressed'), el.getAttribute('aria-checked')];
    const known = s.some((v) => v !== null);
    const liked = known ? (s[0] === 'LIKE' || s[1] === 'true' || s[2] === 'true') : null;
    ipcRenderer.send('like', { liked, track: currentTrack() });
  }, 500);
}, true);
