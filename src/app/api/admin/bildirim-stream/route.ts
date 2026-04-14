import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
  
  if (!token || token.role !== 'ADMIN') {
    return new Response('Unauthorized', { status: 401 })
  }

  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      let isActive = true
      
      const sendCounts = async () => {
        if (!isActive) return
        try {
          const [orderCount, notificationCount, customerCount, reminderCount] = await Promise.all([
            prisma.order.count({ where: { status: 'HAZIRLANIYOR' } }),
            prisma.paymentNotification.count({ where: { status: 'BEKLIYOR' } }),
            prisma.customer.count({ where: { isActive: true } }),
            prisma.customer.count({ 
              where: { 
                followUpStatus: 'BEKLIYOR', 
                nextCallDate: { lte: new Date() } 
              } 
            })
          ])
          
          const data = JSON.stringify({ 
            orders: orderCount, 
            notifications: notificationCount, 
            customers: customerCount,
            reminders: reminderCount,
            timestamp: Date.now() 
          })
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
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
        isActive = false
        clearInterval(interval)
        try { controller.close() } catch (e) {}
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
