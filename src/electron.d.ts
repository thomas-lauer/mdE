export {};

declare global {
  type ElectronFilePayload = {
    filePath?: string | null;
    fileName: string;
    content: string;
  };

  type ElectronFileResult = {
    filePath: string;
    fileName: string;
    content?: string;
  } | null;

  type ElectronMenuCommand = 'open' | 'save' | 'saveAs';

  interface Window {
    mdeApi?: {
      isElectron: true;
      openFile: () => Promise<ElectronFileResult>;
      saveFile: (payload: ElectronFilePayload) => Promise<ElectronFileResult>;
      saveFileAs: (payload: ElectronFilePayload) => Promise<ElectronFileResult>;
      onMenuCommand: (callback: (command: ElectronMenuCommand) => void) => () => void;
    };
  }
}
