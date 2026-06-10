/**
 * プレビュー確定API
 */

export const onRequestPost = async (context) => {
    const { env } = context;

    try {
        const body = await request.clone().json().catch(() => ({}));
        const { shopee_item_id } = body;

        let query = `
            INSERT INTO products (shopee_item_id, item_name, current_price, stock, image_url, image_url_list, source_url, updated_at, created_at)
            SELECT shopee_item_id, item_name, current_price, stock, image_url, image_url_list, source_url, updated_at, datetime('now')
            FROM scraping_staging
        `;
        const params = [];

        if (shopee_item_id) {
            query += " WHERE shopee_item_id = ?";
            params.push(shopee_item_id);
        }

        query += `
            ON CONFLICT(shopee_item_id) DO UPDATE SET
                item_name = excluded.item_name,
                current_price = excluded.current_price,
                stock = excluded.stock,
                image_url = excluded.image_url,
                image_url_list = excluded.image_url_list,
                source_url = excluded.source_url,
                updated_at = excluded.updated_at
        `;

        // 1. ステージングから本番へ更新
        await env.DB.prepare(query).bind(...params).run();

        // 2. ステージングから削除
        if (shopee_item_id) {
            await env.DB.prepare("DELETE FROM scraping_staging WHERE shopee_item_id = ?").bind(shopee_item_id).run();
        } else {
            await env.DB.prepare("DELETE FROM scraping_staging").run();
        }

        return new Response(JSON.stringify({
            success: true,
            message: item_id ? `Successfully updated product ${item_id}` : 'Successfully updated all products'
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
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
};
