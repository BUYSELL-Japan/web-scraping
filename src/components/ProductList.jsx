import { useState, useMemo } from 'react'
import ProductCard from './ProductCard'

function ProductList({ products, loading, error, onEdit, onDelete }) {
    const [sortBy, setSortBy] = useState('price-asc')
    const [filterSite, setFilterSite] = useState('all')

    const filteredAndSortedProducts = useMemo(() => {
        let result = [...products]

        // Filter by site
        if (filterSite !== 'all') {
            result = result.filter(p => p.source === filterSite)
        }

        // Sort
        switch (sortBy) {
            case 'price-asc':
                result.sort((a, b) => a.price - b.price)
                break
            case 'price-desc':
                result.sort((a, b) => b.price - a.price)
                break
            case 'name':
                result.sort((a, b) => a.title.localeCompare(b.title))
                break
            default:
                break
        }

        return result
    }, [products, sortBy, filterSite])

    // 利用可能なソースを取得
    const availableSources = useMemo(() => {
        const sources = new Set(products.map(p => p.source))
        return Array.from(sources)
    }, [products])

    const getSourceLabel = (source) => {
        const labels = {
            'mercari': 'メルカリ',
            'amazon': 'Amazon',
            'shopee-tw': 'Shopee 台湾',
            'shopee-my': 'Shopee マレーシア'
        }
        return labels[source] || source
    }

    if (loading) {
        return (
            <div className="loading">
                <div className="loading-spinner"></div>
                <p>商品を検索中...</p>
                <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                    高度ステルスモードで検索中...少々お時間をいただきます
                </p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">⚠️</div>
                <h3>エラーが発生しました</h3>
                <p>{error}</p>
            </div>
        )
    }

    if (products.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <h3>商品を検索してください</h3>
                <p>フィギュア名を入力して検索ボタンを押してください</p>
            </div>
        )
    }

    return (
        <div>
            <div className="filter-bar">
                <select
                    className="filter-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                >
                    <option value="price-asc">価格が安い順</option>
                    <option value="price-desc">価格が高い順</option>
                    <option value="name">名前順</option>
                </select>

                <select
                    className="filter-select"
                    value={filterSite}
                    onChange={(e) => setFilterSite(e.target.value)}
                >
                    <option value="all">すべてのサイト</option>
                    {availableSources.map(source => (
                        <option key={source} value={source}>
                            {getSourceLabel(source)}のみ
                        </option>
                    ))}
                </select>

                <span className="product-count">
                    {filteredAndSortedProducts.length}件の商品
                </span>
            </div>

            <div className="product-grid">
                {filteredAndSortedProducts.map(product => (
                    <ProductCard
                        key={product.id}
                        product={product}
                        onEdit={onEdit}
                        onDelete={onDelete}
                    />
                ))}
            </div>
        </div>
    )
}

export default ProductList
