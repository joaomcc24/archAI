/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
  // Increase timeout for LLM operations
  experimental: {
    proxyTimeout: 300000, // 5 minutes
  },
};

export default nextConfig;
