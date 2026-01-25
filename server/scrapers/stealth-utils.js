/**
 * 高度なステルスユーティリティ
 * ボット検出を回避するための人間らしい操作シミュレーション
 */

// ベジェ曲線の計算（マウス移動用）
function bezierCurve(t, p0, p1, p2, p3) {
    const u = 1 - t
    const tt = t * t
    const uu = u * u
    const uuu = uu * u
    const ttt = tt * t

    return {
        x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
        y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
    }
}

/**
 * ベジェ曲線を使用した人間らしいマウス移動
 * @param {Page} page - Playwrightページ
 * @param {number} targetX - 目標X座標
 * @param {number} targetY - 目標Y座標
 */
export async function humanMouseMove(page, targetX, targetY) {
    const viewport = page.viewportSize()
    if (!viewport) return

    // 現在のマウス位置（ランダム開始点）
    const startX = Math.random() * viewport.width
    const startY = Math.random() * viewport.height

    // コントロールポイント（ランダムな曲線を生成）
    const cp1 = {
        x: startX + (Math.random() - 0.5) * 200,
        y: startY + (Math.random() - 0.5) * 200
    }
    const cp2 = {
        x: targetX + (Math.random() - 0.5) * 200,
        y: targetY + (Math.random() - 0.5) * 200
    }

    // ステップ数（ランダム）
    const steps = Math.floor(Math.random() * 20) + 30

    for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const point = bezierCurve(
            t,
            { x: startX, y: startY },
            cp1,
            cp2,
            { x: targetX, y: targetY }
        )

        await page.mouse.move(point.x, point.y)

        // 各ステップ間にランダムな遅延
        await new Promise(r => setTimeout(r, Math.random() * 15 + 5))
    }
}

/**
 * 人間らしいタイピングシミュレーション
 * @param {Page} page - Playwrightページ
 * @param {string} selector - 入力フィールドのセレクタ
 * @param {string} text - 入力するテキスト
 */
export async function humanType(page, selector, text) {
    await page.click(selector)
    await randomDelay(200, 500)

    for (const char of text) {
        await page.keyboard.type(char)

        // 文字間のランダム遅延（50〜200ms）
        const delay = Math.floor(Math.random() * 150) + 50

        // たまにタイプミスと修正をシミュレート（5%の確率）
        if (Math.random() < 0.05 && char.match(/[a-zA-Z]/)) {
            const wrongChar = String.fromCharCode(char.charCodeAt(0) + 1)
            await page.keyboard.type(wrongChar)
            await new Promise(r => setTimeout(r, delay * 2))
            await page.keyboard.press('Backspace')
            await new Promise(r => setTimeout(r, delay))
            await page.keyboard.type(char)
        }

        await new Promise(r => setTimeout(r, delay))
    }
}

/**
 * 人間らしいスクロールシミュレーション
 * @param {Page} page - Playwrightページ
 * @param {number} distance - スクロール距離
 */
export async function humanScroll(page, distance = null) {
    const viewport = page.viewportSize()
    if (!viewport) return

    const scrollDistance = distance || Math.floor(Math.random() * 400) + 200
    const steps = Math.floor(Math.random() * 10) + 5
    const stepDistance = scrollDistance / steps

    for (let i = 0; i < steps; i++) {
        // イージング効果（最初と最後はゆっくり）
        const easing = Math.sin((i / steps) * Math.PI)
        const currentStep = stepDistance * (0.5 + easing * 0.5)

        await page.evaluate((dist) => {
            window.scrollBy({ top: dist, behavior: 'auto' })
        }, currentStep)

        // ステップ間の遅延
        await new Promise(r => setTimeout(r, Math.random() * 50 + 20))
    }

    // スクロール後の「読む」時間
    await randomDelay(500, 1500)
}

/**
 * ランダムな遅延
 * @param {number} min - 最小ミリ秒
 * @param {number} max - 最大ミリ秒
 */
export function randomDelay(min = 2000, max = 5000) {
    return new Promise(resolve => {
        const delay = Math.floor(Math.random() * (max - min + 1)) + min
        setTimeout(resolve, delay)
    })
}

/**
 * 長めのランダム遅延（Shopee用）
 */
export function longRandomDelay() {
    return randomDelay(5000, 15000)
}

/**
 * 無料プロキシリストを取得
 * 注意：無料プロキシは信頼性が低い
 */
export async function getFreeProxies() {
    // 無料プロキシは信頼性が低いため、プロキシなしで実行
    // 本番環境では有料の住宅プロキシを推奨
    console.log('[Stealth] 無料プロキシは信頼性が低いため、直接接続を使用します')
    return []
}

/**
 * 高度なUser-Agentリスト（最新版）
 */
export const advancedUserAgents = [
    // Chrome Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    // Chrome Mac
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    // Firefox
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.2; rv:121.0) Gecko/20100101 Firefox/121.0',
    // Safari
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    // Edge
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
]

/**
 * ランダムなUser-Agentを取得
 */
export function getAdvancedUserAgent() {
    return advancedUserAgents[Math.floor(Math.random() * advancedUserAgents.length)]
}

/**
 * ブラウザフィンガープリントを偽装するためのスクリプト
 */
export const fingerprintScript = `
  // WebGL Vendor/Renderer 偽装
  const getParameterProxyHandler = {
    apply: function(target, thisArg, argumentsList) {
      const param = argumentsList[0]
      const gl = thisArg
      
      // UNMASKED_VENDOR_WEBGL
      if (param === 37445) {
        return 'Google Inc. (NVIDIA)'
      }
      // UNMASKED_RENDERER_WEBGL
      if (param === 37446) {
        return 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1080 Direct3D11 vs_5_0 ps_5_0, D3D11)'
      }
      
      return Reflect.apply(target, thisArg, argumentsList)
    }
  }

  // Chrome検出回避
  Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined
  })

  // プラグイン偽装
  Object.defineProperty(navigator, 'plugins', {
    get: () => {
      const plugins = [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
        { name: 'Native Client', filename: 'internal-nacl-plugin' }
      ]
      plugins.length = 3
      return plugins
    }
  })

  // 言語設定
  Object.defineProperty(navigator, 'languages', {
    get: () => ['ja-JP', 'ja', 'en-US', 'en']
  })

  // ハードウェア同時実行数
  Object.defineProperty(navigator, 'hardwareConcurrency', {
    get: () => 8
  })

  // デバイスメモリ
  Object.defineProperty(navigator, 'deviceMemory', {
    get: () => 8
  })

  // 接続情報
  if (navigator.connection) {
    Object.defineProperty(navigator.connection, 'effectiveType', {
      get: () => '4g'
    })
  }

  // タイムゾーン
  Date.prototype.getTimezoneOffset = function() {
    return -540 // JST (UTC+9)
  }
`

/**
 * 高度なブラウザコンテキスト設定を取得
 * @param {string} locale - ロケール（'zh-TW' | 'ms-MY'）
 * @param {string} timezone - タイムゾーン
 */
export function getAdvancedContextOptions(locale = 'zh-TW', timezone = 'Asia/Taipei') {
    return {
        userAgent: getAdvancedUserAgent(),
        locale,
        timezoneId: timezone,
        geolocation: locale === 'zh-TW'
            ? { latitude: 25.0330, longitude: 121.5654 } // 台北
            : { latitude: 3.1390, longitude: 101.6869 }, // クアラルンプール
        permissions: ['geolocation'],
        viewport: {
            width: [1920, 1536, 1440, 1366][Math.floor(Math.random() * 4)],
            height: [1080, 864, 900, 768][Math.floor(Math.random() * 4)]
        },
        deviceScaleFactor: Math.random() < 0.5 ? 1 : 2,
        hasTouch: false,
        isMobile: false,
        colorScheme: 'light',
        reducedMotion: 'no-preference'
    }
}

/**
 * ページにフィンガープリント偽装スクリプトを注入
 * @param {Page} page - Playwrightページ
 */
export async function injectFingerprint(page) {
    await page.addInitScript(fingerprintScript)
}

/**
 * ランダムなページ内操作（検出回避用）
 * @param {Page} page - Playwrightページ
 */
export async function randomPageInteraction(page) {
    const viewport = page.viewportSize()
    if (!viewport) return

    // ランダムな位置にマウスを移動
    const x = Math.floor(Math.random() * viewport.width * 0.8) + viewport.width * 0.1
    const y = Math.floor(Math.random() * viewport.height * 0.8) + viewport.height * 0.1

    await humanMouseMove(page, x, y)

    // 少しスクロール
    if (Math.random() > 0.5) {
        await humanScroll(page, Math.floor(Math.random() * 200) + 100)
    }

    await randomDelay(1000, 3000)
}

/**
 * UUIDを生成
 */
export function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
    })
}

/**
 * 価格文字列から数値を抽出
 */
export function parsePrice(priceStr) {
    if (!priceStr) return 0
    const cleaned = priceStr.replace(/[^\d.,]/g, '').replace(/,/g, '')
    return parseInt(cleaned) || 0
}
