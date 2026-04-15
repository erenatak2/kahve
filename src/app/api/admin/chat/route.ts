import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    const { message, history } = await req.json()

    // 1. CRM Bağlamını Topla (Context)
    const [
      totalOrders,
      totalRevenue,
      totalCustomers,
      pendingPayments,
      customers
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { totalAmount: true } }),
      prisma.customer.count(),
      prisma.payment.findMany({
        where: { status: 'GECIKTI' },
        include: { order: { include: { customer: { include: { user: true } } } } }
      }),
      prisma.customer.findMany({
        include: { user: true, orders: { orderBy: { createdAt: 'desc' }, take: 1 } }
      })
    ])

    // Segmentasyon Mantığı (Basitleştirilmiş)
    const atRisk = customers.filter(c => {
      if (!c.orders[0]) return false
      const lastOrder = new Date(c.orders[0].createdAt)
      const daysSince = (Date.now() - lastOrder.getTime()) / (1000 * 60 * 60 * 24)
      return daysSince > (c.avgOrderDays || 30) * 1.3
    })

    const contextString = `
      Sen Erkan amcanın (şirket sahibi) çok samimi, dürüst ve zeki bir plasiyer müdürü yardımcısısın. 
      Sana "Erkan amca" diye hitap etmeni istiyoruz. Tonun sıcak, güven verici ama iş odaklı olsun.
      
      ŞİRKET DURUMU (GERÇEK VERİLER):
      - Toplam Sipariş Sayısı: ${totalOrders}
      - Toplam Ciro: ${totalRevenue._sum.totalAmount || 0} TL
      - Toplam Aktif Müşteri: ${totalCustomers}
      - Gecikmiş Ödemesi Olan Müşteriler: ${pendingPayments.map(p => `${p.order.customer.user.name} (${p.amount} TL)`).join(', ')}
      - Risk Grubu (Kayıp Riski): ${atRisk.map(c => c.user.name).join(', ')}
      
      GÖREVİN:
      Erkan amca sana soru sorduğunda bu verilere dayanarak ona cevap ver. 
      Eğer borçlu birini sorarsa yukarıdaki listeden bul. 
      Eğer "Bugün ne yapmalıyım?" derse, önce Risk grubundakileri aramasını veya gecikmiş ödemeleri toplamasını samimiyetle öner.
    `

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: contextString }] },
        { role: 'model', parts: [{ text: 'Anlaşıldı Erkan amca! Ben hazırım. Dükkanın tüm verileri elimde. Sana nasıl yardımcı olabilirim? Hangi müşteriyi soracaksın veya bugünkü planını mı yapalım?' }] },
        ...history.map((h: any) => ({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.content }]
        }))
      ]
    })

    const result = await chat.sendMessage(message)
    const response = await result.response
    const text = response.text()

    return NextResponse.json({ content: text })
  } catch (error: any) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: 'AI şu an meşgul, lütfen birazdan dene.' }, { status: 500 })
  }
}
