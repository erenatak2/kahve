import { PrismaClient } from '@prisma/client'
import fs from 'fs'

const prisma = new PrismaClient()

async function main() {
  const rawData = fs.readFileSync('migration-data.json', 'utf8')
  const data = JSON.parse(rawData)

  console.log('--- SİPARİŞLER YÜKLENİYOR ---')

  // Toplayalım: Siparişlerde hangi ürün ID'leri geçiyor?
  const neededProductIds = new Set<string>()
  for (const order of data.orders) {
    for (const item of order.orderItems) {
      neededProductIds.add(item.productId)
    }
  }

  // Bu ürün ID'leri internette var mı? Yoksa geçici olarak oluşturalım ki siparişler kaybolmasın!
  for (const pId of Array.from(neededProductIds)) {
    const exists = await prisma.product.findUnique({ where: { id: pId } })
    if (!exists) {
      await prisma.product.create({
        data: {
          id: pId,
          name: 'Eski Satılan Ürün (Arşiv)',
          category: 'Diğer',
          salePrice: 1, // Sadece geçmiş kayıtlar için
          isActive: false
        }
      })
      console.log(`Kayıp ürün ID'si tanımlandı: ${pId}`)
    }
  }

  // 4. Siparişleri yükle
  let bs = 0
  for (const order of data.orders) {
    const { orderItems, payments, paymentNotifications, ...orderData } = order
    
    const existingOrder = await prisma.order.findUnique({ where: { id: orderData.id } })
    if (!existingOrder) {
      try {
        await prisma.order.create({
          data: {
            ...orderData,
            orderItems: { create: orderItems },
            payments: { create: payments },
            paymentNotifications: { create: paymentNotifications }
          }
        })
        bs++
      } catch (err) {
        console.error('Hata Sipariş:', err)
      }
    }
  }
  console.log(`${bs} Adet Sipariş Başarıyla Taşındı!`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
