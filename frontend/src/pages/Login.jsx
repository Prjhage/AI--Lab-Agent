import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Beaker, ArrowRight, Sparkles } from 'lucide-react';

const floatVariants = {
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } }
};

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [focused, setFocused]   = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (res.success) { setSuccess(true); setTimeout(() => navigate('/dashboard'), 1000); }
    else setError(res.message);
  };



  return (
    <div className="page-container min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* Ambient orbs */}
      <div className="orb orb-violet" style={{ top: '-150px', left: '-100px' }} />
      <div className="orb orb-cyan"   style={{ bottom: '-120px', right: '-80px' }} />
      <div className="orb orb-pink"   style={{ top: '40%', right: '15%' }} />

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: `${4 + i * 2}px`,
            height: `${4 + i * 2}px`,
            background: i % 2 === 0 ? 'rgba(139,92,246,0.4)' : 'rgba(6,182,212,0.35)',
            left: `${10 + i * 15}%`,
            top: `${20 + i * 12}%`,
          }}
          animate={{ y: [0, -18, 0], opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.4, ease: 'easeInOut' }}
        />
      ))}

      <motion.div
        className="w-full max-w-md relative z-10"
        variants={stagger}
        initial="initial"
        animate="animate"
      >
        {/* Brand header */}
        <motion.div
          variants={floatVariants}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="text-center mb-8"
        >
          <motion.div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center relative"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)' }}
            whileHover={{ scale: 1.08, rotate: 4 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <Beaker size={30} className="text-white" />
            <motion.div
              className="absolute inset-0 rounded-2xl"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)' }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            />
            <Beaker size={30} className="text-white relative z-10" />
          </motion.div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1">Welcome back</h1>
          <p className="text-sm" style={{ color: 'var(--text-sub)' }}>
            Log in to your <span className="text-animated-gradient font-semibold">VirtuaLab</span> workspace
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          variants={floatVariants}
          transition={{ type: 'spring', stiffness: 220, damping: 22, delay: 0.05 }}
          className="glass ring-glow p-8"
        >
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="err"
                initial={{ opacity: 0, height: 0, y: -8 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-5 p-3.5 rounded-xl text-sm font-semibold text-red-400 text-center"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div
                key="ok"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-5 p-3.5 rounded-xl text-sm font-semibold text-green-400 text-center"
                style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
              >
                ✓ Access authorized — entering lab…
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-widest pl-1" style={{ color: 'var(--text-sub)' }}>Email Address</label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200"
                  style={{ color: focused === 'email' ? '#a78bfa' : '#6b7280' }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  placeholder="you@example.com"
                  className="glass-input pl-10 pr-4 py-3 text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-widest pl-1" style={{ color: 'var(--text-sub)' }}>Password</label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200"
                  style={{ color: focused === 'pass' ? '#a78bfa' : '#6b7280' }}
                />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocused('pass')}
                  onBlur={() => setFocused(null)}
                  placeholder="••••••••"
                  className="glass-input pl-10 pr-11 py-3 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading || success}
              className="btn-primary w-full py-3.5 rounded-xl text-sm mt-2 flex items-center justify-center gap-2"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <>
                  <motion.div
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                  Authenticating…
                </>
              ) : success ? '✓ Redirecting…' : (
                <>Authorized Login <ArrowRight size={15} /></>
              )}
            </motion.button>
          </form>


        </motion.div>

        {/* Footer */}
        <motion.p
          variants={floatVariants}
          transition={{ delay: 0.18 }}
          className="text-center text-sm mt-5"
          style={{ color: 'var(--text-muted)' }}
        >
          Don't have an account?{' '}
          <Link to="/signup" className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
            Create account
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
