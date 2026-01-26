/** @type {import('next').NextConfig} */
const nextConfig = {
  // Increase timeout for long-running API routes (LLM operations)
  serverExternalPackages: ['openai'],
};

export default nextConfig;
