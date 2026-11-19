"use client";
// Async Calculations and Validation: two async expression functions that ask the backend, share their lookups and
// report each lookup's state above the form (shared/client/async-functions.js in React). As in the reference, the
// functions are registered when this module loads, so the model the render creates (on the server too) knows them;
// a function asks the backend only for an answer, and the server renders the form empty.
import { show } from "@/demo/host";   // first: the requests log wraps fetch before the example runs
import "@/styles/form.css";
import { useMountTask } from "@/lib/use-mount-task";
import { useState } from "react";
import { Model, registerFunction, type ValueChangedEvent } from "survey-core";
import { Survey } from "survey-react-ui";

type Lookup = "email" | "postcode";
type LookupResult = { ok: boolean; value: boolean | number | null; pending?: undefined } | { pending: true; ok?: undefined; value?: undefined };

const cache = new Map<string, Promise<{ ok: boolean; value: boolean | number | null }>>();
const states: Partial<Record<Lookup, LookupResult>> = {};
/** The mounted form: the lookups report to it and to the status above it */
let survey: Model | undefined;
let generation = 0;
const normalize = (name: Lookup, value: unknown) => name === "email"
  ? String(value ?? "").trim().toLowerCase()
  : String(value ?? "").replace(/\s/g, "").toUpperCase();

function report(name: Lookup, key: string, result: LookupResult, run: number) {
  if (run !== generation || normalize(name, survey?.getValue(name)) !== key) return;
  states[name] = result;
  const unavailable = name === "email" ? "Couldn't check email availability. Please retry." : "Couldn't calculate shipping. Please retry.";
  const message = result.pending
    ? name === "email" ? "Checking email..." : "Calculating shipping..."
    : !result.ok ? unavailable
      : name === "email" ? result.value ? "This email is already registered." : "This email is available."
        : Number(result.value) > 0 ? "Delivery is available." : "We don't deliver to this postcode.";
  show(`${name}-status`, message);
  const question = survey?.getQuestionByName(name);
  if (question) question.validators[0].text = !result.ok && !result.pending ? unavailable
    : name === "email" ? "This email is already registered." : "We don't deliver to this postcode.";
  if (name === "postcode" && survey) survey.getQuestionByName("shipping_price").visible = Boolean(result.ok && Number(result.value) > 0);
  updateRetry();
}
function updateRetry() {
  const retry = document.getElementById("retry-checks") as HTMLButtonElement;
  retry.hidden = !Object.values(states).some(state => !state.ok && !state.pending);
  retry.disabled = Object.values(states).some(state => state.pending);
}

// #region sjs:async-functions.lookup
// Reuse in-flight and successful lookups, but allow failed requests to be retried
async function lookup(name: Lookup, key: string, url: string, field: string) {
  const run = generation;
  const cacheKey = `${name}:${key}`;
  if (!cache.has(cacheKey)) {
    const pending = fetch(url).then(async response => {
      if (!response.ok) throw new Error("Lookup failed");
      const value = (await response.json())[field];
      if (name === "email" ? typeof value !== "boolean" : value !== null && (!Number.isFinite(value) || value < 0)) throw new Error("Invalid result");
      return { ok: true, value };
    }).catch(() => ({ ok: false, value: null }));
    cache.set(cacheKey, pending);
  }
  report(name, key, { pending: true }, run);
  const pending = cache.get(cacheKey)!;
  const result = await pending;
  if (!result.ok && cache.get(cacheKey) === pending) cache.delete(cacheKey);
  report(name, key, result, run);
  return result.value;
}
// #endregion

// #region sjs:async-functions.client
// Validate email availability using the backend's customer records
registerFunction({
  name: "emailExists",
  isAsync: true,
  func: async ([email]) => {
    const key = normalize("email", email);
    if (!key) return false;
    return lookup("email", key, `/api/customers/exists?email=${encodeURIComponent(key)}`, "exists");
  }
});

// Share one shipping lookup between the calculation and the postcode validator
registerFunction({
  name: "shippingCost",
  isAsync: true,
  func: async ([postcode]) => {
    const key = normalize("postcode", postcode);
    if (!key) return null;
    return lookup("postcode", key, `/api/shipping?postcode=${encodeURIComponent(key)}`, "price");
  }
});
// #endregion

export default function AsyncFunctions({ definition }: { definition: Record<string, unknown> }) {
  const [model] = useState(() => new Model(definition));   // one model per mount, never per render; the server renders it too
  useMountTask(() => start(model));
  return <Survey model={model} />;
}

function start(model: Model) {
  survey = model;
  const retry = document.getElementById("retry-checks") as HTMLButtonElement;
  const retryChecks = () => {
    model.runExpressions();
    model.validate();
  };
  retry.addEventListener("click", retryChecks);

  // Reset status when an input is cleared, and ignore results from earlier runs
  const cleared = (sender: Model, { name, value }: ValueChangedEvent) => {
    if ((name !== "email" && name !== "postcode") || normalize(name, value)) return;
    delete states[name];
    show(`${name}-status`, name === "email" ? "Enter an email address." : "Enter a postcode.");
    if (name === "postcode") sender.getQuestionByName("shipping_price").visible = false;
    updateRetry();
  };
  model.onValueChanged.add(cleared);
  const startOver = document.getElementById("start-over");
  const restart = () => {
    generation++;
    cache.clear();
    for (const name of Object.keys(states) as Lookup[]) delete states[name];
    model.clear(true, true);
    model.getQuestionByName("shipping_price").visible = false;
    retry.hidden = true;
    show("email-status", "Enter an email address.");
    show("postcode-status", "Enter a postcode.");
  };
  startOver?.addEventListener("click", restart);

  return () => {
    generation++;   // a lookup that finishes after this no longer reports
    if (survey === model) survey = undefined;
    retry.removeEventListener("click", retryChecks);
    model.onValueChanged.remove(cleared);
    startOver?.removeEventListener("click", restart);
  };
}
