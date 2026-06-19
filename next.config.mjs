import { readFileSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, "package.json"), "utf8"))

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_SALES_EMAIL:
      process.env.NEXT_PUBLIC_SALES_EMAIL || "satis@aslife.com.tr",
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // iyzipay reads ./resources at init; bundling breaks paths without externalization
    serverComponentsExternalPackages: ["iyzipay"],
  },
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/icon.svg" }]
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
}

export default nextConfig
