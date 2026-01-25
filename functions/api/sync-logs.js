/**
 * D1データベースエンドポイント - 同期ログ
 * @typedef {Object} Env
 * @property {D1Database} DB - D1データベースバインディング
 */

/**
 * 同期ログを取得
 * @param {import("@cloudflare/workers-types").PagesEventContext<Env>} context
 */
export const onRequestGet = async (context) => {
    const { env, request } = context;

    try {
        const url = new URL(request.url);
        const shopId = url.searchParams.get('shop_id');
        const syncType = url.searchParams.get('sync_type');
        const limit = parseInt(url.searchParams.get('limit') || '50');

        let query = "SELECT * FROM sync_logs WHERE 1=1";
        const params = [];

        if (shopId) {
            query += " AND shop_id = ?";
            params.push(shopId);
        }

        if (syncType) {
            query += " AND sync_type = ?";
            params.push(syncType);
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
 * 同期ログを追加
 * @param {import("@cloudflare/workers-types").PagesEventContext<Env>} context
 */
export const onRequestPost = async (context) => {
    const { env, request } = context;

    try {
        const body = await request.json();
        const { shop_id, sync_type, status, items_synced, error_message } = body;

        const stmt = env.DB.prepare(`
            INSERT INTO sync_logs (shop_id, sync_type, status, items_synced, error_message, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
        `);

        const result = await stmt.bind(
            shop_id,
            sync_type,
            status,
            items_synced || 0,
            error_message || null
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
