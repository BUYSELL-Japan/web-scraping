import { useState } from 'react'

function SearchForm({ onSearch, loading }) {
    const [query, setQuery] = useState('')
    const [sites, setSites] = useState({
        amazon: true,
        'shopee-tw': false,
        'shopee-my': false
    })
    const [newOnly, setNewOnly] = useState(true)

    const handleSubmit = (e) => {
        e.preventDefault()
        const selectedSites = Object.entries(sites)
            .filter(([_, enabled]) => enabled)
            .map(([site]) => site)
        onSearch(query, selectedSites, newOnly)
    }

    const toggleSite = (site) => {
        setSites(prev => ({
            ...prev,
            [site]: !prev[site]
        }))
    }

    const hasAnySiteSelected = Object.values(sites).some(v => v)

    return (
        <form className="search-form" onSubmit={handleSubmit}>
            <div className="search-input-group">
                <input
                    type="text"
                    className="search-input"
                    placeholder="フィギュア名を入力（例：初音ミク フィギュア）"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={loading}
                />
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading || !hasAnySiteSelected}
                >
                    {loading ? (
                        <>
                            <span className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></span>
                            検索中...
                        </>
                    ) : (
                        <>🔍 検索</>
                    )}
                </button>
            </div>

            <div className="search-options">
                <div className="site-selector">
                    <label
                        className={`site-checkbox amazon ${sites.amazon ? 'active' : ''}`}
                        onClick={() => toggleSite('amazon')}
                    >
                        <input
                            type="checkbox"
                            checked={sites.amazon}
                            onChange={() => { }}
                        />
                        <span className="site-icon amazon">A</span>
                        Amazon 日本
                    </label>

                    <label
                        className={`site-checkbox shopee ${sites['shopee-tw'] ? 'active' : ''}`}
                        onClick={() => toggleSite('shopee-tw')}
                    >
                        <input
                            type="checkbox"
                            checked={sites['shopee-tw']}
                            onChange={() => { }}
                        />
                        <span className="site-icon shopee">S</span>
                        Shopee 台湾
                    </label>

                    <label
                        className={`site-checkbox shopee ${sites['shopee-my'] ? 'active' : ''}`}
                        onClick={() => toggleSite('shopee-my')}
                    >
                        <input
                            type="checkbox"
                            checked={sites['shopee-my']}
                            onChange={() => { }}
                        />
                        <span className="site-icon shopee">S</span>
                        Shopee マレーシア
                    </label>
                </div>

                <div className="condition-filter">
                    <label
                        className={`condition-checkbox ${newOnly ? 'active' : ''}`}
                        onClick={() => setNewOnly(!newOnly)}
                    >
                        <input
                            type="checkbox"
                            checked={newOnly}
                            onChange={() => { }}
                        />
                        <span className="condition-icon">✨</span>
                        新品のみ
                    </label>
                </div>
            </div>
        </form>
    )
}

export default SearchForm
