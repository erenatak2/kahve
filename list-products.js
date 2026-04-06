const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listProducts() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { code: 'asc' }
  });
  
  console.log('=== ÜRÜN LİSTESİ ===\n');
  products.forEach((p, i) => {
    console.log(`${i + 1}. ${p.code || '---'} - ${p.name}`);
  });
  
  await prisma.$disconnect();
}

listProducts().catch(console.error);
