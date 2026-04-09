const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const result = await prisma.order.updateMany({
    where: {
      reminderAt: { not: null }
    },
    data: {
      reminderAt: null,
      reminderNote: null,
      followupStatus: 'ARANDI' // Or just leave it as is if reminderAt is null
    }
  })
  console.log(`${result.count} adet takip kaydı temizlendi.`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
