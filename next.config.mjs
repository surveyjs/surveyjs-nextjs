import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: here,
  env: {
    NEXTJS_PUBLIC_SLK: process.env.NEXTJS_PUBLIC_SLK ?? "",
  },
};

export default nextConfig;
