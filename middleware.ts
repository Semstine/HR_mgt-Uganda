export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/recruitment/:path*',
    '/employees/:path*',
    '/onboarding/:path*',
    '/performance/:path*',
    '/analytics/:path*',
    '/ai-assistant/:path*',
    '/company/:path*',
    '/api/jobs/:path*',
    '/api/candidates/:path*',
    '/api/employees/:path*',
    '/api/performance/:path*',
    '/api/analytics/:path*',
    '/api/ai/:path*',
    '/api/company/:path*',
    '/api/upload/:path*',
    '/api/communications/:path*',
    '/api/onboarding/:path*',
  ],
}
