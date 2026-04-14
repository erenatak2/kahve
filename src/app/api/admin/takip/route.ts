import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const body = await req.json()
  const { customerId, days, date } = body // Artık 'date' de gelebilir

  if (!customerId || (days === undefined && !date)) {
    return NextResponse.json({ error: 'Eksik bilgi' }, { status: 400 })
  }

  let nextCallDate: Date;
  
  if (date) {
    // Eğer direkt tarih gelmişse, o günü sabah 09:00 yap
    nextCallDate = new Date(date)
    nextCallDate.setHours(9, 0, 0, 0)
  } else {
    // Eğer 'gün' gelmişse, bugünün üzerine ekle
    nextCallDate = new Date()
    nextCallDate.setHours(9, 0, 0, 0)
    nextCallDate.setDate(nextCallDate.getDate() + parseInt(days))
  }

  await prisma.customer.update({
    where: { id: customerId },
    data: {
      nextCallDate,
      followUpStatus: 'BEKLIYOR'
    }
  })

  return NextResponse.json({ success: true, nextCallDate })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const body = await req.json()
  const { customerId, status } = body

  if (!customerId) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })

  await prisma.customer.update({
    where: { id: customerId },
    data: {
      followUpStatus: status || 'ARANDI',
      nextCallDate: null // Arandıktan sonra tarihi temizle (isteğe bağlı)
    }
  })

  return NextResponse.json({ success: true })
}
