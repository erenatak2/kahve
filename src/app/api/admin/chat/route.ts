import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(req: NextRequest) {
  console.log('[CHAT API] Request received at', new Date().toISOString())
  
  try {
    const session = await getServerSession(authOptions)
    console.log('[CHAT API] Session:', session ? 'Authenticated' : 'No session')
    
    if (!session) {
      console.log('[CHAT API] Returning 401 - No session')
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    }

    // Body kontrolü
    const body = await req.json().catch(() => ({}))
    const { message, history = [] } = body

    if (!message) {
      return NextResponse.json({ error: 'Mesaj içeriği boş olamaz.' }, { status: 400 })
    }

    // API Key Kontrolü (Handler içinde taze okuma)
    const apiKey = process.env.GEMINI_API_KEY
    console.log('[CHAT API] GEMINI_API_KEY:', apiKey ? `Present (${apiKey.substring(0, 10)}...)` : 'MISSING')
    
    if (!apiKey) {
      console.error('[CHAT API] GEMINI_API_KEY is missing in environment variables')
      return NextResponse.json({ error: 'AI anahtarı sunucuda bulunamadı. Lütfen ayarları kontrol edin.' }, { status: 500 })
    }

    // 1. CRM Bağlamını Topla (Context) - OPTİMİZE EDİLDİ
    let stats: any = { _count: 0, _sum: { totalAmount: 0 } }
    let pendingOverdue: any[] = []
    let atRiskSamples: any[] = []

    try {
      console.log('[CHAT API] Querying stats...')
      stats = await prisma.order.aggregate({
        _count: true,
        _sum: { totalAmount: true }
      })
      console.log('[CHAT API] Stats result:', stats)
    } catch (e: any) {
      console.error('[CHAT API] Stats query failed:', e.message || e)
    }

    try {
      console.log('[CHAT API] Querying pending overdue payments...')
      pendingOverdue = await prisma.payment.findMany({
        where: { status: 'GECIKTI' },
        take: 10,
        orderBy: { dueDate: 'asc' },
        include: { order: { include: { customer: { include: { user: true } } } } }
      })
      console.log('[CHAT API] Pending overdue count:', pendingOverdue.length)
    } catch (e: any) {
      console.error('[CHAT API] Pending overdue query failed:', e.message || e)
    }

    try {
      console.log('[CHAT API] Querying at-risk customers...')
      atRiskSamples = await prisma.customer.findMany({
        where: { isActive: true },
        take: 50,
        include: { user: true, orders: { orderBy: { createdAt: 'desc' }, take: 1 } }
      })
      console.log('[CHAT API] At-risk samples count:', atRiskSamples.length)
    } catch (e: any) {
      console.error('[CHAT API] At-risk customers query failed:', e.message || e)
    }

    // Toplam Müşteri Sayısı (Hafif sorgu)
    let totalCustomers = 0
    try {
      console.log('[CHAT API] Counting customers...')
      totalCustomers = await prisma.customer.count()
      console.log('[CHAT API] Total customers:', totalCustomers)
    } catch (e: any) {
      console.error('[CHAT API] Customer count query failed:', e.message || e)
    }

    // Riskli isimleri ayıkla
    const atRiskNames = atRiskSamples
      .filter(c => {
        if (!c.orders[0]) return false
        const lastOrder = new Date(c.orders[0].createdAt)
        const daysSince = (Date.now() - lastOrder.getTime()) / (1000 * 60 * 60 * 24)
        return daysSince > (c.avgOrderDays || 30) * 1.3
      })
      .map(c => c.user.name)
      .slice(0, 10) // Sadece ilk 10'unu prompt'a ekle

    const contextString = `
      Sen Erkan Bey'in (şirket sahibi) çok profesyonel, dürüst ve zeki bir plasiyer müdürü yardımcısısın. 
      Sana "Erkan Bey" diye hitap etmeni istiyoruz. Tonun nazik, saygılı ve iş odaklı olsun.
      
      ŞİRKET DURUMU (ÖZET VERİLER):
      - Toplam Sipariş: ${stats._count}
      - Toplam Ciro: ${Number(stats._sum.totalAmount || 0).toLocaleString('tr-TR')} TL
      - Toplam Müşteri: ${totalCustomers}
      - Kritik Gecikmiş Ödemeler: ${pendingOverdue.map(p => `${p.order.customer.user.name} (${Number(p.amount).toLocaleString('tr-TR')} TL)`).join(', ')}
      - Bazı Riskli Müşteriler: ${atRiskNames.join(', ')}
      
      GÖREVİN:
      Erkan Bey sana soru sorduğunda bu verilere dayanarak ona cevap ver. 
      Lütfen cevaplarını kısa ve öz tut, Erkan Bey meşgul bir iş adamı.
      Eğer borçlu birini sorarsa yukarıdaki listeden bulmaya çalış. Listede yoksa "Listemdeki kritik sızıntılar arasında görünmüyor ama cari hesaptan kontrol edebilirim" de.
    `

    // Gemini Başlatma
    const genAI = new GoogleGenerativeAI(apiKey)
    const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const chat = geminiModel.startChat({
      history: [
        { role: 'user', parts: [{ text: contextString }] },
        { role: 'model', parts: [{ text: 'Anlaşıldı Erkan Bey! Ben hazırım. Dükkanın özet verileri elimde. Size nasıl yardımcı olabilirim? Hangi müşteriyi soracaksınız veya bugünkü planınızı mı yapalım?' }] },
        ...history.map((h: any) => ({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: String(h.content) }]
        }))
      ]
    })

    try {
      console.log('[CHAT API] Sending message to Gemini...')
      const result = await chat.sendMessage(message)
      const text = result.response.text()
      console.log('[CHAT API] Gemini response received, length:', text.length)
      return NextResponse.json({ content: text })
    } catch (geminiError: any) {
      console.error('[CHAT API] Gemini API error:', geminiError.message || geminiError)
      console.error('[CHAT API] Full error object:', JSON.stringify(geminiError, null, 2))
      let geminiErrorMsg = 'AI servisi şu an yanıt vermiyor.'
      if (geminiError?.message?.includes('API key')) {
        geminiErrorMsg = 'AI anahtarı (GEMINI_API_KEY) hatalı veya süresi dolmuş.'
      } else if (geminiError?.message?.includes('quota')) {
        geminiErrorMsg = 'AI kotası dolmuş. Lütfen daha sonra tekrar deneyin.'
      }
      return NextResponse.json({ error: geminiErrorMsg, debug: geminiError?.message }, { status: 500 })
    }
  } catch (error: any) {
    console.error('[CHAT API] Top-level error:', error)
    console.error('[CHAT API] Error message:', error?.message)
    console.error('[CHAT API] Error stack:', error?.stack)
    
    // Daha açıklayıcı hata mesajları
    let errorMsg = 'AI şu an meşgul, lütfen birazdan tekrar deneyin.'
    if (error?.message?.includes('API key')) errorMsg = 'AI anahtarı (GEMINI_API_KEY) hatalı veya süresi dolmuş.'
    if (error?.message?.includes('SAFETY')) errorMsg = 'Sorunuz güvenlik filtrelerine takıldı. Lütfen farklı şekilde sorun.'

    return NextResponse.json({ 
      error: errorMsg,
      debug: process.env.NODE_ENV === 'development' ? error?.message : undefined 
    }, { status: 500 })
  }
}
