import { PrismaClient } from '@prisma/client'
import fs from 'fs'

const prisma = new PrismaClient()

async function main() {
  const rawData = fs.readFileSync('migration-data.json', 'utf8')
  const data = JSON.parse(rawData)
  
  const results = {
      success: 0,
      errors: [] as any[]
  }

  // Eksik ürünleri kontrol et/oluştur
  const neededProductIds = new Set<string>()
  for (const order of data.orders) {
    for (const item of order.orderItems) {
      neededProductIds.add(item.productId)
    }
  }

  for (const pId of Array.from(neededProductIds)) {
    const exists = await prisma.product.findUnique({ where: { id: pId } })
    if (!exists) {
      await prisma.product.create({
        data: {
          id: pId,
          name: 'Eski Satılan Ürün (Arşiv)',
          category: 'Diğer',
          salePrice: 1,
          isActive: false
        }
      })
    }
  }

  for (const order of data.orders) {
    const { orderItems, payments, paymentNotifications, ...orderData } = order
    const existingOrder = await prisma.order.findUnique({ where: { id: orderData.id } })
    if (!existingOrder) {
      try {
        await prisma.order.create({
          data: {
            ...orderData,
            orderItems: { 
              create: orderItems.map(({ orderId, ...rest }: any) => rest) 
            },
            payments: { 
              create: payments.map(({ orderId, ...rest }: any) => rest) 
            },
            paymentNotifications: { 
              create: paymentNotifications.map(({ orderId, ...rest }: any) => rest) 
            }
          }
        })
        results.success++
      } catch (err) {
        results.errors.push({ orderId: orderData.id, message: String(err) })
      }
    }
  }
  
  fs.writeFileSync('order-errors.json', JSON.stringify(results, null, 2))
  console.log(`Bitti! Başarılı: ${results.success}, Hata: ${results.errors.length}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
