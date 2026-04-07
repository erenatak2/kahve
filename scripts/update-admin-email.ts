import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- ADMIN GÜNCELLEME BAŞLADI ---')
  
  const user = await prisma.user.update({
    where: { email: 'admin@satis.com' },
    data: { email: 'eatak72tr@gmail.com' }
  })

  console.log('BAŞARILI: Yönetici e-posta adresi güncellendi.')
  console.log('Yeni Giriş Adresiniz:', user.email)
}

main()
  .catch((e) => {
    console.error('HATA: Admin e-postası güncellenirken bir sorun oluştu.', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
