# ✨ AuraColor — 色彩配色卡 PWA

一個精美的漸層配色卡產生器，支援離線安裝（PWA）。

## 功能特色

- 🎨 **智能配色演算法** — 支援隨機、相似色、單色系、三等分色、互補色、分裂互補等配色學
- ✨ **動態漸層背景** — 背景隨配色即時流動變色
- 🎛️ **自訂 HSV 調色盤** — 精密的色相、飽和度、明度調整面板
- 🔒 **色彩鎖定** — 鎖定喜愛的顏色，重新生成時保留不變
- 💾 **本地儲存** — 將配色卡儲存在裝置中，隨時查看收藏
- 📱 **PWA 支援** — 可安裝至手機主畫面，支援離線使用
- 📋 **一鍵複製** — 點擊色碼即可複製到剪貼簿

## 技術架構

| 檔案 | 說明 |
|------|------|
| `index.html` | 主要 HTML 結構與 PWA meta 設定 |
| `styles.css` | 全域樣式、動態背景、色卡版面 |
| `app.js` | 配色演算法、HSV 調色盤邏輯、LocalStorage |
| `manifest.json` | PWA 應用程式設定 |
| `sw.js` | Service Worker 離線快取策略 |
| `icon.svg` | 應用程式圖示（雙星設計） |

## 線上展示

> 🔗 [點此開啟 AuraColor](https://你的帳號.github.io/auracolor/)

## 本地執行

```bash
# 需要本地 HTTP 伺服器（直接開啟 index.html 無法啟用 Service Worker）
python3 -m http.server 8000
# 然後開啟 http://localhost:8000
```

## 授權

MIT License
