import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    // Body kontrolü
    const body = await req.json().catch(() => ({}))
    const { message, history = [] } = body

    if (!message) {
      return NextResponse.json({ error: 'Mesaj içeriği boş olamaz.' }, { status: 400 })
    }

    // API Key Kontrolü (Handler içinde taze okuma)
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('GEMINI_API_KEY is missing in environment variables')
      return NextResponse.json({ error: 'AI anahtarı sunucuda bulunamadı. Lütfen ayarları kontrol edin.' }, { status: 500 })
    }

    // 1. CRM Bağlamını Topla (Context) - OPTİMİZE EDİLDİ
    const [
      stats,
      pendingOverdue,
      atRiskSamples
    ] = await Promise.all([
      prisma.order.aggregate({
        _count: true,
        _sum: { totalAmount: true }
      }),
      // Sadece en kritik 10 gecikmiş ödeme
      prisma.payment.findMany({
        where: { status: 'GECIKTI' },
        take: 10,
        orderBy: { dueDate: 'asc' },
        include: { order: { include: { customer: { include: { user: true } } } } }
      }),
      // Risk grubundan 5 örnek isim (Context şişmesin diye)
      prisma.customer.findMany({
        where: { isActive: true },
        take: 50,
        include: { user: true, orders: { orderBy: { createdAt: 'desc' }, take: 1 } }
      })
    ])

    // Toplam Müşteri Sayısı (Hafif sorgu)
    const totalCustomers = await prisma.customer.count()

    // Riskli isimleri ayıkla
    const atRiskNames = atRiskSamples
      .filter(c => {
        if (!c.orders || !c.orders[0]) return false
        const lastOrder = new Date(c.orders[0].createdAt)
        const daysSince = (Date.now() - lastOrder.getTime()) / (1000 * 60 * 60 * 24)
        return daysSince > (c.avgOrderDays || 30) * 1.3
      })
      .map(c => c.user?.name || 'Bilinmeyen Müşteri')
      .slice(0, 10) // Sadece ilk 10'unu prompt'a ekle

    const contextString = `
      Sen Erkan Bey'in (şirket sahibi) çok profesyonel, dürüst ve zeki bir plasiyer müdürü yardımcısısın. 
      Sana "Erkan Bey" diye hitap etmeni istiyoruz. Tonun nazik, saygılı ve iş odaklı olsun.
      
      ŞİRKET DURUMU (ÖZET VERİLER):
      - Toplam Sipariş: ${stats._count}
      - Toplam Ciro: ${Number(stats._sum?.totalAmount || 0).toLocaleString('tr-TR')} TL
      - Toplam Müşteri: ${totalCustomers}
      - Kritik Gecikmiş Ödemeler: ${pendingOverdue.map(p => `${p.order?.customer?.user?.name || 'Bilinmeyen'} (${Number(p.amount || 0).toLocaleString('tr-TR')} TL)`).join(', ')}
      - Bazı Riskli Müşteriler: ${atRiskNames.join(', ')}
      
      GÖREVİN:
      Erkan Bey sana soru sorduğunda bu verilere dayanarak ona cevap ver. 
      Lütfen cevaplarını kısa ve öz tut, Erkan Bey meşgul bir iş adamı.
      Eğer borçlu birini sorarsa yukarıdaki listeden bulmaya çalış. Listede yoksa "Listemdeki kritik sızıntılar arasında görünmüyor ama cari hesaptan kontrol edebilirim" de.
    `

    // Gemini Başlatma
    const genAI = new GoogleGenerativeAI(apiKey)
    // Orijinal modele (gemini-1.5-flash) geri dönüyoruz, çünkü artık geçerli bir anahtarımız var
    const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const chat = geminiModel.startChat({
      history: [
        { role: 'user', parts: [{ text: contextString }] },
        { role: 'model', parts: [{ text: 'Anlaşıldı Erkan Bey! Ben hazırım. Dükkanın özet verileri elimde. Size nasıl yardımcı olabilirim? Hangi müşteriyi soracaksınız veya bugünkü planınızı mı yapalım?' }] },
        ...history.map((h: any) => ({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: String(h.content || '') }]
        }))
      ]
    })

    const result = await chat.sendMessage(message)
    const response = await result.response
    const text = response.text()

    return NextResponse.json({ content: text })
  } catch (error: any) {
    console.error('Chat API Detailed Error:', error)
    
    // Daha açıklayıcı hata mesajları
    let errorMsg = 'AI şu an meşgul, lütfen birazdan tekrar deneyin.'
    const errorMessage = error?.message?.toLowerCase() || ''
    
    if (errorMessage.includes('api key' || errorMessage.includes('api_key_invalid'))) {
      errorMsg = 'AI anahtarı (GEMINI_API_KEY) hatalı veya geçersiz. Lütfen ayarları kontrol edin.'
    } else if (errorMessage.includes('safety')) {
      errorMsg = 'Sorunuz güvenlik filtrelerine takıldı. Lütfen farklı şekilde sorun.'
    } else if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
      errorMsg = 'AI kullanım kotası doldu. Lütfen biraz bekleyin.'
    } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      errorMsg = 'AI modeli (gemini-1.5-flash) bulunamadı. Lütfen sistemde bu modelin aktif olduğundan emin olun veya gemini-pro deneyin.'
    }

    return NextResponse.json({ 
      error: errorMsg,
      debug: error?.message, 
      type: error?.name || 'Error'
    }, { status: 500 })
  }
}
