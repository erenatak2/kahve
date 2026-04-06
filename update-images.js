const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateProductImages() {
  const updates = [
    { code: 'A001-1', image: '/Images/A001-1.png' },
    { code: 'A001-2', image: '/Images/A001-2.png' },
  ];
  
  for (const u of updates) {
    await prisma.product.updateMany({
      where: { code: u.code },
      data: { imageUrl: u.image }
    });
    console.log(`✅ ${u.code} resmi eklendi: ${u.image}`);
  }
  
  await prisma.$disconnect();
}

updateProductImages().catch(console.error);
