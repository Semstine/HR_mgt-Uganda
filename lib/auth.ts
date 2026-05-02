import { type NextAuthOptions, getServerSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import type { DscRole, UserRole } from '@/types'

declare module 'next-auth' {
  interface User {
    id: string
    role: UserRole
    companyId: string | null
    districtId?: string | null
    dscRole?: DscRole | null
  }
  interface Session {
    user: User & { name: string; email: string }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole
    companyId: string | null
    districtId?: string | null
    dscRole?: DscRole | null
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        })

        if (!user || !user.isActive) return null

        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: (user.dscRole || user.role) as UserRole,
          companyId: user.companyId,
          districtId: user.districtId,
          dscRole: user.dscRole as DscRole | null,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.companyId = user.companyId
        token.districtId = user.districtId
        token.dscRole = user.dscRole
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.companyId = token.companyId
        session.user.districtId = token.districtId
        session.user.dscRole = token.dscRole
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
}

export async function getSession() {
  return getServerSession(authOptions)
}

export async function requireAuth() {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  return session
}

export const HR_ROLES: UserRole[] = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER', 'HR_OFFICER']

export function canManageHR(role: UserRole): boolean {
  return HR_ROLES.includes(role)
}

export function canViewAnalytics(role: UserRole): boolean {
  return (['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER', 'DEPARTMENT_MANAGER'] as UserRole[]).includes(role)
}

export function canManageVacancies(role: UserRole): boolean {
  return (['HOD', 'DHRO', 'CAO', 'SECRETARY_DSC', 'NATIONAL_ADMIN_MOPS', 'SUPER_ADMIN', 'COMPANY_ADMIN'] as UserRole[]).includes(role)
}

export function canIssueAppointment(role: UserRole): boolean {
  return (['CAO', 'NATIONAL_ADMIN_MOPS', 'SUPER_ADMIN'] as UserRole[]).includes(role)
}

export function canScore(role: UserRole): boolean {
  return (['DSC_CHAIRPERSON', 'DSC_MEMBER', 'COOPTED_TECHNICAL_SPECIALIST', 'HOD', 'NATIONAL_ADMIN_MOPS', 'SUPER_ADMIN'] as UserRole[]).includes(role)
}
