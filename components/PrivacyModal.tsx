import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, Server, Cpu, Lock, Sparkles } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Premium Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50"
          />
          
          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 m-auto max-w-lg h-fit z-50"
          >
            {/* Glass Card */}
            <div className="glass-card rounded-2xl overflow-hidden">
              {/* Gradient Top Border */}
              <div className="h-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-500" />
              
              <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20">
                      <ShieldCheck size={24} className="text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Privacy First</h2>
                      <p className="text-xs text-zinc-500 mt-0.5">Your data stays with you</p>
                    </div>
                  </div>
                  <motion.button 
                    onClick={onClose}
                    className="p-2 hover:bg-zinc-800/50 rounded-lg transition-colors group"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X size={20} className="text-zinc-500 group-hover:text-white transition-colors" />
                  </motion.button>
                </div>

                {/* Content */}
                <div className="space-y-4">
                  {/* Client-Side Processing */}
                  <motion.div 
                    className="info-card p-4 rounded-xl flex gap-4 group hover:border-blue-500/20"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20 h-fit group-hover:scale-110 transition-transform">
                      <Cpu size={20} className="text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold mb-1.5 flex items-center gap-2">
                        Client-Side Processing
                        <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded-full uppercase tracking-wider">Local</span>
                      </h3>
                      <p className="text-sm text-zinc-400 leading-relaxed">
                        When you upload an image, we extract its EXIF metadata <strong className="text-zinc-300">directly in your browser</strong>. 
                        Your photo is never uploaded to our servers.
                      </p>
                    </div>
                  </motion.div>

                  {/* Optional AI Analysis */}
                  <motion.div 
                    className="info-card p-4 rounded-xl flex gap-4 group hover:border-purple-500/20"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/20 h-fit group-hover:scale-110 transition-transform">
                      <Sparkles size={20} className="text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold mb-1.5 flex items-center gap-2">
                        Optional AI Analysis
                        <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] font-bold rounded-full uppercase tracking-wider">Opt-in</span>
                      </h3>
                      <p className="text-sm text-zinc-400 leading-relaxed">
                        If no GPS data is found, you can <em className="text-zinc-300">choose</em> to use our AI tool. 
                        Only then is the image sent to Google's Gemini API for analysis. 
                        It is processed transiently and not stored.
                      </p>
                    </div>
                  </motion.div>

                  {/* Security Note */}
                  <motion.div 
                    className="info-card p-4 rounded-xl flex gap-4 group hover:border-emerald-500/20"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20 h-fit group-hover:scale-110 transition-transform">
                      <Lock size={20} className="text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold mb-1.5 flex items-center gap-2">
                        No Data Storage
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-full uppercase tracking-wider">Secure</span>
                      </h3>
                      <p className="text-sm text-zinc-400 leading-relaxed">
                        We don't store, log, or track any of your images or location data. 
                        Everything stays <strong className="text-zinc-300">completely private</strong>.
                      </p>
                    </div>
                  </motion.div>
                </div>

                {/* Footer */}
                <motion.div 
                  className="mt-6 pt-5 border-t border-zinc-800/50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <p className="text-xs text-zinc-500 text-center mb-5 flex items-center justify-center gap-2">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    We believe your location data belongs to you.
                  </p>
                  
                  <motion.button
                    onClick={onClose}
                    className="btn-premium w-full py-3.5 rounded-xl font-semibold text-sm"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Got it, thanks!
                  </motion.button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PrivacyModal;
