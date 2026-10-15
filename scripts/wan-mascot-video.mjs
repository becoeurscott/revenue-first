#!/usr/bin/env node
// Turn a mascot still into a short clip with Wan (Alibaba Cloud Model Studio).
//
// Usage:
//   DASHSCOPE_API_KEY=sk-... node scripts/wan-mascot-video.mjs <image.png> [out.mp4] [--prompt "..."]
//
// Env:
//   DASHSCOPE_API_KEY   required. Put it in .env (loaded here) or export it.
//   DASHSCOPE_REGION    "intl" (default, Singapore) or "cn" (Beijing).
//   WAN_MODEL           default "wan2.2-i2v-plus". "wan2.2-i2v-flash" is cheaper and faster.
//   WAN_RESOLUTION      default "1080P". wan2.2 accepts only "1080P" or "480P".
//   WAN_DURATION        seconds, default 5.

import fs from "node:fs";
import path from "node:path";

loadDotEnv();

const args = process.argv.slice(2);
const promptIdx = args.indexOf("--prompt");
const prompt =
  promptIdx >= 0
    ? args.splice(promptIdx, 2)[1]
    : "The cat mascot waves hello with one gloved hand, then lowers it and gives a small confident nod. Subtle idle breathing, camera locked, plain background.";

// Appended to every prompt so Wan keeps the character on-model.
const CHARACTER_LOCK =
  " Keep the exact same character design throughout: a faceless black cat head with NO mouth, NO nose and NO pupils; the only facial feature is two solid glowing white oval eyes that keep their oval shape (they may only blink closed briefly). Plain dark gloved hands with no paw pads. Purple hoodie, black pants, purple sneakers. 3D vinyl toy look, same lighting.";

const [imagePath, requestedOut] = args;
const outPath = requestedOut ? uniquePath(requestedOut) : uniquePath("mascot-wan.mp4");
if (!imagePath) {
  console.error("usage: node scripts/wan-mascot-video.mjs <image.png> [out.mp4] [--prompt \"...\"]");
  process.exit(1);
}
const apiKey = process.env.DASHSCOPE_API_KEY;
if (!apiKey) {
  console.error("DASHSCOPE_API_KEY is not set. Add it to .env or export it.");
  process.exit(1);
}

const region = process.env.DASHSCOPE_REGION === "cn" ? "" : "-intl";
const base = `https://dashscope${region}.aliyuncs.com/api/v1`;
const model = process.env.WAN_MODEL || "wan2.2-i2v-plus";
const resolution = process.env.WAN_RESOLUTION || "1080P";
const duration = Number(process.env.WAN_DURATION || 5);

const mime = imagePath.toLowerCase().endsWith(".jpg") || imagePath.toLowerCase().endsWith(".jpeg") ? "image/jpeg" : "image/png";
const imgUrl = `data:${mime};base64,${fs.readFileSync(imagePath).toString("base64")}`;

const headers = {
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
};

console.log(`submitting ${path.basename(imagePath)} to ${model} (${resolution}, ${duration}s)`);
let submit;
// Retry when Alibaba throttles concurrent submissions (Throttling.RateQuota).
for (let attempt = 1; ; attempt++) {
  submit = await fetch(`${base}/services/aigc/video-generation/video-synthesis`, {
  method: "POST",
  headers: { ...headers, "X-DashScope-Async": "enable" },
  body: JSON.stringify({
    model,
    input: { prompt: prompt + CHARACTER_LOCK, img_url: imgUrl, negative_prompt: "mouth, smile, teeth, grin, nose, pupils, irises, eyebrows, eyelids, angry eyes, half-closed eyes, changing eye shape, paw pads, pink paw, claws, text, watermark, logo, blur, distortion, extra limbs, extra fingers, realistic fur" },
    parameters: { resolution, duration, prompt_extend: true, watermark: false },
  }),
}).then(r => r.json());
  if (submit.code !== "Throttling.RateQuota" || attempt >= 12) break;
  console.log(`  throttled, retrying in 30s (attempt ${attempt})`);
  await new Promise(r => setTimeout(r, 30_000));
}

if (!submit.output?.task_id) {
  console.error("submit failed:", JSON.stringify(submit, null, 2));
  process.exit(1);
}
const taskId = submit.output.task_id;
console.log("task", taskId);

let videoUrl;
for (;;) {
  await new Promise(r => setTimeout(r, 10_000));
  const st = await fetch(`${base}/tasks/${taskId}`, { headers }).then(r => r.json());
  const status = st.output?.task_status;
  process.stdout.write(`  ${status}\n`);
  if (status === "SUCCEEDED") { videoUrl = st.output.video_url; break; }
  if (status === "FAILED" || status === "CANCELED" || status === "UNKNOWN") {
    console.error("task failed:", JSON.stringify(st, null, 2));
    process.exit(1);
  }
}

const buf = Buffer.from(await fetch(videoUrl).then(r => r.arrayBuffer()));
fs.writeFileSync(outPath, buf);
console.log(`saved ${outPath} (${(buf.length / 1e6).toFixed(1)} MB). Link expires in 24h: ${videoUrl}`);

// Never overwrite an earlier take: mascot-wan.mp4 -> mascot-wan-2.mp4, -3, ...
function uniquePath(p) {
  if (!fs.existsSync(p)) return p;
  const ext = path.extname(p), stem = p.slice(0, -ext.length);
  for (let i = 2; ; i++) if (!fs.existsSync(`${stem}-${i}${ext}`)) return `${stem}-${i}${ext}`;
}

function loadDotEnv() {
  try {
    for (const line of fs.readFileSync(".env", "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}
