const { app, BrowserWindow, BrowserView, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const THEMES = require('./themes');

const SERVICES = { youtube: 'https://music.youtube.com', yandex: 'https://music.yandex.ru', spotify: 'https://open.spotify.com' };
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const SIDEBAR = 280, FOOT = 28, FAV = 'Избранное';
let win, view, data, settings, dataFile, setFile, cssKey;

const read = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const saveData = () => { fs.writeFileSync(dataFile, JSON.stringify(data, null, 2)); win.webContents.send('data', data); };
const layout = () => { const [w, h] = win.getContentSize(); view.setBounds({ x: SIDEBAR, y: 0, width: w - SIDEBAR, height: h - FOOT }); };

const pageCSS = (t) => `
::-webkit-scrollbar{width:10px;background:${t.bg}} ::-webkit-scrollbar-thumb{background:${t.accent};border-radius:6px} ::selection{background:${t.accent};color:#000}
:root,body,ytmusic-app,ytmusic-app-layout{--ytmusic-general-background-a:${t.bg}!important;--ytmusic-general-background-b:${t.panel}!important;--ytmusic-general-background-c:${t.bg}!important;--ytmusic-player-bar-background:${t.card}!important;--ytmusic-nav-bar-background:${t.panel}!important;--ytmusic-brand-background-solid:${t.panel}!important;--background-base:${t.bg}!important;--background-elevated-base:${t.card}!important;--essential-bright-accent:${t.accent}!important}
body{background-image:${t.img || 'none'}!important}`;

async function applyTheme() {
  const t = THEMES[settings.theme] || THEMES.dark;
  try { if (cssKey) await view.webContents.removeInsertedCSS(cssKey); } catch {}
  cssKey = await view.webContents.insertCSS(pageCSS(t));
}

app.whenReady().then(() => {
  dataFile = path.join(app.getPath('userData'), 'playlists.json');
  setFile = path.join(app.getPath('userData'), 'settings.json');
  data = read(dataFile, {});
  if (data['Лайки']) { data[FAV] = [...(data[FAV] || []), ...data['Лайки']]; delete data['Лайки']; }
  if (!data[FAV]) data = { [FAV]: [], ...data };
  settings = read(setFile, { theme: 'dark' });

  win = new BrowserWindow({
    width: 1300, height: 840, title: 'Music Hub', backgroundColor: '#121212',
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });
  win.setMenuBarVisibility(false);
  win.loadFile('index.html');

  view = new BrowserView({ webPreferences: { partition: 'persist:music', preload: path.join(__dirname, 'inject.js') } });
  view.webContents.setUserAgent(UA);
  view.webContents.setWindowOpenHandler(({ url }) => { view.webContents.loadURL(url); return { action: 'deny' }; });
  view.webContents.on('dom-ready', () => { cssKey = null; applyTheme(); });
  win.setBrowserView(view);
  layout();
  win.on('resize', layout);
  view.webContents.loadURL(SERVICES.youtube);
});

ipcMain.on('like', (e, { liked, track }) => {
  const list = data[FAV];
  const i = list.findIndex((t) => t.url === track.url);
  const want = liked === null ? i < 0 : liked; // если сайт не показал состояние — переключаем
  if (want && i < 0) list.push(track);
  if (!want && i >= 0) list.splice(i, 1);
  saveData();
});

ipcMain.handle('open', (_, target) => view.webContents.loadURL(SERVICES[target] || target));
ipcMain.handle('get', () => data);
ipcMain.handle('create', (_, name) => { if (name && !data[name]) { data[name] = []; saveData(); } return data; });
ipcMain.handle('deleteList', (_, name) => { if (name !== FAV) { delete data[name]; saveData(); } return data; });
ipcMain.handle('addCurrent', (_, name) => {
  const url = view.webContents.getURL();
  const title = view.webContents.getTitle();
  if (data[name] && !data[name].some((t) => t.url === url)) { data[name].push({ title, url }); saveData(); }
  return data;
});
ipcMain.handle('removeTrack', (_, name, i) => { data[name].splice(i, 1); saveData(); return data; });
ipcMain.handle('themes', () => THEMES);
ipcMain.handle('getTheme', () => settings.theme);
ipcMain.handle('setTheme', (_, k) => { if (THEMES[k]) { settings.theme = k; fs.writeFileSync(setFile, JSON.stringify(settings)); applyTheme(); } });
ipcMain.handle('version', () => app.getVersion());

app.on('window-all-closed', () => app.quit());
