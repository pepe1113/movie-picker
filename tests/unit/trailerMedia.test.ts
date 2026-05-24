import { describe, expect, it } from 'vitest'
import {
  buildTrailerEmbedUrl,
  buildTrailerPreviewEmbedUrl,
  findYouTubeTrailer,
} from '@/utils/trailerMedia'
import type { Video } from '@/services/tmdb/types'

describe('trailer media', () => {
  it('selects the first YouTube trailer', () => {
    expect(findYouTubeTrailer(videos)?.key).toBe('trailer-key')
  })

  it('builds privacy-friendly muted preview embed URLs', () => {
    const url = buildTrailerPreviewEmbedUrl('trailer-key')

    expect(url).toContain('https://www.youtube-nocookie.com/embed/trailer-key?')
    expect(url).toContain('autoplay=1')
    expect(url).toContain('mute=1')
    expect(url).toContain('controls=0')
    expect(url).toContain('loop=1')
    expect(url).toContain('playlist=trailer-key')
  })

  it('builds explicit trailer playback embed URLs', () => {
    expect(buildTrailerEmbedUrl('trailer-key')).toBe(
      'https://www.youtube.com/embed/trailer-key?autoplay=1&rel=0',
    )
  })
})

const videos: Video[] = [
  {
    id: 'vimeo-trailer',
    iso_639_1: 'en',
    iso_3166_1: 'US',
    key: 'vimeo-key',
    name: 'Vimeo Trailer',
    official: true,
    published_at: '2026-01-01',
    site: 'Vimeo',
    size: 1080,
    type: 'Trailer',
  },
  {
    id: 'youtube-teaser',
    iso_639_1: 'en',
    iso_3166_1: 'US',
    key: 'teaser-key',
    name: 'YouTube Teaser',
    official: true,
    published_at: '2026-01-01',
    site: 'YouTube',
    size: 1080,
    type: 'Teaser',
  },
  {
    id: 'youtube-trailer',
    iso_639_1: 'en',
    iso_3166_1: 'US',
    key: 'trailer-key',
    name: 'YouTube Trailer',
    official: true,
    published_at: '2026-01-02',
    site: 'YouTube',
    size: 1080,
    type: 'Trailer',
  },
]
