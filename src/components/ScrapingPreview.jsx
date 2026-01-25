import { useState, useEffect } from 'react'

function ScrapingPreview({ onUpdateComplete }) {
    const [previewData, setPreviewData] = useState([])
    const [loading, setLoading] = useState(false)
    const [updating, setUpdating] = useState(false)
    const [error, setError] = useState(null)

    const fetchPreview = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/external/preview')
            const result = await response.json()
            if (result.success) {
                setPreviewData(result.data)
            } else {
                throw new Error(result.error)
            }
        } catch (err) {
            setError('プレビューデータの取得に失敗しました')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPreview()
    }, [])

    const handleConfirm = async () => {
        if (!window.confirm(`${previewData.length}件の商品アップデートを本番D1に反映しますか？`)) return

        setUpdating(true)
        try {
            const response = await fetch('/api/confirm-update', { method: 'POST' })
            const result = await response.json()
            if (result.success) {
                alert('D1を更新しました！')
                setPreviewData([])
                if (onUpdateComplete) onUpdateComplete()
            } else {
                throw new Error(result.error)
            }
        } catch (err) {
            alert('更新に失敗しました: ' + err.message)
        } finally {
            setUpdating(false)
        }
    }

    const formatPrice = (price) => {
        if (price === null || price === undefined) return '-'
        return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'TWD' }).format(price)
    }

    if (loading && previewData.length === 0) return <div className="loading">プレビュー読み込み中...</div>
    if (previewData.length === 0) return null

    return (
        <div className="preview-container" style={{ margin: '2rem 0', padding: '1.5rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>📋 最新スクレイピング結果 (プレビュー)</h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={fetchPreview} className="btn btn-secondary" disabled={updating}>🔄 更新</button>
                    <button onClick={handleConfirm} className="btn btn-primary" disabled={updating}>
                        {updating ? '更新中...' : '✅ この内容でD1を更新する'}
                    </button>
                </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table className="preview-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border-color)' }}>
                            <th style={{ padding: '0.75rem' }}>商品名</th>
                            <th style={{ padding: '0.75rem' }}>現在の価格</th>
                            <th style={{ padding: '0.75rem' }}>新しい価格</th>
                            <th style={{ padding: '0.75rem' }}>差分</th>
                            <th style={{ padding: '0.75rem' }}>在庫</th>
                        </tr>
                    </thead>
                    <tbody>
                        {previewData.map(item => {
                            const diff = item.old_price ? item.new_price - item.old_price : 0;
                            const diffColor = diff > 0 ? '#ff4d4d' : diff < 0 ? '#4d79ff' : 'inherit';

                            return (
                                <tr key={item.item_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '0.75rem', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {item.new_name || item.old_name}
                                    </td>
                                    <td style={{ padding: '0.75rem' }}>{formatPrice(item.old_price)}</td>
                                    <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{formatPrice(item.new_price)}</td>
                                    <td style={{ padding: '0.75rem', color: diffColor }}>
                                        {diff === 0 ? '-' : (diff > 0 ? '▲' : '▼') + Math.abs(diff)}
                                    </td>
                                    <td style={{ padding: '0.75rem' }}>{item.new_stock}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default ScrapingPreview
