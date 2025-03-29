import { NextResponse } from 'next/server'
import Redis from 'ioredis'

// Конфигурация rate limiting для разных путей
const rateLimitConfigs: Record<string, { interval: number; limit: number }> = {
  '/api/upload': { interval: 60, limit: 50 },
  '/api/files': { interval: 60, limit: 100 },
  '/api/auth': { interval: 60, limit: 5 },
  '/api/auth/send-token': { interval: 60, limit: 3 },
}

console.log('Connecting to Redis...')
const redis = new Redis(process.env.REDIS_URL!, {
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000)
    return delay
  },
  maxRetriesPerRequest: 3,
})

redis.on('error', (error) => {
  console.error('Redis connection error:', error)
})

redis.on('connect', () => {
  console.log('Redis connection established')
})

export async function GET(request: Request) {
  console.log('Rate limit request received')
  const { searchParams } = new URL(request.url)
  const identifier = searchParams.get('identifier') || 'anonymous'
  const path = searchParams.get('path') || 'default'
  const email = searchParams.get('email') || 'anonymous'
  
  console.log(`Processing request for path: ${path}, identifier: ${identifier}, email: ${email}`)
  
  // Используем email как идентификатор для rate limiting
  const key = `rate_limit:${path}:${email}`
  const now = Date.now()
  const windowStart = now - 60 * 1000 // 1 минута

  try {
    // Проверяем подключение к Redis
    await redis.ping()
    
    // Удаляем старые записи
    console.log('Removing old records...')
    await redis.zremrangebyscore(key, 0, windowStart)

    // Получаем количество запросов в текущем окне
    console.log('Getting request count...')
    const requestCount = await redis.zcard(key)
    console.log(`Current request count for ${email}: ${requestCount}`)

    // Получаем конфигурацию rate limit для пути
    const config = rateLimitConfigs[path]
    if (!config) {
      return NextResponse.json(
        { error: 'Rate limit configuration not found' },
        { status: 500 }
      )
    }

    if (requestCount >= config.limit) {
      // Получаем время до сброса
      const oldestRequest = await redis.zrange(key, 0, 0)
      const reset = Math.ceil((parseInt(oldestRequest[0]) + config.interval * 1000 - now) / 1000)
      
      console.log(`Rate limit exceeded for ${email}, reset time:`, reset)
      return NextResponse.json(
        {
          success: false,
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${reset} seconds.`,
          reset,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': config.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': reset.toString(),
          },
        }
      )
    }

    // Добавляем новый запрос
    console.log(`Adding new request for ${email}...`)
    await redis.zadd(key, now, now.toString())
    // Устанавливаем время жизни для ключа
    await redis.expire(key, config.interval)

    console.log(`Request processed successfully for ${email}`)
    return NextResponse.json(
      {
        success: true,
        message: 'Request allowed',
        remaining: config.limit - requestCount - 1,
      },
      {
        headers: {
          'X-RateLimit-Limit': config.limit.toString(),
          'X-RateLimit-Remaining': (config.limit - requestCount - 1).toString(),
          'X-RateLimit-Reset': config.interval.toString(),
        },
      }
    )
  } catch (error) {
    console.error('Error in rate limit processing:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error',
        message: 'Error processing rate limit request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
} 