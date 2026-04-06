const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const customer = await prisma.customer.findFirst({
    where: { user: { name: { contains: 'Ömer Faruk' } } }
  });
  
  if (!customer) return;
  
  // Find the order
  const order = await prisma.order.findFirst({
    where: { customerId: customer.id }
  });
  
  if (!order) return;
  
  // Delete all existing payments for this order and replace with one BEKLIYOR record
  await prisma.payment.deleteMany({
    where: { orderId: order.id }
  });
  
  await prisma.payment.create({
    data: {
      orderId: order.id,
      amount: 33360,
      status: 'BEKLIYOR',
      dueDate: new Date('2026-04-17'),
      notes: 'Borç Sıfırlandı (Hata Düzeltme ile Tekrar Bekliyor)',
      method: 'CEK'
    }
  });

  console.log('Restored 33,360 TL as BEKLIYOR for Ömer Faruk Kara.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
