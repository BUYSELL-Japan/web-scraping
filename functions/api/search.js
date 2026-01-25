/**
 * D1データベースエンドポイント - 商品検索（修正版）
 * @typedef {Object} Env
 * @property {D1Database} DB - D1データベースバインディング
 */

/**
 * 商品をキーワードで検索
 * @param {import("@cloudflare/workers-types").PagesEventContext<Env>} context
 */
export const onRequestPost = async (context) => {
    const { env, request } = context;

    try {
        const body = await request.json();
        const { query, sites, newOnly } = body;

        if (!query) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Query is required'
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // D1データベースから商品を検索
        let sql = "SELECT * FROM products WHERE item_name LIKE ?";
        const params = [`%${query}%`];

        // item_statusが正常なもののみ（物理名は item_status でした）
        sql += " AND (item_status = 'NORMAL' OR item_status IS NULL)";

        sql += " ORDER BY updated_at DESC LIMIT 50";

        const stmt = env.DB.prepare(sql);
        const results = await stmt.bind(...params).all();

        // フロントエンド (App.jsx) が期待する形式にデータを変換（マッピング）
        const mappedProducts = results.results.map(p => {
            // ShopeeのURL生成ロジック（物理名は source_url または item_id/shop_id から生成）
            let url = p.source_url || '';
            if (!url && p.shop_id && p.item_id) {
                url = `https://shopee.tw/product/${p.shop_id}/${p.item_id}`;
            }

            return {
                id: p.item_id || p.id.toString(),
                title: p.item_name || '',
                price: p.current_price || 0,
                imageUrl: p.image_url || '',
                url: url,
                source: 'shopee-tw', // ソースカラムがないため固定
                currency: p.currency || 'TWD',
                updated_at: p.updated_at
            };
        });

        // サイトフィルタリングをJS側で行う（sourceカラムがない場合でもエラーにならないように）
        let filteredProducts = mappedProducts;
        if (sites && Array.isArray(sites) && sites.length > 0) {
            // sourceカラムがある場合はフィルタリング、ない場合はそのまま返す
            // ただし、Amazonが選択されていてもこのD1にはShopeeしかないので結果的にShopeeのみが返る
            if (mappedProducts.length > 0 && mappedProducts[0].source) {
                filteredProducts = mappedProducts.filter(p => sites.includes(p.source));
            }
        }

        return new Response(JSON.stringify({
            success: true,
            products: filteredProducts
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
};

/**
 * CORS Preflight
 */
export const onRequestOptions = async () => {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
};
