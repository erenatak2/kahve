import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10)
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@satis.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@satis.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  })

  console.log('Admin oluşturuldu:', admin.email)

  // Kod | Marka (category) | Ürün Adı (name) | Paket Tipi (description) | Form (unit) | Ödeme Türü (purchasePrice) | Fiyat
  const products = [
    { code: 'A001-1',  category: 'Coffytab',               name: 'Kahve Makinesi Temizleme Tableti (100 Adet)',          description: 'Tablet',  unit: 'Tablet',  purchasePrice: 'Peşin', salePrice: 300, stock: 50, imageUrl: '/Images/A001-1.png'  },
    { code: 'A001-2',  category: 'Coffytab',               name: 'Kahve Makinesi Temizleme Tableti (20 Adet)',           description: 'Blister', unit: 'Tablet',  purchasePrice: 'Peşin', salePrice: 190, stock: 50, imageUrl: '/Images/A001-2.png'  },
    { code: 'A001-3',  category: 'Coffytab',               name: 'Kahve Makinesi Temizleme Tozu (150g)',                 description: 'Toz',     unit: 'Toz',     purchasePrice: 'Peşin', salePrice: 190, stock: 50, imageUrl: '/Images/A001-3.png'  },
    { code: 'A001-4',  category: 'Coffytab',               name: 'Kahve Makinesi Temizleme Tozu (900g)',                 description: 'Toz',     unit: 'Toz',     purchasePrice: 'Peşin', salePrice: 500, stock: 20, imageUrl: '/Images/A001-4.png'  },
    { code: 'A001-5',  category: 'Coffytab Milk',          name: 'Kahve Makinesi Süt Çubuğu Temizleme Tableti (100 Adet)', description: 'Tablet', unit: 'Tablet', purchasePrice: 'Peşin', salePrice: 250, stock: 50, imageUrl: '/Images/A001-5.png'  },
    { code: 'A001-7',  category: 'Coffytab Descaler',      name: 'Güçlü Kireç Temizleme Tozu (150g)',                    description: 'Toz',     unit: 'Toz',     purchasePrice: 'Peşin', salePrice: 160, stock: 50, imageUrl: '/Images/A001-7.png'  },
    { code: 'A001-8',  category: 'Coffytab Descaler',      name: 'Güçlü Kireç Temizleme Tozu (900g)',                    description: 'Toz',     unit: 'Toz',     purchasePrice: 'Peşin', salePrice: 400, stock: 20, imageUrl: '/Images/A001-8.png'  },
    { code: 'A001-9',  category: 'Coffytab Milk Liquid',   name: 'Kahve Makinesi Süt Çubuğu Temizleme Sıvısı (1000ml)',  description: 'Sıvı',    unit: 'Sıvı',    purchasePrice: 'Peşin', salePrice: 350, stock: 20, imageUrl: '/Images/A001-9.png'  },
    { code: 'A001-10', category: 'Coffytab Grinder',       name: 'Kahve Değirmeni Temizleme Tozu (150g)',                description: 'Toz',     unit: 'Toz',     purchasePrice: 'Peşin', salePrice: 260, stock: 50, imageUrl: '/Images/A001-10.png' },
    { code: 'A001-11', category: 'Coffytab Descaler Liquid', name: 'Güçlü Kireç Temizleme Sıvısı (250ml)',              description: 'Sıvı',    unit: 'Sıvı',    purchasePrice: 'Peşin', salePrice: 160, stock: 50, imageUrl: '/Images/A001-11.png' },
    { code: 'A002-2',  category: 'Aquatab',                name: 'Matara Şişe Temizleme Tableti (30 Adet)',              description: 'Blister', unit: 'Tablet',  purchasePrice: 'Peşin', salePrice: 150, stock: 50, imageUrl: '/Images/A002-2-.png' },
    { code: 'A003-2',  category: 'Purlax',                 name: 'Çaydanlık Demlik Temizleme Tableti (20 Adet)',         description: 'Blister', unit: 'Tablet',  purchasePrice: 'Peşin', salePrice: 50,  stock: 100, imageUrl: '/Images/A003-2.png' },
    { code: 'A003-3',  category: 'Purlax',                 name: 'Çaydanlık Demlik Temizleme Tozu (150g)',               description: 'Toz',     unit: 'Toz',     purchasePrice: 'Peşin', salePrice: 190, stock: 50, imageUrl: '/Images/A003-3.png'  },
    { code: 'A004-1',  category: 'Deskatab',               name: 'Ütü Kireç Temizleme Tozu (150g)',                      description: 'Toz',     unit: 'Toz',     purchasePrice: 'Peşin', salePrice: 160, stock: 50, imageUrl: '/Images/A004-1.png'  },
    { code: 'A004-2',  category: 'Deskatab',               name: 'Ütü Kireç Temizleme Tozu (900g)',                      description: 'Toz',     unit: 'Toz',     purchasePrice: 'Peşin', salePrice: 400, stock: 20, imageUrl: '/Images/A004-2.png'  },
    { code: 'A005-1',  category: "Ali's",                  name: 'Oto Camsuyu Temizleme Tableti (20 Adet)',              description: 'Blister', unit: 'Tablet',  purchasePrice: 'Peşin', salePrice: 50,  stock: 100, imageUrl: '/Images/A005-1.png' },
  ]

  for (const product of products) {
    const existing = await prisma.product.findFirst({ where: { code: product.code } })
    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: { name: product.name, category: product.category, description: product.description, unit: product.unit, purchasePrice: product.purchasePrice, salePrice: product.salePrice, stock: product.stock, imageUrl: product.imageUrl },
      })
    } else {
      await prisma.product.create({
        data: { ...product, minStock: 10 },
      })
    }
  }

  console.log(`${products.length} ürün oluşturuldu/güncellendi`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
