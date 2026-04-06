const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupOpeningBalance(name, amount) {
  const customer = await prisma.customer.findFirst({
    where: { user: { name: { contains: name } } }
  });
  
  if (!customer) {
    console.log(`Customer ${name} not found`);
    return;
  }
  
  const existingOrder = await prisma.order.findFirst({
    where: {
      customerId: customer.id,
      totalAmount: amount
    }
  });
  
  if (existingOrder) {
    await prisma.order.update({
      where: { id: existingOrder.id },
      data: {
        orderDate: new Date('2024-01-01'),
        notes: 'Açılış Bakiyesi (Devir)',
        status: 'HAZIRLANIYOR'
      }
    });
    console.log(`Order ${existingOrder.id} for ${name} updated to be an opening balance.`);
  } else {
    await prisma.order.create({
      data: {
        customerId: customer.id,
        totalAmount: amount,
        orderDate: new Date('2024-01-01'),
        notes: 'Açılış Bakiyesi (Devir)',
        status: 'HAZIRLANIYOR'
      }
    });
    console.log(`New opening balance order created for ${name} (${amount} TL)`);
  }
}

async function main() {
  await setupOpeningBalance('Ömer Faruk Kara', 33360);
  await setupOpeningBalance('Yusuf Uğur Gençoğlu', 1700);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
