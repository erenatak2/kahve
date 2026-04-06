import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const role = (session.user as any).role
  const sessionCustomerId = (session.user as any).customerId
  const customerId = searchParams.get('customerId') || (role === 'MUSTERI' ? sessionCustomerId : null)

  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    include: customerId ? {
      customerPrices: { where: { customerId } }
    } : undefined,
  })

  if (customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } })
    const enriched = products.map((p: any) => {
      const cp = p.customerPrices?.[0]
      let customerPrice = cp ? cp.price : p.salePrice
      let discountRate = 0
      if (!cp && customer?.discountRate && customer.discountRate > 0) {
        customerPrice = p.salePrice * (1 - customer.discountRate / 100)
        discountRate = customer.discountRate
      }
      return { ...p, customerPrice, discountRate: discountRate > 0 ? discountRate : undefined, customerPrices: undefined }
    })
    const sortedEnriched = [...enriched].sort((a: any, b: any) => {
      if (!a.code && !b.code) return a.name.localeCompare(b.name, 'tr')
      if (!a.code) return 1
      if (!b.code) return -1
      return a.code.localeCompare(b.code, 'tr', { numeric: true })
    })
    return NextResponse.json(sortedEnriched)
  }

  const sorted = [...products].sort((a: any, b: any) => {
    if (!a.code && !b.code) return a.name.localeCompare(b.name, 'tr')
    if (!a.code) return 1
    if (!b.code) return -1
    return a.code.localeCompare(b.code, 'tr', { numeric: true })
  })
  return NextResponse.json(sorted)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const body = await req.json()
  const product = await prisma.product.create({ data: body })
  return NextResponse.json(product, { status: 201 })
}
