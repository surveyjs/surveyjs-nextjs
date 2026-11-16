// GET /api/offices, GET /api/countries
import { db } from "../db.ts";
import { cache } from "../integration/cache.ts";
import { fetchWithTimeout, query } from "../integration/http.ts";
import { readShared } from "../paths.ts";

type Country = { code: string; name: string };
type RestCountry = { cca2: string; name: { common: string } };

const bundledCountries = readShared<Country[]>("seed/countries.json");
const DAY = 24 * 60 * 60 * 1000;

// #region sjs:choices-from-web.server
// GET /api/offices?region= — {region} from the form arrives as a query parameter
export function listOffices(req: Request) {
  const region = query(req, "region") ?? "";   // the first ?region=, or none
  return Response.json(db(req).prepare("SELECT id, name FROM offices WHERE region = ? ORDER BY name").all(region));
}

// GET /api/countries — a proxy: the browser can't call a service without CORS, your server can
export async function listCountries() {
  let countries = cache.get<Country[]>("countries");
  if (!countries) {
    try {
      const response = await fetchWithTimeout("https://restcountries.com/v3.1/all?fields=name,cca2", { timeout: 5000 });
      countries = ((await response.json()) as RestCountry[]).map((country) => ({ code: country.cca2, name: country.name.common }))
        .sort((a, b) => a.name.localeCompare(b.name));
      cache.set("countries", countries, DAY);
    } catch (error) {   // down, or a different answer: serve the bundled list for 10 minutes, not a timeout per request
      console.warn(`restcountries.com failed (${(error as Error).message}); serving shared/seed/countries.json`);
      countries = bundledCountries;
      cache.set("countries", countries, 10 * 60 * 1000);
    }
  }
  return Response.json(countries, { headers: { "Cache-Control": "public, max-age=86400" } });
}
// #endregion
