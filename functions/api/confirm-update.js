/**
 * プレビュー確定API
 */

export const onRequestPost = async (context) => {
    const { env } = context;

    try {
        // 1. ステージングから本番へ更新 (UPSERT)
        // 既存の商品は価格・在庫・更新日時を上書き
        // 新規商品は挿入
        await env.DB.prepare(`
            INSERT INTO products (item_id, item_name, current_price, stock, updated_at, created_at)
            SELECT item_id, item_name, current_price, stock, updated_at, datetime('now')
            FROM scraping_staging
            ON CONFLICT(item_id) DO UPDATE SET
                item_name = excluded.item_name,
                current_price = excluded.current_price,
                stock = excluded.stock,
                updated_at = excluded.updated_at
        `).run();

        // 2. ステージングをクリア
        await env.DB.prepare("DELETE FROM scraping_staging").run();

        return new Response(JSON.stringify({
            success: true,
            message: 'Successfully updated products and cleared staging'
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
