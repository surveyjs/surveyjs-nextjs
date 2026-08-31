import { slk } from "survey-core";

const licenseKey = process.env.NEXTJS_PUBLIC_SLK;

if (licenseKey) {
  slk(licenseKey);
}
