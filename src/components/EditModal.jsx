import { useState } from 'react'

function EditModal({ product, onSave, onClose }) {
    const [formData, setFormData] = useState({
        title: product.title || '',
        description: product.description || '',
        price: product.price || 0,
        imageUrl: product.imageUrl || ''
    })

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: name === 'price' ? parseInt(value) || 0 : value
        }))
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        onSave({
            ...product,
            ...formData
        })
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>商品情報を編集</h2>
                    <button className="btn-icon" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">商品名</label>
                            <input
                                type="text"
                                name="title"
                                className="form-input"
                                value={formData.title}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">商品詳細</label>
                            <textarea
                                name="description"
                                className="form-input form-textarea"
                                value={formData.description}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">価格（円）</label>
                            <input
                                type="number"
                                name="price"
                                className="form-input"
                                value={formData.price}
                                onChange={handleChange}
                                min="0"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">画像URL</label>
                            <input
                                type="url"
                                name="imageUrl"
                                className="form-input"
                                value={formData.imageUrl}
                                onChange={handleChange}
                            />
                        </div>

                        {formData.imageUrl && (
                            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                                <img
                                    src={formData.imageUrl}
                                    alt="プレビュー"
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '150px',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-color)'
                                    }}
                                    onError={(e) => e.target.style.display = 'none'}
                                />
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            キャンセル
                        </button>
                        <button type="submit" className="btn btn-primary">
                            保存
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default EditModal
