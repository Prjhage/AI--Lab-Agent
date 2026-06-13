import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/navbar/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Trash2, Upload, FileText, X,
  FlaskConical, Save, CheckCircle, Target, Star
} from 'lucide-react';

const item = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 270, damping: 22 } },
};
const container = { animate: { transition: { staggerChildren: 0.08 } } };

export default function AddExperiment() {
  const { labId } = useParams();
  const navigate  = useNavigate();
  const { currentUser, labs, addExperiment } = useAuth();
  const lab = labs.find(l => l.id === labId);
  const isTeacher = currentUser?.role === 'teacher';

  useEffect(() => { if (!isTeacher || !lab) navigate('/dashboard'); }, [isTeacher, lab]);

  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints]         = useState('');
  const [testCases, setTestCases]   = useState([{ input: '', expected: '' }]);
  const [file, setFile]             = useState(null);
  const [dragOver, setDragOver]     = useState(false);
  const [error, setError]           = useState('');
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);

  const addTC  = () => setTestCases(p => [...p, { input: '', expected: '' }]);
  const removeTC = i => setTestCases(p => p.filter((_, idx) => idx !== i));
  const updateTC = (i, f, v) => setTestCases(p => p.map((tc, idx) => idx === i ? { ...tc, [f]: v } : tc));

  const handleFileDrop = e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) setFile(f); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim())       { setError('Experiment title is required.'); return; }
    if (!description.trim()) { setError('Description is required.'); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    const validTCs = testCases.filter(tc => tc.input.trim() && tc.expected.trim());
    try {
      await addExperiment(labId, title.trim(), description.trim(), validTCs, points, file);
      setSaved(true);
      setTimeout(() => navigate(`/lab/${labId}`), 1200);
    } catch (err) {
      setError(err.message || 'Failed to create experiment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container min-h-screen flex flex-col">
      <div className="orb orb-violet" style={{ top: '-40px', right: '-60px' }} />
      <div className="orb orb-cyan"   style={{ bottom: '-60px', left: '-40px' }} />
      <Navbar />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6 relative z-10">
        <motion.button
          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(`/lab/${labId}`)}
          className="btn-ghost flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg self-start"
          whileHover={{ x: -2 }} whileTap={{ scale: 0.96 }}
        >
          <ArrowLeft size={14} /> Back to Lab
        </motion.button>

        <motion.div variants={container} initial="initial" animate="animate" className="flex flex-col gap-5">
          {/* Header */}
          <motion.div variants={item}>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#0891b2)' }}>
                <FlaskConical size={15} className="text-white" />
              </div>
              <h1 className="text-2xl font-extrabold text-white">Add New Experiment</h1>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-sub)' }}>
              Lab: <span style={{ color: '#a78bfa' }} className="font-semibold">{lab?.title}</span>
            </p>
          </motion.div>

          <AnimatePresence>
            {error && (
              <motion.div key="err" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="p-3.5 rounded-xl text-sm font-semibold text-red-400 text-center"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
                {error}
              </motion.div>
            )}
            {saved && (
              <motion.div key="ok" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="p-3.5 rounded-xl text-sm font-semibold text-green-400 text-center flex items-center justify-center gap-2"
                style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <CheckCircle size={16} /> Experiment added! Redirecting…
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* — Basic Info — */}
            <motion.div variants={item} className="glass ring-glow p-6 flex flex-col gap-4">
              <h2 className="text-sm font-bold text-white pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                Basic Information
              </h2>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-widest pl-1" style={{ color: 'var(--text-sub)' }}>Title *</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="E.g., Binary Search Tree Implementation"
                  className="glass-input px-4 py-3 text-sm" required />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-widest pl-1" style={{ color: 'var(--text-sub)' }}>Description *</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Describe objectives, requirements, and expected outcomes…"
                  rows={5} className="glass-input px-4 py-3 text-sm resize-none" required />
              </div>

              <div className="flex flex-col gap-1.5 max-w-xs">
                <label className="text-xs font-bold uppercase tracking-widest pl-1" style={{ color: 'var(--text-sub)' }}>
                  <Star size={10} className="inline text-yellow-400 mr-1" />XP Points
                </label>
                <input type="number" value={points} onChange={e => setPoints(e.target.value)}
                  placeholder="E.g., 100" min="1" max="1000"
                  className="glass-input px-4 py-3 text-sm" />
              </div>
            </motion.div>

            {/* — Test Cases — */}
            {lab?.type === 'code' && (
              <motion.div variants={item} className="glass ring-glow p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Target size={14} className="text-cyan-400" /> Test Cases
                </h2>
                <motion.button type="button" onClick={addTC}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg"
                  style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.22)', color: '#c4b5fd' }}
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                  <Plus size={12} /> Add Test Case
                </motion.button>
              </div>

              <div className="flex flex-col gap-2.5">
                <AnimatePresence>
                  {testCases.map((tc, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12, height: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                      className="flex items-center gap-2.5 p-3 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                        style={{ background: 'rgba(124,58,237,0.2)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.25)' }}>
                        {i + 1}
                      </div>
                      <textarea value={tc.input} onChange={e => updateTC(i, 'input', e.target.value)}
                        placeholder="Input" rows={3} className="glass-input flex-1 px-3 py-2 text-xs font-mono resize-y" />
                      <span className="text-gray-600 font-bold text-xs flex-shrink-0">→</span>
                      <textarea value={tc.expected} onChange={e => updateTC(i, 'expected', e.target.value)}
                        placeholder="Expected Output" rows={3} className="glass-input flex-1 px-3 py-2 text-xs font-mono resize-y" />
                      {testCases.length > 1 && (
                        <motion.button type="button" onClick={() => removeTC(i)}
                          className="p-1.5 rounded-lg flex-shrink-0 transition-all"
                          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171' }}
                          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                          <Trash2 size={12} />
                        </motion.button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              </motion.div>
            )}

            {/* — File Upload — */}
            <motion.div variants={item} className="glass ring-glow p-6 flex flex-col gap-4">
              <h2 className="text-sm font-bold text-white pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                Resource Document <span className="font-normal text-gray-500">(Optional)</span>
              </h2>

              {file ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 p-3.5 rounded-xl"
                  style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}
                >
                  <FileText className="text-violet-400 flex-shrink-0" size={20} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{file.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(1)} KB — ready for RAG processing</p>
                  </div>
                  <motion.button type="button" onClick={() => setFile(null)}
                    className="p-1 text-gray-400 hover:text-white transition-colors"
                    whileHover={{ rotate: 90 }} transition={{ duration: 0.2 }}>
                    <X size={16} />
                  </motion.button>
                </motion.div>
              ) : (
                <label
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                  className="flex flex-col items-center justify-center gap-3 py-10 rounded-xl cursor-pointer transition-all duration-300"
                  style={{
                    border: `2px dashed ${dragOver ? 'rgba(124,58,237,0.55)' : 'rgba(255,255,255,0.08)'}`,
                    background: dragOver ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.02)',
                  }}
                >
                  <motion.div
                    animate={dragOver ? { scale: 1.15, y: -4 } : { scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <Upload className="text-violet-400" size={28} />
                  </motion.div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-white">Drop PDF or image here</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      or <span className="text-violet-400 underline">browse files</span> — used by RAG for step generation
                    </p>
                  </div>
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => setFile(e.target.files[0])} className="hidden" />
                </label>
              )}
            </motion.div>

            {/* Actions */}
            <motion.div variants={item} className="grid grid-cols-2 gap-4">
              <motion.button type="button" onClick={() => navigate(`/lab/${labId}`)}
                className="btn-ghost py-3.5 rounded-xl text-sm font-bold"
                whileTap={{ scale: 0.97 }}>
                Cancel
              </motion.button>
              <motion.button type="submit" disabled={saving || saved}
                className="btn-primary py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg"
                style={{ boxShadow: '0 0 20px rgba(124,58,237,0.28)' }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                {saving ? (
                  <motion.div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    animate={{ rotate: 360 }} transition={{ duration: 0.75, repeat: Infinity, ease: 'linear' }} />
                ) : saved ? '✓ Added!' : <><Save size={15} /> Add Experiment</>}
              </motion.button>
            </motion.div>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
