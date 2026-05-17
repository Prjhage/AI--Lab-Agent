import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/navbar/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Copy, Check, ChevronRight, LogIn, Hash,
  Beaker, Users, Star, FlaskConical, BookOpen, Zap, TrendingUp
} from 'lucide-react';

const cardVariants = {
  initial: { opacity: 0, y: 24, scale: 0.97 },
  animate: (i) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', stiffness: 260, damping: 22, delay: i * 0.07 }
  }),
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.18 } }
};

const statsAnim = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentUser, labs, joinLab } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const isTeacher = currentUser?.role === 'teacher';
  const myLabs    = labs;
  const filtered  = myLabs.filter(l =>
    l.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.facultyName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalExps   = myLabs.reduce((s, l) => s + (l.experiments?.length || 0), 0);
  const totalXP     = myLabs.reduce((s, l) => s + l.experiments?.reduce((a, e) => a + (e.points || 0), 0), 0);

  const handleCopy = (e, code, id) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setJoinError('');
    if (joinCode.trim().length !== 10) { setJoinError('Code must be exactly 10 characters.'); return; }
    const res = await joinLab(joinCode.trim().toUpperCase());
    if (res.success) {
      setIsJoinOpen(false); 
      setJoinCode('');
    } else {
      setJoinError(res.message);
    }
  };

  return (
    <div className="page-container min-h-screen flex flex-col">
      <div className="orb orb-violet" style={{ top: '-50px', left: '-100px' }} />
      <div className="orb orb-cyan"   style={{ bottom: '10%', right: '-80px' }} />

      <Navbar onSearch={setSearchTerm} />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-8 relative z-10">

        {/* ── Hero greeting ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1,  y: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 24 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-6"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Hey, <span className="text-animated-gradient">{currentUser?.username?.split(' ')[0] ?? 'Scientist'}</span> 👋
            </h1>
            <p className="text-sm mt-1.5" style={{ color: 'var(--text-sub)' }}>
              {isTeacher
                ? 'Manage your laboratories and track student progress in real time.'
                : 'Explore AI-guided experiments and earn XP as you complete them.'}
            </p>
          </div>
          {!isTeacher ? (
            <motion.button
              onClick={() => setIsJoinOpen(true)}
              className="btn-primary py-3 px-6 rounded-xl text-sm flex items-center gap-2 self-start md:self-auto shadow-lg"
              style={{ boxShadow: '0 0 24px rgba(124,58,237,0.35)' }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              <LogIn size={16} /> Join Lab with Code
            </motion.button>
          ) : (
            myLabs.length > 0 && (
              <motion.button
                onClick={() => navigate('/create-lab')}
                className="btn-primary py-3 px-6 rounded-xl text-sm flex items-center gap-2 self-start"
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              >
                <Plus size={16} /> New Laboratory
              </motion.button>
            )
          )}
        </motion.div>

        {/* ── Stats bar ── */}
        {myLabs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, type: 'spring', stiffness: 250, damping: 22 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            {[
              { label: 'Laboratories',  value: myLabs.length,  icon: Beaker,     color: 'text-violet-400' },
              { label: 'Experiments',   value: totalExps,      icon: FlaskConical, color: 'text-cyan-400' },
              { label: 'Total XP Pool', value: totalXP,        icon: Star,       color: 'text-yellow-400' },
              { label: 'Active Today',  value: '1',            icon: TrendingUp,  color: 'text-green-400' },
            ].map(({ label, value, icon: Icon, color }, i) => (
              <motion.div
                key={label}
                variants={statsAnim}
                initial="initial"
                animate="animate"
                custom={i}
                style={{ transitionDelay: `${i * 60}ms` }}
                className="glass glass-sm p-4 flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <Icon size={18} className={color} />
                </div>
                <div>
                  <p className={`text-xl font-extrabold ${color}`}>{value}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ── Section title ── */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            {isTeacher ? 'Your Laboratories' : 'Enrolled Laboratories'}
          </h2>
          {filtered.length > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
              {filtered.length} {filtered.length === 1 ? 'lab' : 'labs'}
            </span>
          )}
        </div>

        {/* ── Lab grid ── */}
        {myLabs.length === 0 ? (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
            onClick={() => isTeacher ? navigate('/create-lab') : setIsJoinOpen(true)}
            className="rounded-2xl cursor-pointer group py-20 flex flex-col items-center gap-5 transition-all duration-300"
            style={{
              border: '2px dashed rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.02)',
            }}
            whileHover={{ borderColor: 'rgba(124,58,237,0.4)', background: 'rgba(124,58,237,0.05)' }}
          >
            <motion.div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)' }}
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              {isTeacher ? <Plus className="text-violet-400" size={28} /> : <LogIn className="text-violet-400" size={26} />}
            </motion.div>
            <div className="text-center">
              <p className="text-lg font-bold text-white">
                {isTeacher ? 'Create your first laboratory' : 'No labs yet'}
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-sub)' }}>
                {isTeacher ? 'Click to configure a new code or non-code workspace.' : 'Get an invite code from your instructor and join instantly.'}
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            initial="initial"
            animate="animate"
          >
            <AnimatePresence>
              {filtered.map((lab, i) => (
                <motion.div
                  key={lab.id}
                  variants={cardVariants}
                  custom={i}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  layout
                  onClick={() => navigate(`/lab/${lab.id}`)}
                  className="glass ring-glow glass-hover cursor-pointer flex flex-col justify-between min-h-[200px] overflow-hidden group"
                >
                  {/* Top accent line */}
                  <div className="h-0.5 w-full" style={{
                    background: lab.type === 'code'
                      ? 'linear-gradient(90deg, #7c3aed, #6366f1)'
                      : 'linear-gradient(90deg, #0891b2, #06b6d4)'
                  }} />

                  <div className="p-5 flex flex-col gap-3 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className={lab.type === 'code' ? 'badge-violet' : 'badge-cyan'}>
                        {lab.type === 'code' ? `${lab.editorType ?? 'Monaco'}` : 'Non-Code'}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                        <FlaskConical size={12} />
                        {lab.experiments?.length ?? 0} exp
                      </div>
                    </div>

                    <div className="flex-1">
                      <h3 className="font-bold text-white leading-snug text-[15px] group-hover:text-violet-300 transition-colors duration-200 line-clamp-2">
                        {lab.title}
                      </h3>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        {isTeacher ? 'Created by you' : `Instructor: ${lab.facultyName}`}
                      </p>
                    </div>

                    {/* XP pool */}
                    <div className="flex items-center gap-1 text-xs font-semibold text-yellow-400">
                      <Star size={12} />
                      {lab.experiments?.reduce((s, e) => s + (e.points || 0), 0)} XP Pool
                    </div>
                  </div>

                  <div className="px-5 pb-4 flex items-center justify-between"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                    {isTeacher ? (
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono font-bold tracking-widest px-2.5 py-1 rounded-lg"
                          style={{ background: 'rgba(255,255,255,0.05)', color: '#67e8f9', border: '1px solid rgba(6,182,212,0.15)' }}>
                          {lab.code}
                        </code>
                        <motion.button
                          onClick={e => handleCopy(e, lab.code, lab.id)}
                          className="p-1.5 rounded-lg transition-all"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                          whileTap={{ scale: 0.88 }}
                          title="Copy code"
                        >
                          {copiedId === lab.id
                            ? <Check size={12} className="text-green-400" />
                            : <Copy size={12} className="text-gray-400" />}
                        </motion.button>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                        {lab.experiments?.length ?? 0} experiments
                      </span>
                    )}
                    <motion.div
                      className="text-gray-500 group-hover:text-violet-400 transition-colors"
                      animate={{ x: 0 }}
                      whileHover={{ x: 3 }}
                    >
                      <ChevronRight size={16} />
                    </motion.div>
                  </div>
                </motion.div>
              ))}

              {/* Add card */}
              <motion.div
                key="add-card"
                variants={cardVariants}
                custom={filtered.length}
                initial="initial"
                animate="animate"
                onClick={() => isTeacher ? navigate('/create-lab') : setIsJoinOpen(true)}
                className="rounded-2xl cursor-pointer flex flex-col items-center justify-center gap-3 min-h-[200px] group transition-all duration-300"
                style={{ border: '2px dashed rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
                whileHover={{ borderColor: 'rgba(124,58,237,0.35)', background: 'rgba(124,58,237,0.04)', scale: 1.01 }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                  style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.18)' }}>
                  {isTeacher ? <Plus className="text-violet-400" size={20} /> : <LogIn className="text-violet-400" size={18} />}
                </div>
                <p className="text-sm font-bold text-gray-400 group-hover:text-white transition-colors">
                  {isTeacher ? 'Create New Lab' : 'Join Another Lab'}
                </p>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      {/* ── Join Lab Modal ── */}
      <AnimatePresence>
        {isJoinOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              className="fixed inset-0 bg-black/70"
              style={{ backdropFilter: 'blur(10px)' }}
              onClick={() => setIsJoinOpen(false)}
            />
            <motion.div
              className="w-full max-w-sm glass ring-glow p-8 relative z-10"
              initial={{ opacity: 0, scale: 0.88, y: 20 }}
              animate={{ opacity: 1, scale: 1,    y: 0 }}
              exit={{   opacity: 0, scale: 0.9,   y: 10 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            >
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)' }}>
                  <LogIn size={22} className="text-white" />
                </div>
                <h3 className="text-xl font-extrabold text-white">Join a Lab</h3>
                <p className="text-xs mt-1" style={{ color: 'var(--text-sub)' }}>Enter the 10-character code from your instructor</p>
              </div>

              <AnimatePresence>
                {joinError && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="text-xs text-red-400 text-center font-semibold mb-3 p-2 rounded-lg"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}
                  >
                    {joinError}
                  </motion.p>
                )}
              </AnimatePresence>

              <form onSubmit={handleJoin} className="flex flex-col gap-4">
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="E.g. 4A9D3F8E12"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value)}
                    className="glass-input pl-9 pr-4 py-3 text-center text-base font-mono font-bold tracking-widest uppercase"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <motion.button type="button" onClick={() => setIsJoinOpen(false)}
                    className="btn-ghost py-2.5 rounded-xl text-sm font-bold"
                    whileTap={{ scale: 0.96 }}>
                    Cancel
                  </motion.button>
                  <motion.button type="submit"
                    className="btn-primary py-2.5 rounded-xl text-sm font-bold"
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    Add Lab
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
