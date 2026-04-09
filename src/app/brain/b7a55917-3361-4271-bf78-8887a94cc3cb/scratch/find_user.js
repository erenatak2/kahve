
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findUser() {
  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'erenatak67' },
          { name: 'erenatak67' },
          { email: { contains: 'erenatak67' } }
        ]
      },
      include: {
        sellerCustomers: {
          include: {
            orders: {
              include: {
                payments: true,
                orderItems: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      console.log("Kullanıcı bulunamadı: erenatak67");
      return;
    }

    console.log(`Kullanıcı Bulundu: ${user.name} (${user.email}) [ID: ${user.id}]`);
    console.log(`Role: ${user.role}`);
    
    const customers = user.sellerCustomers;
    const orders = customers.flatMap(c => c.orders);
    const payments = orders.flatMap(o => o.payments);
    const orderItems = orders.flatMap(o => o.orderItems);

    console.log("--- Verat Özeti ---");
    console.log(`Toplam Müşteri: ${customers.length}`);
    console.log(`Toplam Sipariş: ${orders.length}`);
    console.log(`Toplam Sipariş Kalemi: ${orderItems.length}`);
    console.log(`Toplam Ödeme Kaydı: ${payments.length}`);

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

findUser();
