/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    return [
      { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
      { source: '/socket.io/:path*', destination: `${backendUrl}/socket.io/:path*` },
    ];
  },
};

export default nextConfig;
