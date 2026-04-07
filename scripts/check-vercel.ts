import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const c = await prisma.order.count()
  console.log('Vercel order count:', c)
  const orders = await prisma.order.findMany({ select: { id: true, customerId: true } })
  console.log('Orders:', orders)
}

main().finally(() => prisma.$disconnect())
