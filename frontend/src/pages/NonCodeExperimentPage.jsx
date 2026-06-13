import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { Navbar } from '../components/navbar/Navbar';
import { ChatPanel } from '../components/chat/ChatPanel';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import {
  ArrowLeft, ChevronDown, ChevronUp, CheckCircle2,
  ArrowRight, Zap, Star, FileText, Bug, Target, CheckCheck, Terminal, HelpCircle,
  Brain, MessageSquare, Users, Tag, BarChart2, AlertCircle, List, PartyPopper
} from 'lucide-react';

export default function NonCodeExperimentPage() {
  const { labId, expId } = useParams();
  const navigate         = useNavigate();
  const { labs, completeExperiment, isExperimentCompleted, currentUser } = useAuth();

  const isTeacher = currentUser?.role === 'teacher';

  const lab        = labs.find(l => l.id === labId);
  const experiment = lab?.experiments?.find(e => e.id === expId);

  const [activeTab, setActiveTab]       = useState('description');
  const [currentStep, setCurrentStep]   = useState(0);
  const [expanded, setExpanded]         = useState({ 0: true });
  const [doneSteps, setDoneSteps]       = useState({});
  const [completed, setCompleted]       = useState(false);
  const [commandInputs, setCommandInputs] = useState({}); // { stepIndex: string }

  // Teacher Insights state
  const [insightData, setInsightData]     = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);

  const chat = useChat(experiment, experiment?.steps?.[currentStep]);

  const [rightWidth, setRightWidth] = useState(480);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);

    // Lock body scroll to completely prevent page-level scrolling
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100vh';

    return () => {
      window.removeEventListener('resize', handleResize);
      document.body.style.overflow = '';
      document.body.style.height = '';
    };
  }, []);

  const handleRightMouseDown = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightWidth;

    const onMouseMove = (moveEvent) => {
      const deltaX = startX - moveEvent.clientX;
      const newWidth = Math.max(260, Math.min(600, startWidth + deltaX));
      setRightWidth(newWidth);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  useEffect(() => {
    if (!lab || !experiment) navigate('/dashboard');
    if (isExperimentCompleted(labId, expId)) setCompleted(true);
  }, [lab, experiment]);

  // Lazy-fetch insights when teacher opens the Insights tab
  useEffect(() => {
    if (activeTab === 'insights' && isTeacher && expId && !insightData) {
      setInsightLoading(true);
      api.get(`/api/ai/experiment-insights/${expId}`)
        .then(d => setInsightData(d))
        .catch(() => setInsightData({ error: true }))
        .finally(() => setInsightLoading(false));
    }
  }, [activeTab, isTeacher, expId]);

  if (!lab || !experiment) return null;

  const steps = experiment.steps || [];
  const progressPct = steps.length > 0 ? (Object.keys(doneSteps).length / steps.length) * 100 : 0;

  const toggleExpand = i => setExpanded(p => ({ ...p, [i]: !p[i] }));

  const handleMoveNext = i => {
    setDoneSteps(p => ({ ...p, [i]: true }));
    const next = i + 1;
    if (next < steps.length) {
      setCurrentStep(next);
      setExpanded(p => ({ ...p, [next]: true, [i]: false }));
    } else {
      completeExperiment(labId, expId);
      setCompleted(true);
      setTimeout(() => navigate(`/lab/${labId}`), 2200);
    }
  };

  return (
    <div className="page-container h-screen max-h-screen flex flex-col overflow-hidden" style={{ minHeight: '0px', height: '100vh', maxHeight: '100vh' }}>
      <Navbar />

      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Breadcrumb */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between px-4 md:px-5 py-2.5 flex-shrink-0"
          style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-3">
            <motion.button
              onClick={() => navigate(`/lab/${labId}`)}
              className="p-1.5 rounded-lg transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
              whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}
            >
              <ArrowLeft size={14} className="text-gray-400" />
            </motion.button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{lab.title}</p>
              <h1 className="text-sm font-bold text-white leading-tight line-clamp-1">{experiment.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <AnimatePresence>
              {completed && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  className="badge-green flex items-center gap-1"
                >
                  <CheckCheck size={10} /> Completed!
                </motion.div>
              )}
            </AnimatePresence>
            <span className="text-[10px] font-semibold px-2 py-1 rounded-full"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.08)' }}>
              Step {Math.min(currentStep + 1, steps.length)}/{steps.length}
            </span>
            <div className="flex items-center gap-1 text-xs font-bold text-yellow-400">
              <Star size={12} /> {experiment.points} XP
            </div>
          </div>
        </motion.div>

        {/* 2-panel Resizable Container */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

          {/* ═══ PANEL 1: Description / Steps ═══ */}
          <div className="flex flex-col overflow-hidden flex-1" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            {/* Tabs */}
            <div className="flex flex-shrink-0 overflow-x-auto" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {['description', 'steps', ...(isTeacher ? ['insights'] : [])].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-3 text-xs font-bold uppercase tracking-wider transition-all relative whitespace-nowrap ${activeTab === tab ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  {tab === 'description' ? <><FileText size={14} /> Description</> : tab === 'steps' ? <><List size={14} /> Steps</> : <><Brain size={14} /> Insights</>}
                  {activeTab === tab && (
                    <motion.div
                      layoutId="ncTabLine"
                      className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ background: 'linear-gradient(90deg,#7c3aed,#06b6d4)' }}
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
              <AnimatePresence mode="wait">
                {/* ── Description tab ── */}
                {activeTab === 'description' && (
                  <motion.div
                    key="desc"
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                    className="px-6 py-5 flex flex-col gap-5"
                  >
                    <div>
                      <h3 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                        <FileText size={13} className="text-violet-400" /> About This Experiment
                      </h3>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-sub)' }}>{experiment.description}</p>
                    </div>

                    {experiment.testCases?.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                          <Target size={13} className="text-cyan-400" /> Checkpoints
                        </h3>
                        <div className="flex flex-col gap-2">
                          {experiment.testCases.map((tc, i) => (
                            <div key={i} className="p-3 rounded-xl text-xs"
                              style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)' }}>
                              <span className="text-violet-400 font-bold">Q: </span>
                              <span style={{ color: 'var(--text-sub)' }}>{tc.input}</span>
                              <br />
                              <span className="text-green-400 font-bold">A: </span>
                              <span style={{ color: 'var(--text-sub)' }}>{tc.expected}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="p-4 rounded-xl" style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.14)' }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Star size={11} className="text-yellow-400" />
                        <span className="text-xs font-bold text-yellow-400">Completion Reward</span>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--text-sub)' }}>
                        Complete all steps to earn <strong className="text-yellow-400">{experiment.points} XP</strong>.
                      </p>
                    </div>

                    <motion.button
                      onClick={() => setActiveTab('steps')}
                      className="btn-primary py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    >
                      Start Steps <ArrowRight size={15} />
                    </motion.button>
                  </motion.div>
                )}

                {/* ── Steps tab ── */}
                {activeTab === 'steps' && (
                  <motion.div
                    key="steps"
                    initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                    className="flex flex-col relative"
                  >
                    {/* Sticky Progress & Status Header */}
                    <div className="p-5 pb-4 flex flex-col gap-3.5 sticky top-0 z-20"
                      style={{
                        background: 'rgba(9, 10, 20, 0.85)',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)'
                      }}
                    >
                      {/* RAG badge */}
                      <div className="flex items-center gap-2 p-2.5 rounded-lg text-[10px] font-semibold"
                        style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)', color: '#c4b5fd' }}>
                        <Zap size={11} /> AI-powered steps from your uploaded PDF resources
                      </div>

                      {/* Progress bar */}
                      <div>
                        <div className="flex justify-between text-[10px] font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                          <span>Progress Tracker</span>
                          <span>{Object.keys(doneSteps).length}/{steps.length} completed</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden bg-white/5" style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: 'linear-gradient(90deg,#7c3aed,#06b6d4)' }}
                            animate={{ width: `${progressPct}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                          />
                        </div>
                      </div>

                      {/* All done banner */}
                      <AnimatePresence>
                        {completed && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                            className="p-3 rounded-xl text-center font-bold text-green-400 text-xs shadow-md"
                            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
                          >
                            <PartyPopper size={16} /> All steps complete! Redirecting to lab…
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Step cards list */}
                    <div className="px-5 py-4 flex flex-col gap-3">
                      {steps.map((step, i) => {
                        const isDone    = !!doneSteps[i];
                        const isCurrent = i === currentStep && !completed;
                        const isLocked  = i > currentStep && !isDone;
                        const isOpen    = !!expanded[i];

                        return (
                          <motion.div
                            key={step.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="rounded-xl overflow-hidden transition-colors duration-200"
                            style={{
                              border: isDone
                                ? '1px solid rgba(34,197,94,0.22)'
                                : isCurrent
                                ? '1px solid rgba(124,58,237,0.35)'
                                : '1px solid rgba(255,255,255,0.06)',
                              background: isDone
                                ? 'rgba(34,197,94,0.05)'
                                : isCurrent
                                ? 'rgba(124,58,237,0.07)'
                                : 'rgba(255,255,255,0.02)',
                              opacity: isLocked ? 0.45 : 1,
                            }}
                          >
                            {/* Step header */}
                            <button
                              onClick={() => !isLocked && toggleExpand(i)}
                              disabled={isLocked}
                              className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                            >
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                                style={{
                                  background: isDone ? 'rgba(34,197,94,0.2)' : isCurrent ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
                                  border: isDone ? '1px solid rgba(34,197,94,0.3)' : isCurrent ? '1px solid rgba(124,58,237,0.35)' : '1px solid rgba(255,255,255,0.1)',
                                  color: isDone ? '#4ade80' : isCurrent ? '#c4b5fd' : '#6b7280',
                                }}>
                                {isDone ? <CheckCircle2 size={14} /> : i + 1}
                              </div>
                              <p className="flex-1 text-xs font-bold"
                                style={{ color: isDone ? '#4ade80' : isCurrent ? '#fff' : '#9ca3af' }}>
                                {step.title.replace(/^Step\s*\d+[:\s]*/i, '').replace(/^[:\s]+/, '').trim() || `Step ${i + 1}`}
                              </p>
                              {!isLocked && (
                                isOpen
                                  ? <ChevronUp size={13} className="text-gray-500 flex-shrink-0" />
                                  : <ChevronDown size={13} className="text-gray-500 flex-shrink-0" />
                              )}
                            </button>

                            {/* Expanded content */}
                            <AnimatePresence>
                              {isOpen && !isLocked && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.25 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-4 pb-4 flex flex-col gap-3">
                                    <div className="text-xs leading-relaxed pt-2 flex flex-col gap-0.5"
                                      style={{ color: 'var(--text-sub)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                      {step.description.split('\n').map((line, li) => {
                                        const indent = line.match(/^(\s+)/)?.[1]?.length ?? 0;
                                        const level = Math.floor(indent / 2);
                                        return (
                                          <span key={li} className="block" style={{ paddingLeft: `${level * 14}px`, opacity: level === 0 ? 1 : 0.85 }}>
                                            {line.trimStart()}
                                          </span>
                                        );
                                      })}
                                    </div>

                                    {/* Command Input Area — shown only for current active step */}
                                    {isCurrent && (
                                      <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-1.5">
                                          <Terminal size={11} className="text-cyan-400" />
                                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Enter Your Command</span>
                                        </div>
                                        <div className="relative">
                                          <textarea
                                            value={commandInputs[i] || ''}
                                            onChange={e => setCommandInputs(p => ({ ...p, [i]: e.target.value }))}
                                            placeholder="Type your command here..."
                                            rows={3}
                                            className="w-full px-3 py-2.5 text-xs font-mono rounded-xl resize-none outline-none"
                                            style={{
                                              background: 'rgba(0,0,0,0.4)',
                                              border: '1px solid rgba(6,182,212,0.2)',
                                              color: '#67e8f9',
                                              boxShadow: '0 0 0 0 transparent',
                                              caretColor: '#67e8f9'
                                            }}
                                            onFocus={e => e.target.style.border = '1px solid rgba(6,182,212,0.5)'}
                                            onBlur={e => e.target.style.border = '1px solid rgba(6,182,212,0.2)'}
                                          />
                                        </div>
                                      </div>
                                    )}

                                    {!isDone && (
                                      <div className="flex gap-2 flex-wrap">
                                        {/* Debug / Hint button */}
                                        <motion.button
                                          onClick={() => chat.debugStep(step.title.replace(/^Step\s*\d+[:\s]*/i, '').replace(/^[:\s]+/, '').trim() || `Step ${i + 1}`, step.description, i, step.id)}
                                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold"
                                          style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.22)', color: '#fdba74' }}
                                          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                                        >
                                          <HelpCircle size={12} /> Hint
                                        </motion.button>

                                        {/* Verify Command button — only when command input is present */}
                                        {isCurrent && commandInputs[i]?.trim() && (
                                          <motion.button
                                            onClick={() => {
                                              const stepTitle = step.title.replace(/^Step\s*\d+[:\s]*/i, '').replace(/^[:\s]+/, '').trim() || `Step ${i + 1}`;
                                              chat.verifyCommand(commandInputs[i].trim(), step.id, stepTitle);
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold"
                                            style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', color: '#67e8f9' }}
                                            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                                          >
                                            <Terminal size={12} /> Verify Command
                                          </motion.button>
                                        )}

                                        {/* Move to Next — unlocked by AI only */}
                                        {chat.unlockedSteps?.[step.id] && (
                                          <motion.button
                                            onClick={() => handleMoveNext(i)}
                                            className="btn-primary flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold shadow-sm"
                                            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                                          >
                                            {i === steps.length - 1 ? '✅ Complete Lab' : 'Move to Next'}
                                            <ArrowRight size={12} />
                                          </motion.button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* ── Insights tab (Teacher-only) ── */}
                {activeTab === 'insights' && (
                  <motion.div
                    key="insights"
                    initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                    className="px-5 py-4 flex flex-col gap-3"
                  >
                    <div className="flex items-center gap-2 p-2.5 rounded-lg text-[10px] font-semibold"
                      style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)', color: '#c4b5fd' }}>
                      <Brain size={11} /> AI-summarized student doubts — only visible to you
                    </div>

                    {insightLoading && (
                      <div className="flex items-center gap-2 py-6 justify-center" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                          <Zap size={13} className="text-violet-400" />
                        </motion.div>
                        Fetching student insights...
                      </div>
                    )}

                    {insightData?.error && (
                      <div className="flex items-center gap-2 py-4" style={{ color: '#fca5a5', fontSize: '12px' }}>
                        <AlertCircle size={13} /> Failed to load insights.
                      </div>
                    )}

                    {insightData && !insightData.error && insightData.total_doubts === 0 && (
                      <div className="flex flex-col items-center gap-2 py-8" style={{ color: 'var(--text-muted)' }}>
                        <MessageSquare size={22} style={{ opacity: 0.3 }} />
                        <p style={{ fontSize: '12px' }}>No student doubts yet.</p>
                        <p style={{ fontSize: '11px' }}>Check back after students start chatting!</p>
                      </div>
                    )}

                    {insightData && !insightData.error && insightData.total_doubts > 0 && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { icon: <MessageSquare size={13} />, label: 'Total Doubts', value: insightData.total_doubts, color: '#a78bfa' },
                            { icon: <Users size={13} />, label: 'Students Asked', value: insightData.unique_students, color: '#67e8f9' },
                          ].map(({ icon, label, value, color }) => (
                            <div key={label} className="flex flex-col gap-0.5 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                              <div className="flex items-center gap-1.5" style={{ color }}>{icon}<span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>{label}</span></div>
                              <span className="text-xl font-extrabold text-white">{value}</span>
                            </div>
                          ))}
                        </div>

                        {insightData.top_topics?.length > 0 && (
                          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-2.5 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                              <BarChart2 size={10} /> Confusion Hotspots
                            </p>
                            <div className="flex flex-col gap-2">
                              {insightData.top_topics.map(([topic, count]) => {
                                const pct = Math.round((count / insightData.total_doubts) * 100);
                                return (
                                  <div key={topic}>
                                    <div className="flex justify-between mb-0.5">
                                      <span style={{ fontSize: '10px', color: '#c4b5fd', fontWeight: 600 }}>{topic}</span>
                                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{count} × ({pct}%)</span>
                                    </div>
                                    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                      <motion.div
                                        className="h-full rounded-full"
                                        style={{ background: 'linear-gradient(90deg,#7c3aed,#06b6d4)' }}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${pct}%` }}
                                        transition={{ duration: 0.7, ease: 'easeOut' }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="flex flex-col gap-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                            <MessageSquare size={10} /> Recent Student Questions
                          </p>
                          {insightData.doubts.map((d, i) => (
                            <motion.div
                              key={d.id}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.04 }}
                              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '2px solid rgba(124,58,237,0.5)', borderRadius: '0.625rem', padding: '9px 11px' }}
                            >
                              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                <span style={{ fontSize: '10px', color: '#a78bfa', fontWeight: 700 }}>{d.student_name}</span>
                                <span style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.25)', borderRadius: '999px', padding: '0 6px', fontSize: '9px', color: '#67e8f9', fontWeight: 600 }}>
                                  <Tag size={7} style={{ display: 'inline', marginRight: '2px' }} />{d.topic_tag}
                                </span>
                                <span style={{ marginLeft: 'auto', fontSize: '9px', color: 'var(--text-muted)' }}>
                                  {new Date(d.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <p style={{ fontSize: '11px', color: 'var(--text-sub)', lineHeight: '1.5' }}>{d.summary}</p>
                            </motion.div>
                          ))}
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Vertical Resizer Splitter */}
          <div
            onMouseDown={handleRightMouseDown}
            className="hidden lg:block w-[5px] cursor-col-resize self-stretch transition-all relative z-30 select-none group"
            style={{ background: 'rgba(255,255,255,0.01)', borderLeft: '1px solid rgba(255,255,255,0.03)', borderRight: '1px solid rgba(255,255,255,0.03)' }}
          >
            {/* Hover decorative indicator */}
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] group-hover:w-[2px] transition-all bg-white/5 group-hover:bg-cyan-500/60 group-active:bg-cyan-500 group-hover:shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
          </div>

          {/* ═══ PANEL 2: Chat Agent ═══ */}
          <div className="flex flex-col overflow-hidden flex-shrink-0" style={{ width: isLargeScreen ? `${rightWidth}px` : '100%', background: 'rgba(6,6,15,0.6)' }}>
            <ChatPanel chat={chat} experiment={experiment} />
          </div>
        </div>
      </div>
    </div>
  );
}
