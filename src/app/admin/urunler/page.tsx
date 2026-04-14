import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import UrunlerClient from './UrunlerClient'

export default async function UrunlerPage() {
  const session = await getServerSession(authOptions)

  if (!session || !['ADMIN', 'SATICI'].includes((session?.user as any)?.role)) {
    redirect('/auth/login')
  }

  // Aktif ürünleri getir ve sırala
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: [
      { code: 'asc' },
      { name: 'asc' }
    ]
  })

  // Prisma verilerini JSON-safe hale getir (Decimal/Date nesnelerini handle et)
  const serializedProducts = JSON.parse(JSON.stringify(products))

  return (
    <UrunlerClient initialProducts={serializedProducts} />
  )
}
