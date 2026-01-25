import { useState, useEffect } from 'react'

function ScrapingPreview({ onUpdateComplete }) {
    const [previewData, setPreviewData] = useState([])
    const [loading, setLoading] = useState(false)
    const [updatingIds, setUpdatingIds] = useState(new Set())
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

    const handleConfirmOne = async (itemId) => {
        setUpdatingIds(prev => new Set(prev).add(itemId))
        try {
            const response = await fetch('/api/confirm-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item_id: itemId })
            })
            const result = await response.json()
            if (result.success) {
                setPreviewData(prev => prev.filter(item => item.item_id !== itemId))
                if (onUpdateComplete) onUpdateComplete()
            } else {
                throw new Error(result.error)
            }
        } catch (err) {
            alert('更新に失敗しました: ' + err.message)
        } finally {
            setUpdatingIds(prev => {
                const next = new Set(prev)
                next.delete(itemId)
                return next
            })
        }
    }

    const formatPrice = (price, currency = 'JPY') => {
        if (price === null || price === undefined) return '-'
        return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: currency }).format(price)
    }

    if (loading && previewData.length === 0) return <div className="loading">プレビュー読み込み中...</div>
    if (previewData.length === 0) return null

    return (
        <div className="preview-container" style={{ margin: '2rem 0', padding: '1.5rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🔍 最新Amazonスクレイピング結果
                </h2>
                <button onClick={fetchPreview} className="btn btn-secondary">🔄 リフレッシュ</button>
            </div>

            <div className="preview-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1.5rem'
            }}>
                {previewData.map(item => {
                    const diff = item.old_price ? item.new_price - item.old_price : 0;
                    const diffColor = diff > 0 ? '#ff4d4d' : diff < 0 ? '#4d79ff' : '#888';
                    const isUpdating = updatingIds.has(item.item_id);

                    return (
                        <div key={item.item_id} className="preview-card" style={{
                            backgroundColor: 'var(--card-bg)',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            border: '1px solid var(--border-color)',
                            display: 'flex',
                            flexDirection: 'column',
                            opacity: isUpdating ? 0.6 : 1,
                            transition: 'all 0.2s ease'
                        }}>
                            <div style={{ position: 'relative', paddingTop: '75%', backgroundColor: '#f0f0f0' }}>
                                <img
                                    src={item.image_url || 'https://via.placeholder.com/300x200?text=No+Image'}
                                    alt={item.new_name}
                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }}
                                />
                                <div style={{
                                    position: 'absolute',
                                    top: '8px',
                                    right: '8px',
                                    backgroundColor: 'rgba(0,0,0,0.7)',
                                    color: 'white',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem'
                                }}>
                                    {item.source.toUpperCase()}
                                </div>
                            </div>

                            <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', lineHeight: '1.4', height: '2.8rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                    {item.new_name}
                                </h3>

                                <div style={{ marginBottom: '1rem' }}>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                                        {formatPrice(item.new_price, 'JPY')}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#888', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span>前: {formatPrice(item.old_price, 'JPY')}</span>
                                        <span style={{ color: diffColor, fontWeight: 'bold' }}>
                                            {diff === 0 ? '±0' : (diff > 0 ? '▲' : '▼') + Math.abs(diff)}
                                        </span>
                                    </div>
                                </div>

                                {item.source_url && (
                                    <a href={item.source_url} target="_blank" rel="noopener noreferrer" style={{
                                        fontSize: '0.75rem',
                                        color: '#3498db',
                                        textDecoration: 'none',
                                        marginBottom: '1rem',
                                        display: 'block'
                                    }}>
                                        🔗 Amazonで見る
                                    </a>
                                )}

                                <div style={{ marginTop: 'auto' }}>
                                    <button
                                        onClick={() => handleConfirmOne(item.item_id)}
                                        className="btn btn-primary"
                                        disabled={isUpdating}
                                        style={{ width: '100%', padding: '0.5rem' }}
                                    >
                                        {isUpdating ? '保存中...' : 'この商品で決定（D1保存）'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    )
}

export default ScrapingPreview
