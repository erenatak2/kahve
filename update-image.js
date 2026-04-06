const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateProductImages() {
  // A001-1
  await prisma.product.updateMany({
    where: { code: 'A001-1' },
    data: { imageUrl: '/Images/A001-1.png' }
  });
  console.log('✅ A001-1 resmi eklendi');
  
  // A001-10 - henüz bekliyor
  console.log('⏳ A001-10 bekleniyor...');
  
  await prisma.$disconnect();
}

updateProductImages().catch(console.error);
