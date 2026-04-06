const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function autoMatchImages() {
  const imagesDir = path.join(__dirname, 'Images');
  const files = fs.readdirSync(imagesDir);
  
  // PNG dosyalarını filtrele ve isimleri temizle
  const imageFiles = files
    .filter(f => f.endsWith('.png'))
    .map(f => ({
      filename: f,
      code: f.replace('.png', '').replace(/-$/, ''), // A002-2-.png → A002-2
      path: `/Images/${f}`
    }));
  
  console.log(`🔍 ${imageFiles.length} resim dosyası bulundu\n`);
  
  // Her resmi eşleştir
  for (const img of imageFiles) {
    const result = await prisma.product.updateMany({
      where: { code: img.code },
      data: { imageUrl: img.path }
    });
    
    if (result.count > 0) {
      console.log(`✅ ${img.code} → ${img.filename}`);
    } else {
      console.log(`⚠️  ${img.code} → Ürün bulunamadı (${img.filename})`);
    }
  }
  
  // Toplam eşleşen resim sayısı
  const productsWithImages = await prisma.product.count({
    where: { imageUrl: { not: null } }
  });
  
  console.log(`\n📊 Toplam ${productsWithImages} ürüne resim eklendi`);
  
  await prisma.$disconnect();
}

autoMatchImages().catch(console.error);
