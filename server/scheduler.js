/**
 * スケジューラーエンジン
 * 手動開始・朝4時自動停止のAmazonスクレイピングシステム
 */

import cron from 'node-cron'
import { scrapeAmazon } from './scrapers/amazon.js'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 設定定数
const CONFIG = {
    MAX_DAILY_SEARCHES: 100,
    SEARCHES_PER_PRODUCT: 3,
    TARGET_PRODUCTS: 50,
    AUTO_STOP_HOUR: 4,
    INTERVALS: [
        { minutes: 5, weight: 40 },
        { minutes: 7.5, weight: 30 },
        { minutes: 10, weight: 20 },
        { minutes: 15, weight: 10 }
    ],
    JITTER_SECONDS: 30,
    BLOCK_COOLDOWN_HOURS: 72
}

// スケジューラーの状態
let schedulerState = {
    isRunning: false,
    startTime: null,
    currentProductIndex: 0,
    currentSearchCount: 0,
    totalSearchesToday: 0,
    productList: [],
    results: [],
    nextSearchTime: null,
    lastError: null,
    isBlocked: false,
    blockedUntil: null
}

// データディレクトリ
const dataDir = join(__dirname, 'data')
const stateFile = join(dataDir, 'scheduler-state.json')
const resultsFile = join(dataDir, 'scraping-results.json')

// ディレクトリ作成
if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
}

/**
 * 状態を保存
 */
function saveState() {
    try {
        writeFileSync(stateFile, JSON.stringify(schedulerState, null, 2))
    } catch (error) {
        console.error('[Scheduler] 状態保存エラー:', error.message)
    }
}

/**
 * 状態を読み込み
 */
function loadState() {
    try {
        if (existsSync(stateFile)) {
            const data = readFileSync(stateFile, 'utf-8')
            const saved = JSON.parse(data)
            // 日付が変わっていれば日次カウントをリセット
            const today = new Date().toDateString()
            const savedDate = saved.startTime ? new Date(saved.startTime).toDateString() : null
            if (savedDate !== today) {
                saved.totalSearchesToday = 0
            }
            return { ...schedulerState, ...saved, isRunning: false }
        }
    } catch (error) {
        console.error('[Scheduler] 状態読み込みエラー:', error.message)
    }
    return schedulerState
}

/**
 * 結果を保存
 */
function saveResults() {
    try {
        writeFileSync(resultsFile, JSON.stringify(schedulerState.results, null, 2))
    } catch (error) {
        console.error('[Scheduler] 結果保存エラー:', error.message)
    }
}

/**
 * 結果を読み込み
 */
function loadResults() {
    try {
        if (existsSync(resultsFile)) {
            const data = readFileSync(resultsFile, 'utf-8')
            return JSON.parse(data)
        }
    } catch (error) {
        console.error('[Scheduler] 結果読み込みエラー:', error.message)
    }
    return []
}

/**
 * 加重ランダムで間隔を選択
 */
function selectInterval() {
    const rand = Math.random() * 100
    let cumulative = 0

    for (const { minutes, weight } of CONFIG.INTERVALS) {
        cumulative += weight
        if (rand <= cumulative) {
            // ジッターを追加
            const jitter = (Math.random() - 0.5) * 2 * CONFIG.JITTER_SECONDS
            const seconds = minutes * 60 + jitter
            return Math.max(60, seconds) // 最低1分
        }
    }

    return 5 * 60 // デフォルト5分
}

/**
 * 朝4時までの残り時間（ミリ秒）
 */
function getTimeUntilAutoStop() {
    const now = new Date()
    const stopTime = new Date()
    stopTime.setHours(CONFIG.AUTO_STOP_HOUR, 0, 0, 0)

    // 既に4時を過ぎていれば翌日の4時
    if (now >= stopTime) {
        stopTime.setDate(stopTime.getDate() + 1)
    }

    return stopTime - now
}

/**
 * 1商品を3回検索して平均価格を算出
 */
async function searchProductWithAveraging(productName) {
    const prices = []
    const allProducts = []

    console.log(`[Scheduler] 商品「${productName}」を3回検索開始`)

    for (let i = 0; i < CONFIG.SEARCHES_PER_PRODUCT; i++) {
        try {
            schedulerState.currentSearchCount = i + 1
            schedulerState.totalSearchesToday++
            schedulerState.currentProductName = productName
            saveState()

            console.log(`[Scheduler] 検索 ${i + 1}/${CONFIG.SEARCHES_PER_PRODUCT}`)

            const products = await scrapeAmazon(productName, 5)

            products.forEach(p => {
                if (p.price > 0) {
                    prices.push(p.price)
                    allProducts.push(p)
                }
            })

            // 検索間の待機（最後の検索後は待たない）
            if (i < CONFIG.SEARCHES_PER_PRODUCT - 1) {
                const waitTime = selectInterval() * 1000
                schedulerState.nextSearchTime = new Date(Date.now() + waitTime)
                saveState()

                console.log(`[Scheduler] 次の検索まで ${Math.round(waitTime / 1000)}秒待機`)
                await new Promise(r => setTimeout(r, waitTime))
            }

        } catch (error) {
            console.error(`[Scheduler] 検索${i + 1}エラー:`, error.message)

            // ブロック検知
            if (error.message.includes('blocked') || error.message.includes('CAPTCHA')) {
                schedulerState.isBlocked = true
                schedulerState.blockedUntil = new Date(Date.now() + CONFIG.BLOCK_COOLDOWN_HOURS * 60 * 60 * 1000)
                schedulerState.lastError = 'ブロック検知: 72時間停止'
                saveState()
                return null
            }
        }
    }

    if (prices.length === 0) {
        return null
    }

    // 平均価格を算出
    const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)

    // 最安値商品を見つける
    const cheapestProduct = allProducts.reduce((min, p) =>
        p.price < min.price ? p : min
        , allProducts[0])

    return {
        productName,
        averagePrice: avgPrice,
        minPrice,
        maxPrice,
        searchCount: prices.length,
        cheapestUrl: cheapestProduct?.url || null,
        cheapestTitle: cheapestProduct?.title || null,
        products: allProducts,
        timestamp: new Date().toISOString()
    }
}

// スケジューラータイマー
let schedulerTimer = null
let autoStopJob = null

/**
 * スケジューラーのメインループ
 */
async function schedulerLoop() {
    if (!schedulerState.isRunning) {
        console.log('[Scheduler] 停止状態のためループ終了')
        return
    }

    // 日次制限チェック
    if (schedulerState.totalSearchesToday >= CONFIG.MAX_DAILY_SEARCHES) {
        console.log('[Scheduler] 日次検索制限に達しました')
        stopScheduler()
        return
    }

    // ブロックチェック
    if (schedulerState.isBlocked) {
        if (new Date() < new Date(schedulerState.blockedUntil)) {
            console.log('[Scheduler] ブロック中: クールダウン待機')
            stopScheduler()
            return
        }
        schedulerState.isBlocked = false
        schedulerState.blockedUntil = null
    }

    // 商品リストチェック
    if (schedulerState.currentProductIndex >= schedulerState.productList.length) {
        console.log('[Scheduler] すべての商品を処理完了')
        stopScheduler()
        return
    }

    const productName = schedulerState.productList[schedulerState.currentProductIndex]

    try {
        const result = await searchProductWithAveraging(productName)

        if (result) {
            schedulerState.results.push(result)
            saveResults()
            console.log(`[Scheduler] 商品「${productName}」完了: 平均¥${result.averagePrice}`)
        }

        schedulerState.currentProductIndex++
        saveState()

    } catch (error) {
        console.error('[Scheduler] ループエラー:', error.message)
        schedulerState.lastError = error.message
        saveState()
    }

    // 次の商品へ
    if (schedulerState.isRunning && schedulerState.currentProductIndex < schedulerState.productList.length) {
        const waitTime = selectInterval() * 1000
        schedulerState.nextSearchTime = new Date(Date.now() + waitTime)
        saveState()

        console.log(`[Scheduler] 次の商品まで ${Math.round(waitTime / 1000)}秒待機`)
        schedulerTimer = setTimeout(schedulerLoop, waitTime)
    }
}

/**
 * スケジューラーを開始
 */
export function startScheduler(productList) {
    if (schedulerState.isRunning) {
        console.log('[Scheduler] 既に実行中です')
        return false
    }

    if (!productList || productList.length === 0) {
        console.log('[Scheduler] 商品リストが空です')
        return false
    }

    console.log('\n========================================')
    console.log('[Scheduler] スクレイピング開始')
    console.log(`[Scheduler] 商品数: ${productList.length}`)
    console.log(`[Scheduler] 朝4時まで: ${Math.round(getTimeUntilAutoStop() / 1000 / 60)}分`)
    console.log('========================================\n')

    schedulerState = {
        ...loadState(),
        isRunning: true,
        startTime: new Date().toISOString(),
        currentProductIndex: 0,
        currentSearchCount: 0,
        productList,
        results: loadResults(),
        nextSearchTime: null,
        lastError: null
    }

    // 日付が変わっていれば日次カウントをリセット
    const today = new Date().toDateString()
    const lastDate = schedulerState.startTime ? new Date(schedulerState.startTime).toDateString() : null
    if (lastDate !== today) {
        schedulerState.totalSearchesToday = 0
    }

    saveState()

    // 朝4時自動停止ジョブ
    if (autoStopJob) {
        autoStopJob.stop()
    }
    autoStopJob = cron.schedule('0 4 * * *', () => {
        console.log('\n========================================')
        console.log('[Scheduler] 朝4時: 自動停止')
        console.log('========================================\n')
        stopScheduler()
    }, {
        timezone: 'Asia/Tokyo'
    })

    // メインループ開始
    schedulerLoop()

    return true
}

/**
 * スケジューラーを停止
 */
export function stopScheduler() {
    console.log('\n========================================')
    console.log('[Scheduler] スクレイピング停止')
    console.log(`[Scheduler] 完了商品数: ${schedulerState.currentProductIndex}`)
    console.log(`[Scheduler] 本日の検索数: ${schedulerState.totalSearchesToday}`)
    console.log('========================================\n')

    schedulerState.isRunning = false
    schedulerState.nextSearchTime = null
    saveState()
    saveResults()

    if (schedulerTimer) {
        clearTimeout(schedulerTimer)
        schedulerTimer = null
    }

    if (autoStopJob) {
        autoStopJob.stop()
        autoStopJob = null
    }

    return true
}

/**
 * スケジューラーの状態を取得
 */
export function getSchedulerStatus() {
    const timeUntilStop = getTimeUntilAutoStop()

    return {
        isRunning: schedulerState.isRunning,
        startTime: schedulerState.startTime,
        currentProductIndex: schedulerState.currentProductIndex,
        totalProducts: schedulerState.productList.length,
        currentProductName: schedulerState.currentProductName || null,
        currentSearchCount: schedulerState.currentSearchCount,
        searchesPerProduct: CONFIG.SEARCHES_PER_PRODUCT,
        totalSearchesToday: schedulerState.totalSearchesToday,
        maxDailySearches: CONFIG.MAX_DAILY_SEARCHES,
        nextSearchTime: schedulerState.nextSearchTime,
        timeUntilAutoStop: timeUntilStop,
        hoursUntilAutoStop: Math.round(timeUntilStop / 1000 / 60 / 60 * 10) / 10,
        resultsCount: schedulerState.results.length,
        lastError: schedulerState.lastError,
        isBlocked: schedulerState.isBlocked,
        blockedUntil: schedulerState.blockedUntil,
        productList: schedulerState.productList
    }
}

/**
 * 結果を取得
 */
export function getResults() {
    return schedulerState.results
}

/**
 * 結果をCSV形式で取得
 */
export function exportResultsAsCSV() {
    const results = schedulerState.results

    if (results.length === 0) {
        return ''
    }

    const headers = ['商品名', '平均価格', '最安値', '最高値', '検索回数', 'タイムスタンプ']
    const rows = results.map(r => [
        `"${r.productName.replace(/"/g, '""')}"`,
        r.averagePrice,
        r.minPrice,
        r.maxPrice,
        r.searchCount,
        r.timestamp
    ])

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
}

/**
 * 結果をクリア
 */
export function clearResults() {
    schedulerState.results = []
    saveResults()
    return true
}

// 初期化時に状態を読み込み
schedulerState = loadState()
schedulerState.results = loadResults()
