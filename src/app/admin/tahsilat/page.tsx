import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import TahsilatClient from './TahsilatClient'

export default async function TahsilatPage() {
  const session = await getServerSession(authOptions)

  if (!session || !['ADMIN', 'SATICI'].includes((session?.user as any)?.role)) {
    redirect('/auth/login')
  }

  const userId = (session?.user as any)?.id
  const role = (session?.user as any)?.role

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  // API'deki mantığı burada sunucu tarafında uyguluyoruz
  // Belirli bir aydaki tahsilatları ve geçmişten gelen ödenmemiş borçları çekiyoruz
  const payments = await prisma.payment.findMany({
    where: {
      OR: [
        {
          // Seçili aydaki tüm işlemler
          order: {
            OR: [
              {
                orderDate: {
                  gte: new Date(currentYear, currentMonth - 1, 1),
                  lt: new Date(currentYear, currentMonth, 1),
                }
              },
              {
                createdAt: {
                  gte: new Date(currentYear, currentMonth - 1, 1),
                  lt: new Date(currentYear, currentMonth, 1),
                }
              }
            ],
            ...(role === 'SATICI' ? { customer: { salesRepId: userId } } : {})
          }
        },
        {
          // Geçmişten gelen ve hala ödenmemiş olanlar (Filtreleme Client tarafında devam eder ama veri sunucudan gelir)
          status: { in: ['BEKLIYOR', 'GECIKTI'] },
          amount: { gte: 0.01 },
          order: {
            ...(role === 'SATICI' ? { customer: { salesRepId: userId } } : {})
          }
        }
      ]
    },
    include: {
      order: {
        include: {
          customer: {
            include: {
              user: true
            }
          },
          orderItems: {
            include: {
              product: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  // Decimal ve Date nesnelerini JSON-safe hale getir
  const serializedPayments = JSON.parse(JSON.stringify(payments))

  return (
    <TahsilatClient 
      initialPayments={serializedPayments} 
      initialMonth={currentMonth} 
      initialYear={currentYear} 
    />
  )
}
