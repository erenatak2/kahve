import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role

  if (!session || role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz erişim. Sadece ana yöneticiler bu sayfayı görebilir.' }, { status: 401 })
  }

  const team = await prisma.user.findMany({
    where: { 
      role: { in: ['ADMIN', 'SATICI'] } 
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(team)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const userRole = (session?.user as any)?.role

  if (!session || userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz erişim. Sadece ana yöneticiler ekip üyesi ekleyebilir.' }, { status: 401 })
  }

  const { name, email, password, role } = await req.json()

  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: 'Tüm alanları doldurunuz.' }, { status: 400 })
  }

  if (role !== 'ADMIN' && role !== 'SATICI') {
    return NextResponse.json({ error: 'Geçersiz rol türü.' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Bu e-posta adresi zaten kullanımda.' }, { status: 409 })
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10)
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    })
    
    return NextResponse.json(newUser, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Kullanıcı oluşturulurken bir hata meydana geldi.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const userRole = (session?.user as any)?.role

  if (!session || userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Geçersiz ID' }, { status: 400 })
  }

  // Kendisini silmesini engelle
  if (id === (session.user as any).id) {
    return NextResponse.json({ error: 'Kendi hesabınızı silemezsiniz!' }, { status: 400 })
  }

  try {
    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Kullanıcı silinirken bir hata oluştu.' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const userRole = (session?.user as any)?.role

  if (!session || userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz erişim. Sadece ana yöneticiler ekip üyesi güncelleyebilir.' }, { status: 401 })
  }

  const { id, name, email, password, role } = await req.json()

  if (!id || !name || !email || !role) {
    return NextResponse.json({ error: 'Eksik bilgi gönderdiniz.' }, { status: 400 })
  }

  if (role !== 'ADMIN' && role !== 'SATICI') {
    return NextResponse.json({ error: 'Geçersiz rol türü.' }, { status: 400 })
  }

  // E-posta çakışmasını kontrol et (Kendi e-postası hariç)
  const existing = await prisma.user.findFirst({
    where: {
      email,
      id: { not: id }
    }
  })

  if (existing) {
    return NextResponse.json({ error: 'Bu e-posta adresi başka bir kullanıcı tarafından kullanılıyor.' }, { status: 409 })
  }

  try {
    let updateData: any = { name, email, role }

    // Eğer şifre girilmişse, şifreyi de güncelle
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10)
      updateData.password = hashedPassword
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    })
    
    return NextResponse.json(updatedUser, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: 'Kullanıcı güncellenirken bir hata meydana geldi.' }, { status: 500 })
  }
}
