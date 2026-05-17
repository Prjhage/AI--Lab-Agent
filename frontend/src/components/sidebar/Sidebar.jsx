import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, LayoutDashboard, User, Settings, History, LogOut, Beaker, ChevronRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';

export const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { logout, currentUser } = useAuth();
  const [hoveredItem, setHoveredItem] = useState(null);

  const menuItems = [
    { label: 'Dashboard',   icon: LayoutDashboard, path: '/dashboard', color: 'text-violet-400' },
    { label: 'Profile',     icon: User,             path: '/profile',   color: 'text-cyan-400' },
    { label: 'Settings',    icon: Settings,         path: '/settings',  color: 'text-blue-400' },
    { label: 'Lab History', icon: History,          path: '/history',   color: 'text-purple-400' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay */}
          <motion.div
            className="fixed inset-0"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="relative w-80 h-full flex flex-col justify-between shadow-2xl z-10"
            style={{
              background: 'rgba(9,9,20,0.92)',
              backdropFilter: 'blur(24px)',
              borderRight: '1px solid rgba(255,255,255,0.07)',
            }}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
          >
            {/* Top glow accent */}
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.6), transparent)' }} />

            <div className="flex flex-col h-full p-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-6 mb-6"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <motion.div
                  className="flex items-center gap-2.5 cursor-pointer"
                  onClick={() => { navigate('/dashboard'); onClose(); }}
                  whileHover={{ scale: 1.03 }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)', boxShadow: '0 0 16px rgba(124,58,237,0.4)' }}>
                    <Beaker size={18} className="text-white" />
                  </div>
                  <span className="text-lg font-extrabold tracking-wider text-gradient">VirtuaLab</span>
                </motion.div>
                <motion.button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X size={16} />
                </motion.button>
              </div>

              {/* User card */}
              {currentUser && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 260 }}
                  className="flex items-center gap-3 p-4 rounded-2xl mb-6"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white text-sm uppercase shadow-md flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                    {currentUser?.username?.[0] ?? '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{currentUser?.username ?? 'User'}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="status-dot" />
                      <p className="text-xs font-semibold capitalize" style={{ color: '#67e8f9' }}>
                        {currentUser?.role ?? 'member'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Nav Items */}
              <nav className="flex flex-col gap-1.5 flex-1">
                {menuItems.map(({ label, icon: Icon, path, color }, i) => (
                  <motion.button
                    key={label}
                    initial={{ opacity: 0, x: -18 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 + i * 0.05, type: 'spring', stiffness: 280 }}
                    onClick={() => { navigate(path); onClose(); }}
                    onHoverStart={() => setHoveredItem(label)}
                    onHoverEnd={() => setHoveredItem(null)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 text-left group"
                    style={{
                      background: hoveredItem === label ? 'rgba(255,255,255,0.06)' : 'transparent',
                      border: `1px solid ${hoveredItem === label ? 'rgba(255,255,255,0.08)' : 'transparent'}`,
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                        style={{ background: hoveredItem === label ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)' }}>
                        <Icon size={16} className={`${color} transition-colors`} />
                      </div>
                      <span className="text-sm font-semibold text-gray-300 group-hover:text-white transition-colors">{label}</span>
                    </div>
                    <ChevronRight size={14} className="text-gray-600 group-hover:text-gray-400 transition-all group-hover:translate-x-0.5" />
                  </motion.button>
                ))}
              </nav>

              {/* Footer sign out */}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, type: 'spring' }}
                onClick={() => { logout(); navigate('/login'); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl mt-4 transition-all duration-200"
                style={{
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  paddingTop: '1.25rem',
                  marginTop: '0.75rem',
                }}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.97 }}
              >
                <LogOut size={18} className="text-red-400" />
                <span className="text-sm font-semibold text-red-400 hover:text-red-300 transition-colors">Sign Out</span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
