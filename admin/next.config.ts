import path from "node:path";
import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  // The repo root also has a package-lock.json (the web prototype); keep tracing scoped to admin/.
  outputFileTracingRoot: path.join(__dirname),
};

export default config;
