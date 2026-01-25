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
        const { shopee_item_id, price, stock } = body;

        if (!shopee_item_id) {
            return new Response(JSON.stringify({
                success: false,
                error: 'shopee_item_id is required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 商品が存在するか確認しつつ更新
        const stmt = env.DB.prepare(`
            UPDATE products 
            SET price = ?, stock = ?, updated_at = datetime('now')
            WHERE shopee_item_id = ?
        `);

        const result = await stmt.bind(price, stock, shopee_item_id).run();

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
        return new Response(JSON.stringify({
            success: false,
            error: error.message
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
