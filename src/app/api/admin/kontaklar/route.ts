import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role

  if (!session || (role !== 'ADMIN' && role !== 'SATICI')) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const userId = (session.user as any).id
  const whereClause: any = { isActive: true }

  // Satıcı ise sadece kendi müşterilerinin kontaklarını görebilir mi?
  // Evet, Müşteriler sayfasındaki prensibi burada da uygulayalım.
  if (role === 'SATICI') {
    whereClause.customer = { salesRepId: userId }
  }

  const contacts = await prisma.contact.findMany({
    where: whereClause,
    include: {
      customer: {
        select: {
          id: true,
          businessName: true,
          user: { select: { name: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(contacts)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role

  if (!session || (role !== 'ADMIN' && role !== 'SATICI')) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  try {
    const { name, title, phone, email, notes, customerId, reminderAt } = await req.json()

    if (!name) {
      return NextResponse.json({ error: 'Kişi adı zorunludur' }, { status: 400 })
    }

    const contact = await prisma.contact.create({
      data: {
        name,
        title,
        phone,
        email,
        notes,
        customerId,
        reminderAt: reminderAt ? new Date(reminderAt) : null,
      },
      include: {
        customer: {
          select: {
            id: true,
            businessName: true,
            user: { select: { name: true } }
          }
        }
      }
    })

    return NextResponse.json(contact, { status: 201 })
  } catch (error) {
    console.error('Kontak oluşturma hatası:', error)
    return NextResponse.json({ error: 'Kontak oluşturulamadı' }, { status: 500 })
  }
}
