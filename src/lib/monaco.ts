import * as monaco from "monaco-editor/editor/editor.api";
import "monaco-editor/language/json/monaco.contribution";

declare global {
  interface Window {
    monaco?: typeof monaco;
    MonacoEnvironment?: monaco.Environment;
  }
}

export function installMonaco(): void {
  if (window.monaco) return;
  window.MonacoEnvironment = {
    getWorker: (_, label) =>
      label === "json"
        ? new Worker(
            new URL("monaco-editor/language/json/json.worker", import.meta.url),
          )
        : new Worker(
            new URL("monaco-editor/editor/editor.worker", import.meta.url),
          ),
  };
  window.monaco = monaco;
}

export function setMonacoTheme(dark: boolean): void {
  monaco.editor.setTheme(dark ? "vs-dark" : "vs");
}
