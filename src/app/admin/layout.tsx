import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AdminShell } from '@/components/layout/AdminShell'
import { AdminLoginForm } from '@/components/auth/AdminLoginForm'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  
  if (!session || (session.user as any).role !== 'ADMIN') {
    return <AdminLoginForm />
  }

  return (
    <AdminShell user={session.user as any}>
      {children}
    </AdminShell>
  )
}
