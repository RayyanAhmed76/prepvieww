/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com', 'via.placeholder.com'],
  },
  async redirects() {
    return [
      { source: '/dashboard/interview', destination: '/interview', permanent: true },
      { source: '/dashboard/resume', destination: '/resume', permanent: true },
      { source: '/dashboard/performance', destination: '/performance', permanent: true },
    ]
  },
}

module.exports = nextConfig

