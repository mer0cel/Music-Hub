const { contextBridge, ipcRenderer } = require('electron');
const call = (ch) => (...a) => ipcRenderer.invoke(ch, ...a);
contextBridge.exposeInMainWorld('api', {
  open: call('open'), get: call('get'), create: call('create'), deleteList: call('deleteList'),
  addCurrent: call('addCurrent'), removeTrack: call('removeTrack'),
  themes: call('themes'), getTheme: call('getTheme'), setTheme: call('setTheme'), version: call('version'),
  onData: (cb) => ipcRenderer.on('data', (_, d) => cb(d)),
});
