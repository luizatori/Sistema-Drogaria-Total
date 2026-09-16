//requerimentos
const { contextBridge, ipcRenderer } = require('electron');

//invoke
contextBridge.exposeInMainWorld('api', {
  registrar: (dados) => ipcRenderer.invoke('registrar', dados),
  login: (dados) => ipcRenderer.invoke('login', dados)
});
