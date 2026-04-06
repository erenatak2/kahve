import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// İyzico configuration - Gerçek API anahtarlarıyla değiştirin
const IYZICO_CONFIG = {
  apiKey: process.env.IYZICO_API_KEY || '',
  secretKey: process.env.IYZICO_SECRET_KEY || '',
  baseUrl: process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com', // Sandbox for testing
}

// Ödeme başlatma
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  try {
    const { paymentId, callbackUrl } = await req.json()

    // Ödeme kaydını getir
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          include: {
            customer: {
              include: { user: { select: { name: true, email: true } } }
            }
          }
        }
      }
    })

    if (!payment) {
      return NextResponse.json({ error: 'Ödeme bulunamadı' }, { status: 404 })
    }

    // Kullanıcı yetkisi kontrolü
    const role = (session.user as any).role
    const customerId = (session.user as any).customerId

    if (role === 'MUSTERI' && payment.order.customerId !== customerId) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const customer = payment.order.customer
    const buyer = {
      id: payment.order.customerId,
      name: customer.user.name?.split(' ')[0] || 'Musteri',
      surname: customer.user.name?.split(' ').slice(1).join(' ') || 'Musteri',
      email: customer.user.email,
      identityNumber: customer.taxNumber || '11111111111',
      registrationAddress: customer.address || 'Antalya',
      ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
      city: customer.city || 'Antalya',
      country: 'Turkey',
      zipCode: '07070'
    }

    // İyzico ödeme isteği oluştur
    const paymentRequest = {
      locale: 'tr',
      conversationId: `payment_${paymentId}_${Date.now()}`,
      price: payment.amount.toFixed(2),
      paidPrice: payment.amount.toFixed(2),
      currency: 'TRY',
      basketId: payment.orderId,
      paymentGroup: 'PRODUCT',
      callbackUrl: callbackUrl || `${process.env.NEXT_PUBLIC_APP_URL}/api/odeme/callback`,
      buyer,
      shippingAddress: {
        contactName: customer.user.name || 'Musteri',
        city: customer.city || 'Antalya',
        country: 'Turkey',
        address: customer.address || 'Antalya',
        zipCode: '07070'
      },
      billingAddress: {
        contactName: customer.user.name || 'Musteri',
        city: customer.city || 'Antalya',
        country: 'Turkey',
        address: customer.address || 'Antalya',
        zipCode: '07070'
      },
      basketItems: [{
        id: payment.orderId,
        name: `Siparis #${payment.orderId.slice(-6)}`,
        category1: 'Temizlik Urunleri',
        itemType: 'PHYSICAL',
        price: payment.amount.toFixed(2)
      }]
    }

    // İyzico API çağrısı (simülasyon modu - gerçek entegrasyon için Iyzipay kütüphanesi kullanılabilir)
    // Şimdilik test URL'i döndürüyoruz
    const isTestMode = !IYZICO_CONFIG.apiKey
    
    if (isTestMode) {
      // Test modu: Başarılı ödeme simülasyonu
      const testCheckoutUrl = `/odeme/test?paymentId=${paymentId}&amount=${payment.amount}`
      
      return NextResponse.json({
        success: true,
        checkoutUrl: testCheckoutUrl,
        token: `test_token_${paymentId}`,
        testMode: true
      })
    }

    // Gerçek İyzico entegrasyonu burada yapılacak
    // const iyzipay = new (require('iyzipay'))(IYZICO_CONFIG)
    // iyzipay.threedsInitialize.create(paymentRequest, (err, result) => { ... })

    return NextResponse.json({
      success: true,
      message: 'İyzico entegrasyonu aktif edildiğinde gerçek ödeme akışı başlayacak',
      testMode: true,
      checkoutUrl: `/odeme/test?paymentId=${paymentId}&amount=${payment.amount}`
    })

  } catch (error) {
    console.error('Ödeme başlatma hatası:', error)
    return NextResponse.json(
      { error: 'Ödeme başlatılırken hata oluştu' },
      { status: 500 }
    )
  }
}
