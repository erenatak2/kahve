const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const oCount = await prisma.order.count();
  const pCount = await prisma.payment.count();
  const nCount = await prisma.paymentNotification.count();
  const cCount = await prisma.customer.count();
  
  console.log('--- DB SUMMARY ---');
  console.log(`Orders: ${oCount}`);
  console.log(`Payments: ${pCount}`);
  console.log(`Notifications: ${nCount}`);
  console.log(`Customers: ${cCount}`);
  
  const statuses = await prisma.order.groupBy({
    by: ['status'],
    _count: true
  });
  console.log('Order Statuses:', JSON.stringify(statuses, null, 2));
  
  const orders = await prisma.order.findMany({
    include: {
      customer: { include: { user: true } },
      orderItems: { include: { product: true } }
    },
    take: 10
  });
  console.log('Sample Orders:', JSON.stringify(orders, null, 2));

  const payments = await prisma.payment.findMany({
    include: {
      order: { include: { customer: { include: { user: true } } } }
    },
    take: 10
  });
  console.log('Sample Payments:', JSON.stringify(payments, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
