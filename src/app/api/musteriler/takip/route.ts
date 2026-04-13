import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { customerId, days, note } = await req.json()

  if (!customerId || days === undefined) {
    return NextResponse.json({ error: 'Müşteri ve gün sayısı gerekli' }, { status: 400 })
  }

  const nextCallDate = new Date()
  nextCallDate.setDate(nextCallDate.getDate() + parseInt(days))
  nextCallDate.setHours(9, 0, 0, 0) // Sabah 09:00'a kur

  try {
    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        nextCallDate,
        followUpNote: note || null,
        followUpStatus: 'BEKLIYOR'
      }
    })
    return NextResponse.json(customer)
  } catch (error) {
    return NextResponse.json({ error: 'Güncelleme yapılamadı' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { customerId, status } = await req.json()

  if (!customerId) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })

  try {
    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: { followUpStatus: status || 'ARANDI' }
    })
    return NextResponse.json(customer)
  } catch (error) {
    return NextResponse.json({ error: 'Güncelleme yapılamadı' }, { status: 500 })
  }
}
