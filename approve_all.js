const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const result = await prisma.customer.updateMany({
    where: { isApproved: false },
    data: { isApproved: true }
  })
  console.log(`Approved ${result.count} customers.`)
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
