import asyncio
import random
import json
import re
import requests
import sys
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

# --- 設定 ---
API_URL = "https://web-scraping.pages.dev/api/external/preview"
API_KEY = "toa_secret_2026"
HEADLESS = False  # ブラウザを見守る
MAX_IMAGES = 5

async def random_sleep(min_s=2, max_s=5):
    """人間らしい待機時間"""
    await asyncio.sleep(random.uniform(min_s, max_s))

def clean_amazon_url(url):
    """アフィリエイトタグ等を除去"""
    if not url: return ""
    match = re.search(r'/(?:dp|gp/product)/([A-Z0-9]{10})', url)
    if match:
        return f"https://www.amazon.co.jp/dp/{match.group(1)}"
    return url

async def scrape_amazon_detail(url):
    """商品詳細ページから全情報を取得"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=HEADLESS)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            locale="ja-JP",
            timezone_id="Asia/Tokyo"
        )
        page = await context.new_page()
        await Stealth().apply_stealth_async(page)

        try:
            print(f"📖 商品ページにアクセス中: {url}")
            await page.goto(url, wait_until="domcontentloaded", timeout=60000)
            await random_sleep(3, 5)

            # ボット検知チェック
            content = await page.content()
            if "申し訳ございません" in content or "Robot Check" in content:
                print("❌ ボット検知に捕まりました。ブラウザを維持しますので、手動で解決するか確認してください。")
                while True: await asyncio.sleep(60)

            # --- タイトルの取得 (マルチセレクタ) ---
            title = "Unknown"
            for sel in ["#productTitle", "h1#title", ".qa-title-text", "meta[name='title']"]:
                if sel.startswith("meta"):
                    el = await page.query_selector(sel)
                    if el: title = await el.get_attribute("content")
                else:
                    el = await page.query_selector(sel)
                    if el: title = await el.inner_text()
                
                if title and title.strip():
                    title = title.strip()
                    break

            # --- 価格の取得 (マルチセレクタ + テキスト検索) ---
            price = 0
            price_found = False
            for sel in [".a-price-whole", "#priceblock_ourprice", "#priceblock_dealprice", ".a-color-price", "span[data-a-color='price']"]:
                el = await page.query_selector(sel)
                if el:
                    price_text = await el.inner_text()
                    digits = re.sub(r'[^\d]', '', price_text)
                    if digits:
                        price = int(digits)
                        if price > 0:
                            price_found = True
                            break
            
            if not price_found:
                # テキストベースで強引に探す
                body_text = await page.inner_text("body")
                match = re.search(r'[￥¥]\s?([\d,]+)', body_text)
                if match:
                    price = int(match.group(1).replace(',', ''))
                    price_found = True

            # --- 画像の取得 (マルチセレクタ) ---
            images = []
            image_selectors = [
                "#altImages ul li.imageThumbnail input",
                "#altImages ul li.item img",
                "#imgTagWrapperId img",
                ".a-dynamic-image",
                "#landingImage"
            ]
            for selector in image_selectors:
                elements = await page.query_selector_all(selector)
                for el in elements:
                    src = await el.get_attribute("src") or await el.get_attribute("data-old-hires") or await el.get_attribute("data-a-dynamic-image")
                    if src and src.startswith('http'):
                        high_res = re.sub(r'\._AC_.*_\.', '.', src)
                        if high_res not in images:
                            images.append(high_res)
                if len(images) >= MAX_IMAGES: break

            # --- 在庫の取得 ---
            stock_text = ""
            availability_el = await page.query_selector("#availability")
            if availability_el:
                stock_text = await availability_el.inner_text()
            
            stock_num = 1
            if "在庫切れ" in stock_text or "現在お取り扱いしておりません" in stock_text:
                stock_num = 0
            elif "在庫あり" in stock_text:
                stock_num = 99
            elif match := re.search(r'残り(\d+)点', stock_text):
                stock_num = int(match.group(1))

            # ASIN抽出
            asin_match = re.search(r'/(?:dp|gp/product)/([A-Z0-9]{10})', url)
            item_id = asin_match.group(1) if asin_match else f"AMZ-{random.randint(1000,9999)}"

            result = {
                "item_id": item_id,
                "item_name": title,
                "price": price,
                "stock": stock_num,
                "image_url": images[0] if images else "",
                "image_url_list": json.dumps(images),
                "source_url": clean_amazon_url(url),
                "source": "amazon"
            }

            print(f"✅ 取得完了: {title[:30]}...")
            print(f"💰 価格: {price} / 📦 在庫: {stock_num}")

            await browser.close()
            return [result] # 配列形式で返す

        except Exception as e:
            print(f"❌ エラーが発生しました: {e}")
            print("🛑 調査のためブラウザを維持します。")
            while True: await asyncio.sleep(60)

def send_to_preview(data):
    headers = {
        "Content-Type": "application/json",
        "X-API-KEY": API_KEY
    }
    try:
        response = requests.post(API_URL, data=json.dumps(data), headers=headers)
        if response.status_code == 200:
            print(f"\n✅ プレビューに送信完了！管理画面で「プレビュー」を確認してください。")
        else:
            print(f"❌ 送信エラー: {response.text}")
    except Exception as e:
        print(f"⚠️ 通信エラー: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("使用法: python scripts/amazon_search.py [AmazonのURL]")
        sys.exit(1)
    
    target_url = sys.argv[1]
    
    async def main():
        scraped_data = await scrape_amazon_detail(target_url)
        if scraped_data:
            send_to_preview(scraped_data)

    asyncio.run(main())
