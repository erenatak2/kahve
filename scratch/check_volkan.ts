import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const volkan = await prisma.customer.findMany({
    where: {
      OR: [
        { businessName: { contains: 'Volkan' } },
        { user: { name: { contains: 'Volkan' } } }
      ]
    },
    include: { user: true }
  })
  console.log(JSON.stringify(volkan, null, 2))
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect())
