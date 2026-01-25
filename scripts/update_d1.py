import requests
import json

# 設定
API_URL = "https://web-scraping.pages.dev/api/external/update"  # 実際のデプロイURLが異なる場合は修正してください
API_KEY = "toa_secret_2026"  # Cloudflareで設定した環境変数と同じ値を入力

def update_product_price(item_id, price, stock):
    """
    Cloudflare D1の製品情報を更新する
    """
    payload = {
        "item_id": item_id,
        "price": price,
        "stock": stock
    }
    
    headers = {
        "Content-Type": "application/json",
        "X-API-KEY": API_KEY
    }
    
    try:
        response = requests.post(API_URL, data=json.dumps(payload), headers=headers)
        
        if response.status_code == 200:
            print(f"✅ Success: Updated Item {shopee_item_id}")
            return response.json()
        elif response.status_code == 401:
            print("❌ Error: Unauthorized - Check your API_KEY")
        elif response.status_code == 404:
            print(f"❌ Error: Product {shopee_item_id} not found in database")
        else:
            print(f"❌ Error {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"⚠️ Exception occurred: {str(e)}")
    
    return None

# 使用例
if __name__ == "__main__":
    # テスト用の更新データ
    # 実際にはスクレイピングしたデータをここで渡します
    test_item_id = "123456789"
    new_price = 1500
    new_stock = 10
    
    result = update_product_price(test_item_id, new_price, new_stock)
    if result:
        print(result)
