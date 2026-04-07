import { PrismaClient } from '@prisma/client'
import fs from 'fs'

const prisma = new PrismaClient()

async function main() {
  const rawData = fs.readFileSync('migration-data.json', 'utf8')
  const data = JSON.parse(rawData)

  console.log('--- VERİ YÜKLENİYOR (Vercel/Neon) ---')

  // 1. Kullanıcıları yükle
  for (const user of data.users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { ...user },
      create: { ...user }
    })
  }
  console.log(`${data.users.length} Müşteri Kullanıcısı Tamam.`)

  // 2. Ürünleri yükle (Orijinal ID'leriyle)
  for (const product of data.products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: { ...product },
      create: { ...product }
    })
  }
  console.log(`${data.products.length} Ürün Tamam.`)

  // 3. Müşteri Detaylarını yükle
  for (const customer of data.customers) {
    await prisma.customer.upsert({
      where: { userId: customer.userId },
      update: { ...customer },
      create: { ...customer }
    })
  }
  console.log(`${data.customers.length} Müşteri Detayı Tamam.`)

  // 3. Özel Fiyatları yükle
  for (const price of data.customerPrices) {
    await prisma.customerPrice.upsert({
      where: {
        customerId_productId: {
          customerId: price.customerId,
          productId: price.productId
        }
      },
      update: { ...price },
      create: { ...price }
    })
  }
  console.log(`${data.customerPrices.length} Özel Fiyat Tamam.`)

  // 4. Siparişleri yükle (İlişkilerle birlikte)
  for (const order of data.orders) {
    const { orderItems, payments, paymentNotifications, ...orderData } = order
    
    const existingOrder = await prisma.order.findUnique({ where: { id: orderData.id } })
    if (existingOrder) {
      await prisma.order.update({
        where: { id: orderData.id },
        data: orderData
      })
    } else {
      await prisma.order.create({
        data: {
          ...orderData,
          orderItems: { create: orderItems },
          payments: { create: payments },
          paymentNotifications: { create: paymentNotifications }
        }
      })
    }
  }
  console.log(`${data.orders.length} Sipariş Tüm Detaylarıyla ( kalemler, ödemeler) Tamam.`)

  console.log('--- TÜM VERİLER BAŞARIYLA TAŞINDI ---')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
