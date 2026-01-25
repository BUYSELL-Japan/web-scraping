/**
 * デバッグ用 - D1テーブル構造確認エンドポイント
 */
export const onRequestGet = async (context) => {
    const { env, request } = context;

    // セキュリティのため、特定のクエリパラメータが必要なように設定
    const url = new URL(request.url);
    if (url.searchParams.get('debug_key') !== 'check_schema_2026') {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        // productsテーブルのカラム情報を取得
        const stmt = env.DB.prepare("PRAGMA table_info(products)");
        const result = await stmt.all();

        return new Response(JSON.stringify({
            success: true,
            columns: result.results
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
