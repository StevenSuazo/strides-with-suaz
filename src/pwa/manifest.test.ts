import { describe, expect, it } from 'vitest'
import indexHtml from '../../index.html?raw'
import manifestText from '../../public/manifest.webmanifest?raw'

const manifest = JSON.parse(manifestText) as {
  name: string
  short_name: string
  start_url: string
  display: string
  theme_color: string
  icons: { src: string; sizes: string; type: string; purpose: string }[]
}
const publicFiles = Object.keys(
  import.meta.glob('../../public/**/*', { query: '?url' }),
)

describe('web app manifest', () => {
  it('opens like an app, from the home page', () => {
    expect(manifest.name).toBe('StridesWithSuaz')
    expect(manifest.short_name).toBe('Strides')
    expect(manifest.start_url).toBe('/')
    expect(manifest.display).toBe('standalone')
  })

  it('has 192, 512 and maskable icons that exist', () => {
    const sizes = manifest.icons.map((i) => `${i.sizes}:${i.purpose}`)
    expect(sizes).toContain('192x192:any')
    expect(sizes).toContain('512x512:any')
    expect(sizes).toContain('512x512:maskable')
    for (const icon of manifest.icons) {
      expect(publicFiles).toContain(`../../public${icon.src}`)
    }
  })
})

describe('index.html', () => {
  it('links the manifest, icons and theme colour', () => {
    expect(indexHtml).toContain('rel="manifest" href="/manifest.webmanifest"')
    expect(indexHtml).toContain(
      `name="theme-color" content="${manifest.theme_color}"`,
    )
    expect(indexHtml).toContain(
      'rel="apple-touch-icon" href="/icons/apple-touch-icon.png"',
    )
    expect(indexHtml).toContain('href="/favicon-32.png"')
    expect(indexHtml).toContain('<title>StridesWithSuaz</title>')
    for (const href of [
      '/icons/apple-touch-icon.png',
      '/favicon-32.png',
      '/favicon.svg',
    ]) {
      expect(publicFiles).toContain(`../../public${href}`)
    }
  })
})
