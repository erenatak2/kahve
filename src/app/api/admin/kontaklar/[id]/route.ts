import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role

  if (!session || (role !== 'ADMIN' && role !== 'SATICI')) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  try {
    const { name, title, phone, email, notes, customerId, companyName, reminderAt } = await req.json()

    const contact = await prisma.contact.update({
      where: { id: params.id },
      data: {
        name,
        title,
        phone,
        email,
        notes,
        customerId: customerId || null,
        companyName,
        reminderAt: reminderAt ? new Date(reminderAt) : null,
      },
    })

    return NextResponse.json(contact)
  } catch (error) {
    console.error('Kontak güncelleme hatası:', error)
    return NextResponse.json({ error: 'Kontak güncellenemedi' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role

  if (!session || (role !== 'ADMIN' && role !== 'SATICI')) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  try {
    // Soft delete - reminderAt'ı da null yap
    await prisma.contact.update({
      where: { id: params.id },
      data: { isActive: false, reminderAt: null }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Kontak silme hatası:', error)
    return NextResponse.json({ error: 'Kontak silinemedi' }, { status: 500 })
  }
}
