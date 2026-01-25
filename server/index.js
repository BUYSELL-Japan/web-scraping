import express from 'express'
import cors from 'cors'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { scrapeAmazon } from './scrapers/amazon.js'
import { scrapeShopee } from './scrapers/shopee.js'
import {
    startScheduler,
    stopScheduler,
    getSchedulerStatus,
    getResults,
    exportResultsAsCSV,
    clearResults
} from './scheduler.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = 3001

// ミドルウェア
app.use(cors())
app.use(express.json())

// データファイルパス
const dataDir = join(__dirname, 'data')
const dataFile = join(dataDir, 'products.json')

// データディレクトリが存在しない場合は作成
if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
}

// 保存済み商品を読み込み
function loadProducts() {
    try {
        if (existsSync(dataFile)) {
            const data = readFileSync(dataFile, 'utf-8')
            return JSON.parse(data)
        }
    } catch (error) {
        console.error('データ読み込みエラー:', error)
    }
    return []
}

// 商品を保存
function saveProducts(products) {
    try {
        writeFileSync(dataFile, JSON.stringify(products, null, 2))
    } catch (error) {
        console.error('データ保存エラー:', error)
    }
}

// API: 商品検索
app.post('/api/search', async (req, res) => {
    const { query, sites = ['amazon'], newOnly = false } = req.body

    if (!query) {
        return res.status(400).json({ error: '検索キーワードが必要です' })
    }

    console.log(`\n========================================`)
    console.log(`検索開始: "${query}"`)
    console.log(`対象サイト: ${sites.join(', ')}`)
    console.log(`新品のみ: ${newOnly ? 'はい' : 'いいえ'}`)
    console.log(`========================================\n`)

    try {
        const promises = []

        if (sites.includes('amazon')) {
            promises.push(scrapeAmazon(query, 10, { newOnly }))
        }

        if (sites.includes('shopee-tw')) {
            promises.push(scrapeShopee(query, 'shopee-tw', 10))
        }

        if (sites.includes('shopee-my')) {
            promises.push(scrapeShopee(query, 'shopee-my', 10))
        }

        const results = await Promise.all(promises)
        const allProducts = results.flat()

        // 結果を保存
        saveProducts(allProducts)

        console.log(`\n========================================`)
        console.log(`検索完了: 合計${allProducts.length}件の商品を取得`)
        console.log(`========================================\n`)

        res.json({ products: allProducts })
    } catch (error) {
        console.error('検索エラー:', error)
        res.status(500).json({ error: '検索中にエラーが発生しました' })
    }
})

// API: 保存済み商品を取得
app.get('/api/products', (req, res) => {
    const products = loadProducts()
    res.json({ products })
})

// API: 商品を更新
app.put('/api/products/:id', (req, res) => {
    const { id } = req.params
    const updatedProduct = req.body

    let products = loadProducts()
    const index = products.findIndex(p => p.id === id)

    if (index === -1) {
        return res.status(404).json({ error: '商品が見つかりません' })
    }

    products[index] = { ...products[index], ...updatedProduct }
    saveProducts(products)

    res.json({ product: products[index] })
})

// API: 商品を削除
app.delete('/api/products/:id', (req, res) => {
    const { id } = req.params

    let products = loadProducts()
    const newProducts = products.filter(p => p.id !== id)

    if (products.length === newProducts.length) {
        return res.status(404).json({ error: '商品が見つかりません' })
    }

    saveProducts(newProducts)
    res.json({ success: true })
})

// ================================
// スケジューラーAPI
// ================================

// API: スケジューラー開始
app.post('/api/scheduler/start', (req, res) => {
    const { productList } = req.body

    if (!productList || !Array.isArray(productList) || productList.length === 0) {
        return res.status(400).json({ error: '商品リストが必要です' })
    }

    const success = startScheduler(productList)

    if (success) {
        res.json({
            success: true,
            message: 'スクレイピングを開始しました',
            status: getSchedulerStatus()
        })
    } else {
        res.status(400).json({ error: '開始に失敗しました（既に実行中か商品リストが空です）' })
    }
})

// API: スケジューラー停止
app.post('/api/scheduler/stop', (req, res) => {
    const success = stopScheduler()
    res.json({
        success,
        message: success ? 'スクレイピングを停止しました' : '停止に失敗しました',
        status: getSchedulerStatus()
    })
})

// API: スケジューラー状態取得
app.get('/api/scheduler/status', (req, res) => {
    res.json(getSchedulerStatus())
})

// API: 結果取得
app.get('/api/scheduler/results', (req, res) => {
    res.json({ results: getResults() })
})

// API: CSVエクスポート
app.get('/api/scheduler/export', (req, res) => {
    const csv = exportResultsAsCSV()

    if (!csv) {
        return res.status(404).json({ error: 'エクスポートするデータがありません' })
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename=scraping-results.csv')
    // UTF-8 BOMを追加（Excelで開くため）
    res.send('\uFEFF' + csv)
})

// API: 結果クリア
app.post('/api/scheduler/clear', (req, res) => {
    clearResults()
    res.json({ success: true, message: '結果をクリアしました' })
})

// サーバー起動
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🎭 フィギュア価格比較スクレイピングサーバー              ║
║                                                            ║
║   サーバー起動: http://localhost:${PORT}                    ║
║                                                            ║
║   API エンドポイント:                                      ║
║   - POST /api/search              商品検索                 ║
║   - GET  /api/products            保存済み商品取得         ║
║   - PUT  /api/products/:id        商品更新                 ║
║   - DELETE /api/products/:id      商品削除                 ║
║                                                            ║
║   スケジューラーAPI:                                       ║
║   - POST /api/scheduler/start     スクレイピング開始       ║
║   - POST /api/scheduler/stop      スクレイピング停止       ║
║   - GET  /api/scheduler/status    進捗状況取得             ║
║   - GET  /api/scheduler/results   結果取得                 ║
║   - GET  /api/scheduler/export    CSVエクスポート          ║
║   - POST /api/scheduler/clear     結果クリア               ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `)
})
