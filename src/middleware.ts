import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { loginRateLimiter, apiRateLimiter } from '@/lib/rate-limiter'

const getIP = (req: NextRequest) => {
  const ip = req.ip ?? req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  return ip
}

export async function middleware(request: NextRequest) {
  const ip = getIP(request)
  const path = request.nextUrl.pathname

  // Sadece login/signin endpoint'leri için rate limiting (session değil)
  if (path.startsWith('/api/auth/callback') || path.startsWith('/api/auth/signin')) {
    try {
      await loginRateLimiter.consume(ip)
    } catch {
      return NextResponse.json(
        { error: 'Çok fazla deneme. Lütfen 15 dakika sonra tekrar deneyin.' },
        { status: 429 }
      )
    }
  }

  // Genel API rate limiting (auth hariç)
  if (path.startsWith('/api/') && !path.startsWith('/api/auth')) {
    try {
      await apiRateLimiter.consume(ip)
    } catch {
      return NextResponse.json(
        { error: 'Çok fazla istek. Lütfen bekleyin.' },
        { status: 429 }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}
