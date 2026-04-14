import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
  
  if (!token || (token.role !== 'ADMIN' && token.role !== 'SATICI')) {
    return new Response('Unauthorized', { status: 401 })
  }

  const role = token.role as string
  const userId = token.sub as string

  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      let isActive = true
      
      const sendCounts = async () => {
        if (!isActive) return
        const now = new Date()
        try {
          const [pendingOrders, notificationCount, customerCount, orderReminders, customerReminders] = await Promise.all([
            prisma.order.count({ 
              where: { 
                status: 'HAZIRLANIYOR',
                ...(role === 'SATICI' && { customer: { salesRepId: userId } })
              } 
            }),
            prisma.paymentNotification.count({ 
              where: { 
                status: 'BEKLIYOR',
                ...(role === 'SATICI' && { customer: { salesRepId: userId } })
              } 
            }),
            prisma.customer.count({ 
              where: { 
                isActive: true,
                ...(role === 'SATICI' && { salesRepId: userId })
              } 
            }),
            prisma.order.count({ 
              where: { 
                reminderAt: { not: null, lte: now },
                followupStatus: 'BEKLIYOR',
                ...(role === 'SATICI' && { customer: { salesRepId: userId } })
              } 
            }),
            prisma.customer.count({ 
              where: { 
                followUpStatus: 'BEKLIYOR', 
                nextCallDate: { lte: now },
                ...(role === 'SATICI' && { salesRepId: userId })
              } 
            })
          ])
          
          const data = JSON.stringify({ 
            orders: pendingOrders, 
            notifications: notificationCount, 
            customers: customerCount,
            reminders: orderReminders + customerReminders,
            timestamp: Date.now() 
          })
          if (isActive) {
            try {
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            } catch (e) {
              isActive = false
            }
          }
        } catch (error) {
          console.error('SSE count error:', error)
        }
      }

      // İlk veriyi gönder
      await sendCounts()
      
      // Her 3 saniyede bir güncelle (daha hızlı)
      const interval = setInterval(sendCounts, 3000)
      
      // Client bağlantıyı kesince temizle
      const cleanup = () => {
        if (!isActive) return
        isActive = false
        clearInterval(interval)
        try { 
          controller.close() 
        } catch (e) {}
      }

      request.signal.addEventListener('abort', cleanup)
    },
    cancel() {
      // Stream iptal edildiğinde (örn. başka yere navigate edilince)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Nginx buffering disable
    },
  })
}
