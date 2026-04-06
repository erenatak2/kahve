const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const customer = await prisma.customer.findFirst({
    where: { user: { name: { contains: 'Ömer Faruk' } } }
  });
  
  if (!customer) {
    console.log('Müşteri bulunamadı.');
    return;
  }
  
  const payments = await prisma.payment.findMany({
    where: { order: { customerId: customer.id } },
    include: { order: true }
  });
  
  console.log(JSON.stringify(payments, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
