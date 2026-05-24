import type { Video } from '@/services/tmdb/types'

export function findYouTubeTrailer(videos: Video[] | undefined) {
  return videos?.find(
    (video) => video.site === 'YouTube' && video.type === 'Trailer',
  )
}

export function buildTrailerPreviewEmbedUrl(key: string) {
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    controls: '0',
    disablekb: '1',
    fs: '0',
    iv_load_policy: '3',
    loop: '1',
    modestbranding: '1',
    playsinline: '1',
    rel: '0',
    showinfo: '0',
    playlist: key,
  })

  return `https://www.youtube-nocookie.com/embed/${key}?${params.toString()}`
}

export function buildTrailerEmbedUrl(key: string) {
  return `https://www.youtube.com/embed/${key}?autoplay=1&rel=0`
}
