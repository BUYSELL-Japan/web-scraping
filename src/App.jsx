import { useState, useCallback } from 'react'
import SearchForm from './components/SearchForm'
import ProductList from './components/ProductList'
import PriceStats from './components/PriceStats'
import EditModal from './components/EditModal'
import Dashboard from './components/Dashboard'

function App() {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [editingProduct, setEditingProduct] = useState(null)
    const [toasts, setToasts] = useState([])
    const [showDashboard, setShowDashboard] = useState(false)

    const addToast = useCallback((message, type = 'success') => {
        const id = Date.now()
        setToasts(prev => [...prev, { id, message, type }])
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 3000)
    }, [])

    const handleSearch = async (query, sites, newOnly = false) => {
        if (!query.trim()) {
            addToast('検索キーワードを入力してください', 'warning')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, sites, newOnly })
            })

            if (!response.ok) {
                throw new Error('検索に失敗しました')
            }

            const data = await response.json()
            const newProducts = data.products || []

            // 既存の商品に新しい商品を追加（IDで重複を除外）
            setProducts(prevProducts => {
                const existingIds = new Set(prevProducts.map(p => p.id))
                const uniqueNewProducts = newProducts.filter(p => !existingIds.has(p.id))
                const combined = [...prevProducts, ...uniqueNewProducts]
                console.log(`[Search] 既存: ${prevProducts.length}, 新規: ${uniqueNewProducts.length}, 合計: ${combined.length}`)
                return combined
            })

            addToast(`${newProducts.length}件の商品が見つかりました`)
        } catch (err) {
            setError(err.message)
            addToast(err.message, 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleEdit = (product) => {
        setEditingProduct(product)
    }

    const handleSave = async (updatedProduct) => {
        try {
            const response = await fetch(`/api/products/${updatedProduct.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedProduct)
            })

            if (!response.ok) {
                throw new Error('更新に失敗しました')
            }

            setProducts(prev =>
                prev.map(p => p.id === updatedProduct.id ? updatedProduct : p)
            )
            setEditingProduct(null)
            addToast('商品情報を更新しました')
        } catch (err) {
            addToast(err.message, 'error')
        }
    }

    const handleDelete = async (productId) => {
        if (!confirm('この商品を削除しますか？')) return

        try {
            const response = await fetch(`/api/products/${productId}`, {
                method: 'DELETE'
            })

            if (!response.ok) {
                throw new Error('削除に失敗しました')
            }

            setProducts(prev => prev.filter(p => p.id !== productId))
            addToast('商品を削除しました')
        } catch (err) {
            addToast(err.message, 'error')
        }
    }

    return (
        <div className="app">
            <div className="app-container">
                <header className="header">
                    <h1>🎭 フィギュア価格比較ツール</h1>
                    <p>AmazonとShopeeの相場価格を一括検索</p>
                    <button
                        className="btn btn-secondary dashboard-btn"
                        onClick={() => setShowDashboard(true)}
                    >
                        📊 スケジュールスクレイピング
                    </button>
                </header>

                <SearchForm onSearch={handleSearch} loading={loading} />

                {products.length > 0 && (
                    <div className="results-control">
                        <PriceStats products={products} />
                        <button
                            className="btn btn-secondary clear-results-btn"
                            onClick={() => {
                                if (confirm('検索結果をすべてクリアしますか？')) {
                                    setProducts([])
                                    addToast('検索結果をクリアしました')
                                }
                            }}
                        >
                            🗑️ 結果をクリア ({products.length}件)
                        </button>
                    </div>
                )}

                <ProductList
                    products={products}
                    loading={loading}
                    error={error}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />

                {editingProduct && (
                    <EditModal
                        product={editingProduct}
                        onSave={handleSave}
                        onClose={() => setEditingProduct(null)}
                    />
                )}

                {showDashboard && (
                    <Dashboard onClose={() => setShowDashboard(false)} />
                )}

                <div className="toast-container">
                    {toasts.map(toast => (
                        <div key={toast.id} className={`toast ${toast.type}`}>
                            {toast.message}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default App
