const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const customer = await prisma.customer.findFirst({
    where: { user: { name: { contains: 'Ömer Faruk' } } }
  });
  
  const order = await prisma.order.findFirst({
    where: { customerId: customer.id },
    include: { payments: true }
  });
  
  if (order) {
    console.log('Order Total:', order.totalAmount);
    console.log('Payments:', 
      order.payments.map(p => ({
        id: p.id,
        amount: p.amount,
        status: p.status
      }))
    );
    const totalPaid = order.payments
      .filter(p => p.status === 'ODENDI')
      .reduce((sum, p) => sum + p.amount, 0);
    console.log('Total Paid:', totalPaid);
    console.log('Remaining:', order.totalAmount - totalPaid);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
