const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const targetEmail = 'erenatak67@gmail.com';
  
  const rep = await prisma.user.findUnique({
    where: { email: targetEmail }
  });

  if (!rep) {
    console.log('Temsilci bulunamadı.');
    return;
  }

  console.log(`Temizleme işlemi başlıyor: ${rep.name} (${targetEmail})`);

  // 1. Bu temsilciye atanmış müşterileri bul
  const customers = await prisma.customer.findMany({
    where: { salesRepId: rep.id },
    include: { user: true }
  });

  console.log(`${customers.length} adet müşteri bulundu.`);

  for (const customer of customers) {
    // 2. Müşterinin User kaydını silince Cascade sayesinde Customer ve Siparişler de silinecek
    console.log(`Siliniyor: ${customer.user.name}`);
    await prisma.user.delete({
      where: { id: customer.userId }
    });
  }

  console.log('Temizleme işlemi tamamlandı.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
