const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    include: { payments: true }
  });
  
  const results = orders.map(o => {
    const totalPaid = o.payments
      .filter(p => p.status === 'ODENDI')
      .reduce((sum, p) => sum + p.amount, 0);
      
    const totalPending = o.payments
      .filter(p => p.status === 'BEKLIYOR' || p.status === 'GECIKTI')
      .reduce((sum, p) => sum + p.amount, 0);
      
    return {
      orderId: o.id,
      totalAmount: o.totalAmount,
      totalPaid,
      totalPending,
      paymentDetails: o.payments.map(p => ({
        id: p.id,
        amount: p.amount,
        status: p.status
      }))
    };
  });
  
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
