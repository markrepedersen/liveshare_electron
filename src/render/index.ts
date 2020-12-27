import {promises as fs} from "fs";
import {remote, ipcRenderer} from "electron";
import {edit, require as acerequire} from "ace-builds";
import {createConnection, Socket} from "net";

export class Menu {
  private static app: any = remote.app;
  private static dialog: any = remote.dialog;
  private static modes: any = acerequire("ace/ext/modelist");

  constructor(private editor: any, private file?: string) {}

  /**
   * Saves the contents of the editor
   */
  public async save(): Promise<void> {
    if (this.file) {
      await this.saveFile();
    } else {
      let saveDialog = await Menu.dialog.showSaveDialog({
        title: "Select Location",
      });

      if (saveDialog.filePath) {
        this.file = saveDialog.filePath;
        await this.saveFile();
      }
    }
  }

  /**
   * Opens a file in the editor
   * @param {String} [fileToOpen] A specific file to open.  Omit to show the open dialog.
   */
  public async open(file?: string): Promise<void> {
    if (file) {
      await this.openFile(file);
    } else {
      let file = await this.getFile();
      await this.openFile(file);
    }
  }

  /**
   * Sets the language mode for the given file path.
   */
  public setMode(path: string) {
    let mode = Menu.modes.getModeForPath(path);

    console.log(`Changed mode to ${mode.mode}.`);

    this.editor.session.setMode(mode.mode);
  }

  /**
   * Prompts the user for a file selection using the electron native file dialog
   * @returns {Promise}
   */
  private async getFile(): Promise<string | undefined> {
    let openDialog = await Menu.dialog.showOpenDialog({
      properties: ["openFile"],
    });
    if (openDialog.filePaths && openDialog.filePaths[0]) {
      this.file = openDialog.filePaths[0];
      return this.file;
    }
  }

  private async saveFile() {
    await fs.writeFile(this.file, this.editor.getValue(), "utf8");
  }

  private async openFile(file?: string) {
    if (file !== undefined) {
      this.file = file;
      let contents = await fs.readFile(file, "utf8");

      Menu.app.addRecentDocument(file);
      this.setMode(file);
      this.editor.setValue(contents);
    } else console.log("Unable to open file.");
  }
}

export class Editor {
  private _editor: any;
  private socket: Socket;
  private menu: Menu;

  constructor() {
    this._editor = edit("editor");
    this.menu = new Menu(this._editor);
    this.socket = createConnection({host: "localhost", port: 2000}, () =>
      console.log("Connected to server.")
    );
  }

  /*
   * Initalize the editor state.
   */
  public init() {
    this.initDisplayOptions();
    this.initLanguageTools();
    this.initMenuHandlerOptions();
    this.initConnectionOptions();
  }

  public initLanguageTools() {
    acerequire("ace/ext/language_tools");

    this._editor.setOptions({
      enableBasicAutocompletion: true,
      enableSnippets: true,
      enableLiveAutocompletion: true,
    });
  }

  public initDisplayOptions() {
    acerequire("ace/theme/monokai");
    acerequire("ace/mode/javascript");

    this._editor.setShowPrintMargin(false);
    this._editor.getSession().setMode("ace/mode/javascript");
    this._editor.setTheme("ace/theme/monokai");
  }

  // Handle main process' save/open events
  public initMenuHandlerOptions() {
    ipcRenderer.on("save", this.menu.save);
    ipcRenderer.on("open", (_, file) => this.menu.open(file));
  }

  public initConnectionOptions() {
    this.socket.on("data", (data) => {
      console.log(data.toString());
    });

    this.socket.on("end", () => {
      console.log("disconnected from server");
    });

    this._editor.on("change", (change: any) => {
      console.log(change);
    });

    this._editor.selection.on("changeSelection", () => {
      console.log(this._editor.selection.getRange());
    });
  }
}

let editor = new Editor();

editor.init();
