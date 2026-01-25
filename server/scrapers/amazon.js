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
 * Amazon日本から商品を検索してスクレイピング
 * @param {string} query - 検索キーワード
 * @param {number} maxItems - 最大取得件数
 * @param {Object} options - オプション
 * @param {boolean} options.newOnly - 新品のみ検索
 * @returns {Promise<Array>} 商品リスト
 */
export async function scrapeAmazon(query, maxItems = 20, options = {}) {
    const { newOnly = false } = options
    const products = []
    let browser = null

    try {
        console.log(`[Amazon Japan] 検索開始: ${query}${newOnly ? ' (新品のみ)' : ''}`)

        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--lang=ja-JP'
            ]
        })

        const context = await browser.newContext({
            userAgent: getRandomUserAgent(),
            locale: 'ja-JP',
            timezoneId: 'Asia/Tokyo',
            extraHTTPHeaders: {
                'Accept-Language': 'ja-JP,ja;q=0.9'
            }
        })

        const page = await context.newPage()
        await setupPage(page)

        // 検索URLを構築（日本Amazon、フィギュアカテゴリ、新品フィルター）
        let searchUrl = `https://www.amazon.co.jp/s?k=${encodeURIComponent(query)}&i=hobby`

        // 新品のみフィルター
        if (newOnly) {
            searchUrl += '&rh=p_n_condition-type%3A71084051'  // Amazon日本の新品フィルター
        }

        console.log(`[Amazon Japan] アクセス: ${searchUrl}`)

        await page.goto(searchUrl, { waitUntil: 'domcontentloaded' })
        await randomDelay(2000, 4000)

        // 人間らしい操作
        await humanLikeMouseMove(page)
        await humanLikeScroll(page)
        await randomDelay(1000, 2000)

        // 商品一覧を取得
        const items = await page.$$('[data-component-type="s-search-result"]')
        console.log(`[Amazon Japan] ${items.length}件の商品を検出`)

        const itemCount = Math.min(items.length, maxItems)

        for (let i = 0; i < itemCount; i++) {
            try {
                await randomDelay(300, 800)

                const item = items[i]

                // 広告をスキップ
                const isAd = await item.$('[data-component-type="sp-sponsored-result"]')
                if (isAd) continue

                // 商品情報を抽出
                const title = await item.$eval(
                    'h2 a span, h2 span',
                    el => el.textContent || ''
                ).catch(() => '')

                // 日本語を含むタイトルのみを抽出（ひらがな、カタカナ、漢字）
                const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(title)
                if (!hasJapanese) {
                    continue // 日本語が含まれない商品はスキップ
                }

                const imageUrl = await item.$eval(
                    '.s-image',
                    el => el.getAttribute('src') || ''
                ).catch(() => '')

                // 価格を取得（複数の価格形式に対応）
                let priceText = await item.$eval(
                    '.a-price .a-offscreen',
                    el => el.textContent || ''
                ).catch(() => '')

                if (!priceText) {
                    priceText = await item.$eval(
                        '.a-price-whole',
                        el => el.textContent || ''
                    ).catch(() => '0')
                }

                // 商品URLを取得（複数のセレクタを試行）
                let url = ''

                // まず h2 a から取得
                url = await item.$eval(
                    'h2 a[href*="/dp/"], h2 a[href*="/gp/"]',
                    el => el.getAttribute('href') || ''
                ).catch(() => '')

                // h2 a で取得できない場合は他のセレクタを試す
                if (!url) {
                    url = await item.$eval(
                        'a.a-link-normal[href*="/dp/"], a[href*="/dp/"]',
                        el => el.getAttribute('href') || ''
                    ).catch(() => '')
                }

                // データ属性からASINを取得してURL構築
                if (!url) {
                    const asin = await item.getAttribute('data-asin').catch(() => '')
                    if (asin) {
                        url = `/dp/${asin}`
                    }
                }

                const price = parsePrice(priceText)

                if (title && price > 0) {
                    products.push({
                        id: generateId(),
                        title: title.trim(),
                        description: '',
                        price,
                        imageUrl,
                        url: url.startsWith('http') ? url : `https://www.amazon.co.jp${url}`,
                        source: 'amazon',
                        currency: 'JPY',
                        condition: newOnly ? '新品' : '全て'
                    })
                }
            } catch (itemError) {
                console.error(`[Amazon Japan] 商品${i + 1}の取得エラー:`, itemError.message)
            }
        }

        console.log(`[Amazon Japan] ${products.length}件の商品を取得完了`)

    } catch (error) {
        console.error('[Amazon Japan] スクレイピングエラー:', error.message)
    } finally {
        if (browser) {
            await browser.close()
        }
    }

    return products
}
