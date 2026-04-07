import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AdminShell } from '@/components/layout/AdminShell'
import { AdminLoginForm } from '@/components/auth/AdminLoginForm'
import { prisma } from '@/lib/prisma'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  
  const role = (session?.user as any)?.role
  if (!session || (role !== 'ADMIN' && role !== 'SATICI')) {
    return <AdminLoginForm />
  }

  // Veritabanından en güncel bilgiyi çek ki isim/email değiştiyse anında yansısın
  const dbUser = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { name: true, email: true, role: true }
  })

  return (
    <AdminShell user={(dbUser as any) || (session.user as any)}>
      {children}
    </AdminShell>
  )
}
