import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import api from '../utils/api';
import { Navbar } from '../components/navbar/Navbar';
import { ChatPanel } from '../components/chat/ChatPanel';
import MonacoEditor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Play, Bot, CheckCircle2, FileText,
  Target, Star, Zap, Code, ChevronDown, Terminal,
  Brain, MessageSquare, Users, Tag, BarChart2, AlertCircle, Bug, List
} from 'lucide-react';

// Jupyter-style editor wrapper
function JupyterEditor({ code, setCode }) {
  return (
    <div className="flex flex-col h-full gap-2 p-3">
      {/* Jupyter toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg flex-shrink-0"
        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex gap-1.5">
          {['#ef4444','#f59e0b','#22c55e'].map(c => (
            <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
          ))}
        </div>
        <span className="text-[10px] font-mono ml-2" style={{ color: 'var(--text-muted)' }}>
          Kernel: Python 3.11 · Idle ●
        </span>
      </div>
      {/* Cell */}
      <div className="flex-1 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2 px-3 py-1.5 flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>In [1]:</span>
          <span className="badge-violet">Python</span>
        </div>
        <MonacoEditor
          height="100%"
          defaultLanguage="python"
          value={code}
          onChange={v => setCode(v || '')}
          theme="vs-dark"
          options={{ fontSize: 13, minimap: { enabled: false }, lineNumbers: 'on', scrollBeyondLastLine: false, wordWrap: 'on', padding: { top: 12 }, fontFamily: "'JetBrains Mono', monospace" }}
        />
      </div>
    </div>
  );
}

export default function ExperimentPage() {
  const { labId, expId } = useParams();
  const navigate         = useNavigate();
  const { currentUser, labs, completeExperiment, isExperimentCompleted } = useAuth();

  const lab        = labs.find(l => l.id === labId);
  const experiment = lab?.experiments?.find(e => e.id === expId);

  const isTeacher = currentUser?.role === 'teacher';
  const [activeTab, setActiveTab] = useState('description');

  // Teacher Insights state
  const [insightData, setInsightData] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [codes, setCodes] = useState({
    python: '# Write your solution here\ndef solution():\n    pass\n\n# Test your implementation\nresult = solution()\nprint(result)\n',
    javascript: `// Write your JavaScript solution here\nfunction solution() {\n    return null;\n}\nconsole.log(solution());\n`,
    cpp: `// Write your C++ solution here\n#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}\n`,
    java: `// Write your Java solution here\npublic class Solution {\n    public static void main(String[] args) {\n        \n    }\n}\n`
  });

  const code = codes[selectedLanguage];
  const setCode = (newVal) => setCodes(prev => ({ ...prev, [selectedLanguage]: newVal }));
  const chat       = useChat(experiment, null, code);

  const [output, setOutput]       = useState('');
  const [running, setRunning]     = useState(false);
  const [completed, setCompleted] = useState(false);

  // Bottom Interactive Tabbed Console States
  const [bottomPanelHeight, setBottomPanelHeight] = useState(200);
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(true);
  const [bottomActiveTab, setBottomActiveTab] = useState('testcases');
  const [lastRunResults, setLastRunResults] = useState(null);
  const [activeTestCaseIdx, setActiveTestCaseIdx] = useState(0);

  // Vertical Resizable Panel States
  const [leftWidth, setLeftWidth] = useState(320);
  const [rightWidth, setRightWidth] = useState(480);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);

  // Monaco Editor References for highlighting
  const [editorInstance, setEditorInstance] = useState(null);
  const [monacoInstance, setMonacoInstance] = useState(null);
  const [decorations, setDecorations] = useState([]);

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

  const handleLeftMouseDown = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftWidth;

    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(220, Math.min(600, startWidth + deltaX));
      setLeftWidth(newWidth);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleRightMouseDown = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightWidth;

    const onMouseMove = (moveEvent) => {
      const deltaX = startX - moveEvent.clientX;
      const newWidth = Math.max(220, Math.min(500, startWidth + deltaX));
      setRightWidth(newWidth);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleBottomMouseDown = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = bottomPanelHeight;

    const onMouseMove = (moveEvent) => {
      const deltaY = startY - moveEvent.clientY; // Dragging UP increases height
      const newHeight = Math.max(80, Math.min(450, startHeight + deltaY));
      setBottomPanelHeight(newHeight);
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

  // Fetch insights when teacher switches to insights tab
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

  const handleRun = async () => {
    setRunning(true);
    setOutput(`▶ Initializing secure VirtuaLab ${selectedLanguage} Sandbox subprocess...\n`);
    try {
      const res = await api.post('/api/sandbox/run', {
        code,
        language: selectedLanguage,
        experiment_id: experiment.id
      });

      setLastRunResults(res);
      setIsBottomPanelOpen(true);
      setBottomActiveTab(res.test_case_results && res.test_case_results.length > 0 ? 'testcases' : 'terminal');

      let outText = `▶ Executing code in VirtuaLab Sandbox...\n\n`;
      if (res.test_case_results && res.test_case_results.length > 0) {
        res.test_case_results.forEach((tc, idx) => {
          if (tc.passed) {
            outText += `✓ Test Case ${idx + 1}: PASSED (status: ${tc.status})\n`;
          } else {
            outText += `❌ Test Case ${idx + 1}: FAILED\n` +
                       `   Input:    ${tc.input.trim()}\n` +
                       `   Expected: ${tc.expected.trim()}\n` +
                       `   Actual:   ${tc.actual.trim()}\n` +
                       (tc.stderr ? `   Error:    ${tc.stderr.trim()}\n` : '');
          }
        });
      } else {
        outText += res.stdout || '';
      }

      if (res.stderr) {
        outText += `\n⚠️ Execution Error Console:\n${res.stderr}\n`;
      }

      outText += `\n[i] Compilation Status: ${res.status}\n` +
                 `[i] Time limit threshold: ${res.time}s · Memory footprint: ${res.memory} MB\n`;

      if (res.all_passed) {
        outText += `\n🎉 [SUCCESS] All test cases validated successfully!\n`;
        setOutput(outText);
        if (!completed) {
          await completeExperiment(labId, expId);
          setCompleted(true);
        }
      } else {
        outText += `\n❌ [FAILURE] Code does not satisfy all validation assertions.\n`;
        setOutput(outText);
      }
    } catch (err) {
      console.error("Sandbox code execution error:", err);
      setOutput(`❌ Sandbox Error: Failed to execute code in compilation chamber.\nDetails: ${err.message || 'Connection refused'}`);
      setIsBottomPanelOpen(true);
      setBottomActiveTab('terminal');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="page-container h-screen max-h-screen flex flex-col overflow-hidden" style={{ minHeight: '0px', height: '100vh', maxHeight: '100vh' }}>
      <Navbar />

      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Top breadcrumb */}
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
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="badge-green flex items-center gap-1"
                >
                  <CheckCircle2 size={10} /> Completed
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex items-center gap-1 text-xs font-bold text-yellow-400">
              <Star size={12} /> {experiment.points} XP
            </div>
          </div>
        </motion.div>

        {/* 3-Panel Resizable Container */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

          {/* ═══ PANEL 1: Description / Steps ═══ */}
          <div className="flex flex-col overflow-hidden flex-shrink-0" style={{ width: isLargeScreen ? `${leftWidth}px` : '100%', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            {/* Tabs */}
            <div className="flex flex-shrink-0 overflow-x-auto" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {['description', 'steps', ...(isTeacher ? ['insights'] : [])].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-1.5 px-3 py-3 text-xs font-bold uppercase tracking-wider transition-all relative whitespace-nowrap
                    ${activeTab === tab ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  {tab === 'description' ? <><FileText size={14} /> Description</> : tab === 'steps' ? <><List size={14} /> Steps</> : <><Brain size={14} /> Insights</>}
                  {activeTab === tab && (
                    <motion.div
                      layoutId="expTabLine"
                      className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ background: 'linear-gradient(90deg,#7c3aed,#06b6d4)' }}
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {activeTab === 'description' ? (
                  <motion.div
                    key="desc"
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="px-5 py-4 flex flex-col gap-5"
                  >
                    <div>
                      <h3 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                        <FileText size={13} className="text-violet-400" /> Problem Statement
                      </h3>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-sub)' }}>{experiment.description}</p>
                    </div>

                    {experiment.test_cases?.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                          <Target size={13} className="text-cyan-400" /> Test Cases
                        </h3>
                        <div className="flex flex-col gap-2">
                          {experiment.test_cases.map((tc, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="p-3 rounded-xl text-[11px] font-mono"
                              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}
                            >
                              <div className="flex gap-2 mb-1">
                                <span className="text-violet-400 font-bold">IN:</span>
                                <span className="text-white">{tc.input}</span>
                              </div>
                              <div className="flex gap-2">
                                <span className="text-green-400 font-bold">OUT:</span>
                                <span className="text-white">{tc.expected}</span>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="p-3.5 rounded-xl" style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.15)' }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Star size={11} className="text-yellow-400" />
                        <span className="text-xs font-bold text-yellow-400">Reward</span>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--text-sub)' }}>
                        Pass all test cases to earn <strong className="text-yellow-400">{experiment.points} XP</strong>.
                      </p>
                    </div>
                  </motion.div>
                ) : activeTab === 'steps' ? (
                  <motion.div
                    key="steps"
                    initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="px-5 py-4 flex flex-col gap-3"
                  >
                    <div className="flex items-center gap-2 p-2.5 rounded-lg text-[10px] font-semibold"
                      style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)', color: '#c4b5fd' }}>
                      <Zap size={11} /> RAG-generated from uploaded PDF resources
                    </div>
                    {experiment.steps?.map((step, i) => (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="rounded-xl overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        <div className="flex items-center gap-3 px-4 py-3">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                            style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)', color: '#c4b5fd' }}>
                            {i + 1}
                          </div>
                          <p className="text-xs font-bold text-white">{step.title.replace(/^Step\s*\d+[:\s]*/i, '').replace(/^[:\s]+/, '').trim() || `Step ${i + 1}`}</p>
                        </div>
                        <p className="px-4 pb-3 text-[11px] leading-relaxed" style={{ color: 'var(--text-sub)' }}>
                          {step.description}
                        </p>
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  /* ── INSIGHTS TAB (Teacher only) ── */
                  <motion.div
                    key="insights"
                    initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="px-4 py-4 flex flex-col gap-3"
                  >
                    {/* Header banner */}
                    <div className="flex items-center gap-2 p-2.5 rounded-lg text-[10px] font-semibold"
                      style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)', color: '#c4b5fd' }}>
                      <Brain size={11} /> AI-summarized student doubts — only visible to you
                    </div>

                    {/* Loading */}
                    {insightLoading && (
                      <div className="flex items-center gap-2 py-6 justify-center" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                          <Zap size={13} className="text-violet-400" />
                        </motion.div>
                        Fetching student insights...
                      </div>
                    )}

                    {/* Error */}
                    {insightData?.error && (
                      <div className="flex items-center gap-2 py-4" style={{ color: '#fca5a5', fontSize: '12px' }}>
                        <AlertCircle size={13} /> Failed to load insights.
                      </div>
                    )}

                    {insightData && !insightData.error && insightData.total_doubts === 0 && insightData.total_mistakes === 0 && (
                      <div className="flex flex-col items-center gap-2 py-8" style={{ color: 'var(--text-muted)' }}>
                        <MessageSquare size={22} style={{ opacity: 0.3 }} />
                        <p style={{ fontSize: '12px' }}>No student insights yet.</p>
                        <p style={{ fontSize: '11px' }}>Check back after students start participating!</p>
                      </div>
                    )}

                    {insightData && !insightData.error && (insightData.total_doubts > 0 || insightData.total_mistakes > 0) && (
                      <>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { icon: <MessageSquare size={13} />, label: 'Total Doubts', value: insightData.total_doubts, color: '#a78bfa' },
                            { icon: <Bug size={13} />, label: 'Total Mistakes', value: insightData.total_mistakes, color: '#f87171' },
                            { icon: <Users size={13} />, label: 'Students Asked', value: insightData.unique_students, color: '#67e8f9' },
                          ].map(({ icon, label, value, color }) => (
                            <div key={label} className="flex flex-col gap-0.5 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                              <div className="flex items-center gap-1.5" style={{ color }}>{icon}<span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>{label}</span></div>
                              <span className="text-xl font-extrabold text-white">{value}</span>
                            </div>
                          ))}
                        </div>

                        {insightData.top_mistakes?.length > 0 && (
                          <div className="rounded-xl p-3 mt-2" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-2.5 flex items-center gap-1.5" style={{ color: '#fca5a5' }}>
                              <Bug size={10} /> Common Coding Mistakes
                            </p>
                            <div className="flex flex-col gap-2">
                              {insightData.top_mistakes.map(([mistake, count]) => {
                                const pct = Math.round((count / insightData.total_mistakes) * 100);
                                return (
                                  <div key={mistake}>
                                    <div className="flex justify-between mb-0.5">
                                      <span style={{ fontSize: '10px', color: '#fecaca', fontWeight: 600 }}>{mistake}</span>
                                      <span style={{ fontSize: '10px', color: '#fca5a5' }}>{count} × ({pct}%)</span>
                                    </div>
                                    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(239,68,68,0.1)' }}>
                                      <motion.div
                                        className="h-full rounded-full"
                                        style={{ background: 'linear-gradient(90deg,#ef4444,#f87171)' }}
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

                        {/* Topic breakdown */}
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

                        {/* Doubt feed */}
                        {insightData.doubts?.length > 0 && (
                          <div className="flex flex-col gap-2 mt-2">
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
                        )}
                        
                        {insightData.mistakes?.length > 0 && (
                          <div className="flex flex-col gap-2 mt-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                              <Bug size={10} /> Recent Code Failures
                            </p>
                            {insightData.mistakes.map((m, i) => (
                              <motion.div
                                key={m.id}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.04 }}
                                style={{ background: 'rgba(239,68,68,0.02)', border: '1px solid rgba(239,68,68,0.1)', borderLeft: '2px solid rgba(239,68,68,0.5)', borderRadius: '0.625rem', padding: '9px 11px' }}
                              >
                                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                  <span style={{ fontSize: '10px', color: '#fca5a5', fontWeight: 700 }}>{m.student_name}</span>
                                  <span style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '999px', padding: '0 6px', fontSize: '9px', color: '#fca5a5', fontWeight: 600 }}>
                                    <Bug size={7} style={{ display: 'inline', marginRight: '2px' }} />{m.error_type}
                                  </span>
                                  <span style={{ marginLeft: 'auto', fontSize: '9px', color: 'var(--text-muted)' }}>
                                    {new Date(m.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                                <pre style={{ fontSize: '10px', color: '#fecaca', background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '4px', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                                  {m.description}
                                </pre>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Left Vertical Resizer Splitter */}
          <div
            onMouseDown={handleLeftMouseDown}
            className="hidden lg:block w-[5px] cursor-col-resize self-stretch transition-all relative z-30 select-none group"
            style={{ background: 'rgba(255,255,255,0.01)', borderLeft: '1px solid rgba(255,255,255,0.03)', borderRight: '1px solid rgba(255,255,255,0.03)' }}
          >
            {/* Hover decorative indicator */}
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] group-hover:w-[2px] transition-all bg-white/5 group-hover:bg-violet-500/60 group-active:bg-violet-500 group-hover:shadow-[0_0_8px_rgba(124,58,237,0.5)]" />
          </div>

          {/* ═══ PANEL 2: Code Editor ═══ */}
          <div className="flex flex-col overflow-hidden flex-1" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            {/* Editor header */}
            <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
              style={{ background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2">
                <Code size={13} className="text-violet-400" />
                <span className="text-xs font-bold text-white">
                  {lab.editor_type === 'jupyter' ? 'Jupyter Notebook' : 'Monaco Editor'}
                </span>
                
                {lab.editor_type === 'monaco' || !lab.editor_type ? (
                  <select
                    value={selectedLanguage}
                    onChange={e => setSelectedLanguage(e.target.value)}
                    className="ml-2 bg-white/5 border border-white/10 hover:border-white/20 transition-all rounded-lg px-2.5 py-1 text-[11px] font-bold text-violet-300 focus:outline-none cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <option value="python" style={{ background: '#0e111d', color: '#fff' }}>🐍 Python 3</option>
                    <option value="javascript" style={{ background: '#0e111d', color: '#fff' }}>⚡ JavaScript (Node)</option>
                    <option value="cpp" style={{ background: '#0e111d', color: '#fff' }}>⚙️ C++ (GCC)</option>
                    <option value="java" style={{ background: '#0e111d', color: '#fff' }}>☕ Java (OpenJDK)</option>
                  </select>
                ) : (
                  <span className="badge-violet">Python 3</span>
                )}
              </div>
              <div className="flex gap-1">
                {['#ef4444','#f59e0b','#22c55e'].map(c => (
                  <div key={c} className="w-2 h-2 rounded-full" style={{ background: c, opacity: 0.7 }} />
                ))}
              </div>
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-hidden relative">
              <style>{`
                .monaco-error-line {
                  background-color: rgba(239, 68, 68, 0.2) !important;
                }
                .monaco-inline-fix {
                  color: #10b981 !important;
                  font-style: italic;
                  opacity: 0.9;
                  margin-left: 16px;
                }
              `}</style>
              {lab.editor_type === 'jupyter'
                ? <JupyterEditor code={code} setCode={setCode} />
                : <MonacoEditor
                    height="100%"
                    language={selectedLanguage}
                    value={code}
                    onChange={v => {
                      setCode(v || '');
                      if (decorations.length > 0 && editorInstance) {
                        setDecorations(editorInstance.deltaDecorations(decorations, []));
                      }
                    }}
                    onMount={(editor, monaco) => {
                      setEditorInstance(editor);
                      setMonacoInstance(monaco);
                    }}
                    theme="vs-dark"
                    options={{ fontSize: 13, minimap: { enabled: false }, lineNumbers: 'on', scrollBeyondLastLine: false, wordWrap: 'on', padding: { top: 14 }, fontFamily: "'JetBrains Mono','Fira Code',monospace", fontLigatures: true }}
                  />
              }
            </div>

            {/* Horizontal Resizer Splitter */}
            {isBottomPanelOpen && (
              <div
                onMouseDown={handleBottomMouseDown}
                className="h-[5px] cursor-row-resize w-full transition-all relative z-20 select-none group flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.01)', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              >
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] group-hover:h-[2px] bg-white/5 group-hover:bg-violet-500/60 group-active:bg-violet-500 group-hover:shadow-[0_0_8px_rgba(124,58,237,0.5)] transition-all" />
              </div>
            )}

            {/* Bottom Console Panel */}
            <div
              className="flex-shrink-0 flex flex-col overflow-hidden"
              style={{
                height: isBottomPanelOpen ? `${bottomPanelHeight}px` : '40px',
                background: 'rgba(5,5,12,0.95)',
                borderTop: !isBottomPanelOpen ? '1px solid rgba(255,255,255,0.05)' : 'none'
              }}
            >
              {/* Tab Header Bar */}
              <div className="flex items-center justify-between px-4 py-1.5 flex-shrink-0"
                style={{ background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setIsBottomPanelOpen(true); setBottomActiveTab('testcases'); }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      bottomActiveTab === 'testcases' && isBottomPanelOpen
                        ? 'text-white'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                    style={{
                      background: bottomActiveTab === 'testcases' && isBottomPanelOpen ? 'rgba(255,255,255,0.06)' : 'transparent',
                      border: bottomActiveTab === 'testcases' && isBottomPanelOpen ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent'
                    }}
                  >
                    🧪 Test Cases
                  </button>
                  <button
                    onClick={() => { setIsBottomPanelOpen(true); setBottomActiveTab('terminal'); }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      bottomActiveTab === 'terminal' && isBottomPanelOpen
                        ? 'text-white'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                    style={{
                      background: bottomActiveTab === 'terminal' && isBottomPanelOpen ? 'rgba(255,255,255,0.06)' : 'transparent',
                      border: bottomActiveTab === 'terminal' && isBottomPanelOpen ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent'
                    }}
                  >
                    🖥 Terminal Output
                  </button>
                </div>

                {/* Minimize / Expand Toggle */}
                <button
                  onClick={() => setIsBottomPanelOpen(!isBottomPanelOpen)}
                  className="p-1 rounded-lg hover:bg-white/5 transition-all text-gray-400 hover:text-white cursor-pointer"
                >
                  <ChevronDown size={14} style={{ transform: isBottomPanelOpen ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
                </button>
              </div>

              {/* Panel Content Body */}
              {isBottomPanelOpen && (
                <div className="flex-1 overflow-y-auto p-4">
                  {bottomActiveTab === 'testcases' ? (
                    <div className="flex flex-col gap-3.5 h-full">
                      {experiment.test_cases && experiment.test_cases.length > 0 ? (
                        <div className="flex flex-col gap-3">
                          {/* Case Select Pills Row */}
                          <div className="flex items-center gap-2 flex-wrap border-b border-white/5 pb-2 flex-shrink-0">
                            {experiment.test_cases.map((tc, idx) => {
                              const result = lastRunResults?.test_case_results?.[idx];
                              const passed = result?.passed;
                              const hasRun = !!result;
                              const isSelected = activeTestCaseIdx === idx;

                              return (
                                <button
                                  key={idx}
                                  onClick={() => setActiveTestCaseIdx(idx)}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                    isSelected
                                      ? 'text-white bg-white/10 border border-white/15'
                                      : 'text-gray-400 hover:text-gray-200 bg-white/3 border border-transparent'
                                  }`}
                                >
                                  <div
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      hasRun
                                        ? passed
                                          ? 'bg-green-400 shadow-[0_0_6px_#22c55e]'
                                          : 'bg-red-400 shadow-[0_0_6px_#ef4444]'
                                        : 'bg-gray-500'
                                    }`}
                                  />
                                  Case {idx + 1}
                                </button>
                              );
                            })}
                          </div>

                          {/* Selected Case Detail Block */}
                          {experiment.test_cases[activeTestCaseIdx] && (() => {
                            const tc = experiment.test_cases[activeTestCaseIdx];
                            const result = lastRunResults?.test_case_results?.[activeTestCaseIdx];
                            const passed = result?.passed;
                            const hasRun = !!result;

                            return (
                              <div className="flex flex-col gap-3.5">
                                {/* Case Status Bar */}
                                {hasRun && (
                                  <div
                                    className="p-2.5 rounded-lg flex items-center justify-between text-xs font-semibold"
                                    style={{
                                      background: passed ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                                      border: `1px solid ${passed ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.18)'}`,
                                      color: passed ? '#86efac' : '#fca5a5'
                                    }}
                                  >
                                    <span className="flex items-center gap-1.5">
                                      {passed ? '✓ All assertions passed for this case.' : '❌ Wrong Answer: output does not match expected value.'}
                                    </span>
                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/5">
                                      {result.status}
                                    </span>
                                  </div>
                                )}

                                {/* Inputs and Outputs Box */}
                                <div className="space-y-3">
                                  {/* Input Area */}
                                  <div>
                                    <p className="text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Input:</p>
                                    <pre className="p-3 rounded-lg text-xs font-mono text-white bg-black/40 border border-white/5 overflow-x-auto leading-relaxed">
                                      {tc.input || '(empty)'}
                                    </pre>
                                  </div>

                                  {/* Expected Output Area */}
                                  <div>
                                    <p className="text-[10px] font-bold text-cyan-400 mb-1.5 uppercase tracking-wider">Expected Output:</p>
                                    <pre className="p-3 rounded-lg text-xs font-mono text-cyan-300 bg-black/40 border border-white/5 overflow-x-auto leading-relaxed">
                                      {tc.expected}
                                    </pre>
                                  </div>

                                  {/* Actual Output Area */}
                                  {hasRun && (
                                    <div>
                                      <p className={`text-[10px] font-bold mb-1.5 uppercase tracking-wider ${passed ? 'text-green-400' : 'text-red-400'}`}>
                                        Your Output:
                                      </p>
                                      <pre
                                        className="p-3 rounded-lg text-xs font-mono border overflow-x-auto leading-relaxed"
                                        style={{
                                          background: 'rgba(0,0,0,0.4)',
                                          borderColor: passed ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                          color: passed ? '#86efac' : '#fca5a5'
                                        }}
                                      >
                                        {result.actual || '(empty)'}
                                      </pre>
                                    </div>
                                  )}

                                  {/* Stderr Error Console Area */}
                                  {hasRun && result.stderr && (
                                    <div>
                                      <p className="text-[10px] font-bold text-yellow-500 mb-1.5 uppercase tracking-wider">Execution Error Console:</p>
                                      <pre className="p-3 rounded-lg text-xs font-mono text-yellow-300 bg-yellow-950/20 border border-yellow-500/10 overflow-x-auto leading-relaxed">
                                        {result.stderr}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No validation test cases declared for this experiment.</p>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col">
                      {output ? (
                        <pre className="text-[11px] font-mono text-green-300 whitespace-pre-wrap leading-relaxed">
                          {output}
                        </pre>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 italic text-xs py-8">
                          <span>No execution output logs. Click "Run Code" above to evaluate.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action bar */}
            <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
              style={{ background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <motion.button
                onClick={() => {
                  let customPrompt = "Analyze my current code implementation. Detect any bugs, formatting issues, or optimizations.";
                  if (lastRunResults) {
                    const allPassed = lastRunResults.test_case_results?.every(r => r.passed);
                    customPrompt += `\n\n[Sandbox Unit Test execution status: ${
                      allPassed ? "SUCCESS - All unit test cases passed!" : "FAILURE - Some test cases failed."
                    }]\nStdout: ${lastRunResults.stdout || 'None'}\nStderr: ${lastRunResults.stderr || 'None'}`;
                  }
                  chat.askAgent(code, customPrompt);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all"
                style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)', color: '#c4b5fd' }}
                whileHover={{ scale: 1.04, background: 'rgba(124,58,237,0.2)' }}
                whileTap={{ scale: 0.96 }}
              >
                <Bot size={13} /> Ask AI Agent
              </motion.button>
              <motion.button
                onClick={async () => {
                  const resText = await chat.findMistake(code);
                  console.log("AI Mistake Response:", resText);
                  if (resText && editorInstance && monacoInstance) {
                    const regex = /\[LINE:\s*(\d+)\]\s*\[FIX:\s*([\s\S]*?)\]/gi;
                    let match;
                    let newDecsList = [];
                    const model = editorInstance.getModel();
                    while ((match = regex.exec(resText)) !== null) {
                      const lineNum = parseInt(match[1]);
                      const fix = match[2].trim().replace(/\n/g, ' ');
                      console.log(`Parsed -> Line: ${lineNum}, Fix: ${fix}`);
                      if (lineNum > 0 && lineNum <= model.getLineCount()) {
                        const maxCol = model.getLineMaxColumn(lineNum);
                        
                        // 1. Red background decoration
                        newDecsList.push({
                          range: new monacoInstance.Range(lineNum, 1, lineNum, 1),
                          options: {
                            description: 'error-line-bg',
                            isWholeLine: true,
                            className: 'monaco-error-line',
                            hoverMessage: { value: `**AI Suggested Fix:**\n\`\`\`cpp\n${fix}\n\`\`\`` }
                          }
                        });

                        // 2. Inline ghost text decoration at the end of the line
                        newDecsList.push({
                          range: new monacoInstance.Range(lineNum, 1, lineNum, maxCol),
                          options: {
                            description: 'error-line-fix-text',
                            after: {
                              content: `    // FIX: ${fix}`,
                              inlineClassName: 'monaco-inline-fix'
                            }
                          }
                        });
                      }
                    }
                    if (newDecsList.length > 0) {
                      const newDecs = editorInstance.deltaDecorations(decorations, newDecsList);
                      setDecorations(newDecs);
                    } else {
                      console.warn("Regex found no matches in AI response.");
                    }
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}
                whileHover={{ scale: 1.04, background: 'rgba(239,68,68,0.15)' }} whileTap={{ scale: 0.96 }}
              >
                <Bug size={13} /> Find Mistake
              </motion.button>
              <div className="flex-1" />
              <motion.button
                onClick={handleRun}
                disabled={running}
                className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold shadow-md disabled:opacity-60"
                style={{ boxShadow: '0 0 14px rgba(124,58,237,0.3)' }}
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              >
                {running ? (
                  <>
                    <motion.div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }} transition={{ duration: 0.75, repeat: Infinity, ease: 'linear' }} />
                    Running…
                  </>
                ) : <><Play size={12} /> Run Code</>}
              </motion.button>
              <motion.button
                onClick={async () => {
                  if (!completed) {
                    await completeExperiment(labId, expId);
                    setCompleted(true);
                  }
                }}
                disabled={completed}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold shadow-md transition-all ${completed ? 'bg-green-600/30 text-green-400 cursor-not-allowed border border-green-500/30' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
                whileHover={!completed ? { scale: 1.04 } : {}}
                whileTap={!completed ? { scale: 0.96 } : {}}
              >
                {completed ? <><CheckCircle2 size={12} /> Submitted</> : 'Submit Assignment'}
              </motion.button>
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

          {/* ═══ PANEL 3: Chat ═══ */}
          <div className="flex flex-col overflow-hidden flex-shrink-0" style={{ width: isLargeScreen ? `${rightWidth}px` : '100%', background: 'rgba(6,6,15,0.6)' }}>
            <ChatPanel
              chat={chat}
              onSuggestAlternate={chat.suggestAlternate}
              onSuggestTestCases={chat.suggestTestCases}
              currentCode={code}
              experiment={experiment}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
