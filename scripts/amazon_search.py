import asyncio
import random
import json
import re
import requests
from playwright.async_api import async_playwright
from playwright_stealth import stealth_async

# --- 設定 ---
API_URL = "https://web-scraping.pages.dev/api/external/preview"
API_KEY = "toa_secret_2026"
HEADLESS = False  # ブラウザの動きを見る場合は False にする
MAX_RESULTS = 10
MAX_IMAGES = 5

async def random_sleep(min_s=2, max_s=5):
    """人間らしい待機時間を挿入"""
    await asyncio.sleep(random.uniform(min_s, max_s))

def clean_amazon_url(url):
    """アフィリエイトタグやトラッキングパラメータを除去"""
    if not url: return ""
    match = re.search(r'/(?:dp|gp/product)/([A-Z0-9]{10})', url)
    if match:
        return f"https://www.amazon.co.jp/dp/{match.group(1)}"
    return url

async def get_item_details(page, url):
    """商品詳細ページから高解像度画像を取得"""
    try:
        await page.goto(url, wait_until="domcontentloaded")
        await random_sleep(2, 3)
        
        images = []
        # メイン画像とサブ画像のコンテナを探す
        image_elements = await page.query_selector_all("#altImages ul li.imageThumbnail input")
        if not image_elements:
            # 代替セレクタ
            image_elements = await page.query_selector_all("#altImages ul li.item img")

        for img in image_elements:
            if len(images) >= MAX_IMAGES: break
            
            # サムネイルから高解像度版のURLを推測（AmazonのURL規則）
            src = await img.get_attribute("src")
            if src:
                # _AC_..._.jpg の部分を削除するとフルサイズになる場合が多い
                high_res = re.sub(r'\._AC_.*_\.', '.', src)
                if high_res not in images:
                    images.append(high_res)
        
        # メイン画像が取得できていない場合のフォールバック
        if not images:
            main_img = await page.get_attribute("#landingImage", "src")
            if main_img: images.append(main_img)

        return images[:MAX_IMAGES]
    except Exception as e:
        print(f"⚠️ 詳細ページ取得エラー ({url}): {e}")
        return []

async def search_amazon(query):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=HEADLESS)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        await stealth_async(page)

        print(f"🔍 Amazon.co.jp で「{query}」を検索中...")
        search_url = f"https://www.amazon.co.jp/s?k={query}&rh=p_n_condition-type%3A71084051" # 新品のみ
        await page.goto(search_url)
        await random_sleep(3, 5)

        # 商品リストを取得
        items = await page.query_selector_all('[data-component-type="s-search-result"]')
        results = []

        for i, item in enumerate(items[:MAX_RESULTS]):
            try:
                # 基本情報の取得
                title_el = await item.query_selector("h2 a span")
                title = await title_el.inner_text() if title_el else "Unknown"
                
                price_el = await item.query_selector(".a-price-whole")
                price_str = await price_el.inner_text() if price_el else "0"
                price = int(re.sub(r'[^\d]', '', price_str))

                link_el = await item.query_selector("h2 a")
                raw_url = await link_el.get_attribute("href") if link_el else ""
                full_url = f"https://www.amazon.co.jp{raw_url}" if raw_url.startswith("/") else raw_url
                clean_url = clean_amazon_url(full_url)
                
                asin_match = re.search(r'/dp/([A-Z0-9]{10})', clean_url)
                item_id = asin_match.group(1) if asin_match else f"AMZ-{i}"

                print(f"📦 [{i+1}/{MAX_RESULTS}] 詳細を取得中: {title[:30]}...")
                
                # 新しいタブで詳細ページを開いて画像を取得（元のページを汚さない）
                detail_page = await context.new_page()
                await stealth_async(detail_page)
                image_list = await get_item_details(detail_page, clean_url)
                await detail_page.close()

                results.append({
                    "item_id": item_id,
                    "item_name": title,
                    "price": price,
                    "stock": 10, # 仮の在庫
                    "image_url": image_list[0] if image_list else "",
                    "image_url_list": json.dumps(image_list),
                    "source_url": clean_url,
                    "source": "amazon"
                })

                await random_sleep(2, 4)

            except Exception as e:
                print(f"❌ 商品解析エラー: {e}")

        await browser.close()
        return results

def send_to_preview(data):
    headers = {
        "Content-Type": "application/json",
        "X-API-KEY": API_KEY
    }
    try:
        response = requests.post(API_URL, data=json.dumps(data), headers=headers)
        if response.status_code == 200:
            print(f"\n✅ {len(data)}件のデータをプレビューに送信しました！")
            print("管理画面の「プレビュー」ボタンから確認してください。")
        else:
            print(f"❌ 送信エラー ({response.status_code}): {response.text}")
    except Exception as e:
        print(f"⚠️ 通信エラー: {e}")

if __name__ == "__main__":
    import sys
    query = sys.argv[1] if len(sys.argv) > 1 else "フィギュア"
    
    async def main():
        scraped_data = await search_amazon(query)
        if scraped_data:
            send_to_preview(scraped_data)

    asyncio.run(main())
