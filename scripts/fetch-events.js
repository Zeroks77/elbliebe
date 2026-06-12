#!/usr/bin/env node
/**
 * fetch-events.js — läuft täglich via GitHub Actions.
 * Holt Dresdner Veranstaltungen aus offiziellen, erlaubten Event-APIs:
 *   1) Ticketmaster Discovery API  (Key: secrets.TICKETMASTER_KEY)
 *   2) Eventbrite API              (Key: secrets.EVENTBRITE_TOKEN, optional)
 * Beide Quellen werden zusammengeführt, dedupliziert und nach events.json
 * geschrieben. Fehlt ein Key oder ist eine Quelle nicht erreichbar, wird sie
 * einfach übersprungen; eine vorhandene events.json bleibt als Fallback erhalten.
 */
const fs = require("fs");

const TM_KEY = process.env.TICKETMASTER_KEY || "";
const EB_TOKEN = process.env.EVENTBRITE_TOKEN || "";

async function getJSON(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, ...opts });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

const clean = (s, max = 180) => {
  if (!s) return "";
  let x = String(s).replace(/\s+/g, " ").trim();
  return x.length > max ? x.slice(0, max - 1).trimEnd() + "…" : x;
};
const isoDate = s => { const d = new Date(s); return isNaN(d) ? null : d.toISOString().slice(0, 10); };
const timeLabel = s => {
  const d = new Date(s); if (isNaN(d)) return "";
  const hh = d.getHours(), mm = d.getMinutes();
  return (hh === 0 && mm === 0) ? "" : `${hh}:${String(mm).padStart(2, "0")} Uhr`;
};

/* ---------- Ticketmaster Discovery API ---------- */
async function fromTicketmaster() {
  if (!TM_KEY) { console.log("[TM] kein Key — übersprungen"); return []; }
  const out = [];
  // Dresden: city-Filter + Umkreis über latlong/radius (51.05,13.74 = Dresden)
  const base = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${TM_KEY}`
    + `&latlong=51.0504,13.7373&radius=40&unit=km&locale=de&size=80&sort=date,asc`;
  try {
    const j = await getJSON(base);
    const evs = j?._embedded?.events || [];
    for (const e of evs) {
      const start = e.dates?.start?.dateTime || e.dates?.start?.localDate;
      const date = isoDate(start);
      if (!date) continue;
      const venue = e._embedded?.venues?.[0];
      const cls = e.classifications?.[0];
      out.push({
        date,
        title: clean(e.name, 80),
        venue: clean(venue?.name || "Dresden", 60),
        time: e.dates?.start?.dateTime ? timeLabel(e.dates.start.dateTime) : "",
        tag: clean(cls?.segment?.name || cls?.genre?.name || "Event", 20),
        text: clean(e.info || e.pleaseNote || (cls?.genre?.name ? cls.genre.name + " in Dresden" : "Veranstaltung in Dresden und Umgebung."), 180),
        url: e.url,
        _src: "tm",
      });
    }
    console.log(`[TM] ${out.length} Events`);
  } catch (err) { console.warn("[TM] Fehler:", err.message); }
  return out;
}

/* ---------- Eventbrite API ---------- */
async function fromEventbrite() {
  if (!EB_TOKEN) { console.log("[EB] kein Token — übersprungen"); return []; }
  const out = [];
  const url = "https://www.eventbriteapi.com/v3/events/search/"
    + "?location.address=Dresden&location.within=40km&expand=venue&sort_by=date";
  try {
    const j = await getJSON(url, { headers: { Authorization: "Bearer " + EB_TOKEN } });
    for (const e of (j.events || [])) {
      const date = isoDate(e.start?.utc || e.start?.local);
      if (!date) continue;
      out.push({
        date,
        title: clean(e.name?.text, 80),
        venue: clean(e.venue?.name || "Dresden", 60),
        time: timeLabel(e.start?.local),
        tag: "Event",
        text: clean(e.description?.text || "Veranstaltung in Dresden und Umgebung.", 180),
        url: e.url,
        free: e.is_free || undefined,
        _src: "eb",
      });
    }
    console.log(`[EB] ${out.length} Events`);
  } catch (err) { console.warn("[EB] Fehler:", err.message); }
  return out;
}

async function main() {
  const all = [...(await fromTicketmaster()), ...(await fromEventbrite())];
  const today = new Date().toISOString().slice(0, 10);
  const seen = new Set();
  const events = all
    .filter(e => e.date >= today && e.title)
    .filter(e => {
      const key = e.title.toLowerCase().slice(0, 30) + "|" + e.date;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 40)
    .map(({ _src, ...rest }) => rest);

  if (!events.length) {
    console.warn("Keine Events gefunden.");
    if (fs.existsSync("events.json")) { console.log("Behalte bestehende events.json."); process.exit(0); }
  }
  const payload = { updated: new Date().toISOString(), source: "Ticketmaster Discovery + Eventbrite API", count: events.length, events };
  fs.writeFileSync("events.json", JSON.stringify(payload, null, 2));
  console.log(`events.json geschrieben: ${events.length} Events`);
}
main().catch(e => { console.error(e); process.exit(1); });
