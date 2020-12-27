import {app, BrowserWindow, Menu, Tray} from "electron";
import main from "./menus/main";
import file from "./menus/file";
import edit from "./menus/edit";
import view from "./menus/view";
import {join} from "path";

var template = [];
var menu: any;
var mainWindow: any;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 728,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  template = [main(app), file(mainWindow), edit, view(mainWindow)];

  mainWindow.webContents.openDevTools();
  mainWindow.loadFile(join(__dirname, "..", "src", "render", "index.html"));
  mainWindow.setTitle("Liveshare");

  menu = Menu.buildFromTemplate(template);

  Menu.setApplicationMenu(menu);

  const appIcon = new Tray(join(__dirname, "..", "static", "tray.png"));

  appIcon.setToolTip("Tray!");
  appIcon.setContextMenu(
    Menu.buildFromTemplate([
      {label: "Open File...", click: () => mainWindow.webContents.send("open")},
    ])
  );
}

app.on("ready", () => {
  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("open-file", (event, file) => {
  mainWindow.webContents.send("open", file);
});
