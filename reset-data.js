const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetAllData() {
  console.log('⚠️  TÜM SİPARİŞLER VE TAHSLİATLAR SİLİNECEK!\n');
  
  // Sırayla bağımlı tabloları temizle
  console.log('1️⃣  Tahsilatlar (payments) siliniyor...');
  const deletedPayments = await prisma.payment.deleteMany({});
  console.log(`   ✅ ${deletedPayments.count} tahsilat silindi`);
  
  console.log('\n2️⃣  Sipariş kalemleri (orderItems) siliniyor...');
  const deletedItems = await prisma.orderItem.deleteMany({});
  console.log(`   ✅ ${deletedItems.count} sipariş kalemi silindi`);
  
  console.log('\n3️⃣  Siparişler (orders) siliniyor...');
  const deletedOrders = await prisma.order.deleteMany({});
  console.log(`   ✅ ${deletedOrders.count} sipariş silindi`);
  
  console.log('\n✨ TÜM VERİLER TEMİZLENDİ!');
  console.log('\n📝 Özet:');
  console.log(`   - Sipariş: 0`);
  console.log(`   - Tahsilat: 0`);
  console.log(`   - Bakiye: 0`);
  
  await prisma.$disconnect();
}

resetAllData().catch(console.error);
