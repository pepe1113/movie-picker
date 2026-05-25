# Spotify-like UI 改版紀錄

**日期：** 2026-05-20
**狀態：** 已實作

## 目標

依照 `DESIGN.md` 將 Movie Picker 的全站主要 UI 從銳利邊角、橘色 accent、超大標題的 Bold Typography 方向，調整為 Spotify-like 的沉浸式深色介面。

## 改版重點

- 全域 tokens 改為近黑背景階層：`#121212`、`#181818`、`#1f1f1f`。
- 主功能色改為 Spotify Green：`#1ed760`，用於 CTA、active 狀態與功能性標籤。
- 恢復圓角系統，按鈕與搜尋框採 pill，收藏與圖示操作採圓形控制。
- 共用元件更新：Button、Input、Select、Badge、Card、Dialog、Dropdown、Sheet、Tabs、Skeleton。
- 主要頁面更新：首頁、Random Pick、Top100、Search、Wishlist、Movie Detail。
- 電影卡片與排行榜列表改為深色 surface、6-8px 圓角、海報主導色彩、hover lift 與重陰影。

## 範圍限制

- 未新增大型依賴或 UI framework。
- 未修改路由、TMDB API、Firebase 服務、Zustand store shape。
- 未移除 i18n 結構；本次主要調整既有樣式與版面。

## 驗收重點

- 全站不再以橘色或 sharp-edge 作為主視覺。
- Header、搜尋、tabs、主要 CTA 符合 pill/circle 幾何。
- 深色 surface 有明確層次，彈窗與選單使用重陰影。
- 電影海報成為頁面主要色彩來源，UI 本身維持黑灰綠的克制色系。
