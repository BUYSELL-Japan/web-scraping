// 共通ユーティリティ

// User-Agentリスト（実在するブラウザのUA）
export const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
]

// ランダムなUser-Agentを取得
export function getRandomUserAgent() {
    return userAgents[Math.floor(Math.random() * userAgents.length)]
}

// ランダムな遅延（ミリ秒）
export function randomDelay(min = 2000, max = 5000) {
    return new Promise(resolve => {
        const delay = Math.floor(Math.random() * (max - min + 1)) + min
        setTimeout(resolve, delay)
    })
}

// 価格文字列から数値を抽出
export function parsePrice(priceStr) {
    if (!priceStr) return 0
    // 数字とカンマ以外を削除し、カンマも削除して数値に変換
    const cleaned = priceStr.replace(/[^\d,]/g, '').replace(/,/g, '')
    return parseInt(cleaned) || 0
}

// 人間らしいマウス移動をシミュレート
export async function humanLikeMouseMove(page) {
    const viewport = page.viewportSize()
    if (!viewport) return

    // ランダムな位置にマウスを移動
    const x = Math.floor(Math.random() * viewport.width)
    const y = Math.floor(Math.random() * viewport.height)

    await page.mouse.move(x, y, { steps: 10 })
}

// 人間らしいスクロールをシミュレート
export async function humanLikeScroll(page) {
    const scrollAmount = Math.floor(Math.random() * 500) + 200
    await page.evaluate((amount) => {
        window.scrollBy({ top: amount, behavior: 'smooth' })
    }, scrollAmount)
    await randomDelay(500, 1500)
}

// ブラウザ設定を取得
export function getBrowserConfig() {
    return {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--window-size=1920,1080'
        ]
    }
}

// ページ設定を適用
export async function setupPage(page) {
    // ビューポートサイズをランダムに設定
    const viewports = [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 1536, height: 864 },
        { width: 1440, height: 900 }
    ]
    const viewport = viewports[Math.floor(Math.random() * viewports.length)]
    await page.setViewportSize(viewport)

    // タイムアウト設定
    page.setDefaultTimeout(30000)
    page.setDefaultNavigationTimeout(30000)
}

// UUIDを生成
export function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
    })
}
