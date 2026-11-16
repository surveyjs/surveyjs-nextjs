// JSON for an inline <script>: `<`, `>`, `&`, U+2028 and U+2029 escaped, so a "</script>" in a title can't end the
// script and the text is still valid JavaScript. The page config and Option A's window.FORM_DEFINITION and
// window.FORM_VARIABLES go through it: <script dangerouslySetInnerHTML={{ __html: `window.X = ${scriptJson(x)};` }} />
export function scriptJson(value: unknown): string {
  return JSON.stringify(value ?? null).replace(/[<>&\u{2028}\u{2029}]/gu, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
}
