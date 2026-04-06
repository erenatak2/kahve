import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { MusteriShell } from '@/components/layout/MusteriShell'

export default async function MusteriLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'MUSTERI') redirect('/')

  return (
    <MusteriShell user={session.user as any}>
      {children}
    </MusteriShell>
  )
}
