const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixUnits() {
  // Tablet ürünlerde g/gram -> Adet düzeltmesi
  const updates = [
    { code: 'A001-1', name: 'Kahve Makinesi Temizleme Tableti (100 Adet)', unit: 'TABLET' },
    { code: 'A001-2', name: 'Kahve Makinesi Temizleme Tableti (20 Adet)', unit: 'TABLET' },
    { code: 'A001-5', name: 'Süt Çubuğu Temizleme Tableti (100 Adet)', unit: 'TABLET' },
    { code: 'A001-10', name: 'Kahve Değirmeni Temizleme Tozu (150 Gr)', unit: 'TOZ' },
  ];

  console.log('=== ÜRÜN DÜZELTMELERİ ===\n');

  for (const u of updates) {
    const result = await prisma.product.updateMany({
      where: { code: u.code },
      data: { name: u.name, unit: u.unit }
    });
    if (result.count > 0) {
      console.log(`✅ ${u.code}: ${u.name}`);
    } else {
      console.log(`⚠️  ${u.code}: Ürün bulunamadı`);
    }
  }

  console.log('\n✨ Düzeltmeler tamamlandı!');
  await prisma.$disconnect();
}

fixUnits();
