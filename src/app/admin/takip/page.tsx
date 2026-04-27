import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import TakipClient from './TakipClient'

export default async function TakipPage() {
  const session = await getServerSession(authOptions)

  if (!session || !['ADMIN', 'SATICI'].includes((session?.user as any)?.role)) {
    redirect('/auth/login')
  }

  // Veriler client-side çekilecek - sayfa hemen açılsın
  return (
    <TakipClient 
      initialReminders={[]} 
      session={session}
    />
  )
}
