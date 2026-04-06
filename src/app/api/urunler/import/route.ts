import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const { products } = await req.json()

  if (!Array.isArray(products) || products.length === 0) {
    return NextResponse.json({ error: 'Ürün listesi boş' }, { status: 400 })
  }

  let created = 0
  let updated = 0

  type DbProduct = { id: string; name: string; purchasePrice: string | null; salePrice: number; category: string; unit: string; stock: number }
  const allDbProducts = await prisma.product.findMany({ where: { isActive: true }, select: { id: true, name: true, purchasePrice: true, salePrice: true, category: true, unit: true, stock: true } }) as unknown as DbProduct[]
  const seenNames = new Set(allDbProducts.map((pr) => pr.name.toLowerCase().trim()))

  for (const p of products) {
    if (!p.name || !p.salePrice) continue

    const nameLower = p.name.toLowerCase().trim()
    const existing = allDbProducts.find((pr) => pr.name.toLowerCase().trim() === nameLower)

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          ...(p.code !== undefined ? { code: p.code || null } : {}),
          purchasePrice: p.purchasePrice ?? existing.purchasePrice,
          salePrice: p.salePrice,
          category: p.category || existing.category,
          unit: p.unit || existing.unit,
          stock: p.stock !== undefined ? p.stock : existing.stock,
        },
      })
      updated++
    } else if (!seenNames.has(nameLower)) {
      seenNames.add(nameLower)
      const created_product = await prisma.product.create({
        data: {
          ...(p.code ? { code: p.code } : {}),
          name: p.name.trim(),
          category: p.category || 'Genel',
          purchasePrice: p.purchasePrice || '0',
          salePrice: p.salePrice,
          stock: p.stock || 0,
          minStock: p.minStock || 10,
          unit: p.unit || 'Adet',
          description: p.description || '',
        },
        select: { id: true, name: true, purchasePrice: true, salePrice: true, category: true, unit: true, stock: true },
      })
      allDbProducts.push(created_product)
      created++
    }
  }

  return NextResponse.json({ created, updated, total: products.length })
}
