import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible'

// Redis yoksa memory fallback kullan
const createRateLimiter = (opts: { keyPrefix: string; points: number; duration: number }) => {
  try {
    return new RateLimiterMemory({
      keyPrefix: opts.keyPrefix,
      points: opts.points,
      duration: opts.duration,
    })
  } catch {
    return new RateLimiterMemory({
      keyPrefix: opts.keyPrefix,
      points: opts.points,
      duration: opts.duration,
    })
  }
}

// Login rate limiter: 5 deneme / 15 dakika
export const loginRateLimiter = createRateLimiter({
  keyPrefix: 'login_fail',
  points: 5,
  duration: 15 * 60, // 15 dakika
})

// API genel rate limiter: 100 request / 1 dakika
export const apiRateLimiter = createRateLimiter({
  keyPrefix: 'api_general',
  points: 100,
  duration: 60,
})

// Sipariş oluşturma limiter: 10 sipariş / 1 saat
export const orderRateLimiter = createRateLimiter({
  keyPrefix: 'order_create',
  points: 10,
  duration: 60 * 60,
})
