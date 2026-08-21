"use client";

import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";

// Monaco is bundled with the app instead of pulled from the default CDN, so the
// demo works offline and in CI.
if (typeof window !== "undefined") {
  window.MonacoEnvironment = {
    getWorker(_workerId: string, label: string) {
      return label === "json"
        ? new Worker(
            new URL(
              "monaco-editor/esm/vs/language/json/json.worker.js",
              import.meta.url,
            ),
          )
        : new Worker(
            new URL(
              "monaco-editor/esm/vs/editor/editor.worker.js",
              import.meta.url,
            ),
          );
    },
  };
  loader.config({ monaco });
  (window as unknown as { monaco: typeof monaco }).monaco = monaco;
}

export function JsonEditor({
  value,
  onChange,
  dark,
}: {
  value: string;
  onChange: (value: string) => void;
  dark: boolean;
}) {
  return (
    <Editor
      language="json"
      value={value}
      onChange={(next) => onChange(next ?? "")}
      theme={dark ? "vs-dark" : "light"}
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        tabSize: 2,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: "on",
      }}
    />
  );
}

export default JsonEditor;
