import { handleQookkaSnapshot } from './qookkaProxy'
import { handlePortrait } from './portraitProxy'

interface SitesEnvironment {
  ASSETS: { fetch(request: Request): Promise<Response> }
}

export default {
  async fetch(request: Request, env: SitesEnvironment): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/api/qookka-snapshot') return handleQookkaSnapshot(request)
    if (url.pathname === '/api/portrait') return handlePortrait(request)

    const response = await env.ASSETS.fetch(request)
    const acceptsHtml = request.headers.get('accept')?.includes('text/html')
    if (response.status === 404 && request.method === 'GET' && acceptsHtml) {
      const fallbackUrl = new URL('/index.html', request.url)
      return env.ASSETS.fetch(new Request(fallbackUrl, request))
    }
    return response
  },
}
