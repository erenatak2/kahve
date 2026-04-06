const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUnits() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { code: 'asc' }
  });

  console.log('=== ÜRÜN BİRİMLERİ ===\n');
  products.forEach(p => {
    console.log(`${p.code || '---'} - ${p.name}`);
    console.log(`   Birim: ${p.unit || '(boş)'}\n`);
  });

  await prisma.$disconnect();
}

checkUnits();
