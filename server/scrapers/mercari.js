import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import {
    getRandomUserAgent,
    randomDelay,
    parsePrice,
    humanLikeMouseMove,
    humanLikeScroll,
    setupPage,
    generateId
} from './utils.js'

// ステルスプラグインを適用
chromium.use(StealthPlugin())

/**
 * メルカリから商品を検索してスクレイピング
 * @param {string} query - 検索キーワード
 * @param {number} maxItems - 最大取得件数
 * @returns {Promise<Array>} 商品リスト
 */
export async function scrapeMercari(query, maxItems = 20) {
    const products = []
    let browser = null

    try {
        console.log(`[Mercari] 検索開始: ${query}`)

        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled'
            ]
        })

        const context = await browser.newContext({
            userAgent: getRandomUserAgent(),
            locale: 'ja-JP',
            timezoneId: 'Asia/Tokyo',
            viewport: { width: 1920, height: 1080 }
        })

        const page = await context.newPage()

        // タイムアウトを延長
        page.setDefaultTimeout(60000)
        page.setDefaultNavigationTimeout(60000)

        // 検索URLを構築
        const searchUrl = `https://jp.mercari.com/search?keyword=${encodeURIComponent(query)}`
        console.log(`[Mercari] アクセス: ${searchUrl}`)

        // domcontentloadedで待機（networkidleは長すぎる）
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded' })

        // ページの読み込みを待つ
        await randomDelay(5000, 8000)

        // 人間らしい操作
        await humanLikeMouseMove(page)
        await randomDelay(1000, 2000)
        await humanLikeScroll(page)
        await randomDelay(2000, 3000)

        console.log('[Mercari] ページ内容を解析中...')

        // ページから直接商品情報を取得
        const pageProducts = await page.evaluate(() => {
            const results = []

            // 商品リンクを探す
            const links = document.querySelectorAll('a[href*="/item/m"]')

            links.forEach(link => {
                try {
                    const href = link.getAttribute('href')
                    if (!href || !href.includes('/item/m')) return

                    // 親要素から情報を取得
                    const container = link.closest('li') || link.parentElement?.parentElement || link

                    // 画像を探す
                    const img = container.querySelector('img') || link.querySelector('img')
                    const imageUrl = img ? (img.src || img.dataset?.src || '') : ''
                    const title = img ? (img.alt || '') : ''

                    // 価格を探す - テキストコンテンツ全体から価格を抽出
                    const allText = container.textContent || ''
                    const priceMatch = allText.match(/¥[\d,]+/)
                    const priceText = priceMatch ? priceMatch[0] : ''

                    if (title && priceText) {
                        results.push({
                            title: title.trim(),
                            imageUrl,
                            priceText,
                            url: href
                        })
                    }
                } catch (e) {
                    // 個別のエラーは無視
                }
            })

            // 重複を除去
            const seen = new Set()
            return results.filter(item => {
                const key = item.url
                if (seen.has(key)) return false
                seen.add(key)
                return true
            })
        })

        console.log(`[Mercari] ${pageProducts.length}件の商品を検出`)

        const itemCount = Math.min(pageProducts.length, maxItems)
        for (let i = 0; i < itemCount; i++) {
            const item = pageProducts[i]
            const price = parsePrice(item.priceText)

            if (item.title && price > 0) {
                products.push({
                    id: generateId(),
                    title: item.title,
                    description: '',
                    price,
                    imageUrl: item.imageUrl,
                    url: item.url.startsWith('http') ? item.url : `https://jp.mercari.com${item.url}`,
                    source: 'mercari',
                    currency: 'JPY'
                })
            }
        }

        console.log(`[Mercari] ${products.length}件の商品を取得完了`)

    } catch (error) {
        console.error('[Mercari] スクレイピングエラー:', error.message)
    } finally {
        if (browser) {
            await browser.close()
        }
    }

    return products
}
