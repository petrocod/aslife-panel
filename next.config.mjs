/** @type {import('next').NextConfig} */
const nextConfig = {
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
