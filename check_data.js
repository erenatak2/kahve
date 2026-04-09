const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function main() { 
  const customers = await prisma.customer.findMany({ include: { user: true, salesRep: true } }); 
  console.log(customers.map(c => ({ id: c.id, name: c.user?.name, rep: c.salesRep?.name }))); 
} 
main().finally(() => prisma['$disconnect']());
