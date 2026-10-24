// Echoes of the Fall для Windows: та же игра из index.html в своём окне, без браузера и без сети.
// Сохранения лежат в папке пользователя (%APPDATA%\Echoes of the Fall), а не рядом с .exe.
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

if (!app.requestSingleInstanceLock()) app.quit(); // два окна перетирали бы одно сохранение

// пиксельному 3D нужен WebGL: на старых видеокартах из «чёрного списка» и без драйвера — программный.
// Окно грузит только файлы самой игры, поэтому программный WebGL здесь безопасен.
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-unsafe-swiftshader');

let win = null;
function create() {
  win = new BrowserWindow({
    width: 1400, height: 880, minWidth: 760, minHeight: 540,
    backgroundColor: '#0b0b10',
    title: 'Echoes of the Fall',
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: { contextIsolation: true, sandbox: true, spellcheck: false, backgroundThrottling: false },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, '..', 'index.html'));
  win.once('ready-to-show', () => win.show());
  // ссылки — в обычный браузер, не в окно игры
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });
  // F11 — во весь экран
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
  });
  win.on('closed', () => { win = null; });
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(create);
app.on('window-all-closed', () => app.quit());
