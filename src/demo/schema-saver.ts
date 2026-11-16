// shared/client/schema-saver.js in TypeScript, unchanged in behaviour: serialized schema saves and the error text for
// the Creator pages. Serialize schema writes and keep the newest browser edits separate from the saved version.

export type SaveState = { state: "saving" | "saved" | "error" | "unsaved"; dirty: boolean; error: string | null };

export function createSchemaSaver(getDefinition: () => unknown, write: (json: string) => Promise<void>, onState: (state: SaveState) => void) {
  let saved: string | undefined;
  let pending = 0;
  let error: string | null = null;
  let tail: Promise<void> = Promise.resolve();
  const snapshot = () => JSON.stringify(getDefinition());
  function publish() {
    const dirty = snapshot() !== saved;
    onState({ state: pending ? "saving" : !dirty ? "saved" : error ? "error" : "unsaved", dirty, error });
  }
  function save(): Promise<boolean> {
    const json = snapshot();
    pending++;
    error = null;
    publish();
    const task = tail.then(async () => {
      if (json !== saved) {
        await write(json);
        saved = json;
      }
      error = null;
      return true;
    }).catch((reason: Error) => {
      error = reason.message || "Couldn't save the form schema. Please try again.";
      return false;
    }).finally(() => { pending--; publish(); });
    tail = task.then(() => undefined);
    return task;
  }
  return {
    save,
    changed() { error = null; publish(); },
    markSaved() { saved = snapshot(); error = null; publish(); },
    get dirty() { return snapshot() !== saved; },
    get error() { return error; },
  };
}

export async function responseError(response: Response, fallback: string): Promise<Error> {
  const report = (await response.json().catch(() => null)) as { error?: string; errors?: { message?: string; text?: string }[] } | null;
  return new Error(report?.error || report?.errors?.map((error) => error.message || error.text).filter(Boolean).join("; ") || fallback);
}
