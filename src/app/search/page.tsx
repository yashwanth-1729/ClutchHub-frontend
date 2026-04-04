'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { userApi } from '@/lib/api';
import { Search, Send, ArrowLeft, MessageCircle } from 'lucide-react';

export default function SearchPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [tab,           setTab]           = useState<'search' | 'chats'>('search');
  const [query,         setQuery]         = useState('');
  const [results,       setResults]       = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedUser,  setSelectedUser]  = useState<any>(null);
  const [messages,      setMessages]      = useState<any[]>([]);
  const [newMsg,        setNewMsg]        = useState('');
  const [sending,       setSending]       = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/auth'); return; }
    userApi.conversations().then(r => setConversations(r.data?.data || [])).catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (query.trim().length >= 2) {
        userApi.search(query).then(r => setResults(r.data?.data || [])).catch(() => {});
      } else { setResults([]); }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const openChat = (u: any) => {
    setSelectedUser(u); setMessages([]);
    userApi.getMessages(u.id).then(r => setMessages(r.data?.data || [])).catch(() => {});
  };

  useEffect(() => {
    if (!selectedUser) return;
    const iv = setInterval(() => {
      userApi.getMessages(selectedUser.id).then(r => setMessages(r.data?.data || [])).catch(() => {});
    }, 4000);
    return () => clearInterval(iv);
  }, [selectedUser]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMsg = async () => {
    if (!newMsg.trim() || !selectedUser || sending) return;
    setSending(true);
    try {
      await userApi.sendMessage(selectedUser.id, newMsg.trim());
      setMessages(m => [...m, { content: newMsg.trim(), senderId: user?.id, createdAt: new Date().toISOString() }]);
      setNewMsg('');
    } catch {} finally { setSending(false); }
  };

  if (!isAuthenticated) return null;

  /* ── Chat view ── */
  if (selectedUser) return (
    <div className="page-wrapper" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--nav-h) - 2rem)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <button className="btn btn-ghost btn-icon" onClick={() => setSelectedUser(null)}><ArrowLeft size={18} /></button>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--red-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--red)', fontSize: '0.875rem' }}>
          {selectedUser.displayName?.slice(0,2).toUpperCase() || 'U'}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selectedUser.displayName || selectedUser.username}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>@{selectedUser.username}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem 0', minHeight: 0 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '0.825rem', padding: '2rem' }}>Start the conversation</div>
        )}
        {messages.map((m: any, i) => {
          const mine = m.senderId === user?.id;
          return (
            <div key={i} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '72%', padding: '0.6rem 0.875rem', borderRadius: 10, background: mine ? 'var(--red)' : 'var(--surface-hi)', fontSize: '0.875rem', lineHeight: 1.5, color: mine ? '#fff' : 'var(--text)' }}>
                {m.content}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
        <input className="input" placeholder="Message…" value={newMsg} onChange={e => setNewMsg(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
          style={{ flex: 1 }} />
        <button className="btn btn-primary btn-icon" onClick={sendMsg} disabled={sending || !newMsg.trim()}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );

  /* ── Main view ── */
  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-title">Comms</h1>
        <p className="page-sub">Search players · Direct messages</p>
      </div>

      <div className="tab-bar" style={{ marginBottom: '1.25rem' }}>
        <button className={`tab${tab === 'search' ? ' active' : ''}`} onClick={() => setTab('search')}>Find Players</button>
        <button className={`tab${tab === 'chats' ? ' active' : ''}`} onClick={() => setTab('chats')}>Messages</button>
      </div>

      {tab === 'search' && (
        <>
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
            <input className="input" style={{ paddingLeft: '2.5rem' }} placeholder="Search by username…" value={query} onChange={e => setQuery(e.target.value)} autoFocus />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {results.map(u => (
              <div key={u.id} className="card card-hover" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.875rem', cursor: 'pointer' }} onClick={() => openChat(u)}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface-hi)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-2)', flexShrink: 0 }}>
                  {u.displayName?.slice(0,2).toUpperCase() || 'U'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{u.displayName || u.username}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>@{u.username} · {u.role}</div>
                </div>
                <MessageCircle size={16} color="var(--text-3)" />
              </div>
            ))}
            {query.length >= 2 && results.length === 0 && (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <div className="empty-title">No players found</div>
                <div className="empty-sub">Try a different username.</div>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'chats' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {conversations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <div className="empty-title">No messages yet</div>
              <div className="empty-sub">Search for a player to start chatting.</div>
            </div>
          ) : conversations.map(u => (
            <div key={u.id} className="card card-hover" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.875rem', cursor: 'pointer' }} onClick={() => openChat(u)}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface-hi)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-2)', flexShrink: 0 }}>
                {u.displayName?.slice(0,2).toUpperCase() || 'U'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{u.displayName || u.username}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>@{u.username}</div>
              </div>
              <MessageCircle size={16} color="var(--text-3)" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
