import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminShell } from '@/components/layout/AdminShell'
import ReminderList from '@/components/layout/ReminderList'

export default async function TakipPage() {
  const session = await getServerSession(authOptions)
  if (!session || ((session.user as any).role !== 'ADMIN' && (session.user as any).role !== 'SATICI')) {
    redirect('/admin')
  }

  return (
    <AdminShell user={session.user}>
      <div className="p-6 h-full flex flex-col">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Müşteri Takip ve Hatırlatıcılar</h1>
          <p className="text-gray-500">Teslimat sonrası aranacak veya ziyaret edilecek müşterilerin listesi.</p>
        </div>

        <div className="flex-1 bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col">
          <ReminderList />
        </div>
      </div>
    </AdminShell>
  )
}
