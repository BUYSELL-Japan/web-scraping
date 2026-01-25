import { useMemo } from 'react'

/**
 * 商品名から類似度を計算するためのキーワードを抽出
 */
function extractKeywords(title) {
    // 不要な文字を除去
    const cleaned = title
        .replace(/【.*?】/g, '')
        .replace(/\[.*?\]/g, '')
        .replace(/（.*?）/g, '')
        .replace(/\(.*?\)/g, '')
        .replace(/[★☆●◆■□▲△▼▽◇]/g, '')
        .replace(/送料無料|新品|中古|未開封|美品|訳あり/g, '')
        .trim()

    // 単語に分割
    return cleaned.toLowerCase().split(/[\s\u3000]+/).filter(w => w.length > 1)
}

/**
 * 2つの商品名の類似度を計算（0-1）
 */
function calculateSimilarity(title1, title2) {
    const keywords1 = extractKeywords(title1)
    const keywords2 = extractKeywords(title2)

    if (keywords1.length === 0 || keywords2.length === 0) return 0

    const set1 = new Set(keywords1)
    const set2 = new Set(keywords2)

    // Jaccard類似度
    const intersection = [...set1].filter(x => set2.has(x)).length
    const union = new Set([...set1, ...set2]).size

    return intersection / union
}

/**
 * 商品をグループ化
 */
function groupProducts(products, threshold = 0.3) {
    const groups = []
    const assigned = new Set()

    products.forEach((product, i) => {
        if (assigned.has(i)) return

        const group = {
            name: product.title,
            products: [product]
        }
        assigned.add(i)

        // 類似商品を探す
        products.forEach((other, j) => {
            if (i === j || assigned.has(j)) return

            const similarity = calculateSimilarity(product.title, other.title)
            if (similarity >= threshold) {
                group.products.push(other)
                assigned.add(j)
            }
        })

        groups.push(group)
    })

    return groups
}

/**
 * グループの統計を計算
 */
function calculateGroupStats(products) {
    const prices = products.map(p => p.price).filter(p => p > 0)
    if (prices.length === 0) return null

    const sorted = [...prices].sort((a, b) => a - b)

    return {
        average: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
        min: Math.min(...sorted),
        max: Math.max(...sorted),
        count: products.length,
        sources: [...new Set(products.map(p => p.source))]
    }
}

function PriceStats({ products }) {
    const stats = useMemo(() => {
        if (products.length === 0) return null

        // 商品をグループ化
        const groups = groupProducts(products)

        // グループごとの統計を計算
        const groupStats = groups.map(group => ({
            name: group.name.length > 50 ? group.name.substring(0, 50) + '...' : group.name,
            stats: calculateGroupStats(group.products),
            products: group.products
        })).filter(g => g.stats && g.stats.count > 0)

        // 全体の統計も計算
        const allPrices = products.map(p => p.price).filter(p => p > 0)
        const overallStats = allPrices.length > 0 ? {
            average: Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length),
            min: Math.min(...allPrices),
            max: Math.max(...allPrices),
            totalCount: products.length,
            groupCount: groupStats.length
        } : null

        return {
            overall: overallStats,
            groups: groupStats.sort((a, b) => b.stats.count - a.stats.count) // 件数順
        }
    }, [products])

    if (!stats || !stats.overall) return null

    const formatPrice = (price, currency = 'JPY') => {
        const currencyMap = {
            'JPY': { locale: 'ja-JP', currency: 'JPY' },
            'TWD': { locale: 'zh-TW', currency: 'TWD' },
            'MYR': { locale: 'ms-MY', currency: 'MYR' }
        }
        const config = currencyMap[currency] || currencyMap['JPY']
        return new Intl.NumberFormat(config.locale, {
            style: 'currency',
            currency: config.currency
        }).format(price)
    }

    const getSourceLabel = (source) => {
        const labels = {
            'mercari': 'メルカリ',
            'amazon': 'Amazon',
            'shopee-tw': 'Shopee台湾',
            'shopee-my': 'Shopeeマレーシア'
        }
        return labels[source] || source
    }

    const getSourceClass = (source) => {
        if (source.startsWith('shopee')) return 'shopee'
        return source
    }

    return (
        <div className="price-stats-container">
            {/* 全体の統計 */}
            <div className="price-stats">
                <div className="stat-card">
                    <div className="stat-label">全体の相場価格</div>
                    <div className="stat-value">{formatPrice(stats.overall.average)}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">全体の最安値</div>
                    <div className="stat-value success">{formatPrice(stats.overall.min)}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">全体の最高値</div>
                    <div className="stat-value warning">{formatPrice(stats.overall.max)}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">取得件数</div>
                    <div className="stat-value">{stats.overall.totalCount}件</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        ({stats.overall.groupCount}グループ)
                    </div>
                </div>
            </div>

            {/* 商品グループごとの統計 */}
            {stats.groups.length > 1 && (
                <div className="product-groups">
                    <h3 className="groups-title">📊 商品グループ別の相場価格</h3>
                    <div className="groups-list">
                        {stats.groups.slice(0, 5).map((group, index) => (
                            <div key={index} className="group-card">
                                <div className="group-name">{group.name}</div>
                                <div className="group-stats">
                                    <div className="group-stat">
                                        <span className="group-stat-label">相場</span>
                                        <span className="group-stat-value">{formatPrice(group.stats.average)}</span>
                                    </div>
                                    <div className="group-stat">
                                        <span className="group-stat-label">最安</span>
                                        <span className="group-stat-value success">{formatPrice(group.stats.min)}</span>
                                    </div>
                                    <div className="group-stat">
                                        <span className="group-stat-label">最高</span>
                                        <span className="group-stat-value warning">{formatPrice(group.stats.max)}</span>
                                    </div>
                                </div>
                                <div className="group-sources">
                                    {group.stats.sources.map(source => (
                                        <span key={source} className={`group-source ${getSourceClass(source)}`}>
                                            {getSourceLabel(source)}
                                        </span>
                                    ))}
                                    <span className="group-count">{group.stats.count}件</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default PriceStats
