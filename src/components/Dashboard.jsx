import { useState, useEffect, useCallback } from 'react'

function Dashboard({ onClose }) {
    const [status, setStatus] = useState(null)
    const [results, setResults] = useState([])
    const [productInput, setProductInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    // 状態を定期的に取得
    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/scheduler/status')
            const data = await res.json()
            setStatus(data)
        } catch (err) {
            console.error('状態取得エラー:', err)
        }
    }, [])

    // 結果を取得
    const fetchResults = useCallback(async () => {
        try {
            const res = await fetch('/api/scheduler/results')
            const data = await res.json()
            setResults(data.results || [])
        } catch (err) {
            console.error('結果取得エラー:', err)
        }
    }, [])

    useEffect(() => {
        fetchStatus()
        fetchResults()

        // 実行中は3秒ごとに更新（より頻繁に進捗表示）
        const interval = setInterval(() => {
            fetchStatus()
            fetchResults()
        }, 3000)

        return () => clearInterval(interval)
    }, [fetchStatus, fetchResults])

    // スクレイピング開始
    const handleStart = async () => {
        const lines = productInput.split('\n').map(l => l.trim()).filter(l => l)

        if (lines.length === 0) {
            setError('商品名を入力してください（1行に1商品）')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const res = await fetch('/api/scheduler/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productList: lines })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || '開始に失敗しました')
            }

            setStatus(data.status)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // スクレイピング停止
    const handleStop = async () => {
        setLoading(true)

        try {
            const res = await fetch('/api/scheduler/stop', { method: 'POST' })
            const data = await res.json()
            setStatus(data.status)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // CSVエクスポート
    const handleExport = () => {
        window.open('/api/scheduler/export', '_blank')
    }

    // 結果クリア
    const handleClear = async () => {
        if (!confirm('結果をクリアしますか？')) return

        try {
            await fetch('/api/scheduler/clear', { method: 'POST' })
            fetchResults()
        } catch (err) {
            setError(err.message)
        }
    }

    const formatPrice = (price) => {
        return new Intl.NumberFormat('ja-JP', {
            style: 'currency',
            currency: 'JPY'
        }).format(price)
    }

    const formatTime = (ms) => {
        const hours = Math.floor(ms / 1000 / 60 / 60)
        const minutes = Math.floor((ms / 1000 / 60) % 60)
        return `${hours}時間${minutes}分`
    }

    const formatNextTime = (dateStr) => {
        if (!dateStr) return ''
        const date = new Date(dateStr)
        const now = new Date()
        const diff = date - now
        if (diff < 0) return '間もなく'
        const mins = Math.floor(diff / 1000 / 60)
        const secs = Math.floor((diff / 1000) % 60)
        return `${mins}分${secs}秒後`
    }

    return (
        <div className="dashboard-overlay">
            <div className="dashboard">
                <div className="dashboard-header">
                    <h2>📊 スケジュールスクレイピング</h2>
                    <button className="btn-icon" onClick={onClose}>✕</button>
                </div>

                <div className="dashboard-body">
                    {/* ステータス表示 */}
                    {status && (
                        <div className="status-panel">
                            <div className="status-grid">
                                <div className="status-item">
                                    <span className="status-label">状態</span>
                                    <span className={`status-value ${status.isRunning ? 'running' : 'stopped'}`}>
                                        {status.isRunning ? '🟢 実行中' : '⏹️ 停止'}
                                    </span>
                                </div>
                                <div className="status-item">
                                    <span className="status-label">進捗</span>
                                    <span className="status-value">
                                        {status.currentProductIndex} / {status.totalProducts} 商品
                                    </span>
                                </div>
                                <div className="status-item">
                                    <span className="status-label">本日の検索数</span>
                                    <span className="status-value">
                                        {status.totalSearchesToday} / {status.maxDailySearches}
                                    </span>
                                </div>
                                <div className="status-item">
                                    <span className="status-label">朝4時まで</span>
                                    <span className="status-value">
                                        {formatTime(status.timeUntilAutoStop)}
                                    </span>
                                </div>
                            </div>

                            {/* 現在検索中の商品 */}
                            {status.isRunning && status.currentProductName && (
                                <div className="current-product-info">
                                    🔍 検索中: <strong>{status.currentProductName}</strong>
                                    <span className="search-count-badge">
                                        ({status.currentSearchCount}/{status.searchesPerProduct}回目)
                                    </span>
                                </div>
                            )}

                            {status.isRunning && status.nextSearchTime && (
                                <div className="next-search-info">
                                    ⏰ 次の検索: {new Date(status.nextSearchTime).toLocaleTimeString('ja-JP')}
                                    <span className="time-remaining">({formatNextTime(status.nextSearchTime)})</span>
                                </div>
                            )}

                            {/* 進捗バー */}
                            {status.isRunning && status.totalProducts > 0 && (
                                <div className="progress-bar-container">
                                    <div
                                        className="progress-bar-fill"
                                        style={{ width: `${(status.currentProductIndex / status.totalProducts) * 100}%` }}
                                    />
                                    <span className="progress-bar-text">
                                        {Math.round((status.currentProductIndex / status.totalProducts) * 100)}%
                                    </span>
                                </div>
                            )}

                            {status.lastError && (
                                <div className="error-alert">
                                    ⚠️ {status.lastError}
                                </div>
                            )}

                            {status.isBlocked && (
                                <div className="block-alert">
                                    🚫 ブロック検知: {new Date(status.blockedUntil).toLocaleString('ja-JP')} まで停止
                                </div>
                            )}
                        </div>
                    )}

                    {/* コントロールパネル */}
                    <div className="control-panel">
                        {!status?.isRunning ? (
                            <>
                                <div className="product-input-section">
                                    <label className="form-label">商品リスト（1行に1商品）</label>
                                    <textarea
                                        className="form-input form-textarea product-textarea"
                                        value={productInput}
                                        onChange={(e) => setProductInput(e.target.value)}
                                        placeholder="初音ミク フィギュア&#10;鬼滅の刃 フィギュア&#10;呪術廻戦 フィギュア&#10;僕のヒーローアカデミア フィギュア"
                                        rows={6}
                                    />
                                    <div className="input-hint">
                                        {productInput.split('\n').filter(l => l.trim()).length} 商品
                                        （各商品を3回検索して平均価格を算出）
                                    </div>
                                </div>

                                <button
                                    className="btn btn-primary start-btn"
                                    onClick={handleStart}
                                    disabled={loading}
                                >
                                    {loading ? '処理中...' : '🚀 スクレイピング開始'}
                                </button>
                            </>
                        ) : (
                            <button
                                className="btn btn-danger stop-btn"
                                onClick={handleStop}
                                disabled={loading}
                            >
                                {loading ? '処理中...' : '⏹️ 停止'}
                            </button>
                        )}
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    {/* 結果テーブル */}
                    {results.length > 0 && (
                        <div className="results-section">
                            <div className="results-header">
                                <h3>📋 取得結果 ({results.length}件)</h3>
                                <div className="results-actions">
                                    <button className="btn btn-secondary" onClick={handleExport}>
                                        📥 CSVエクスポート
                                    </button>
                                    <button className="btn btn-secondary" onClick={handleClear}>
                                        🗑️ クリア
                                    </button>
                                </div>
                            </div>

                            <div className="results-table-container">
                                <table className="results-table">
                                    <thead>
                                        <tr>
                                            <th>商品名</th>
                                            <th>平均価格</th>
                                            <th>最安値</th>
                                            <th>最高値</th>
                                            <th>最安値リンク</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {results.map((result, index) => (
                                            <tr key={index}>
                                                <td className="product-name-cell">
                                                    {result.productName}
                                                </td>
                                                <td className="price-cell">
                                                    {formatPrice(result.averagePrice)}
                                                </td>
                                                <td className="price-cell success">
                                                    {formatPrice(result.minPrice)}
                                                </td>
                                                <td className="price-cell warning">
                                                    {formatPrice(result.maxPrice)}
                                                </td>
                                                <td>
                                                    {result.cheapestUrl ? (
                                                        <a
                                                            href={result.cheapestUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="cheapest-link"
                                                            title={result.cheapestTitle || '最安値商品'}
                                                        >
                                                            🛒 購入ページ
                                                        </a>
                                                    ) : (
                                                        <span className="no-link">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Dashboard
