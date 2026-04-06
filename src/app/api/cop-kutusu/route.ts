import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const [customers, products] = await Promise.all([
    prisma.customer.findMany({
      where: { isActive: false },
      include: {
        user: { select: { id: true, name: true, email: true } },
        orders: { select: { id: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.product.findMany({
      where: { isActive: false },
      include: { orderItems: { select: { id: true } } },
      orderBy: { updatedAt: 'desc' },
    }),
  ])

  return NextResponse.json({ customers, products })
}
