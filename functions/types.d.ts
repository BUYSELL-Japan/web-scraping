/**
 * Cloudflare Workers/Pages Functions 環境変数の型定義
 */

interface Env {
    /** D1 Database binding */
    DB: D1Database;
}

/**
 * D1 Products テーブル
 */
interface Product {
    id: number;
    shopee_item_id: string;
    shop_id: string;
    name: string;
    price: number;
    stock: number;
    status: 'active' | 'inactive' | 'deleted';
    image_url?: string;
    description?: string;
    category?: string;
    sku?: string;
    created_at: string;
    updated_at: string;
}

/**
 * D1 Price Rules テーブル
 */
interface PriceRule {
    id: number;
    shop_id: string;
    rule_name: string;
    rule_type: 'percentage' | 'fixed' | 'competitive';
    adjustment_type: 'increase' | 'decrease';
    adjustment_value: number;
    min_price?: number;
    max_price?: number;
    priority: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

/**
 * D1 Tokens テーブル
 */
interface Token {
    id: number;
    shop_id: string;
    access_token: string;
    refresh_token: string;
    expires_at: string;
    created_at: string;
    updated_at: string;
}

/**
 * D1 Price History テーブル
 */
interface PriceHistory {
    id: number;
    product_id: number;
    old_price: number;
    new_price: number;
    change_type: 'manual' | 'auto' | 'rule';
    reason?: string;
    created_at: string;
}

/**
 * D1 Sync Logs テーブル
 */
interface SyncLog {
    id: number;
    shop_id: string;
    sync_type: 'products' | 'orders' | 'prices' | 'full';
    status: 'success' | 'failed' | 'partial';
    items_synced: number;
    error_message?: string;
    created_at: string;
}

/**
 * API Response 型
 */
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    meta?: {
        total?: number;
        limit?: number;
        offset?: number;
    };
}

export type { Env, Product, PriceRule, Token, PriceHistory, SyncLog, ApiResponse };
