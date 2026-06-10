import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, Beaker, GraduationCap, FlaskConical, PartyPopper, CheckCircle2 } from 'lucide-react';

const item = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 24 } },
};

const container = {
  animate: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } }
};

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [username, setUsername]             = useState('');
  const [email, setEmail]                   = useState('');
  const [role, setRole]                     = useState('student');
  const [password, setPassword]             = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass]             = useState(false);
  const [error, setError]                   = useState('');
  const [success, setSuccess]               = useState(false);
  const [loading, setLoading]               = useState(false);
  const [focused, setFocused]               = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username || !email || !password || !confirmPassword) { setError('All fields are required.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    const res = await signup(username, email, role, password);
    setLoading(false);
    if (res.success) { setSuccess(true); setTimeout(() => navigate('/dashboard'), 1000); }
    else setError(res.message);
  };

  const fields = [
    { key: 'username', label: 'Full Name', type: 'text',     icon: User,  value: username,  set: setUsername,  placeholder: 'Your display name' },
    { key: 'email',    label: 'Email',     type: 'email',    icon: Mail,  value: email,     set: setEmail,     placeholder: 'you@example.com' },
    { key: 'password', label: 'Password',  type: showPass ? 'text' : 'password', icon: Lock, value: password, set: setPassword, placeholder: '••••••••' },
    { key: 'confirm',  label: 'Confirm Password', type: showPass ? 'text' : 'password', icon: Lock, value: confirmPassword, set: setConfirmPassword, placeholder: '••••••••' },
  ];

  return (
    <div className="page-container min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <div className="orb orb-violet" style={{ top: '-100px', right: '-80px' }} />
      <div className="orb orb-cyan"   style={{ bottom: '-80px', left: '-60px' }} />

      {/* Animated orbit rings */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ border: '1px solid rgba(139,92,246,0.08)', top: '50%', left: '50%', x: '-50%', y: '-50%' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{ border: '1px solid rgba(6,182,212,0.05)', top: '50%', left: '50%', x: '-50%', y: '-50%' }}
        animate={{ rotate: -360 }}
        transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
      />

      <motion.div
        className="w-full max-w-lg relative z-10"
        variants={container}
        initial="initial"
        animate="animate"
      >
        {/* Header */}
        <motion.div variants={item} className="text-center mb-7">
          <motion.div
            className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)', boxShadow: '0 0 30px rgba(124,58,237,0.35)' }}
            whileHover={{ scale: 1.1, rotate: -5 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <Beaker size={26} className="text-white" />
          </motion.div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Create Account</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-sub)' }}>
            Join the <span className="text-animated-gradient font-semibold">VirtuaLab</span> ecosystem
          </p>
        </motion.div>

        {/* Card */}
        <motion.div variants={item} className="glass ring-glow p-7 md:p-8">
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3.5 rounded-xl text-sm font-semibold text-red-400 text-center"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="mb-4 p-3.5 rounded-xl text-sm font-semibold text-green-400 text-center"
                style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
              >
                <span className="flex items-center gap-2"><PartyPopper size={16} /> Account created! Entering your lab…</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Inputs */}
            {fields.map(({ key, label, type, icon: Icon, value, set, placeholder }) => (
              <div key={key} className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-widest pl-1" style={{ color: 'var(--text-sub)' }}>
                  {label}
                </label>
                <div className="relative">
                  <Icon
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200"
                    style={{ color: focused === key ? '#a78bfa' : '#6b7280' }}
                  />
                  <input
                    type={type}
                    value={value}
                    onChange={e => set(e.target.value)}
                    onFocus={() => setFocused(key)}
                    onBlur={() => setFocused(null)}
                    placeholder={placeholder}
                    className="glass-input pl-10 pr-4 py-3 text-sm"
                  />
                  {(key === 'password') && (
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Role Picker */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-widest pl-1" style={{ color: 'var(--text-sub)' }}>Select Role</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'student', label: 'Student',        emoji: '🎓', Icon: GraduationCap, sub: 'Join experiments' },
                  { id: 'teacher', label: 'Faculty / Teacher', emoji: '🔬', Icon: FlaskConical,  sub: 'Create labs'  },
                ].map(({ id, label, emoji, Icon, sub }) => (
                  <motion.button
                    key={id}
                    type="button"
                    onClick={() => setRole(id)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="py-3.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all duration-200 relative overflow-hidden"
                    style={{
                      background: role === id ? (id === 'student' ? 'rgba(124,58,237,0.14)' : 'rgba(6,182,212,0.12)') : 'rgba(255,255,255,0.03)',
                      borderColor: role === id ? (id === 'student' ? 'rgba(124,58,237,0.45)' : 'rgba(6,182,212,0.4)') : 'rgba(255,255,255,0.07)',
                      boxShadow: role === id ? (id === 'student' ? '0 0 18px rgba(124,58,237,0.18)' : '0 0 18px rgba(6,182,212,0.14)') : 'none',
                    }}
                  >
                    <span className="text-xl">{emoji}</span>
                    <span className="text-xs font-bold text-white">{label}</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{sub}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading || success}
              className="btn-primary w-full py-3.5 rounded-xl text-sm mt-1 flex items-center justify-center gap-2"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <motion.div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  animate={{ rotate: 360 }} transition={{ duration: 0.75, repeat: Infinity, ease: 'linear' }} />
              ) : success ? <><CheckCircle2 size={15}/> Done!</> : <> Create Free Account <ArrowRight size={15} /> </>}
            </motion.button>
          </form>
        </motion.div>

        <motion.p variants={item} className="text-center text-sm mt-4" style={{ color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">Login</Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
