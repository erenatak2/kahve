import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  // Müşteri bilgilerini al
  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: { user: { select: { name: true, email: true } } }
  })

  if (!customer) {
    return NextResponse.json({ error: 'Müşteri bulunamadı' }, { status: 404 })
  }

  // Tarih filtresi
  const dateFilter: any = {}
  const globalDateFilter: any = {}
  
  if (startDate || endDate) {
    if (startDate) {
      dateFilter.orderDate = { gte: new Date(startDate) }
      globalDateFilter.orderDate = { lt: new Date(startDate) }
    }
    if (endDate) {
      if (!dateFilter.orderDate) dateFilter.orderDate = {}
      dateFilter.orderDate.lte = new Date(endDate + 'T23:59:59')
    }
  }

  // Açılış Bakiyesi Hesapla (filtre öncesi dönem)
  let acilisBakiyesi = 0
  if (startDate) {
    const oncekiSiparisler = await prisma.order.findMany({
      where: {
        customerId: params.id,
        status: { not: 'IPTAL' },
      },
      include: { payments: true }
    })
    
    for (const order of oncekiSiparisler) {
      const orderDate = new Date(order.orderDate || order.createdAt)
      if (orderDate < new Date(startDate)) {
        acilisBakiyesi += order.totalAmount
        const odenen = order.payments
          .filter((p: any) => p.status === 'ODENDI' && p.paidAt && new Date(p.paidAt) < new Date(startDate))
          .reduce((sum: number, p: any) => sum + p.amount, 0)
        acilisBakiyesi -= odenen
      }
    }
  }

  // Siparişleri al (TESLIM_EDILDI olanlar borç oluşturur)
  const orders = await prisma.order.findMany({
    where: {
      customerId: params.id,
      status: { not: 'IPTAL' },
    },
    include: {
      orderItems: { include: { product: { select: { name: true, code: true, imageUrl: true } } } },
      payments: true
    },
    orderBy: { orderDate: 'asc' }
  })
  
  // orderDate veya createdAt'e göre filtrele
  const filteredOrders = orders.filter((order: any) => {
    const orderDate = new Date(order.orderDate || order.createdAt)
    if (startDate && orderDate < new Date(startDate)) return false
    if (endDate && orderDate > new Date(endDate + 'T23:59:59')) return false
    return true
  })

  // Tahsilatları al
  const payments = await prisma.payment.findMany({
    where: {
      order: { customerId: params.id },
      status: 'ODENDI',
      ...dateFilter
    },
    include: { order: { select: { id: true, orderDate: true } } },
    orderBy: { paidAt: 'asc' }
  })

  // Cari hesap hareketlerini oluştur
  let bakiye = acilisBakiyesi
  let siraNo = 0
  const hareketler: any[] = []

  // Açılış bakiyesi kaydı (eğer varsa)
  if (acilisBakiyesi !== 0) {
    hareketler.push({
      siraNo: ++siraNo,
      tarih: startDate,
      tip: 'ACILIS',
      evrakNo: '-',
      aciklama: 'Dönem Başı Bakiye (Devir)',
      urunler: [],
      borc: acilisBakiyesi > 0 ? acilisBakiyesi : 0,
      alacak: acilisBakiyesi < 0 ? Math.abs(acilisBakiyesi) : 0,
      bakiye: acilisBakiyesi,
      acilis: true
    })
  }

  // Siparişleri işle (filtrelenmiş listeyi kullan)
  for (const order of filteredOrders) {
    const odemeTutari = order.payments
      .filter((p: any) => p.status === 'ODENDI')
      .reduce((sum: number, p: any) => sum + p.amount, 0)
    
    const kalanBorc = order.totalAmount - odemeTutari

    if (order.status !== 'IPTAL') {
      // Sipariş = borç (teslim durumu fark etmeksizin)
      bakiye += order.totalAmount
      const orderTarih = new Date(order.orderDate || order.createdAt)
      hareketler.push({
        siraNo: ++siraNo,
        tarih: orderTarih,
        tip: 'SIPARIS',
        evrakNo: order.orderNumber || order.id.slice(-8).toUpperCase(),
        aciklama: `Sipariş`,
        urunler: order.orderItems.map((item: any) => ({
          ad: item.product?.name || 'Ürün',
          kod: item.product?.code,
          resim: item.product?.imageUrl,
          miktar: item.quantity,
          birimFiyat: item.unitPrice,
          toplam: item.total
        })),
        borc: order.totalAmount,
        alacak: 0,
        bakiye
      })

      // Ödemeleri ayrı satır olarak ekle
      for (const payment of order.payments.filter((p: any) => p.status === 'ODENDI')) {
        bakiye -= payment.amount
        hareketler.push({
          siraNo: ++siraNo,
          tarih: payment.paidAt || payment.createdAt,
          tip: 'TAHSILAT',
          evrakNo: `TN-${payment.id.slice(-4).toUpperCase()}`,
          aciklama: `Tahsilat - Sipariş ${order.orderNumber || order.id.slice(-8).toUpperCase()}`,
          odemeYontemi: payment.method,
          ilgiliSiparis: order.orderNumber || order.id.slice(-8).toUpperCase(),
          borc: 0,
          alacak: payment.amount,
          bakiye
        })
      }
    }
  }

  // Tarihe göre sırala
  hareketler.sort((a, b) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime())

  // Özet bilgiler
  const toplamBorc = hareketler.reduce((sum, h) => sum + (h.borc || 0), 0)
  const toplamAlacak = hareketler.reduce((sum, h) => sum + (h.alacak || 0), 0)
  const hareketSayisi = siraNo

  return NextResponse.json({
    musteri: {
      id: customer.id,
      ad: customer.user.name,
      email: customer.user.email,
      telefon: customer.phone,
      adres: customer.address,
      sehir: customer.city,
      vergiNo: customer.taxNumber
    },
    hareketler,
    ozet: {
      acilisBakiyesi,
      toplamBorc,
      toplamAlacak,
      bakiye: toplamBorc - toplamAlacak,
      hareketSayisi
    },
    donem: {
      baslangic: startDate,
      bitis: endDate
    }
  })
}
