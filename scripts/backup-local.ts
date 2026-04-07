import { PrismaClient } from '@prisma/client'
import fs from 'fs'

const prisma = new PrismaClient()

async function main() {
  console.log('--- YEDEKLEME BAŞLADI (SQLite) ---')
  
  const users = await prisma.user.findMany()
  const customers = await prisma.customer.findMany()
  const orders = await prisma.order.findMany({
    include: {
      orderItems: true,
      payments: true,
      paymentNotifications: true
    }
  })
  const products = await prisma.product.findMany()
  const customerPrices = await prisma.customerPrice.findMany()

  const data = {
    users,
    customers,
    products,
    orders,
    customerPrices
  }

  fs.writeFileSync('migration-data.json', JSON.stringify(data, null, 2))
  console.log(`Yedekleme Tamamlandı!`)
  console.log(`- ${users.length} Müşteri Kullanıcısı`)
  console.log(`- ${customers.length} Müşteri Detayı`)
  console.log(`- ${orders.length} Sipariş`)
  console.log(`- ${customerPrices.length} Özel Fiyat`)
  console.log('migration-data.json dosyası oluşturuldu.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
