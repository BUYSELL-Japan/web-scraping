/**
 * 外部ツール連携用 - D1商品更新エンドポイント
 * @typedef {Object} Env
 * @property {D1Database} DB - D1データベースバインディング
 * @property {string} EXTERNAL_API_KEY - 認証用APIキー（環境変数）
 */

/**
 * 商品情報を更新
 * @param {import("@cloudflare/workers-types").PagesEventContext<Env>} context
 */
export const onRequestPost = async (context) => {
    const { env, request } = context;

    // 認証チェック
    const apiKey = request.headers.get('X-API-KEY');
    if (!apiKey || apiKey !== env.EXTERNAL_API_KEY) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Unauthorized'
        }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await request.json();
        const { item_id, price, stock } = body;

        if (!item_id) {
            return new Response(JSON.stringify({
                success: false,
                error: 'item_id is required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 商品が存在するか確認しつつ更新
        // 文脈から、実際のカラム名が price ではない可能性があるため
        // まずは一般的な名称を試みますが、エラーハンドリングを強化します
        const stmt = env.DB.prepare(`
            UPDATE products 
            SET current_price = ?, stock = ?, updated_at = datetime('now')
            WHERE item_id = ?
        `);

        const result = await stmt.bind(price, stock, item_id).run();

        if (result.meta.changes === 0) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Product not found'
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            message: 'Product updated successfully'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        let columns = [];
        try {
            const schema = await env.DB.prepare("PRAGMA table_info(products)").all();
            columns = schema.results.map(c => c.name);
        } catch (sError) {
            columns = ["Could not retrieve schema"];
        }

        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            available_columns: columns
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
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
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-API-KEY'
        }
    });
};
