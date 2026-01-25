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
        // ユーザーのテーブル構造変更に合わせて、より汎用的なクエリを使用
        let sql = "SELECT * FROM products WHERE name LIKE ?";
        const params = [`%${query}%`];

        // statusがactiveのもののみ取得（カラムが存在する場合を想定）
        // ※ 存在しない場合はエラーになる可能性があるが、types.d.tsに基づき実装
        sql += " AND (status = 'active' OR status IS NULL)";

        sql += " ORDER BY updated_at DESC LIMIT 50";

        const stmt = env.DB.prepare(sql);
        const results = await stmt.bind(...params).all();

        // フロントエンド (App.jsx) が期待する形式にデータを変換（マッピング）
        const mappedProducts = results.results.map(p => {
            // ShopeeのURL生成ロジック（urlカラムがない場合のフォールバック）
            let url = p.url || '';
            if (!url && p.shop_id && p.shopee_item_id) {
                // shop_idから国を推測するのは難しいため、一旦台湾をデフォルトにするか
                // 実際には同期時にurlを保存するのが理想的
                url = `https://shopee.tw/product/${p.shop_id}/${p.shopee_item_id}`;
            }

            return {
                id: p.shopee_item_id || p.id.toString(),
                title: p.name || '',
                price: p.price || 0,
                imageUrl: p.image_url || '',
                url: url,
                source: p.source || 'shopee-tw', // D1は現状Shopeeのみを想定
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
