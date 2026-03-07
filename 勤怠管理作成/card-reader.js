/**
 * PaSoRi カードリーダー WebSocketミドルウェア
 *
 * 事前準備:
 *   npm install
 *
 * 起動:
 *   node card-reader.js
 *
 * 必要なドライバ:
 *   - Sony NFC Port Library (https://www.sony.net/Products/felica/business/products/ICS-D004.html)
 *   - または PC/SC ドライバ (Windows標準 or libnfc)
 */

const { NFC } = require('nfc-pcsc');
const WebSocket = require('ws');

const PORT = 8765;

const wss = new WebSocket.Server({ port: PORT });
console.log(`[WebSocket] サーバー起動: ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
    console.log('[WebSocket] ブラウザ接続');
    ws.send(JSON.stringify({ type: 'status', message: 'connected' }));
    ws.on('close', () => console.log('[WebSocket] ブラウザ切断'));
});

function broadcast(data) {
    const msg = JSON.stringify(data);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    });
}

const nfc = new NFC();

nfc.on('reader', (reader) => {
    console.log(`[NFC] リーダー検出: ${reader.reader.name}`);
    broadcast({ type: 'reader', name: reader.reader.name });

    reader.on('card', (card) => {
        const uid = card.uid;
        console.log(`[NFC] カード検出: ${uid}`);
        broadcast({ type: 'card', uid });
    });

    reader.on('card.off', () => {
        console.log('[NFC] カード離れた');
        broadcast({ type: 'card.off' });
    });

    reader.on('error', (err) => {
        console.error('[NFC] リーダーエラー:', err.message);
    });
});

nfc.on('error', (err) => {
    console.error('[NFC] エラー:', err.message);
});

process.on('SIGINT', () => {
    console.log('\n終了します...');
    wss.close();
    process.exit();
});
