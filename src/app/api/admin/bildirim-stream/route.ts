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
      let interval: NodeJS.Timeout | null = null
      
      const sendCounts = async () => {
        if (!isActive) return
        try {
          const [orderCount, notificationCount, customerCount, reminderCount] = await Promise.all([
            prisma.order.count({ where: { status: 'HAZIRLANIYOR' } }),
            prisma.paymentNotification.count({ where: { status: 'BEKLIYOR' } }),
            prisma.customer.count({ where: { isApproved: false } }),
            prisma.order.count({ where: { followupStatus: 'BEKLIYOR', reminderAt: { not: null } } })
          ])
          
          if (!isActive) return

          const data = JSON.stringify({ 
            orders: orderCount, 
            notifications: notificationCount, 
            customers: customerCount,
            reminders: reminderCount,
            timestamp: Date.now() 
          })
          
          try {
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          } catch (e) {
            isActive = false
            if (interval) clearInterval(interval)
          }
        } catch (error) {
          console.error('SSE data fetch error:', error)
        }
      }

      await sendCounts()
      interval = setInterval(sendCounts, 3000)
      
      request.signal.addEventListener('abort', () => {
        isActive = false
        if (interval) clearInterval(interval)
        try { controller.close() } catch (e) {}
      })
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
