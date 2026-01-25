import requests
import json

# 設定
API_URL = "https://web-scraping.pages.dev/api/external/preview"  # プレビュー用エンドポイント
API_KEY = "toa_secret_2026"

def send_to_preview(item_id, price, stock, item_name=None):
    """
    Cloudflareのプレビューエリアにスクレイピング結果を送信する
    """
    payload = {
        "item_id": item_id,
        "price": price,
        "stock": stock,
        "item_name": item_name
    }
    
    headers = {
        "Content-Type": "application/json",
        "X-API-KEY": API_KEY
    }
    
    try:
        response = requests.post(API_URL, data=json.dumps(payload), headers=headers)
        
        if response.status_code == 200:
            print(f"✅ Staged: {item_id} (Check your dashboard preview)")
            return response.json()
        elif response.status_code == 401:
            print("❌ Error: Unauthorized - Check your API_KEY")
        else:
            print(f"❌ Error {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"⚠️ Exception occurred: {str(e)}")
    
    return None

# 使用例
if __name__ == "__main__":
    # テスト用のスクレイピング結果
    test_item_id = "123456789"
    new_price = 1500
    new_stock = 10
    test_name = "テスト用フィギュア商品"
    
    result = send_to_preview(test_item_id, new_price, new_stock, test_name)
    if result:
        print(result)
