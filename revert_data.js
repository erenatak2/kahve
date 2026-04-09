const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const erkanId = 'cmngni7580000101gaqdas2mn';
  const erenId = 'cmnom14f20000s6j4sd76m9zp';

  // 1. Eren Yılmaz is Eren Atak's customer. Leave him alone or ensure he's assigned to Eren Atak.
  const erenYilmazUser = await prisma.user.findFirst({ where: { name: 'Eren Yılmaz' } });

  // 2. Erkan Atak itself is a customer? Wait, "Eren Atak" is a customer too.
  // We will transfer ALL customers currently assigned to Eren Atak back to Erkan Atak...
  // EXCEPT Eren Yılmaz.
  const customers = await prisma.customer.findMany({ include: { user: true } });

  for (const c of customers) {
    if (c.user?.name === 'Eren Yılmaz') {
      // Must be Eren Atak's
      await prisma.customer.update({ where: { id: c.id }, data: { salesRepId: erenId } });
      console.log(`Eren Yılmaz -> assigned to Eren Atak`);
    } else {
      // Must be Erkan Atak's
      await prisma.customer.update({ where: { id: c.id }, data: { salesRepId: erkanId } });
      console.log(`${c.user?.name} -> assigned to Erkan Atak`);
    }
  }
}

main().catch(console.error).finally(() => process.exit(0));
