export function getApiBaseUrl(): string {
  // In production, set NEXT_PUBLIC_API_BASE_URL="https://yourdomain.com/api"
  // For local dev, default to localhost backend.
  return (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api').replace(/\/+$/, '')
}

