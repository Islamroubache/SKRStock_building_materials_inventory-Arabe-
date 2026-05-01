const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  // NEW: print function
  print: () => ipcRenderer.send('print-window'),
  
  // NEW: print to PDF
  printToPDF: (filename) => 
    ipcRenderer.invoke('print-to-pdf', filename),

  // Check if running in Electron
  isElectron: true
});
