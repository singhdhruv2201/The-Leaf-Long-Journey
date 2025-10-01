const { app, BrowserWindow, ipcMain, shell, nativeImage } = require('electron');
const path = require('path');



function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    }
  });
//upodated the environment name display
//testing this out 

  // Load the local index.html from the project root
  win.loadFile(path.join(__dirname, 'index.html'));

  // Set the window icon if the asset exists. On macOS the Dock icon is set separately.
  try {
    const iconPath = path.join(__dirname, 'assets', 'Gemini_Generated_logo_fall_background.png');
    const image = nativeImage.createFromPath(iconPath);
    if (!image.isEmpty()) {
      win.setIcon(image);
    }
  } catch (e) {
    // ignore failures; app will still run without a custom icon
    console.warn('Could not set window icon:', e && e.message);
  }
  // Uncomment to open DevTools by default during development
  // win.webContents.openDevTools();
}

app.whenReady().then(() => {
  // On macOS set the Dock icon early so it appears in the Dock while the app runs
  if (process.platform === 'darwin') {
    try {
      const dockIcon = path.join(__dirname, 'assets', 'Gemini_Generated_logo_fall_background.png');
      const dockImage = nativeImage.createFromPath(dockIcon);
      if (!dockImage.isEmpty()) {
        app.dock && app.dock.setIcon && app.dock.setIcon(dockImage);
      }
    } catch (e) {
      console.warn('Could not set Dock icon:', e && e.message);
    }
  }
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('open-external', async (event, url) => {
  try {
    await shell.openExternal(url);
    return true;
  } catch (e) {
    return false;
  }
});
