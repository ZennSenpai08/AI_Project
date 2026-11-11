const { contextBridge, ipcRenderer } = require('electron');
const subscribe = (channel, fn) => { const handler = (_event, value) => fn(value); ipcRenderer.on(channel, handler); return () => ipcRenderer.removeListener(channel, handler); };
contextBridge.exposeInMainWorld('zyrahDesktop', Object.freeze({
  getState: () => ipcRenderer.invoke('zyrah:state'),
  action: (name, value) => ipcRenderer.invoke('zyrah:action', name, value),
  drag: phase => ipcRenderer.send('zyrah:drag', phase),
  hitMap: map => ipcRenderer.send('zyrah:hit-map', map),
  avatar: state => ipcRenderer.send('zyrah:avatar', state),
  onAvatar: fn => subscribe('zyrah:avatar', fn),
  onLifecycle: fn => subscribe('zyrah:lifecycle', fn),
  onCommand: fn => subscribe('zyrah:command', fn),
  acknowledge: epoch => ipcRenderer.send('zyrah:quiet', epoch),
}));
