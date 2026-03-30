'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function SearchPage() {
  const router = useRouter();
  const { isAuthenticated, accessToken, user } = useAuthStore();
  const [tab, setTab] = useState<'search' | 'chats'>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated) { router.push('/auth'); return; }
    loadConversations();
  }, [isAuthenticated]);

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(() => searchUsers(), 400);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!selectedUser) return;
    loadMessages(selectedUser.id);
    const interval = setInterval(() => loadMessages(selectedUser.id), 5000);
    return () => clearInterval(interval);
  }, [selectedUser]);

  const headers = { Authorization: `Bearer ${accessToken}` };

  const searchUsers = async () => {
    try {
      const res = await axios.get(`${API}/users/search?q=${query}`, { headers });
      setResults(res.data?.data || []);
    } catch {}
  };

  const loadConversations = async () => {
    try {
      const res = await axios.get(`${API}/users/conversations`, { headers });
      setConversations(res.data?.data || []);
    } catch {}
  };

  const loadMessages = async (userId: string) => {
    try {
      const res = await axios.get(`${API}/users/messages/${userId}`, { headers });
      setMessages(res.data?.data || []);
    } catch {}
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !selectedUser) return;
    setSending(true);
    try {
      await axios.post(`${API}/users/messages/${selectedUser.id}`, { content: newMsg }, { headers });
      setNewMsg('');
      await loadMessages(selectedUser.id);
      await loadConversations();
    } catch {}
    setSending(false);
  };

  const openChat = (u: any) => {
    setSelectedUser(u);
    setTab('chats');
    loadMessages(u.id);
  };

  if (selectedUser) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingBottom: '80px', animation: mounted ? 'pageEnter 0.4s ease forwards' : 'none' }}>
        {/* Chat header */}
        <div style={{ background: 'rgba(3,3,8,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', padding: '1rem', position: 'sticky', top: 0, zIndex: 40 }}>
          <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={() => setSelectedUser(null)} style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text-dim)', width: '32px', height: '32px', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--orange), var(--gold))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 700, flexShrink: 0 }}>
              {selectedUser.displayName?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>{selectedUser.displayName || selectedUser.username}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>@{selectedUser.username}</div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, maxWidth: '480px', width: '100%', margin: '0 auto', padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.2em' }}>
              NO MESSAGES YET<br />
              <span style={{ fontSize: '0.65rem', opacity: 0.5 }}>Start the conversation!</span>
            </div>
          ) : (
            messages.map((msg: any, i: number) => {
              const isMe = msg.senderId === user?.id;
              return (
                <div key={i} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '75%', padding: '0.6rem 0.9rem',
                    background: isMe ? 'linear-gradient(135deg, var(--orange), #cc4400)' : 'var(--surface2)',
                    border: isMe ? 'none' : '1px solid var(--border)',
                    borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    boxShadow: isMe ? '0 0 15px var(--orange-glow)' : 'none',
                  }}>
                    <div style={{ color: '#fff', fontSize: '0.9rem', lineHeight: 1.4 }}>{msg.content}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: isMe ? 'rgba(255,255,255,0.6)' : 'var(--text-dim)', marginTop: '3px', textAlign: 'right' }}>
                      {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ background: 'rgba(3,3,8,0.97)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--border)', padding: '0.75rem 1rem', position: 'sticky', bottom: '80px' }}>
          <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', gap: '0.5rem' }}>
            <input
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Type a message..."
              style={{
                flex: 1, background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border2)',
                borderBottom: '1px solid var(--orange)', color: 'var(--text)',
                padding: '0.65rem 0.875rem', fontFamily: 'var(--font-body)',
                fontSize: '0.9rem', outline: 'none', borderRadius: '4px 4px 0 0',
              }}
            />
            <button onClick={sendMessage} disabled={sending || !newMsg.trim()} style={{
              background: sending ? 'rgba(255,107,43,0.3)' : 'var(--orange)',
              border: 'none', color: '#fff', padding: '0 1rem',
              borderRadius: '4px', cursor: 'pointer', fontSize: '1.1rem',
              boxShadow: '0 0 15px var(--orange-glow)', transition: 'all 0.3s',
            }}>➤</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '80px', animation: mounted ? 'pageEnter 0.4s ease forwards' : 'none' }}>
      {/* Header */}
      <div style={{ background: 'rgba(3,3,8,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', padding: '1rem', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 900, color: 'var(--orange)', letterSpacing: '0.1em', textShadow: '0 0 15px var(--orange-glow)' }}>COMMS</h1>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.2em' }}>SEARCH & MESSAGES</div>
        </div>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '1rem' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '3px', marginBottom: '1.25rem' }}>
          {(['search', 'chats'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '0.6rem', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase', borderRadius: '4px',
              background: tab === t ? 'var(--orange)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--text-dim)',
              boxShadow: tab === t ? '0 0 12px var(--orange-glow)' : 'none',
              transition: 'all 0.3s',
            }}>{t === 'search' ? '🔍 SEARCH' : '💬 CHATS'}</button>
          ))}
        </div>

        {tab === 'search' && (
          <div>
            {/* Search input */}
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--orange)', fontSize: '0.8rem' }}>⌕</span>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="SEARCH BY USERNAME..."
                style={{
                  width: '100%', background: 'rgba(0,0,0,0.5)',
                  border: '1px solid var(--border2)', borderBottom: '1px solid var(--orange)',
                  color: 'var(--text)', padding: '0.75rem 1rem 0.75rem 2rem',
                  fontFamily: 'var(--font-body)', fontSize: '0.95rem',
                  outline: 'none', borderRadius: '4px 4px 0 0', letterSpacing: '0.05em',
                }}
              />
            </div>

            {/* Results */}
            {results.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {results.map((u: any, i: number) => (
                  <div key={i} onClick={() => openChat(u)} style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: '8px', padding: '0.875rem 1rem',
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    cursor: 'pointer', transition: 'all 0.3s',
                  }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--orange)'; el.style.transform = 'translateX(4px)'; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--border)'; el.style.transform = 'translateX(0)'; }}
                  >
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--orange), var(--gold))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 700, flexShrink: 0, boxShadow: '0 0 10px var(--orange-glow)' }}>
                      {u.displayName?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>{u.displayName || u.username}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>@{u.username} · {u.role}</div>
                    </div>
                    <span style={{ color: 'var(--orange)', fontSize: '1rem' }}>💬</span>
                  </div>
                ))}
              </div>
            ) : query ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.2em' }}>NO PLAYERS FOUND</div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.2em' }}>TYPE TO SEARCH PLAYERS</div>
            )}
          </div>
        )}

        {tab === 'chats' && (
          <div>
            {conversations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', opacity: 0.2, marginBottom: '0.75rem' }}>💬</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-dim)', letterSpacing: '0.2em' }}>NO CONVERSATIONS YET</div>
                <button onClick={() => setTab('search')} style={{ marginTop: '1rem', background: 'transparent', border: '1px solid var(--orange)', color: 'var(--orange)', padding: '0.5rem 1.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', cursor: 'pointer', borderRadius: '4px', letterSpacing: '0.1em' }}>
                  FIND PLAYERS →
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {conversations.map((u: any, i: number) => (
                  <div key={i} onClick={() => openChat(u)} style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: '8px', padding: '0.875rem 1rem',
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    cursor: 'pointer', transition: 'all 0.3s',
                  }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--cyan)'; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--border)'; }}
                  >
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--cyan), var(--magenta))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 700, flexShrink: 0 }}>
                      {u.displayName?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>{u.displayName || u.username}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>@{u.username}</div>
                    </div>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>›</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
