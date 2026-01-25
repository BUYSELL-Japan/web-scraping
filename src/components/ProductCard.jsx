function ProductCard({ product, onEdit, onDelete }) {
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
            'shopee-tw': 'Shopee 台湾',
            'shopee-my': 'Shopee マレーシア'
        }
        return labels[source] || source
    }

    const getSourceClass = (source) => {
        if (source.startsWith('shopee')) return 'shopee'
        return source
    }

    // URLを短縮表示用に整形
    const formatUrl = (url) => {
        if (!url) return ''
        try {
            const urlObj = new URL(url)
            const path = urlObj.pathname.length > 30
                ? urlObj.pathname.substring(0, 30) + '...'
                : urlObj.pathname
            return urlObj.hostname + path
        } catch {
            return url.length > 50 ? url.substring(0, 50) + '...' : url
        }
    }

    return (
        <div className="product-card">
            <div className="product-image-container">
                <img
                    src={product.imageUrl || 'https://via.placeholder.com/300x300?text=No+Image'}
                    alt={product.title}
                    className="product-image"
                    onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/300x300?text=No+Image'
                    }}
                />
                <span className={`product-source ${getSourceClass(product.source)}`}>
                    {getSourceLabel(product.source)}
                </span>
            </div>

            <div className="product-info">
                <h3 className="product-title">{product.title}</h3>
                {product.description && (
                    <p className="product-description">{product.description}</p>
                )}
                <div className="product-price">
                    {formatPrice(product.price, product.currency)}
                </div>

                {/* 検索元情報 */}
                <div className="product-source-info">
                    <span className="source-label">検索元:</span>
                    <span className={`source-name ${getSourceClass(product.source)}`}>
                        {getSourceLabel(product.source)}
                    </span>
                </div>

                {/* URL表示 */}
                {product.url && (
                    <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="product-url"
                        title={product.url}
                    >
                        🔗 {formatUrl(product.url)}
                    </a>
                )}

                <div className="product-actions">
                    <button
                        className="btn btn-secondary"
                        onClick={() => onEdit(product)}
                        style={{ flex: 1 }}
                    >
                        ✏️ 編集
                    </button>
                    <button
                        className="btn-icon danger"
                        onClick={() => onDelete(product.id)}
                        title="削除"
                    >
                        🗑️
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ProductCard
