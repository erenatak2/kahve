import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Bir müşterinin arama geçmişi
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const customerId = searchParams.get('customerId')

  if (customerId) {
    const logs = await prisma.callLog.findMany({
      where: { customerId },
      orderBy: { calledAt: 'desc' },
      take: 20
    })
    return NextResponse.json(logs)
  }

  // Tüm arama geçmişi (Admin/Takip sayfasındaki "Geçmiş" için)
  const allLogs = await prisma.callLog.findMany({
    orderBy: { calledAt: 'desc' },
    include: {
      customer: { select: { businessName: true, user: { select: { name: true } } } },
      contact: { select: { name: true } }
    },
    take: 50
  })

  return NextResponse.json(allLogs)
}

// POST: Yeni arama notu kaydet + takibi tamamla
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const body = await req.json()
  const { customerId, contactId, note, outcome, type, relatedId } = body

  if (!customerId && !contactId && type !== 'CONTACT') return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })

  const calledBy = (session.user as any).id
  const calledByName = session.user?.name || 'Bilinmeyen'

  // Arama notunu kaydet
  const log = await prisma.callLog.create({
    data: {
      customerId: customerId || undefined,
      contactId: contactId || (type === 'CONTACT' ? relatedId : undefined),
      note: note || '',
      outcome: outcome || 'GORUSTUK',
      calledBy,
      calledByName
    }
  })

  // Takip tipine göre tamamla
  if (type === 'CUSTOMER' && customerId) {
    await prisma.customer.update({
      where: { id: customerId },
      data: { followUpStatus: 'ARANDI', nextCallDate: null }
    })
  } else if (type === 'ORDER' && relatedId) {
    await prisma.order.update({
      where: { id: relatedId },
      data: { followupStatus: 'ARANDI' }
    })
  } else if (type === 'CONTACT' && relatedId) {
    await prisma.contact.update({
      where: { id: relatedId },
      data: { reminderAt: null }
    })
  }

  return NextResponse.json({ success: true, log })
}
