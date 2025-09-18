/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_DEFILLAMA_API_KEY: process.env.NEXT_PUBLIC_DEFILLAMA_API_KEY,
  },
  
  // Disable ESLint during build for development
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Enable React 19 features
  experimental: {
    reactCompiler: false
  },
  
  // API routes configuration
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },
  
  // Optimize for performance (swcMinify is deprecated in Next.js 15)
  
  // Image optimization
  images: {
    domains: ['defillama.com', 'llama.fi'],
  },

  // Enable webpack bundle analyzer in development
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      const originalEntry = config.entry
      config.entry = async () => {
        const entries = await originalEntry()
        if (entries['main.js'] && !entries['main.js'].includes('./src/lib/dev-tools.js')) {
          entries['main.js'].push('./src/lib/dev-tools.js')
        }
        return entries
      }
    }
    return config
  },
}

module.exports = nextConfig