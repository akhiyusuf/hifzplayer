/**
 * AI Ustadh browser e2e — Chrome's fake microphone plays a reference recitation
 * into the real coach UI, so the continuous loop and live highlight are checked
 * end to end (MediaRecorder → VAD auto-send → /api/ustadh/asr → replay → re-listen).
 *
 *   npm i --no-save puppeteer-core
 *   npm run build && GROQ_API_KEY=… npx next start -p 3100 &
 *   node scripts/ustadh-browser-e2e.mjs --wav mic.wav \
 *     --url "http://localhost:3100/read/1?from=5&to=5&mode=ustadh&style=mushaf" \
 *     --expect-miss 3
 *   # clean take (any style): --expect-match → matched, then auto-listen again
 *
 * Make a mic WAV from the audio soak cache (1:5 with وَإِيَّاكَ cut out):
 *   node --experimental-strip-types scripts/ustadh-audio-soak.ts --verses 1:5 --variants skip
 *   ffmpeg -f s16le -ar 16000 -ac 1 -i node_modules/.cache/ustadh-soak/final-1_5-skip.raw \
 *     -af apad=pad_dur=4 -ar 48000 mic.wav
 *
 * Passes when one Listen tap yields ≥2 automatic takes, Ustadh's replay walks the
 * highlight with the speaking ring, the expected word gets the miss underline, no
 * live peek underlines a word before the final verdict says so, and Pause stops it.
 */
import puppeteer from "puppeteer-core";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const url = arg("url", "http://localhost:3100/read/1?from=5&to=5&mode=ustadh&style=mushaf");
const wav = arg("wav", "mic.wav");
const chrome = arg("chrome", process.env.CHROME_PATH || "/usr/bin/google-chrome");
const seconds = Number(arg("seconds", "40"));
const expectMiss = arg("expect-miss", null);
// Clean take: expect "matched" then an automatic re-listen (no replay needed).
const expectMatch = process.argv.includes("--expect-match");

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: [
    "--no-sandbox",
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
    `--use-file-for-fake-audio-capture=${wav}`,
    "--autoplay-policy=no-user-gesture-required",
  ],
});
const failures = [];
try {
  const page = await browser.newPage();
  await browser.defaultBrowserContext().overridePermissions(new URL(url).origin, ["microphone"]);
  page.on("pageerror", (e) => failures.push(`page error: ${e.message}`));
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60_000 });
  await page.waitForSelector('button[aria-label="Start listening"]', { timeout: 30_000 });
  const t0 = Date.now();
  await page.click('button[aria-label="Start listening"]');
  const frames = [];
  let last = "";
  while (Date.now() - t0 < seconds * 1000) {
    const s = await page.evaluate(() => {
      const bar = document.querySelector(".ustadh-coach-bar");
      const css = document.querySelector("style[data-ustadh-words]")?.textContent || "";
      const missCss = css.split("\n").find((rule) => rule.includes("--state-error")) || "";
      const speakCss = css.split("\n").find((rule) => rule.includes("--state-success")) || "";
      const pick = (rule) => [...rule.matchAll(/data-w="(\d+)"/g)].map((m) => m[1]).join(",");
      return {
        status: bar?.getAttribute("data-ustadh-status") || "",
        cur: document.querySelector(".w.cur")?.getAttribute("data-w") || null,
        recited: [...document.querySelectorAll(".w.inrange")].map((w) => w.getAttribute("data-w")).join(","),
        misses: pick(missCss),
        speaking: pick(speakCss),
      };
    });
    const key = JSON.stringify(s);
    if (key !== last) {
      frames.push({ t: Date.now() - t0, ...s });
      console.log(String(Date.now() - t0).padStart(6), key);
      last = key;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  const takes = frames.filter((f, i) => f.status === "listening" && frames[i - 1]?.status !== "listening").length;
  if (takes < 2) failures.push(`expected ≥2 automatic takes from one tap, got ${takes}`);
  if (expectMatch) {
    const m = frames.findIndex((f) => f.status === "matched");
    if (m < 0) failures.push("never reached matched");
    else if (!frames.slice(m).some((f) => f.status === "listening")) failures.push("no automatic listen after matched");
  } else if (!frames.some((f) => f.status === "replaying" && f.speaking)) failures.push("no Ustadh replay highlight seen");
  if (expectMiss && !frames.some((f) => f.misses.split(",").includes(expectMiss))) {
    failures.push(`word ${expectMiss} never got the miss underline`);
  }
  const liveFalseMiss = frames.find((f) => f.status === "listening" && f.misses && expectMiss && !f.misses.split(",").every((m) => m === expectMiss));
  if (liveFalseMiss) failures.push(`live peek underlined ${liveFalseMiss.misses} at ${liveFalseMiss.t}ms`);
  const pause = await page.$('button[aria-label="Pause the Ustadh loop"]');
  if (!pause) failures.push("no Pause button while looping");
  else {
    await pause.click();
    await new Promise((r) => setTimeout(r, 2_500));
    const after = await page.evaluate(() => document.querySelector(".ustadh-coach-bar")?.getAttribute("data-ustadh-loop"));
    if (after !== "off") failures.push("Pause did not stop the loop");
  }
  console.log({ takes, frames: frames.length });
} finally {
  await browser.close();
}
if (failures.length) {
  console.error("FAIL\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log("PASS");
