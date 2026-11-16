// Fill Forms Together: the example page and its texts. The SurveyJS code is in client.tsx, the relay in
// src/server/relay/fill-relay.ts and src/server/relay/fill-room.ts (WS /ws/rooms/:recordId, run by node server.ts).
import { ExampleLayout } from "@/components/example/example-layout";
import { buttonVariants } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { exampleMetadata, examplePage, type SearchParams } from "@/lib/example-page";
import { scriptJson } from "@/lib/script-json";
import { cn } from "@/lib/utils";
import { jobSheets } from "../../../server/demo/pages.ts";
import FillTogether from "./client";

export const generateMetadata = () => exampleMetadata("fill-together");

const button = cn(buttonVariants({ variant: "outline" }), "h-9 px-3 font-semibold");

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const { req, data, joinFailed } = await examplePage("fill-together", searchParams);
  // The saved job sheets, and the record in ?record (default the first); the page config carries it as `record`
  const { records, record, known } = jobSheets(req);
  // The partner's link, as client.tsx's partnerLink() builds it: there before hydration, so it opens the other role at once
  const partner = new URL(req.url).searchParams;
  if (data.page.sandboxId) partner.set("join", data.page.sandboxId);
  else partner.delete("join");
  partner.set("record", record);
  partner.set("role", partner.get("role") === "technician" ? "dispatcher" : "technician");
  return (
    <ExampleLayout
      data={data}
      joinFailed={joinFailed}
      inlineScript={`window.SURVEYJS_PAGE.record = ${scriptJson(record)};`}
      description={<p>Let multiple respondents fill out the same record together in real time. Answers, focus, and cursors are shared between participants, so teams can coordinate on a job sheet or similar form.</p>}
      tryThis={<>
        <li>Choose a saved job sheet from <strong>Record</strong> or select <strong>A new, blank job sheet</strong>. Wait for the connection status, then enter the dispatcher&apos;s notes.</li>
        <li>Press <strong>Open a second window</strong> to join as the <strong>Technician</strong>. The shared answers appear automatically. Add findings or hours in that window and watch them appear in the first.</li>
        <li>Focus the same question in both windows to see the participant indicators. When both participants edit the same answer, the last change wins.</li>
        <li>Press <strong>Finish job sheet</strong> in either window. The relay saves one response for the session, and both windows show the same saved response ID. Open <strong>Data</strong> to inspect it.</li>
        <li>If the connection drops, use <strong>Reconnect</strong> to rejoin the shared session. Select <strong>A new, blank job sheet</strong> from <strong>Record</strong> to start another session.</li>
      </>}
      about={data.demoMode ? <p>The invite link carries your sandbox ID: whoever opens it works in your copy of the demo data, in the same rooms.</p> : undefined}
      actions={<>
        <span className="flex items-center gap-2">
          <label htmlFor="record" className="text-gray-600">Record</label>
          <NativeSelect id="record" name="record" disabled defaultValue={record} className="bg-background">
            {records.map((r) => <NativeSelectOption key={r.id} value={r.id}>{r.label}</NativeSelectOption>)}
            <NativeSelectOption value="">A new, blank job sheet</NativeSelectOption>
            {!known && <NativeSelectOption value={record}>New job sheet</NativeSelectOption>}
          </NativeSelect>
        </span>
        <label className="flex items-center gap-2">
          <span className="text-gray-600">Role</span>
          <NativeSelect id="participant-role" disabled className="bg-background">
            <NativeSelectOption value="dispatcher">Dispatcher</NativeSelectOption>
            <NativeSelectOption value="technician">Technician</NativeSelectOption>
          </NativeSelect>
        </label>
        <a data-invite-link target="_blank" href={`/examples/fill-together?${partner}`} className={cn(buttonVariants(), "h-9 gap-1.5 px-3 font-semibold no-underline")}>
          Open a second window
          <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>
        </a>
      </>}
      form={<>
        <div className="flex flex-wrap items-center gap-3 border-b p-4 text-sm sm:px-6">
          <p data-show="connection-status" role="status" aria-live="polite" className="m-0 flex-1 text-gray-700">Connecting to the shared job sheet...</p>
          <button id="reconnect" type="button" hidden className={button}>Reconnect</button>
        </div>
        <p id="collaboration-loading" className="m-0 p-6 text-sm text-muted-foreground">The form will appear when the shared answers have loaded.</p>
        <div id="form" hidden inert aria-busy="true" className="p-4 sm:p-6">
          <FillTogether />
        </div>
      </>}
    />
  );
}
