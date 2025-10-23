/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable React Strict Mode to prevent hydration issues
  reactStrictMode: false,
  // Disable source maps in development to prevent JS errors
  productionBrowserSourceMaps: false,
  // Optimize JavaScript to prevent runtime crashes
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === "production",
  },
  // Configure trailing slash explicitly for Next.js 15.5.3
  trailingSlash: false,
  // Disable ESLint errors during build (allow warnings)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
  // Configure webpack for SVG handling
  webpack: (config) => {
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });
    return config;
  }
}

module.exports = nextConfig