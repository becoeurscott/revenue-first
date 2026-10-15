// Vercel root entrypoint: boot the mock and listen on PORT.
import http from "node:http";
try {
  const { handle } = await import("./vaulten-mock.mjs");
  const port = Number(process.env.PORT || 4310);
  http.createServer(handle).listen(port, () => console.log(`mock listening on ${port}`));
} catch (e) {
  console.error("MOCK_BOOT_ERROR", e && e.stack ? e.stack : e);
  http.createServer((req, res) => { res.statusCode = 500; res.end("MOCK_BOOT_ERROR " + (e && e.stack ? e.stack : e)); }).listen(Number(process.env.PORT || 4310));
}
