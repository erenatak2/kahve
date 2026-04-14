import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import CariHesapDetayClient from './CariHesapDetayClient'

export default async function CariHesapPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)

  if (!session || !['ADMIN', 'SATICI'].includes((session?.user as any)?.role)) {
    redirect('/auth/login')
  }

  const role = (session.user as any).role
  const userId = (session.user as any).id

  // 1. Müşteri bilgilerini al
  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: { user: { select: { name: true, email: true } } }
  })

  // Yetki Kontrolü: Satıcı sadece kendi müşterisini görebilir
  if (!customer || (role === 'SATICI' && customer.salesRepId !== userId)) {
    notFound()
  }

  // 2. Tüm Siparişleri al (Borç oluşturur)
  const orders = await prisma.order.findMany({
    where: {
      customerId: params.id,
      status: { not: 'IPTAL' },
    },
    include: {
      orderItems: { include: { product: { select: { name: true, code: true, imageUrl: true } } } },
      payments: {
        where: { status: 'ODENDI' }
      }
    },
    orderBy: { orderDate: 'asc' }
  })
  
  // 3. Bağımsız Tahsilatları al (Alacak oluşturur)
  // Not: Sistemin mevcut yapısında ödemeler genelde bir siparişe bağlıdır.
  // Ancak bağımsız payment kayıtları da olabilir.
  
  // Cari hesap hareketlerini oluştur
  let bakiye = 0
  let siraNo = 0
  const hareketler: any[] = []

  // Siparişleri işle
  for (const order of orders) {
    // Sipariş = borç
    bakiye += order.totalAmount
    const orderTarih = order.orderDate || order.createdAt
    
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

    // Bu siparişe bağlı ödemeleri ayrı satır olarak ekle
    for (const payment of order.payments) {
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

  // Tarihe göre sırala
  hareketler.sort((a, b) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime())

  // Özet bilgiler
  const toplamBorc = hareketler.reduce((sum, h) => sum + (h.borc || 0), 0)
  const toplamAlacak = hareketler.reduce((sum, h) => sum + (h.alacak || 0), 0)

  const initialData = {
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
      acilisBakiyesi: 0,
      toplamBorc,
      toplamAlacak,
      bakiye: toplamBorc - toplamAlacak,
      hareketSayisi: siraNo
    },
    donem: {
      baslangic: '',
      bitis: ''
    }
  }

  // JSON-safe hale getir
  const serializedData = JSON.parse(JSON.stringify(initialData))

  return (
    <CariHesapDetayClient 
      initialData={serializedData} 
      customerId={params.id}
    />
  )
}
