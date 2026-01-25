/**
 * プレビュー用ステージングAPI
 */

export const onRequestPost = async (context) => {
    const { env, request } = context;

    // 認証チェック
    const apiKey = request.headers.get('X-API-KEY');
    if (!apiKey || apiKey !== env.EXTERNAL_API_KEY) {
        return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await request.json();
        // 単一オブジェクトまたは配列の両方に対応
        const items = Array.isArray(body) ? body : [body];

        for (const item of items) {
            const { item_id, price, stock, item_name, image_url, image_url_list, source_url, source } = item;

            // ステージングテーブルへ保存 (UPSERT)
            await env.DB.prepare(`
                INSERT INTO scraping_staging (item_id, item_name, current_price, stock, image_url, image_url_list, source_url, source, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                ON CONFLICT(item_id) DO UPDATE SET
                    item_name = excluded.item_name,
                    current_price = excluded.current_price,
                    stock = excluded.stock,
                    image_url = excluded.image_url,
                    image_url_list = excluded.image_url_list,
                    source_url = excluded.source_url,
                    source = excluded.source,
                    updated_at = datetime('now')
            `).bind(item_id, item_name || null, price, stock, image_url || null, image_url_list || null, source_url || null, source || 'amazon').run();
        }

        return new Response(JSON.stringify({ success: true, message: `${items.length} items staged` }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

export const onRequestGet = async (context) => {
    const { env } = context;

    try {
        // ステージングデータと、現在の本番データを結合して取得
        const results = await env.DB.prepare(`
            SELECT 
                s.item_id,
                s.item_name as new_name,
                s.current_price as new_price,
                s.stock as new_stock,
                s.image_url,
                s.image_url_list,
                s.source_url,
                s.source,
                p.item_name as old_name,
                p.current_price as old_price,
                p.stock as old_stock
            FROM scraping_staging s
            LEFT JOIN products p ON s.item_id = p.item_id
            ORDER BY s.updated_at DESC
        `).all();

        return new Response(JSON.stringify({
            success: true,
            data: results.results
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

export const onRequestOptions = async () => {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-API-KEY'
        }
    });
};
