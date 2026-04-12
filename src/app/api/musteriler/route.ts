import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role

  if (!session || (role !== 'ADMIN' && role !== 'SATICI')) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const whereClause: any = { isActive: true }
  if (role === 'SATICI') {
    whereClause.salesRepId = (session.user as any).id
  }

  const customers = await prisma.customer.findMany({
    where: whereClause,
    include: {
      user: { select: { id: true, name: true, email: true, createdAt: true } },
      salesRep: { select: { id: true, name: true } },
      orders: { 
        select: { 
          totalAmount: true, 
          payments: { select: { amount: true, status: true } } 
        } 
      },
      _count: { select: { customerPrices: true } }
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(customers)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role

  if (!session || (role !== 'ADMIN' && role !== 'SATICI')) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const { name, email, password, phone, address, shippingAddress, city, taxNumber, taxOffice, businessName, discountRate, notes, salesRepId } = await req.json()

  if (!name || !email) return NextResponse.json({ error: 'Ad ve e-posta zorunlu' }, { status: 400 })

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: 'Bu e-posta adresi zaten kayıtlı' }, { status: 409 })

  const hashedPassword = await bcrypt.hash(password || '123456', 10)

  // Plasiyer belirleme: 
  // 1. Gelen salesRepId varsa (Admin seçmiş olabilir)
  // 2. İşlemi yapan SATICI ise kendisini ata
  const assignedSalesRepId = salesRepId || (role === 'SATICI' ? (session.user as any).id : undefined)

  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'MUSTERI',
        customer: {
          create: { 
            phone, address, shippingAddress, city, taxNumber, taxOffice, businessName, discountRate: discountRate || 0, notes,
            ...(assignedSalesRepId ? { salesRepId: assignedSalesRepId } : {})
          },
        },
      },
      include: { customer: true },
    })
    return NextResponse.json(user, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Müşteri oluşturulamadı' }, { status: 500 })
  }
}
