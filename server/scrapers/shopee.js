import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import {
    humanMouseMove,
    humanType,
    humanScroll,
    randomDelay,
    longRandomDelay,
    getAdvancedContextOptions,
    injectFingerprint,
    randomPageInteraction,
    generateId,
    parsePrice
} from './stealth-utils.js'

// ステルスプラグインを適用（全オプション有効）
chromium.use(StealthPlugin())

// Shopeeの国別設定
const SHOPEE_CONFIG = {
    'shopee-tw': {
        name: 'Shopee台湾',
        baseUrl: 'https://shopee.tw',
        searchUrl: 'https://shopee.tw/search?keyword=',
        locale: 'zh-TW',
        timezone: 'Asia/Taipei',
        currency: 'TWD'
    },
    'shopee-my': {
        name: 'Shopeeマレーシア',
        baseUrl: 'https://shopee.com.my',
        searchUrl: 'https://shopee.com.my/search?keyword=',
        locale: 'ms-MY',
        timezone: 'Asia/Kuala_Lumpur',
        currency: 'MYR'
    }
}

/**
 * Shopeeから商品を検索してスクレイピング（高度ステルス版）
 * @param {string} query - 検索キーワード
 * @param {string} country - 国コード ('shopee-tw' | 'shopee-my')
 * @param {number} maxItems - 最大取得件数
 * @returns {Promise<Array>} 商品リスト
 */
export async function scrapeShopee(query, country = 'shopee-tw', maxItems = 10) {
    const config = SHOPEE_CONFIG[country]
    if (!config) {
        console.error(`[Shopee] 不明な国コード: ${country}`)
        return []
    }

    const products = []
    let browser = null

    try {
        console.log(`\n[${config.name}] ========================================`)
        console.log(`[${config.name}] 高度ステルスモードで検索開始: ${query}`)
        console.log(`[${config.name}] ========================================\n`)

        // ブラウザ起動
        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920,1080',
                '--disable-blink-features=AutomationControlled',
                '--disable-features=IsolateOrigins,site-per-process'
            ]
        })

        // 高度なコンテキスト設定
        const contextOptions = getAdvancedContextOptions(config.locale, config.timezone)
        const context = await browser.newContext(contextOptions)

        // Cookieを設定（既存ユーザーを偽装）
        await context.addCookies([
            {
                name: 'SPC_F',
                value: generateId(),
                domain: new URL(config.baseUrl).hostname,
                path: '/'
            }
        ])

        const page = await context.newPage()

        // フィンガープリント偽装スクリプトを注入
        await injectFingerprint(page)

        // タイムアウト設定
        page.setDefaultTimeout(60000)
        page.setDefaultNavigationTimeout(60000)

        console.log(`[${config.name}] ページにアクセス中...`)

        // まずトップページにアクセス
        await page.goto(config.baseUrl, { waitUntil: 'domcontentloaded' })
        await longRandomDelay()

        // ランダムな操作（人間らしさを演出）
        await randomPageInteraction(page)
        console.log(`[${config.name}] 人間らしい操作を実行...`)

        // 検索ページにアクセス
        const searchUrl = `${config.searchUrl}${encodeURIComponent(query)}`
        console.log(`[${config.name}] 検索URL: ${searchUrl}`)

        await page.goto(searchUrl, { waitUntil: 'domcontentloaded' })
        await longRandomDelay()

        // ページ内でスクロール（商品を読み込ませる）
        for (let i = 0; i < 3; i++) {
            await humanScroll(page, 500)
            await randomDelay(2000, 4000)
        }

        console.log(`[${config.name}] 商品を取得中...`)

        // 商品一覧を取得（複数のセレクタを試行）
        const selectors = [
            '.shopee-search-item-result__item',
            '[data-sqe="item"]',
            '.shop-search-result-view__item',
            'div[data-item-id]'
        ]

        let items = []
        for (const selector of selectors) {
            items = await page.$$(selector)
            if (items.length > 0) {
                console.log(`[${config.name}] セレクタ "${selector}" で ${items.length}件の商品を検出`)
                break
            }
        }

        if (items.length === 0) {
            // フォールバック：すべての商品リンクを取得
            console.log(`[${config.name}] 標準セレクタで商品が見つからないため、リンクから取得を試行...`)

            // ページのHTMLを解析
            const productLinks = await page.$$eval('a[href*="/product/"], a[data-sqe="link"]', links =>
                links.map(link => ({
                    href: link.href,
                    text: link.textContent?.trim() || ''
                })).filter(l => l.href && l.text)
            ).catch(() => [])

            console.log(`[${config.name}] ${productLinks.length}件の商品リンクを検出`)
        }

        const itemCount = Math.min(items.length, maxItems)

        for (let i = 0; i < itemCount; i++) {
            try {
                // 各商品間に遅延
                await randomDelay(1000, 3000)

                const item = items[i]

                // 商品情報を抽出
                let title = ''
                let imageUrl = ''
                let priceText = ''
                let url = ''

                // タイトル
                title = await item.$eval(
                    '.ie3A\\+n, .Cve6sh, [data-sqe="name"], .yQmmFK, ._10Wbs-, .shopee-item-card__text-name',
                    el => el.textContent?.trim() || ''
                ).catch(() => '')

                if (!title) {
                    title = await item.$eval('div[style*="line-clamp"], div[class*="name"]',
                        el => el.textContent?.trim() || ''
                    ).catch(() => '')
                }

                // 画像
                imageUrl = await item.$eval(
                    'img',
                    el => el.src || el.dataset.src || ''
                ).catch(() => '')

                // 価格
                priceText = await item.$eval(
                    '.vioxXd, ._32hnMv, [data-sqe="price"], .kIo6pj, ._1xk7ak, .shopee-item-card__current-price',
                    el => el.textContent?.trim() || ''
                ).catch(() => '')

                if (!priceText) {
                    priceText = await item.$eval('span[class*="price"]',
                        el => el.textContent?.trim() || ''
                    ).catch(() => '0')
                }

                // URL
                url = await item.$eval(
                    'a',
                    el => el.href || ''
                ).catch(() => '')

                const price = parsePrice(priceText)

                if (title && price > 0) {
                    products.push({
                        id: generateId(),
                        title: title.substring(0, 200), // タイトルを制限
                        description: '',
                        price,
                        imageUrl: imageUrl.startsWith('//') ? `https:${imageUrl}` : imageUrl,
                        url: url.startsWith('http') ? url : `${config.baseUrl}${url}`,
                        source: country,
                        currency: config.currency
                    })
                    console.log(`[${config.name}] 商品${i + 1}: ${title.substring(0, 30)}... - ${price} ${config.currency}`)
                }
            } catch (itemError) {
                console.error(`[${config.name}] 商品${i + 1}の取得エラー:`, itemError.message)
            }
        }

        console.log(`\n[${config.name}] ========================================`)
        console.log(`[${config.name}] ${products.length}件の商品を取得完了`)
        console.log(`[${config.name}] ========================================\n`)

    } catch (error) {
        console.error(`[${SHOPEE_CONFIG[country]?.name || country}] スクレイピングエラー:`, error.message)
    } finally {
        if (browser) {
            await browser.close()
        }
    }

    return products
}

/**
 * Shopee台湾から検索
 */
export async function scrapeShoreeTaiwan(query, maxItems = 10) {
    return scrapeShopee(query, 'shopee-tw', maxItems)
}

/**
 * Shopeeマレーシアから検索
 */
export async function scrapeShoreeMalaysia(query, maxItems = 10) {
    return scrapeShopee(query, 'shopee-my', maxItems)
}
