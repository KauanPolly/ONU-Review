const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let backendProcess = null;

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'icon.ico'),
        title: "ONU Review Pro"
    });

    // Dá 2 segundos para o backend do Python (main.exe) ligar antes de mostrar a tela
    setTimeout(() => {
        win.loadURL('http://127.0.0.1:8000');
    }, 2000);
}

app.whenReady().then(() => {
    // Caminho inteligente: funciona tanto no VS Code quanto no .exe final
    const backendPath = app.isPackaged
        ? path.join(process.resourcesPath, 'main.exe')
        : path.join(__dirname, 'main.exe');

    // Inicia o backend Python compilado
    backendProcess = spawn(backendPath);

    createWindow();
});

// Mata o processo do Python quando o app for fechado
app.on('window-all-closed', () => {
    if (backendProcess) {
        backendProcess.kill();
    }
    if (process.platform !== 'darwin') app.quit();
});