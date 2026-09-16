const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const auth = require('./server/auth');
const ejse = require('ejs-electron'); // dependencia extra

//criando a funcao de abrir a janela irada 
function createWindow() {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      preload: path.join(__dirname, 'renderer/preload.js'),
    },
  });

 win.loadURL('http://localhost:4040/'); // abre a rota do express
}

//backend
app.whenReady().then(()=>{
    require('./server/app')
    createWindow()

})

// IPC de registro
ipcMain.handle('registrar', async (event, { nome, senha }) => {
  return await auth.registrar(nome, senha);
});

// IPC de login
ipcMain.handle('login', async (event, {  senha }) => {
  return await auth.login( senha);
});