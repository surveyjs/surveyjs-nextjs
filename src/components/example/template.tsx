// Demo only: a <template> the demo code clones (src/demo/host.ts fill()). The browser parses a template's markup
// into template.content, where React's hydration can't find it: JSX children would make React report a mismatch
// and render the rows as the template's own children. So the markup is HTML that React sets and never hydrates.
// (react-dom/server's renderToStaticMarkup, which would turn JSX into that HTML, is not allowed in Server Components.)
// The whitespace between tags stays, as in the other platforms' <template>s: some of it is content, such as the
// space between a request's status and its time. fill() clones the first element, so the rest is harmless.
export function Template({ id, html }: { id: string; html: string }) {
  return <template id={id} dangerouslySetInnerHTML={{ __html: html.trim() }} />;
}
