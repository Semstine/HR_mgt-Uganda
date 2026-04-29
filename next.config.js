/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma', 'mammoth', 'pdf-lib'],
  },
  images: {
    domains: ['localhost'],
  },
}

module.exports = nextConfig
