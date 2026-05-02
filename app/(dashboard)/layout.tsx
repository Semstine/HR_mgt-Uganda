import { getSession } from '@/lib/auth'
import { prisma, withRetry } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  let organizationName: string | undefined
  if (session.user.districtId) {
    const district = await withRetry(() =>
      prisma.district.findUnique({
        where: { id: session.user.districtId! },
        select: { name: true },
      })
    )
    organizationName = district?.name
  } else if (session.user.companyId) {
    const company = await withRetry(() =>
      prisma.company.findUnique({
        where: { id: session.user.companyId! },
        select: { name: true },
      })
    )
    organizationName = company?.name
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar companyName={organizationName} />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {children}
      </div>
    </div>
  )
}
