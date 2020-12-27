import {promises as fs} from "fs";
import {app, remote, ipcRenderer, BrowserWindow} from "electron";
import {edit, require as acerequire} from "ace-builds";

const dialog = remote.dialog;
const modes = acerequire("ace/ext/modelist");

let file: string;
let editor: any;

/**
 * Opens a file in the editor
 * @param {String} [fileToOpen] A specific file to open.  Omit to show the open dialog.
 */
async function open(fileToOpen?: string) {
  console.log("opened");
  const doOpen = async (f?: string) => {
    if (f !== undefined) {
      file = f;
      let contents = await fs.readFile(f, "utf8");

      document.getElementById("filename").innerHTML = ` | ${f}`;

      app.addRecentDocument(f);

      editor.setValue(contents);
    } else console.log("Unable to open file.");
  };

  if (fileToOpen) {
    await doOpen(fileToOpen);
  } else {
    await getFile();
    await doOpen();
  }
}

/**
 * Saves the contents of the editor
 */
async function save() {
  console.log("save");

  const write = async (file: string) => {
    await fs.writeFile(file, editor.getValue(), "utf8");
  };

  if (file) {
    await write(file);
  } else {
    let saveDialog = await dialog.showSaveDialog({title: "Select Location"});

    if (saveDialog.filePath) {
      file = saveDialog.filePath;
      await write(file);
    }
  }
}

/**
 * Prompts the user for a file selection using the electron native file dialog
 * @returns {Promise}
 */
async function getFile(): Promise<string | undefined> {
  let openDialog = await dialog.showOpenDialog({properties: ["openFile"]});
  if (openDialog.filePaths && openDialog.filePaths[0]) {
    file = openDialog.filePaths[0];
    return file;
  }
}

/**
 * Sets the language mode for the given file name.
 */
function setMode(fileName: string) {
  let mode = modes.getModeForPath(fileName);
  console.log(`$fileName has mode '$mode'.`);

  editor.session.setMode(mode.mode);
}

/**
 * Binds the ace component to the editor div
 */
function initAce() {
  const editor = edit("editor");

  acerequire("ace/theme/monokai");
  acerequire("ace/mode/javascript");

  editor.getSession().setMode("ace/mode/javascript");
  editor.setTheme("ace/theme/monokai");
}

initAce();

// Handle local render save/open events when document loads
document.getElementById("save").addEventListener("click", () => save());
document.getElementById("open").addEventListener("click", () => open());

// Handle main process' save/open events
ipcRenderer.on("save", save);
ipcRenderer.on("open", (_, file) => open(file));
