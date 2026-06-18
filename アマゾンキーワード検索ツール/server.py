#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Amazon 検索順位チェック ローカルサーバー"""

from http.server import HTTPServer, BaseHTTPRequestHandler
from http.cookiejar import CookieJar
import urllib.request
import urllib.parse
import json
import re
import gzip
import time
import random
import sys

PORT = 8765

cookie_jar = CookieJar()
opener = urllib.request.build_opener(
    urllib.request.HTTPCookieProcessor(cookie_jar)
)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
}


class Handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)

        if parsed.path == '/ping':
            self._json({'ok': True})

        elif parsed.path == '/search':
            kw   = params.get('kw',   [''])[0]
            asin = params.get('asin', [''])[0]
            if not kw or not asin:
                self._json({'error': 'kw と asin が必要です'})
                return
            result = find_rank(kw, asin)
            self._json(result)

        else:
            self.send_response(404)
            self.end_headers()

    def _json(self, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')

    def log_message(self, fmt, *args):
        print(f'  {fmt % args}')


def fetch(url):
    req = urllib.request.Request(url)
    for k, v in HEADERS.items():
        req.add_header(k, v)
    with opener.open(req, timeout=20) as resp:
        data = resp.read()
        if resp.headers.get('Content-Encoding') == 'gzip':
            data = gzip.decompress(data)
        return data.decode('utf-8', errors='replace')


def extract_asins(html):
    asins = re.findall(r'data-asin="([A-Z0-9]{10})"', html)
    seen, result = set(), []
    for a in asins:
        if a and a not in seen:
            seen.add(a)
            result.append(a)
    return result


def find_rank(keyword, asin):
    print(f'\n検索: "{keyword}"  ASIN={asin}')

    for page in range(1, 6):
        url = 'https://www.amazon.co.jp/s?k=' + urllib.parse.quote(keyword, safe='')
        if page > 1:
            url += f'&page={page}'

        print(f'  {page}ページ目...')
        try:
            html = fetch(url)
        except Exception as e:
            return {'error': f'取得失敗: {e}'}

        if re.search(r'captcha|robot.check|unusual.traffic', html, re.IGNORECASE):
            print('  → ブロックされました')
            return {'error': 'captcha', 'message': 'Amazonにブロックされました。1〜2分待ってから再試行してください。'}

        asins = extract_asins(html)
        print(f'  → {len(asins)}件取得')

        if asin in asins:
            pos = asins.index(asin) + 1
            print(f'  → 発見！ {page}ページ目 {pos}番')
            return {'found': True, 'page': page, 'position': pos}

        has_next = bool(re.search(r'pagination-next|次のページ', html))
        if not has_next:
            break

        time.sleep(random.uniform(1.0, 2.0))

    print('  → 圏外（5ページ内に見つからず）')
    return {'found': False}


if __name__ == '__main__':
    print('=' * 45)
    print('  Amazon 検索順位チェック サーバー')
    print(f'  ポート: {PORT}')
    print('  このウィンドウは開いたままにしてください')
    print('  終了するには Ctrl+C を押してください')
    print('=' * 45)
    try:
        server = HTTPServer(('localhost', PORT), Handler)
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nサーバーを停止しました')
        sys.exit(0)
