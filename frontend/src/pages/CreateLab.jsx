import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/navbar/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Terminal, BookOpen, Code, Save, Sparkles, ChevronRight, Hash } from 'lucide-react';

const item = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 24 } },
};
const container = { animate: { transition: { staggerChildren: 0.07 } } };

export default function CreateLab() {
  const navigate = useNavigate();
  const { currentUser, createLab } = useAuth();

  useEffect(() => {
    if (currentUser && currentUser.role !== 'teacher') navigate('/dashboard');
  }, [currentUser]);

  const [title, setTitle]         = useState('');
  const [labType, setLabType]     = useState('code');
  const [editorType, setEditorType] = useState('monaco');
  const [error, setError]         = useState('');
  const [saving, setSaving]       = useState(false);
  const [done, setDone]           = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) { setError('Please provide a lab title.'); return; }
    setSaving(true);
    try {
      await createLab(title.trim(), labType, editorType);
      setDone(true);
      setTimeout(() => navigate('/dashboard'), 900);
    } catch (err) {
      setError(err.message || 'Failed to create laboratory.');
    } finally {
      setSaving(false);
    }
  };

  const typeCards = [
    { id: 'code',     label: 'Code-Based Lab',   sub: 'Monaco / Jupyter execution',  icon: Terminal, color: 'violet' },
    { id: 'non-code', label: 'Non-Code Lab',      sub: 'Procedural & PDF guided',     icon: BookOpen, color: 'cyan'   },
  ];

  const editorCards = [
    { id: 'monaco',  label: 'Monaco Editor',   sub: 'VS Code-style IDE',          icon: Code     },
    { id: 'jupyter', label: 'Jupyter Notebook', sub: 'Cell-based Python notebook', icon: Terminal },
  ];

  return (
    <div className="page-container min-h-screen flex flex-col">
      <div className="orb orb-violet" style={{ top: '-60px', left: '-80px' }} />
      <div className="orb orb-cyan"   style={{ bottom: '-40px', right: '-60px' }} />

      <Navbar />

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6 relative z-10">
        {/* Back */}
        <motion.button
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/dashboard')}
          className="btn-ghost flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg self-start"
          whileHover={{ x: -2 }} whileTap={{ scale: 0.96 }}
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </motion.button>

        <motion.div variants={container} initial="initial" animate="animate">
          {/* Header */}
          <motion.div variants={item} className="mb-6">
            <div className="flex items-center gap-2.5 mb-1">
              <motion.div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)' }}
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <Sparkles size={16} className="text-white" />
              </motion.div>
              <h1 className="text-2xl font-extrabold text-white">Create New Laboratory</h1>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-sub)' }}>
              Configure your workspace parameters — a unique 10-digit access code will be auto-generated.
            </p>
          </motion.div>

          {/* Card */}
          <motion.div variants={item} className="glass ring-glow p-7 md:p-8 flex flex-col gap-6">

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="p-3.5 rounded-xl text-sm font-semibold text-red-400 text-center"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}
                >
                  {error}
                </motion.div>
              )}
              {done && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="p-3.5 rounded-xl text-sm font-semibold text-green-400 text-center"
                  style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
                >
                  ✓ Laboratory created! Redirecting…
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSave} className="flex flex-col gap-6">
              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-widest pl-1" style={{ color: 'var(--text-sub)' }}>
                  Lab Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="E.g., Advanced Computer Networks"
                  className="glass-input px-4 py-3 text-sm"
                />
              </div>

              {/* Lab Type */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-widest pl-1" style={{ color: 'var(--text-sub)' }}>
                  Laboratory Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {typeCards.map(({ id, label, sub, icon: Icon, color }) => {
                    const active = labType === id;
                    return (
                      <motion.button
                        key={id}
                        type="button"
                        onClick={() => setLabType(id)}
                        className="py-4 rounded-xl border flex flex-col items-center gap-2 relative overflow-hidden"
                        style={{
                          background: active
                            ? (color === 'violet' ? 'rgba(124,58,237,0.14)' : 'rgba(6,182,212,0.12)')
                            : 'rgba(255,255,255,0.03)',
                          borderColor: active
                            ? (color === 'violet' ? 'rgba(124,58,237,0.5)' : 'rgba(6,182,212,0.45)')
                            : 'rgba(255,255,255,0.07)',
                          boxShadow: active
                            ? (color === 'violet' ? '0 0 20px rgba(124,58,237,0.18)' : '0 0 20px rgba(6,182,212,0.14)')
                            : 'none',
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 380 }}
                      >
                        {active && (
                          <motion.div
                            className="absolute top-0 left-0 right-0 h-0.5"
                            style={{ background: color === 'violet' ? 'linear-gradient(90deg,#7c3aed,#6366f1)' : 'linear-gradient(90deg,#0891b2,#06b6d4)' }}
                            layoutId="typeAccent"
                          />
                        )}
                        <Icon size={22} className={active ? (color === 'violet' ? 'text-violet-400' : 'text-cyan-400') : 'text-gray-500'} />
                        <span className="text-sm font-bold text-white">{label}</span>
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{sub}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Editor Type (code only) */}
              <AnimatePresence>
                {labType === 'code' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-col gap-2 overflow-hidden"
                  >
                    <label className="text-xs font-bold uppercase tracking-widest pl-1" style={{ color: 'var(--text-sub)' }}>
                      Code Editor
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {editorCards.map(({ id, label, sub, icon: Icon }) => {
                        const active = editorType === id;
                        return (
                          <motion.button
                            key={id}
                            type="button"
                            onClick={() => setEditorType(id)}
                            className="py-3.5 px-4 rounded-xl border flex items-center gap-3 transition-all"
                            style={{
                              background: active ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.03)',
                              borderColor: active ? 'rgba(124,58,237,0.45)' : 'rgba(255,255,255,0.07)',
                            }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            <Icon size={18} className={active ? 'text-violet-400' : 'text-gray-500'} />
                            <div className="text-left">
                              <p className="text-sm font-bold text-white">{label}</p>
                              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{sub}</p>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Code preview chip */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-2.5 p-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <Hash size={14} className="text-cyan-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-white">Auto-generated Access Code</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    A unique 10-character code will be created and shown on your dashboard for students to join.
                  </p>
                </div>
              </motion.div>

              {/* Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <motion.button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="btn-ghost py-3.5 rounded-xl text-sm font-bold"
                  whileTap={{ scale: 0.97 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  disabled={saving || done}
                  className="btn-primary py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg"
                  style={{ boxShadow: '0 0 20px rgba(124,58,237,0.3)' }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {saving ? (
                    <motion.div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }} transition={{ duration: 0.75, repeat: Infinity, ease: 'linear' }} />
                  ) : done ? '✓ Saved!' : <><Save size={15} /> Save Laboratory</>}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
