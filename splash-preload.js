const { contextBridge, ipcRenderer } = require('electron');

// Expose a minimal bridge to the splash screen HTML
contextBridge.exposeInMainWorld('electronSplash', {
  // Called by splash.html when animation completes — tells main process to show the app
  done: () => ipcRenderer.send('splash-done'),
});
