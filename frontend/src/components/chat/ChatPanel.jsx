import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Inline markdown-lite renderer
function renderMD(text) {
  return text
    .replace(/### (.+)/g, '<p class="text-xs font-bold text-violet-300 mt-3 mb-1">$1</p>')
    .replace(/## (.+)/g,  '<p class="text-sm font-bold text-white mt-3 mb-1">$1</p>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
    .replace(/`([^`\n]+)`/g, '<code class="bg-white/10 text-cyan-300 px-1.5 py-0.5 rounded text-[11px] font-mono">$1</code>')
    .replace(/```[\w]*\n?([\s\S]*?)```/g,
      '<pre class="bg-black/50 border border-white/8 rounded-lg p-3 text-[11px] font-mono text-green-300 overflow-x-auto my-2 whitespace-pre-wrap leading-relaxed">$1</pre>')
    .replace(/^(\d+)\. (.+)/gm, '<div class="flex gap-1.5 mb-0.5"><span class="text-violet-400 font-bold flex-shrink-0">$1.</span><span>$2</span></div>')
    .replace(/^- (.+)/gm, '<div class="flex gap-1.5 mb-0.5"><span class="text-cyan-400">•</span><span>$1</span></div>')
    .replace(/\n/g, '<br/>');
}

export const ChatPanel = ({ chat, onSuggestAlternate, onSuggestTestCases, currentCode }) => {
  const [input, setInput] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages, chat.isTyping]);

  const handleSend = e => {
    e.preventDefault();
    if (!input.trim() || chat.isTyping) return;
    
    // Find active step context from activeContexts state
    const stepCtx = chat.activeContexts?.find(c => c.type === 'step');
    
    chat.sendMessage(input.trim(), 'user', currentCode, false, stepCtx);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <motion.div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#0891b2)', boxShadow: '0 0 14px rgba(124,58,237,0.35)' }}
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Bot size={17} className="text-white" />
        </motion.div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white leading-tight">AI Lab Agent</p>
          <div className="flex items-center gap-1.5">
            <div className="status-dot" />
            <span className="text-[10px] font-semibold" style={{ color: '#4ade80' }}>Online · Grok Powered</span>
          </div>
        </div>
        <Sparkles size={14} className="text-violet-400 flex-shrink-0" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {chat.messages.filter(msg => !msg.isHidden).map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className={`flex gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-white ${
                msg.sender === 'user'
                  ? 'bg-gradient-to-br from-violet-500 to-purple-700'
                  : 'bg-gradient-to-br from-cyan-500 to-blue-700'
              }`}>
                {msg.sender === 'user' ? <User size={13} /> : <Bot size={13} />}
              </div>

              {/* Bubble */}
              <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'rounded-tr-sm text-white'
                  : 'rounded-tl-sm text-gray-200'
              }`}
              style={{
                background: msg.sender === 'user'
                  ? 'rgba(124,58,237,0.22)'
                  : 'rgba(255,255,255,0.05)',
                border: `1px solid ${msg.sender === 'user' ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.07)'}`,
              }}>
                {msg.sender === 'ai' || msg.text.startsWith('🪜')
                  ? <div dangerouslySetInnerHTML={{ __html: renderMD(msg.text) }} />
                  : <p className="whitespace-pre-wrap">{msg.text}</p>
                }
                <p className="text-[9px] mt-1.5 opacity-40 text-right">{msg.timestamp}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {chat.isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
              className="flex gap-2.5"
            >
              <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-700">
                <Bot size={13} className="text-white" />
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                {[0, 150, 300].map(delay => (
                  <motion.div key={delay}
                    className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 0.7, repeat: Infinity, delay: delay / 1000 }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={endRef} />
      </div>

      {/* Quick action chips */}
      {onSuggestAlternate && (
        <div className="px-4 py-2 flex gap-2 flex-wrap flex-shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {[
            { label: '💡 Alternate Solution', action: () => onSuggestAlternate(currentCode), color: 'violet' },
            ...(onSuggestTestCases ? [{ label: '🧪 Test Cases', action: onSuggestTestCases, color: 'cyan' }] : []),
          ].map(({ label, action, color }) => (
            <motion.button
              key={label}
              onClick={action}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all cursor-pointer"
              style={{
                background: color === 'violet' ? 'rgba(124,58,237,0.1)' : 'rgba(6,182,212,0.1)',
                border: color === 'violet' ? '1px solid rgba(124,58,237,0.22)' : '1px solid rgba(6,182,212,0.22)',
                color: color === 'violet' ? '#c4b5fd' : '#67e8f9',
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {label}
            </motion.button>
          ))}
        </div>
      )}

      {/* Active Context Chips (VS Code Copilot style) */}
      {chat.activeContexts && chat.activeContexts.length > 0 && (
        <div className="px-4 py-1.5 flex gap-1.5 flex-wrap flex-shrink-0">
          <AnimatePresence>
            {chat.activeContexts.map((ctx, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.85, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: -5 }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold"
                style={{
                  background: 'rgba(6,182,212,0.08)',
                  border: '1px solid rgba(6,182,212,0.18)',
                  color: '#67e8f9',
                }}
              >
                <span>{ctx.type === 'step' ? '🪜' : '📄'} {ctx.name}</span>
                <button
                  type="button"
                  onClick={() => chat.removeContext(idx)}
                  className="hover:text-red-400 ml-1 cursor-pointer font-bold text-[11px] leading-none transition-colors"
                  title="Remove context"
                >
                  ×
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="px-4 pb-4 pt-2 flex-shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask your AI agent anything…"
            className="glass-input flex-1 px-4 py-2.5 text-sm"
          />
          <motion.button
            type="submit"
            disabled={!input.trim() || chat.isTyping}
            className="w-10 h-10 flex items-center justify-center rounded-xl btn-primary flex-shrink-0 disabled:opacity-50"
            style={{ boxShadow: '0 0 12px rgba(124,58,237,0.3)' }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
          >
            {chat.isTyping
              ? <Loader2 size={15} className="animate-spin" />
              : <Send size={14} />
            }
          </motion.button>
        </div>
      </form>
    </div>
  );
};
