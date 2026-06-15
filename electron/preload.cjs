const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mdeApi', {
  isElectron: true,
  openFile: () => ipcRenderer.invoke('file:open'),
  saveFile: (payload) => ipcRenderer.invoke('file:save', payload),
  saveFileAs: (payload) => ipcRenderer.invoke('file:save-as', payload),
  getPendingOpenedFile: () => ipcRenderer.invoke('file:get-pending-opened-file'),
  onOpenedFromArgument: (callback) => {
    const listener = (_event, fileData) => callback(fileData);
    ipcRenderer.on('file:opened-from-argument', listener);
    return () => ipcRenderer.removeListener('file:opened-from-argument', listener);
  },
  onMenuCommand: (callback) => {
    const listener = (_event, command) => callback(command);
    ipcRenderer.on('menu:command', listener);
    return () => ipcRenderer.removeListener('menu:command', listener);
  },
});
