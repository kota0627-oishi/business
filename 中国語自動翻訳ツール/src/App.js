import { useState, useEffect, useRef } from 'react';
import './App.css';

const translateText = async (text, from, to) => {
  const res = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`
  );
  const data = await res.json();
  if (data.responseStatus === 200) return data.responseData.translatedText;
  throw new Error('Translation failed');
};

export default function App() {
  const [incomingText, setIncomingText] = useState('');
  const [incomingTranslation, setIncomingTranslation] = useState('');
  const [incomingLoading, setIncomingLoading] = useState(false);

  const [replyText, setReplyText] = useState('');
  const [replyTranslation, setReplyTranslation] = useState('');
  const [backTranslation, setBackTranslation] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  const [autoMode, setAutoMode] = useState(true);

  const [contacts, setContacts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wt-contacts')) || [{ id: '1', name: '工場A' }]; }
    catch { return [{ id: '1', name: '工場A' }]; }
  });
  const [activeId, setActiveId] = useState('1');
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wt-messages')) || {}; }
    catch { return {}; }
  });
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [msgInput, setMsgInput] = useState('');
  const [apiCount, setApiCount] = useState(0);

  const debounceRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('wt-contacts', JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem('wt-messages', JSON.stringify(messages));
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!autoMode || !incomingText.trim()) {
      if (!incomingText.trim()) setIncomingTranslation('');
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(doTranslateIncoming, 600);
    return () => clearTimeout(debounceRef.current);
  }, [incomingText, autoMode]);

  const doTranslateIncoming = async () => {
    if (!incomingText.trim()) return;
    setIncomingLoading(true);
    try {
      const r = await translateText(incomingText, 'zh', 'ja');
      setIncomingTranslation(r);
      setApiCount(c => c + 1);
    } catch { setIncomingTranslation('翻訳に失敗しました'); }
    finally { setIncomingLoading(false); }
  };

  const pasteAndTranslate = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setIncomingText(text);
      setIncomingLoading(true);
      try {
        const r = await translateText(text, 'zh', 'ja');
        setIncomingTranslation(r);
        setApiCount(c => c + 1);
      } finally { setIncomingLoading(false); }
    } catch { alert('クリップボードへのアクセスが許可されていません'); }
  };

  const doTranslateReply = async () => {
    if (!replyText.trim()) return;
    setReplyLoading(true);
    try {
      const zh = await translateText(replyText, 'ja', 'zh');
      setReplyTranslation(zh);
      setApiCount(c => c + 1);
      const back = await translateText(zh, 'zh', 'ja');
      setBackTranslation(back);
      setApiCount(c => c + 1);
    } catch { setReplyTranslation('翻訳に失敗しました'); }
    finally { setReplyLoading(false); }
  };

  const addMsg = (type, original, translation) => {
    const msg = {
      id: Date.now().toString(),
      type,
      original,
      translation,
      time: new Date().toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => ({ ...prev, [activeId]: [...(prev[activeId] || []), msg] }));
  };

  const saveIncoming = () => {
    if (!incomingText || !incomingTranslation) return;
    addMsg('incoming', incomingText, incomingTranslation);
    setIncomingText(''); setIncomingTranslation('');
  };

  const copySaveReply = () => {
    if (!replyTranslation) return;
    navigator.clipboard.writeText(replyTranslation);
    addMsg('outgoing', replyText, replyTranslation);
    setReplyText(''); setReplyTranslation(''); setBackTranslation('');
  };

  const addContact = () => {
    if (!newContactName.trim()) return;
    const id = Date.now().toString();
    setContacts(prev => [...prev, { id, name: newContactName.trim() }]);
    setActiveId(id);
    setNewContactName(''); setShowAddContact(false);
  };

  const clearChat = () => {
    if (window.confirm('チャット履歴をクリアしますか？'))
      setMessages(prev => ({ ...prev, [activeId]: [] }));
  };

  const exportChat = () => {
    const msgs = messages[activeId] || [];
    const contact = contacts.find(c => c.id === activeId);
    const text = msgs.map(m => `[${m.time}] ${m.type === 'incoming' ? '受信' : '送信'}\n${m.original}\n→ ${m.translation}`).join('\n\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    a.download = `${contact?.name || 'chat'}_履歴.txt`;
    a.click();
  };

  const currentMsgs = messages[activeId] || [];
  const cost = (apiCount * 0.00004).toFixed(5);

  return (
    <div className="app">
      <header className="header">
        <div className="logo"><span className="logo-w">W</span> WeChat翻訳</div>
        <label className="manual-toggle">
          <input type="checkbox" checked={!autoMode} onChange={e => setAutoMode(!e.target.checked)} />
          <span className="toggle-track" />
          <span className="toggle-label">手動モード</span>
        </label>
      </header>

      <div className="body">
        {/* ── 左パネル ── */}
        <div className="left">

          {/* 受信翻訳 */}
          <div className="card">
            <div className="card-head">
              <span className="icon-badge orange">工</span>
              <div>
                <div className="card-title">中文 → 日本語</div>
                <div className="card-sub">手動で貼り付けて翻訳</div>
              </div>
              <div className="auto-switch">
                <span>手動</span>
                <label className="sm-toggle">
                  <input type="checkbox" checked={autoMode} onChange={e => setAutoMode(e.target.checked)} />
                  <span className="sm-track" />
                </label>
                <span>自動</span>
              </div>
            </div>

            <textarea
              className="textarea"
              placeholder="中国語のテキストをここに貼り付けてください..."
              value={incomingText}
              onChange={e => setIncomingText(e.target.value)}
            />

            <button className="paste-btn" onClick={pasteAndTranslate}>
              📋 クリップボードから貼り付けて翻訳
            </button>

            <div className="arrow">↓</div>

            <div className="result-box">
              {incomingLoading
                ? <span className="muted">翻訳中...</span>
                : incomingTranslation
                ? incomingTranslation
                : <span className="muted">もしここに中国語の内容を入力すれば、システムはそれを日本語に翻訳し、原文とともに右側のチャット履歴に保存されます。</span>}
            </div>

            {incomingTranslation && (
              <button className="save-incoming-btn" onClick={saveIncoming}>チャット履歴に保存</button>
            )}
          </div>

          {/* 返信作成 */}
          <div className="card">
            <div className="card-head">
              <span className="icon-badge teal">返</span>
              <div>
                <div className="card-title">返信作成</div>
                <div className="card-sub">日本語を入力して中国語に変換</div>
              </div>
              <span className="lang-badge">日本語 → 中文</span>
            </div>

            <textarea
              className="textarea"
              placeholder="日本語を入力..."
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) doTranslateReply(); }}
            />

            <div className="reply-actions">
              <button className="btn-green" onClick={doTranslateReply} disabled={replyLoading || !replyText.trim()}>
                翻訳 ⌘+Enter
              </button>
              <button className="btn-outline" onClick={copySaveReply} disabled={!replyTranslation}>
                📋 コピー＆保存
              </button>
            </div>

            <div className="arrow">↓</div>

            <div className="result-box">
              {replyLoading
                ? <span className="muted">翻訳中...</span>
                : replyTranslation
                ? replyTranslation
                : <span className="muted">翻訳結果がここに表示されます</span>}
            </div>

            {backTranslation && (
              <div className="back-trans">
                <div className="back-trans-label">🔄 逆翻訳（ニュアンス確認）</div>
                <div>{backTranslation}</div>
              </div>
            )}
          </div>
        </div>

        {/* ── 右パネル ── */}
        <div className="right">
          <div className="chat-title">チャット履歴</div>

          <div className="tabs">
            {contacts.map(c => (
              <button key={c.id} className={`tab ${c.id === activeId ? 'tab-active' : ''}`} onClick={() => setActiveId(c.id)}>
                {c.name} ↘
              </button>
            ))}
            {showAddContact ? (
              <div className="add-form">
                <input value={newContactName} onChange={e => setNewContactName(e.target.value)}
                  placeholder="名前" onKeyDown={e => e.key === 'Enter' && addContact()} autoFocus />
                <button onClick={addContact}>OK</button>
                <button onClick={() => setShowAddContact(false)}>✕</button>
              </div>
            ) : (
              <button className="tab-add" onClick={() => setShowAddContact(true)}>+ 追加</button>
            )}
          </div>

          <div className="chat-msgs">
            {currentMsgs.length === 0 ? (
              <div className="empty">メッセージがありません</div>
            ) : currentMsgs.map(msg => (
              <div key={msg.id} className={`msg-wrap ${msg.type}`}>
                <div className="msg-time">{msg.time}</div>
                {msg.type === 'incoming' ? (
                  <div className="bubble incoming-bubble">
                    <span className="bubble-icon orange">工</span>
                    <div>
                      <div className="bubble-original">{msg.original}</div>
                      <div className="bubble-trans">{msg.translation}</div>
                    </div>
                  </div>
                ) : (
                  <div className="bubble outgoing-bubble">
                    <div>
                      <div className="bubble-original">{msg.original}</div>
                      <div className="bubble-trans outgoing-trans">{msg.translation}</div>
                    </div>
                    <span className="bubble-icon blue">N</span>
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="chat-footer">
            <div className="msg-row">
              <input className="msg-input" placeholder="末尾にメッセージを追加..."
                value={msgInput} onChange={e => setMsgInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && msgInput.trim()) {
                    addMsg('note', msgInput, '');
                    setMsgInput('');
                  }
                }} />
              <button className="btn-green-sm" onClick={() => { if (msgInput.trim()) { addMsg('note', msgInput, ''); setMsgInput(''); } }}>追加</button>
            </div>
            <div className="chat-actions">
              <button className="action-btn" onClick={() => {}}>+ インポート</button>
              <button className="action-btn" onClick={exportChat}>+ エクスポート</button>
              <button className="action-btn danger" onClick={clearChat}>クリア</button>
            </div>
          </div>
        </div>
      </div>

      <footer className="footer">
        <span>今月: ${cost}</span>
        <span>API出力: {apiCount} 回</span>
        <span>累計: ${cost}</span>
        <button className="detail-btn">▼ 詳細</button>
      </footer>
    </div>
  );
}
