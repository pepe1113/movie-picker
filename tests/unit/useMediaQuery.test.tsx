import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MOBILE_MEDIA_QUERY, useIsMobile } from '@/hooks/useMediaQuery'

function mockMatchMedia(matches: boolean) {
  const spy = vi.fn((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
  vi.stubGlobal('matchMedia', spy)
  return spy
}

describe('useIsMobile', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('is true when the mobile media query matches', () => {
    const spy = mockMatchMedia(true)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
    expect(spy).toHaveBeenCalledWith(MOBILE_MEDIA_QUERY)
  })

  it('is false on wider viewports', () => {
    mockMatchMedia(false)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })
})
