import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Plus, User, LogOut, Beaker, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Sidebar } from '../sidebar/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';

export const Navbar = ({ onSearch }) => {
  const navigate = useNavigate();
  const { currentUser, labs, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [searchTerm, setSearchTerm]     = useState('');
  const [searchOpen, setSearchOpen]     = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isTeacher    = currentUser?.role === 'teacher';
  const teacherLabs  = labs.filter(l => l.facultyName === currentUser?.username);
  const hasLabs      = isTeacher && teacherLabs.length > 0;

  const handleSearch = (val) => {
    setSearchTerm(val);
    onSearch?.(val);
  };

  return (
    <>
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0,   opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="sticky top-0 z-40 w-full flex items-center justify-between px-4 md:px-6 py-3"
        style={{
          background: 'rgba(6,6,15,0.82)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Top gradient line */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(124,58,237,0.5) 40%, rgba(6,182,212,0.4) 70%, transparent 100%)' }} />

        {/* LEFT: Hamburger + Logo */}
        <div className="flex items-center gap-3">
          <motion.button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl text-gray-400 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
          >
            <Menu size={19} />
          </motion.button>

          <motion.div
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 cursor-pointer select-none"
            whileHover={{ scale: 1.03 }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)', boxShadow: '0 0 14px rgba(124,58,237,0.35)' }}>
              <Beaker size={18} className="text-white" />
            </div>
            <span className="text-lg font-extrabold tracking-wider text-gradient hidden sm:block">VirtuaLab</span>
          </motion.div>
        </div>

        {/* RIGHT: Search + Plus + Avatar */}
        <div className="flex items-center gap-2.5">
          {/* Desktop search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search labs…"
              className="glass-input pl-9 pr-4 py-2 text-sm w-52 focus:w-64 transition-all duration-300"
              style={{ borderRadius: '0.75rem' }}
            />
          </div>

          {/* Mobile search toggle */}
          <motion.button
            onClick={() => setSearchOpen(o => !o)}
            className="md:hidden p-2 rounded-xl text-gray-400 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            whileTap={{ scale: 0.9 }}
          >
            {searchOpen ? <X size={17} /> : <Search size={17} />}
          </motion.button>

          {/* Teacher + fab */}
          <AnimatePresence>
            {hasLabs && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={() => navigate('/create-lab')}
                className="btn-primary p-2 rounded-xl shadow-md"
                style={{ boxShadow: '0 0 14px rgba(124,58,237,0.35)' }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="New Laboratory"
              >
                <Plus size={18} />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Avatar + dropdown */}
          {currentUser && (
            <div className="relative">
              <motion.button
                onClick={() => setDropdownOpen(o => !o)}
                className="relative w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 0 12px rgba(124,58,237,0.3)' }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
              >
                <span className="text-sm font-bold text-white uppercase">
                  {currentUser?.username?.[0] ?? '?'}
                </span>
                {/* Online dot */}
                <div className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-green-400 border border-black" />
              </motion.button>

              <AnimatePresence>
                {dropdownOpen && (
                  <>
                    <motion.div
                      className="fixed inset-0 z-40"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      onClick={() => setDropdownOpen(false)}
                    />
                    <motion.div
                      className="absolute right-0 mt-2 w-56 z-50 rounded-2xl overflow-hidden"
                      style={{ background: 'rgba(9,9,22,0.96)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
                      initial={{ opacity: 0, scale: 0.88, y: -8 }}
                      animate={{ opacity: 1, scale: 1,    y: 0 }}
                      exit={{   opacity: 0, scale: 0.9,   y: -6 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                    >
                      {/* Top accent */}
                      <div className="h-0.5" style={{ background: 'linear-gradient(90deg, #7c3aed, #06b6d4)' }} />

                      <div className="p-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white uppercase text-sm"
                            style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                            {currentUser?.username?.[0] ?? '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">{currentUser?.username ?? 'User'}</p>
                            <p className="text-xs capitalize font-semibold" style={{ color: '#67e8f9' }}>{currentUser?.role}</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-1.5 flex flex-col gap-0.5">
                        {[
                          { label: 'My Profile', icon: User,    action: () => { setDropdownOpen(false); navigate('/profile'); } },
                          { label: 'Sign Out',   icon: LogOut,  action: () => { setDropdownOpen(false); logout(); navigate('/login'); }, danger: true },
                        ].map(({ label, icon: Icon, action, danger }) => (
                          <motion.button
                            key={label}
                            onClick={action}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left"
                            style={{ color: danger ? '#f87171' : '#d1d5db' }}
                            whileHover={{ background: danger ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.05)', x: 2 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            <Icon size={15} />
                            {label}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.nav>

      {/* Mobile search bar */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden px-4 py-2 overflow-hidden"
            style={{ background: 'rgba(6,6,15,0.9)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
              <input
                autoFocus
                type="text"
                value={searchTerm}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search labs…"
                className="glass-input pl-9 pr-4 py-2.5 text-sm"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  );
};
