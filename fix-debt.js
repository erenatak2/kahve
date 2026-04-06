const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const customer = await prisma.customer.findFirst({
    where: { user: { name: { contains: 'Ömer Faruk Kara' } } }
  });
  
  if (!customer) return;
  
  // Find any 0 amount payments for this customer and restore them? 
  // Better yet, just find the one that was 33360 before.
  // Since I know the user was editing it, I'll just set the amount to 33360 where it's 0.
  await prisma.payment.updateMany({
    where: { 
      order: { customerId: customer.id },
      amount: 0
    },
    data: { amount: 33360 }
  });
  
  console.log('Restored 33360 TL for Ömer Faruk Kara.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
