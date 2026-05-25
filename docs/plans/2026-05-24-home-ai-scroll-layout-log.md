# 2026-05-24 Home AI Scroll Layout Log

## Goal

Restructure the home page so the first viewport is a focused AI picker invitation, the second viewport is the full AI picker flow, and the following content still guides users into the latest movie sections.

## Decisions

- Hero height subtracts the sticky header and marquee height: `100svh - 104px`.
- AI picker height subtracts only the sticky header: `100svh - 64px`.
- The first CTA scrolls smoothly to the AI picker section.
- The AI picker no longer jumps back to the page top after the final answer.
- The AI picker bottom prompt scrolls users onward to the latest movie content.

## Files

- `src/pages/Home.tsx`
- `src/components/features/ai-picker/AiMoviePicker.tsx`
- `src/components/layout/Marquee.tsx`
- `src/i18n/locales/zh-TW.json`
- `src/i18n/locales/en.json`
