/**
 * D1データベースエンドポイント - 価格ルール
 * @typedef {Object} Env
 * @property {D1Database} DB - D1データベースバインディング
 */

/**
 * 価格ルールを取得
 * @param {import("@cloudflare/workers-types").PagesEventContext<Env>} context
 */
export const onRequestGet = async (context) => {
    const { env, request } = context;

    try {
        const url = new URL(request.url);
        const shopId = url.searchParams.get('shop_id');
        const isActive = url.searchParams.get('is_active');

        let query = "SELECT * FROM price_rules WHERE 1=1";
        const params = [];

        if (shopId) {
            query += " AND shop_id = ?";
            params.push(shopId);
        }

        if (isActive !== null && isActive !== undefined) {
            query += " AND is_active = ?";
            params.push(isActive === 'true' ? 1 : 0);
        }

        query += " ORDER BY priority DESC, created_at DESC";

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
 * 価格ルールを追加
 * @param {import("@cloudflare/workers-types").PagesEventContext<Env>} context
 */
export const onRequestPost = async (context) => {
    const { env, request } = context;

    try {
        const body = await request.json();
        const {
            shop_id,
            rule_name,
            rule_type,
            adjustment_type,
            adjustment_value,
            min_price,
            max_price,
            priority,
            is_active
        } = body;

        const stmt = env.DB.prepare(`
            INSERT INTO price_rules (
                shop_id, rule_name, rule_type, adjustment_type, adjustment_value, 
                min_price, max_price, priority, is_active, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `);

        const result = await stmt.bind(
            shop_id,
            rule_name,
            rule_type,
            adjustment_type,
            adjustment_value,
            min_price || null,
            max_price || null,
            priority || 0,
            is_active !== false ? 1 : 0
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
