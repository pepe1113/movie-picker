// 僅由本機預覽載入；使用原生 Performance API，量到結果繪製與海報解碼。
export {}

document.addEventListener(
  'submit',
  (event) => {
    const form = event.target
    if (!(form instanceof HTMLFormElement)) return
    const input = form.querySelector('textarea')
    const section = form.closest('section')
    if (!input || input.value.trim().length < 2 || !section) return

    const startedAt = performance.now()
    let finished = false
    const afterPaint = () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      })
    const observer = new MutationObserver(async () => {
      if (finished) return
      const success = section.querySelector(
        '[role="progressbar"][aria-valuenow="100"]',
      )
      const error = section.querySelector('[role="alert"]')
      if (!success && !error) return
      finished = true
      observer.disconnect()
      await afterPaint()

      const renderedAt = performance.now()
      const requests = performance.getEntriesByType(
        'resource',
      ) as PerformanceResourceTiming[]
      const api = requests.find(
        (entry) =>
          entry.startTime >= startedAt &&
          entry.name.includes('/functions/v1/recommend-movies'),
      )
      const images = [...section.querySelectorAll('img')]
      const decoded = await Promise.allSettled(
        images.map((image) => image.decode()),
      )
      await afterPaint()
      const detail = {
        outcome: error ? 'error' : 'success',
        requestMs: api?.duration ?? null,
        submitToResponseMs: api ? api.responseEnd - startedAt : null,
        submitToRenderMs: renderedAt - startedAt,
        submitToPostersMs: performance.now() - startedAt,
        posterCount: images.length,
        posterErrors: decoded.filter((result) => result.status === 'rejected')
          .length,
      }
      performance.measure('ai-picker:frontend-wait', {
        start: startedAt,
        end: performance.now(),
        detail,
      })
      console.info('ai-picker frontend wait', JSON.stringify(detail))
    })
    observer.observe(section, {
      childList: true,
      subtree: true,
      attributes: true,
    })
  },
  true,
)
