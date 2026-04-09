
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearUserData() {
  const sellerId = 'cmnom14f20000s6j4sd76m9zp'; // erenatak67 ID
  
  try {
    console.log(`Temizlik işlemi başlatılıyor: erenatak67 (ID: ${sellerId})`);
    
    // 1. Bu satıcıya bağlı tüm müşterileri bul
    const customers = await prisma.customer.findMany({
      where: { salesRepId: sellerId }
    });

    console.log(`Silinecek müşteri sayısı: ${customers.length}`);

    // 2. Müşterileri sil (onDelete: Cascade olduğu için User ve diğer bağlı veriler de silinecektir)
    for (const customer of customers) {
      await prisma.customer.delete({
        where: { id: customer.id }
      });
      console.log(`Müşteri silindi: ID ${customer.id}`);
    }

    console.log("Temizlik işlemi başarıyla tamamlandı.");

  } catch (err) {
    console.error("Hata oluştu:", err);
  } finally {
    await prisma.$disconnect();
  }
}

clearUserData();
