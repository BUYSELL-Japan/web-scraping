/**
 * D1データベースエンドポイント - 商品一覧
 * @typedef {Object} Env
 * @property {D1Database} DB - D1データベースバインディング
 */

/**
 * 商品一覧を取得
 * @param {import("@cloudflare/workers-types").PagesEventContext<Env>} context
 */
export const onRequestGet = async (context) => {
    const { env, request } = context;

    try {
        const url = new URL(request.url);
        const shopId = url.searchParams.get('shop_id');
        const status = url.searchParams.get('status');
        const limit = parseInt(url.searchParams.get('limit') || '100');
        const offset = parseInt(url.searchParams.get('offset') || '0');

        let query = "SELECT * FROM products WHERE 1=1";
        const params = [];

        if (shopId) {
            query += " AND shop_id = ?";
            params.push(shopId);
        }

        if (status) {
            query += " AND status = ?";
            params.push(status);
        }

        query += " ORDER BY updated_at DESC LIMIT ? OFFSET ?";
        params.push(limit, offset);

        const stmt = env.DB.prepare(query);
        const results = await stmt.bind(...params).all();

        return new Response(JSON.stringify({
            success: true,
            data: results.results,
            meta: {
                total: results.results.length,
                limit,
                offset
            }
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
 * 新規商品を追加
 * @param {import("@cloudflare/workers-types").PagesEventContext<Env>} context
 */
export const onRequestPost = async (context) => {
    const { env, request } = context;

    try {
        const body = await request.json();
        const { shopee_item_id, shop_id, name, price, stock, status } = body;

        const stmt = env.DB.prepare(`
            INSERT INTO products (shopee_item_id, shop_id, name, price, stock, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `);

        const result = await stmt.bind(
            shopee_item_id,
            shop_id,
            name,
            price,
            stock || 0,
            status || 'active'
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
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
};
