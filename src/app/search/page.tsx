'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { searchUsers, getConversations, getMessages, sendMessage } from '@/lib/data';
import { Search, Send, ArrowLeft, MessageSquare, User } from 'lucide-react';

export default function MessagesPage() {
  const router = useRouter();
  const { isAuthenticated, ready, user } = useAuthStore();
  const [tab, setTab] = useState<'search' | 'chats'>('chats');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [convoLoading, setConvoLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ready && !isAuthenticated) { router.push('/auth'); return; }
    if (isAuthenticated) loadConversations();
  }, [ready, isAuthenticated, router]);

  const loadConversations = useCallback(() => {
    setConvoLoading(true);
    getConversations()
      .then((c) => setConversations(c as any[]))
      .catch(() => {})
      .finally(() => setConvoLoading(false));
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const t = setTimeout(() => {
      searchUsers(query)
        .then((r) => setResults(r as any[]))
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const openChat = useCallback((u: any) => {
    setSelectedUser(u);
    setMessages([]);
    setMsgLoading(true);
    getMessages(u.id)
      .then((m) => setMessages(m as any[]))
      .catch(() => {})
      .finally(() => setMsgLoading(false));
  }, []);

  // Poll messages when in chat
  useEffect(() => {
    if (!selectedUser) return;
    const iv = setInterval(() => {
      getMessages(selectedUser.id).then((m) => setMessages(m as any[])).catch(() => {});
    }, 3000);
    return () => clearInterval(iv);
  }, [selectedUser]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMsg = async () => {
    if (!newMsg.trim() || !selectedUser || sending) return;
    const text = newMsg.trim();
    setSending(true);
    setNewMsg('');
    setMessages(m => [...m, { content: text, senderId: user?.id, createdAt: new Date().toISOString() }]);
    try {
      await sendMessage(selectedUser.id, text);
    } catch {
      setMessages(m => m.slice(0, -1));
      setNewMsg(text);
    } finally {
      setSending(false);
    }
  };

  if (ready && !isAuthenticated) return null;

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diff = now.getTime() - d.getTime();
      if (diff < 60000) return 'now';
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
      if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch { return ''; }
  };

  const Avatar = ({ name, size = 40 }: { name?: string; size?: number }) => (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, var(--red-dim), var(--surface-hi))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, color: 'var(--red)', fontSize: size * 0.35,
      flexShrink: 0, border: '1px solid var(--border)',
    }}>
      {name?.slice(0, 2).toUpperCase() || <User size={size * 0.4} />}
    </div>
  );

  /* ── Chat view ── */
  if (selectedUser) return (
    <div className="page-wrapper" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--nav-h) - 2rem)', padding: '1rem' }}>
      {/* Chat header */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', marginBottom: '0.75rem', flexShrink: 0 }}>
        <button className="btn btn-ghost btn-icon" onClick={() => { setSelectedUser(null); loadConversations(); }} style={{ padding: '0.4rem' }}>
          <ArrowLeft size={18} />
        </button>
        <Avatar name={selectedUser.displayName || selectedUser.username} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selectedUser.displayName || selectedUser.username}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>@{selectedUser.username}</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.5rem 0', minHeight: 0 }}>
        {msgLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><div className="spinner" /></div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-3)' }}>
            <MessageSquare size={32} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
            <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>No messages yet</div>
            <div style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>Say hello to start the conversation</div>
          </div>
        ) : messages.map((m: any, i: number) => {
          const mine = m.senderId === user?.id;
          return (
            <div key={i} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', paddingLeft: mine ? '15%' : 0, paddingRight: mine ? 0 : '15%' }}>
              <div style={{
                padding: '0.55rem 0.85rem',
                borderRadius: mine ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                background: mine ? 'var(--red)' : 'var(--surface-hi)',
                border: mine ? 'none' : '1px solid var(--border)',
                fontSize: '0.875rem', lineHeight: 1.5,
                color: mine ? '#fff' : 'var(--text)',
                maxWidth: '100%', wordBreak: 'break-word',
              }}>
                <div>{m.content}</div>
                <div style={{ fontSize: '0.62rem', opacity: 0.6, marginTop: '0.2rem', textAlign: 'right' }}>
                  {formatTime(m.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <input
          ref={inputRef}
          className="input"
          placeholder="Type a message..."
          value={newMsg}
          onChange={e => setNewMsg(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
          style={{ flex: 1 }}
          autoFocus
        />
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
        <h1 className="page-title">Messages</h1>
        <p className="page-sub">Connect with players and teams</p>
      </div>

      <div className="tab-bar" style={{ marginBottom: '1.25rem' }}>
        <button className={`tab${tab === 'chats' ? ' active' : ''}`} onClick={() => setTab('chats')}>Inbox</button>
        <button className={`tab${tab === 'search' ? ' active' : ''}`} onClick={() => setTab('search')}>Find Players</button>
      </div>

      {/* ── Inbox tab ── */}
      {tab === 'chats' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {convoLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>
          ) : conversations.length === 0 ? (
            <div className="empty-state">
              <div style={{ marginBottom: '0.75rem', opacity: 0.3 }}><MessageSquare size={40} /></div>
              <div className="empty-title">No conversations yet</div>
              <div className="empty-sub">Find a player to start chatting</div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }} onClick={() => setTab('search')}>
                <Search size={14} /> Find Players
              </button>
            </div>
          ) : conversations.map((u: any) => (
            <div
              key={u.id}
              className="card card-hover"
              style={{ padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.875rem', cursor: 'pointer' }}
              onClick={() => openChat(u)}
            >
              <Avatar name={u.displayName || u.username} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.displayName || u.username}
                  </span>
                  {u.lastMessageAt && (
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-3)', flexShrink: 0 }}>
                      {formatTime(u.lastMessageAt)}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  @{u.username}{u.lastMessage ? ` · ${u.lastMessage}` : ''}
                </div>
              </div>
              <ArrowLeft size={14} color="var(--text-3)" style={{ transform: 'rotate(180deg)', flexShrink: 0 }} />
            </div>
          ))}
        </div>
      )}

      {/* ── Search tab ── */}
      {tab === 'search' && (
        <>
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
            <input
              className="input"
              style={{ paddingLeft: '2.5rem' }}
              placeholder="Search by username..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
          </div>

          {searching && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><div className="spinner spinner-sm" /></div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {!searching && results.map(u => (
              <div
                key={u.id}
                className="card card-hover"
                style={{ padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.875rem', cursor: 'pointer' }}
                onClick={() => openChat(u)}
              >
                <Avatar name={u.displayName || u.username} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{u.displayName || u.username}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-3)' }}>
                    <span>@{u.username}</span>
                    {u.role && <span className="badge badge-gray" style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem' }}>{u.role}</span>}
                  </div>
                </div>
                <button className="btn btn-outline btn-sm" style={{ flexShrink: 0 }} onClick={e => { e.stopPropagation(); openChat(u); }}>
                  <MessageSquare size={14} /> Chat
                </button>
              </div>
            ))}
            {!searching && query.length >= 2 && results.length === 0 && (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <div className="empty-title">No players found</div>
                <div className="empty-sub">Try a different username</div>
              </div>
            )}
            {!searching && query.length < 2 && results.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)', fontSize: '0.825rem' }}>
                Type at least 2 characters to search
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
