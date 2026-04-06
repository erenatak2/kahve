const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const customers = await prisma.customer.findMany({
    include: {
      user: true,
      orders: {
        include: { payments: true }
      }
    }
  });
  
  console.log(JSON.stringify(customers.map(c => ({
    id: c.id,
    name: c.user.name,
    orderCount: c.orders.length,
    payments: c.orders.flatMap(o => o.payments.map(p => ({
      id: p.id,
      amount: p.amount,
      status: p.status
    })))
  })), null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
