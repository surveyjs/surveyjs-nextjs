"use client";
// Run a component's start-up work (load a form, open a relay connection) once per mount. In development, Strict Mode
// mounts every component twice: the work starts in a timer that the first mount's cleanup cancels, so only the second
// mount sends the request or joins the room, and the requests log shows each request once. The task may return a
// cleanup, which runs when the component unmounts; `active()` says whether it is still mounted after an await.
import { useEffect } from "react";

type Cleanup = () => void;

export function useMountTask(task: (active: () => boolean) => Cleanup | void | Promise<Cleanup | void>) {
  useEffect(() => {
    let mounted = true;
    let cleanup: Cleanup | void;
    const timer = setTimeout(async () => {
      const result = await task(() => mounted);
      if (mounted) cleanup = result;
      else result?.();
    });
    return () => {
      mounted = false;
      clearTimeout(timer);
      cleanup?.();
    };
    // The task runs once per mount by design: it reads what it needs when it starts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
