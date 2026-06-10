import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/navbar/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import {
  Plus, ArrowLeft, FlaskConical, CheckCircle2,
  Star, ChevronRight, Beaker, BookOpen, Zap, Lock, Trash2,
  Brain, MessageSquare, ChevronDown, Tag, AlertCircle, TrendingUp
} from 'lucide-react';

const cardAnim = {
  initial: { opacity: 0, y: 18 },
  animate: i => ({ opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 22, delay: i * 0.06 } })
};

export default function LabPage() {
  const { labId }   = useParams();
  const navigate    = useNavigate();
  const { currentUser, labs, isExperimentCompleted, deleteExperiment } = useAuth();

  const lab       = labs.find(l => l.id === labId);
  const isTeacher = currentUser?.role === 'teacher';

  // Student Insights state (teacher only)
  const [insights, setInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [expandedExp, setExpandedExp] = useState(null);

  useEffect(() => {
    if (isTeacher && labId) {
      setLoadingInsights(true);
      api.get(`/api/ai/lab-insights/${labId}`)
        .then(data => setInsights(data))
        .catch(() => setInsights(null))
        .finally(() => setLoadingInsights(false));
    }
  }, [isTeacher, labId]);

  const handleDeleteExperiment = async (e, expId) => {
    e.stopPropagation();
    if (window.confirm("⚠️ Are you sure you want to permanently delete this experiment? All student completions, steps, and test cases will be deleted forever.")) {
      try {
        await deleteExperiment(labId, expId);
      } catch (err) {
        alert("Failed to delete experiment: " + err.message);
      }
    }
  };

  useEffect(() => { if (!lab) navigate('/dashboard'); }, [lab]);
  if (!lab) return null;

  const experiments = lab.experiments || [];
  const totalXP     = experiments.reduce((s, e) => s + (e.points || 0), 0);
  const completedCount = experiments.filter(e => isExperimentCompleted(labId, e.id)).length;
  const progressPct = experiments.length > 0 ? (completedCount / experiments.length) * 100 : 0;

  return (
    <div className="page-container min-h-screen flex flex-col">
      <div className="orb orb-violet" style={{ top: 0, right: '-60px' }} />
      <div className="orb orb-cyan"   style={{ bottom: '-40px', left: '-60px' }} />

      <Navbar />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-7 relative z-10">

        {/* Back */}
        <motion.button
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/dashboard')}
          className="btn-ghost flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg self-start"
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.96 }}
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </motion.button>

        {/* Lab Header card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 240, damping: 22 }}
          className="glass ring-glow overflow-hidden"
        >
          {/* Gradient accent */}
          <div className="h-1" style={{
            background: lab.type === 'code'
              ? 'linear-gradient(90deg, #7c3aed, #6366f1, #06b6d4)'
              : 'linear-gradient(90deg, #0891b2, #06b6d4, #67e8f9)'
          }} />

          <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <motion.div
                className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: lab.type === 'code'
                    ? 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(99,102,241,0.2))'
                    : 'linear-gradient(135deg, rgba(8,145,178,0.25), rgba(6,182,212,0.2))',
                  border: lab.type === 'code' ? '1px solid rgba(124,58,237,0.3)' : '1px solid rgba(6,182,212,0.3)',
                }}
                animate={{ rotate: [0, 3, -3, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Beaker className={lab.type === 'code' ? 'text-violet-400' : 'text-cyan-400'} size={26} />
              </motion.div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={lab.type === 'code' ? 'badge-violet' : 'badge-cyan'}>
                    {lab.type === 'code' ? `${lab.editorType ?? 'Monaco'} Editor` : 'Non-Code Lab'}
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">{lab.title}</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  Instructor: <span style={{ color: '#67e8f9' }} className="font-semibold">{lab.facultyName}</span>
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-3 flex-shrink-0 flex-wrap">
              {[
                { label: 'Experiments', value: experiments.length, color: 'text-white' },
                { label: 'Total XP',    value: totalXP,            color: 'text-yellow-400' },
                { label: !isTeacher ? 'Completed' : 'Published', value: !isTeacher ? `${completedCount}/${experiments.length}` : experiments.length, color: 'text-green-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="glass-sm px-4 py-3 text-center min-w-[76px]">
                  <p className={`text-xl font-extrabold ${color}`}>{value}</p>
                  <p className="text-[10px] uppercase tracking-wider font-semibold mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Progress bar (students only) */}
          {!isTeacher && experiments.length > 0 && (
            <div className="px-6 md:px-8 pb-5">
              <div className="flex justify-between text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                <span>Your Progress</span>
                <span>{Math.round(progressPct)}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #7c3aed, #06b6d4)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Section header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Experiments</h2>
          <div className="flex items-center gap-3">
            {isTeacher && (
              <motion.button
                onClick={() => navigate(`/lab/${labId}/add-experiment`)}
                className="btn-primary py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
                style={{ boxShadow: '0 0 16px rgba(124,58,237,0.3)' }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                <Plus size={14} /> Add Experiment
              </motion.button>
            )}
          </div>
        </div>

        {/* Experiments list */}
        {experiments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            onClick={() => isTeacher && navigate(`/lab/${labId}/add-experiment`)}
            className={`rounded-2xl py-16 flex flex-col items-center gap-4 transition-all duration-300 ${isTeacher ? 'cursor-pointer' : ''}`}
            style={{ border: '2px dashed rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
            whileHover={isTeacher ? { borderColor: 'rgba(124,58,237,0.35)', background: 'rgba(124,58,237,0.04)' } : {}}
          >
            <motion.div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              {isTeacher ? <Plus className="text-violet-400" size={24} /> : <FlaskConical className="text-gray-500" size={24} />}
            </motion.div>
            <div className="text-center">
              <p className="font-bold text-white">{isTeacher ? 'Add your first experiment' : 'No experiments yet'}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-sub)' }}>
                {isTeacher ? 'Create guided experiments with test cases and PDF resources.' : 'Your instructor hasn\'t created any experiments yet.'}
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-3">
            {experiments.map((exp, i) => {
              const done = isExperimentCompleted(labId, exp.id);
              return (
                <motion.div
                  key={exp.id}
                  custom={i}
                  variants={cardAnim}
                  initial="initial"
                  animate="animate"
                  onClick={() => navigate(`/lab/${labId}/${exp.id}`)}
                  className="glass glass-hover ring-glow cursor-pointer flex items-center gap-4 p-5 group"
                  whileTap={{ scale: 0.99 }}
                >
                  {/* Index / done badge */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm transition-all ${
                    done
                      ? 'text-green-400'
                      : 'text-gray-400 group-hover:text-violet-400'
                  }`}
                  style={{
                    background: done ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)',
                    border: done ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(255,255,255,0.08)',
                  }}>
                    {done ? <CheckCircle2 size={20} /> : <span>{String(i + 1).padStart(2, '0')}</span>}
                  </div>

                  {/* Text info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {done && <span className="badge-green">Completed</span>}
                      <h3 className="text-[15px] font-bold text-white truncate group-hover:text-violet-300 transition-colors">
                        {exp.title}
                      </h3>
                    </div>
                    <p className="text-xs line-clamp-1 mt-0.5" style={{ color: 'var(--text-muted)' }}>{exp.description}</p>
                  </div>

                  {/* Right meta */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="hidden sm:flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1 text-xs font-bold text-yellow-400">
                        <Star size={11} /> {exp.points} XP
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                        <BookOpen size={10} /> {exp.steps?.length ?? 0} steps
                      </div>
                    </div>

                    {isTeacher && (
                      <button
                        onClick={(e) => handleDeleteExperiment(e, exp.id)}
                        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-400 hover:text-red-300 transition-all border border-red-500/20 hover:border-red-500/35 cursor-pointer flex items-center justify-center relative z-20"
                        title="Delete Experiment"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}

                    <motion.div animate={{ x: 0 }} className="text-gray-600 group-hover:text-violet-400 transition-colors">
                      <ChevronRight size={16} />
                    </motion.div>
                  </div>
                </motion.div>
              );
            })}

            {/* Teacher add-more card */}
            {isTeacher && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: experiments.length * 0.06 + 0.1 }}
                onClick={() => navigate(`/lab/${labId}/add-experiment`)}
                className="rounded-xl flex items-center justify-center gap-3 py-5 cursor-pointer group transition-all duration-300"
                style={{ border: '1px dashed rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
                whileHover={{ borderColor: 'rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.04)' }}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
                  <Plus className="text-violet-400" size={14} />
                </div>
                <span className="text-sm font-bold text-gray-400 group-hover:text-white transition-colors">Add Another Experiment</span>
              </motion.div>
            )}
          </div>
        )}
        {/* ── STUDENT INSIGHTS PANEL (Teacher-only) ── */}
        {isTeacher && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 220, damping: 22 }}
            style={{
              background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(6,182,212,0.06))',
              border: '1px solid rgba(124,58,237,0.25)',
              borderRadius: '1.25rem',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{ background: 'linear-gradient(90deg, rgba(124,58,237,0.18), rgba(6,182,212,0.12))', borderBottom: '1px solid rgba(124,58,237,0.2)' }} className="px-6 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(99,102,241,0.2))', border: '1px solid rgba(124,58,237,0.4)' }}>
                <Brain size={18} className="text-violet-300" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-sm tracking-tight">🧠 Student Insights</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '11px' }}>AI-summarized doubts from student interactions — visible only to you</p>
              </div>
              {loadingInsights && (
                <div style={{ marginLeft: 'auto', fontSize: '11px', color: '#a78bfa' }} className="flex items-center gap-1.5">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                    <Zap size={12} />
                  </motion.div>
                  Analyzing...
                </div>
              )}
              {insights && !loadingInsights && (
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                  <span style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '999px', padding: '2px 10px', fontSize: '11px', color: '#fca5a5', fontWeight: 700 }}>
                    {insights.experiments?.reduce((s, e) => s + (e.total_mistakes || 0), 0)} mistakes
                  </span>
                  <span style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.35)', borderRadius: '999px', padding: '2px 10px', fontSize: '11px', color: '#c4b5fd', fontWeight: 700 }}>
                    {insights.experiments?.reduce((s, e) => s + e.total_doubts, 0)} doubts
                  </span>
                </div>
              )}
            </div>

            <div className="p-5 flex flex-col gap-3">
              {!insights && !loadingInsights && (
                <div className="flex items-center gap-2 py-4" style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  <AlertCircle size={15} />
                  No student interactions yet. Insights will appear once students use the AI chatbot.
                </div>
              )}

              {insights?.experiments?.filter(e => e.total_doubts > 0 || e.total_mistakes > 0).length === 0 && insights && (
                <div className="flex items-center gap-2 py-4" style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  <MessageSquare size={15} />
                  Students haven't asked any questions or made any mistakes yet. Check back later!
                </div>
              )}

              {insights?.experiments?.filter(e => e.total_doubts > 0 || e.total_mistakes > 0).map(expData => (
                <div key={expData.experiment_id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '0.875rem', overflow: 'hidden' }}>
                  {/* Experiment header row */}
                  <button
                    onClick={() => setExpandedExp(expandedExp === expData.experiment_id ? null : expData.experiment_id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all"
                    style={{ background: expandedExp === expData.experiment_id ? 'rgba(124,58,237,0.08)' : 'transparent' }}
                  >
                    <FlaskConical size={14} className="text-violet-400 flex-shrink-0" />
                    <span className="text-sm font-bold text-white flex-1 truncate">{expData.experiment_title}</span>

                    {/* Topic pills */}
                    <div className="hidden sm:flex gap-1.5 flex-wrap flex-shrink-0">
                      {expData.top_topics.slice(0, 3).map(([topic, count]) => (
                        <span key={topic} style={{ background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '999px', padding: '1px 8px', fontSize: '10px', color: '#a5b4fc', fontWeight: 600 }}>
                          {topic} ×{count}
                        </span>
                      ))}
                    </div>

                    {/* Count badges */}
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {expData.total_mistakes > 0 && (
                        <span style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '999px', padding: '2px 8px', fontSize: '11px', color: '#fca5a5', fontWeight: 700 }}>
                          {expData.total_mistakes} mistakes
                        </span>
                      )}
                      {expData.total_doubts > 0 && (
                        <span style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '999px', padding: '2px 8px', fontSize: '11px', color: '#a5b4fc', fontWeight: 700 }}>
                          {expData.total_doubts} doubts
                        </span>
                      )}
                    </div>

                    <motion.div animate={{ rotate: expandedExp === expData.experiment_id ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown size={14} style={{ color: 'var(--text-muted)', flexShrink: 0, marginLeft: '4px' }} />
                    </motion.div>
                  </button>

                  {/* Expanded doubt list */}
                  <AnimatePresence>
                    {expandedExp === expData.experiment_id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        <div className="px-4 py-3 flex flex-col gap-2.5">
                          {/* Render Top Mistakes summary if any */}
                          {expData.top_mistakes?.length > 0 && (
                            <div className="flex flex-col gap-1.5 mb-2">
                              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#fca5a5' }}>Most Common Mistakes</p>
                              <div className="flex flex-wrap gap-2">
                                {expData.top_mistakes.map(([mistake, count]) => (
                                  <span key={mistake} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', color: '#fecaca' }}>
                                    {mistake} ({count})
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {expData.recent_doubts.map((doubt, idx) => (
                            <div key={doubt.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '0.625rem', padding: '10px 12px', borderLeft: '2px solid rgba(124,58,237,0.4)' }}>
                              <div className="flex items-center gap-2 mb-1">
                                <MessageSquare size={11} className="text-violet-400" />
                                <span style={{ fontSize: '11px', color: '#a78bfa', fontWeight: 700 }}>{doubt.student_name}</span>
                                <span style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: '999px', padding: '0px 7px', fontSize: '10px', color: '#67e8f9', fontWeight: 600 }}>
                                  <Tag size={8} style={{ display: 'inline', marginRight: '3px' }} />{doubt.topic_tag}
                                </span>
                                <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-muted)' }}>
                                  {new Date(doubt.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <p style={{ fontSize: '12px', color: 'var(--text-sub)', lineHeight: '1.5' }}>{doubt.summary}</p>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </main>
    </div>
  );
}
