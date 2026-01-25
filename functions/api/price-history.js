/**
 * D1データベースエンドポイント - 価格履歴
 * @typedef {Object} Env
 * @property {D1Database} DB - D1データベースバインディング
 */

/**
 * 価格履歴を取得
 * @param {import("@cloudflare/workers-types").PagesEventContext<Env>} context
 */
export const onRequestGet = async (context) => {
    const { env, request } = context;

    try {
        const url = new URL(request.url);
        const productId = url.searchParams.get('product_id');
        const limit = parseInt(url.searchParams.get('limit') || '50');

        let query = "SELECT * FROM price_history";
        const params = [];

        if (productId) {
            query += " WHERE product_id = ?";
            params.push(productId);
        }

        query += " ORDER BY created_at DESC LIMIT ?";
        params.push(limit);

        const stmt = env.DB.prepare(query);
        const results = await stmt.bind(...params).all();

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
 * 価格履歴を追加
 * @param {import("@cloudflare/workers-types").PagesEventContext<Env>} context
 */
export const onRequestPost = async (context) => {
    const { env, request } = context;

    try {
        const body = await request.json();
        const { product_id, old_price, new_price, change_type, reason } = body;

        const stmt = env.DB.prepare(`
            INSERT INTO price_history (product_id, old_price, new_price, change_type, reason, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
        `);

        const result = await stmt.bind(
            product_id,
            old_price,
            new_price,
            change_type || 'manual',
            reason || ''
        ).run();

        return new Response(JSON.stringify({
            success: true,
            data: { id: result.meta.last_row_id }
        }), {
            status: 201,
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
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
};
