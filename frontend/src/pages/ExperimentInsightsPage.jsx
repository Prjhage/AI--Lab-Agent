import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';
import { Navbar } from '../components/navbar/Navbar';
import { motion } from 'framer-motion';
import { ArrowLeft, Brain, Zap, AlertCircle, MessageSquare, Tag, TerminalSquare } from 'lucide-react';

const cardAnim = {
  initial: { opacity: 0, y: 15 },
  animate: i => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, type: 'spring', stiffness: 260, damping: 22 } })
};

export default function ExperimentInsightsPage() {
  const { labId, expId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (currentUser?.role !== 'teacher') {
      navigate('/dashboard');
      return;
    }

    setLoading(true);
    api.get(`/api/ai/experiment-insights/${expId}`)
      .then(res => setData(res))
      .catch(err => setError(err.response?.data?.detail || "Failed to load insights"))
      .finally(() => setLoading(false));
  }, [expId, currentUser, navigate]);

  return (
    <div className="page-container min-h-screen flex flex-col">
      <div className="orb orb-violet" style={{ top: 0, right: '-60px' }} />
      <div className="orb orb-cyan" style={{ bottom: '-40px', left: '-60px' }} />
      <Navbar />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6 relative z-10">
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(`/lab/${labId}`)}
          className="btn-ghost flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg self-start"
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.96 }}
        >
          <ArrowLeft size={14} /> Back to Lab
        </motion.button>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-violet-400">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <Zap size={32} />
            </motion.div>
            <p className="mt-4 font-bold tracking-widest uppercase text-xs">Analyzing Student Data...</p>
          </div>
        ) : error ? (
          <div className="glass ring-glow p-8 text-center text-red-400 font-bold flex flex-col items-center gap-3">
            <AlertCircle size={32} />
            {error}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
          >
            {/* Header */}
            <div className="glass ring-glow p-6 md:p-8 flex items-center gap-5 mb-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.2))', border: '1px solid rgba(124,58,237,0.4)' }}>
                <Brain size={28} className="text-violet-300" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge-violet">AI Insights</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">{data.experiment_title}</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--text-sub)' }}>
                  Interactions from {data.unique_students} unique student(s)
                </p>
              </div>
              
              <div className="hidden sm:flex items-center gap-3">
                <div className="glass-sm px-4 py-2 text-center rounded-xl border border-red-500/20">
                  <p className="text-xl font-extrabold text-red-400">{data.total_mistakes}</p>
                  <p className="text-[10px] uppercase font-bold text-red-300/70">Mistakes</p>
                </div>
                <div className="glass-sm px-4 py-2 text-center rounded-xl border border-indigo-500/20">
                  <p className="text-xl font-extrabold text-indigo-400">{data.total_doubts}</p>
                  <p className="text-[10px] uppercase font-bold text-indigo-300/70">Doubts</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Common Doubts Panel */}
              <div className="flex flex-col gap-4">
                <h2 className="text-sm font-bold uppercase tracking-widest text-indigo-300 flex items-center gap-2">
                  <MessageSquare size={16} /> Recent Queries
                </h2>
                {data.doubts?.length === 0 ? (
                  <div className="glass p-5 text-sm text-center text-gray-400">No AI doubts captured yet.</div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {data.doubts.map((doubt, i) => (
                      <motion.div key={doubt.id} custom={i} variants={cardAnim} initial="initial" animate="animate" className="glass p-4 ring-glow">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-extrabold text-white">{doubt.student_name}</span>
                          <span className="text-[10px] text-gray-500">{new Date(doubt.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full mb-3" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', fontSize: '10px', fontWeight: 700 }}>
                          <Tag size={10} /> {doubt.topic_tag}
                        </div>
                        <p className="text-xs leading-relaxed text-gray-300 bg-white/5 p-3 rounded-lg border border-white/5">
                          {doubt.summary}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Common Mistakes Panel */}
              <div className="flex flex-col gap-4">
                <h2 className="text-sm font-bold uppercase tracking-widest text-red-300 flex items-center gap-2">
                  <TerminalSquare size={16} /> Recent Code Mistakes
                </h2>
                {data.mistakes?.length === 0 ? (
                  <div className="glass p-5 text-sm text-center text-gray-400">No code mistakes verified yet.</div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {data.mistakes.map((mistake, i) => (
                      <motion.div key={mistake.id} custom={i} variants={cardAnim} initial="initial" animate="animate" className="glass p-4 ring-glow" style={{ borderColor: 'rgba(239,68,68,0.15)' }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-extrabold text-white">{mistake.student_name}</span>
                          <span className="text-[10px] text-gray-500">{new Date(mistake.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full mb-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: '10px', fontWeight: 700 }}>
                          <AlertCircle size={10} /> {mistake.error_type}
                        </div>
                        <pre className="text-xs text-red-200 bg-red-500/10 p-3 rounded-lg border border-red-500/20 whitespace-pre-wrap font-mono">
                          {mistake.description}
                        </pre>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </motion.div>
        )}
      </main>
    </div>
  );
}
