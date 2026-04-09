import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const erenYilmazUser = await prisma.user.findFirst({ where: { name: 'Eren Yılmaz' } });
  
  if (!erenYilmazUser) {
    console.log("Eren Yılmaz bulunamadı.");
    return;
  }

  const customer = await prisma.customer.findFirst({ where: { userId: erenYilmazUser.id } });
  
  if (!customer) {
    console.log("Eren Yılmaz'ın müşteri hesabı yok.");
    return;
  }

  await prisma.customer.update({
    where: { id: customer.id },
    data: { salesRepId: null }
  });

  console.log("BAŞARILI: Eren Yılmaz'ın, Erkan Atak (veya başka biri) ile olan satış temsilcisi bağlantısı koparıldı.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
