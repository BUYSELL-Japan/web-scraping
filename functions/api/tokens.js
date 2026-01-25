/**
 * D1データベースエンドポイント - トークン管理
 * @typedef {Object} Env
 * @property {D1Database} DB - D1データベースバインディング
 */

/**
 * トークンを取得
 * @param {import("@cloudflare/workers-types").PagesEventContext<Env>} context
 */
export const onRequestGet = async (context) => {
    const { env, request } = context;

    try {
        const url = new URL(request.url);
        const shopId = url.searchParams.get('shop_id');

        if (!shopId) {
            return new Response(JSON.stringify({
                success: false,
                error: 'shop_id is required'
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        const stmt = env.DB.prepare(
            "SELECT * FROM tokens WHERE shop_id = ? ORDER BY updated_at DESC LIMIT 1"
        );
        const result = await stmt.bind(shopId).first();

        return new Response(JSON.stringify({
            success: true,
            data: result
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
 * トークンを追加または更新
 * @param {import("@cloudflare/workers-types").PagesEventContext<Env>} context
 */
export const onRequestPost = async (context) => {
    const { env, request } = context;

    try {
        const body = await request.json();
        const { shop_id, access_token, refresh_token, expires_at } = body;

        // UPSERTを使用して既存のトークンを更新または新規作成
        const stmt = env.DB.prepare(`
            INSERT INTO tokens (shop_id, access_token, refresh_token, expires_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
            ON CONFLICT(shop_id) DO UPDATE SET
                access_token = excluded.access_token,
                refresh_token = excluded.refresh_token,
                expires_at = excluded.expires_at,
                updated_at = datetime('now')
        `);

        await stmt.bind(
            shop_id,
            access_token,
            refresh_token,
            expires_at
        ).run();

        return new Response(JSON.stringify({
            success: true,
            message: 'Token saved successfully'
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
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
};
