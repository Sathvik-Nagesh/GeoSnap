import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, MapPin, AlertCircle, ScanSearch, Map as MapIcon, RotateCcw, Calendar, Clock, Camera, Aperture, Timer, Zap, Sparkles, Shield, Eye, Copy, Check, Download, Eraser, Link, Image as ImageIcon } from 'lucide-react';
import PrivacyModal from './components/PrivacyModal';
import MapDisplay from './components/MapDisplay';
import { extractImageMetadata, reverseGeocode } from './services/locationService';
import { guessLocationWithAI } from './services/geminiService';
import { AppState, ProcessedImage } from './types';

// Helper to format exposure time (e.g. 0.005 -> 1/200s)
const formatExposureTime = (time?: number) => {
  if (!time) return null;
  if (time >= 1) return `${time}s`;
  const rec = Math.round(1 / time);
  return `1/${rec}s`;
};

// Toast notification component
const Toast: React.FC<{ message: string; isVisible: boolean }> = ({ message, isVisible }) => (
  <AnimatePresence>
    {isVisible && (
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 bg-emerald-500 text-white rounded-xl font-medium text-sm shadow-lg shadow-emerald-500/30 flex items-center gap-2"
      >
        <Check size={16} />
        {message}
      </motion.div>
    )}
  </AnimatePresence>
);

function App() {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [data, setData] = useState<ProcessedImage | null>(null);
  const [isPrivacyOpen, setPrivacyOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDraggingUrl, setIsDraggingUrl] = useState(false);
  const [showStripper, setShowStripper] = useState(false);
  const [stripperImage, setStripperImage] = useState<{ file: File; previewUrl: string } | null>(null);
  const [isStripping, setIsStripping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stripperInputRef = useRef<HTMLInputElement>(null);

  // Show toast notification
  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

  // Copy coordinates to clipboard
  const copyCoordinates = useCallback(() => {
    if (data?.exifLocation) {
      const coords = `${data.exifLocation.lat.toFixed(6)}, ${data.exifLocation.lng.toFixed(6)}`;
      navigator.clipboard.writeText(coords).then(() => {
        showToast('Coordinates copied to clipboard!');
      });
    }
  }, [data, showToast]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  // Handle drag over - detect if URL or file
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const hasUrl = e.dataTransfer.types.includes('text/uri-list') || 
                   e.dataTransfer.types.includes('text/plain');
    setIsDraggingUrl(hasUrl && !e.dataTransfer.types.includes('Files'));
  };

  const handleDragLeave = () => {
    setIsDraggingUrl(false);
  };

  // Handle drop - support both files and URLs
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingUrl(false);
    
    // Check for files first
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp')) {
      processFile(file);
      return;
    }

    // Check for URL (dragged from browser)
    const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      // Check if it looks like an image URL
      if (url.match(/\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i) || url.includes('image')) {
        await processImageUrl(url);
        return;
      }
    }

    setErrorMsg("Please drop a valid image file or image URL.");
  };

  // Process image from URL
  const processImageUrl = async (url: string) => {
    setAppState(AppState.ANALYZING);
    setErrorMsg(null);

    try {
      // Fetch the image
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch image');
      
      const blob = await response.blob();
      const file = new File([blob], 'image-from-url.jpg', { type: blob.type || 'image/jpeg' });
      
      await processFile(file);
    } catch (err) {
      console.error('Failed to load image from URL:', err);
      setErrorMsg("Failed to load image from URL. The server might block cross-origin requests.");
      setAppState(AppState.IDLE);
    }
  };

  const processFile = async (file: File) => {
    setAppState(AppState.ANALYZING);
    setErrorMsg(null);
    
    // Create preview
    const previewUrl = URL.createObjectURL(file);
    
    // Extract Metadata (EXIF Location + Date + Details)
    const { location: exifLocation, date: exifDate, exifDetails } = await extractImageMetadata(file);
    let locationInfo = null;

    if (exifLocation) {
      locationInfo = await reverseGeocode(exifLocation);
    }

    setData({
      file,
      previewUrl,
      exifLocation: exifLocation || undefined,
      exifDate: exifDate || undefined,
      exifDetails: exifDetails || undefined,
      locationInfo: locationInfo || undefined,
      gpsFound: !!exifLocation
    });

    setAppState(AppState.RESULT);
  };

  const handleAiGuess = async () => {
    if (!data?.file) return;
    
    setAppState(AppState.ANALYZING);
    try {
      const result = await guessLocationWithAI(data.file);
      
      setData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          exifLocation: (result.lat && result.lng) ? { lat: result.lat, lng: result.lng } : undefined,
          locationInfo: { displayName: result.locationName },
          aiGuessed: true,
          aiConfidence: result.confidence,
          aiReasoning: result.reasoning
        };
      });
      setAppState(AppState.RESULT);
    } catch (err) {
      console.error(err);
      setErrorMsg("AI analysis failed. Please try again or use a different image.");
      setAppState(AppState.RESULT);
    }
  };

  const resetApp = () => {
    setAppState(AppState.IDLE);
    setData(null);
    setErrorMsg(null);
    setShowStripper(false);
    setStripperImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // === EXIF Stripper Functions ===
  const handleStripperFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const previewUrl = URL.createObjectURL(file);
    setStripperImage({ file, previewUrl });
  };

  const stripExifAndDownload = async () => {
    if (!stripperImage) return;
    
    setIsStripping(true);
    
    try {
      // Create an image element
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = stripperImage.previewUrl;
      });

      // Draw to canvas (this strips EXIF data)
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      
      ctx.drawImage(img, 0, 0);

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) return;
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clean_${stripperImage.file.name}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('Image downloaded without metadata!');
        setIsStripping(false);
      }, 'image/jpeg', 0.95);
    } catch (err) {
      console.error('Failed to strip EXIF:', err);
      setErrorMsg('Failed to process image');
      setIsStripping(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/30 overflow-x-hidden">
      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setPrivacyOpen(false)} />
      <Toast message={toastMessage || ''} isVisible={!!toastMessage} />
      
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        {/* Sparkles */}
        <div className="sparkle" style={{ top: '15%', left: '10%', animationDelay: '0s' }} />
        <div className="sparkle" style={{ top: '25%', left: '85%', animationDelay: '0.5s' }} />
        <div className="sparkle" style={{ top: '65%', left: '15%', animationDelay: '1s' }} />
        <div className="sparkle" style={{ top: '80%', left: '75%', animationDelay: '1.5s' }} />
        <div className="sparkle" style={{ top: '45%', left: '92%', animationDelay: '2s' }} />
      </div>
      
      {/* Header */}
      <header className="header-glass px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <motion.div 
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={resetApp}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <img 
            src="/logo.png" 
            alt="GeoSnap Logo" 
            className="h-10 w-auto object-contain"
          />
        </motion.div>
        
        <div className="flex items-center gap-2">
          {/* EXIF Stripper Toggle */}
          <motion.button 
            onClick={() => {
              setShowStripper(!showStripper);
              if (!showStripper) {
                setAppState(AppState.IDLE);
                setData(null);
              }
            }}
            className={`btn-ghost text-xs font-medium flex items-center gap-2 px-4 py-2 rounded-full ${showStripper ? 'bg-purple-500/20 border-purple-500/30 text-purple-300' : ''}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Eraser size={14} className={showStripper ? 'text-purple-400' : 'text-zinc-400'} />
            <span>Strip EXIF</span>
          </motion.button>
          
          <motion.button 
            onClick={() => setPrivacyOpen(true)}
            className="btn-ghost text-xs font-medium flex items-center gap-2 px-4 py-2 rounded-full"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Shield size={14} className="text-emerald-400" />
            <span>Privacy First</span>
          </motion.button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative z-10">
        <AnimatePresence mode="wait">
          {/* EXIF Stripper Mode */}
          {showStripper && (
            <motion.div 
              key="stripper"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              className="w-full max-w-xl text-center"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 mb-6">
                  <Eraser size={32} className="text-purple-400" />
                </div>
                <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                  EXIF Stripper
                </h2>
              </motion.div>
              
              <motion.p 
                className="text-lg text-zinc-400 mb-10 max-w-lg mx-auto leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                Remove all metadata from your photos before sharing.
                <span className="block mt-1 text-purple-400/80 font-medium">GPS • Camera info • Date/Time • All stripped!</span>
              </motion.p>

              {!stripperImage ? (
                <motion.div 
                  className="upload-zone gradient-border w-full aspect-[2/1] flex flex-col items-center justify-center cursor-pointer group"
                  onClick={() => stripperInputRef.current?.click()}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.03) 0%, rgba(236, 72, 153, 0.03) 100%)',
                    borderColor: 'rgba(168, 85, 247, 0.3)'
                  }}
                >
                  <motion.div 
                    className="upload-zone-icon mb-5"
                    style={{ background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(168, 85, 247, 0.1) 100%)', borderColor: 'rgba(168, 85, 247, 0.3)' }}
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Eraser className="text-purple-400" size={32} />
                  </motion.div>
                  <p className="text-zinc-100 font-semibold text-lg mb-2">
                    Select image to clean
                  </p>
                  <p className="text-zinc-500 text-sm">
                    or <span className="text-purple-400 font-medium">click to browse</span>
                  </p>
                  <input 
                    type="file" 
                    ref={stripperInputRef} 
                    className="hidden" 
                    accept="image/jpeg,image/png,image/webp" 
                    onChange={handleStripperFileSelect}
                  />
                </motion.div>
              ) : (
                <motion.div 
                  className="result-card p-6"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <div className="image-preview relative aspect-video w-full mb-6 rounded-xl overflow-hidden">
                    <img 
                      src={stripperImage.previewUrl} 
                      alt="Preview" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  
                  <p className="text-zinc-300 mb-6 text-sm">
                    Ready to strip all metadata from: <span className="font-semibold text-white">{stripperImage.file.name}</span>
                  </p>
                  
                  <div className="flex gap-3">
                    <motion.button 
                      onClick={() => setStripperImage(null)}
                      className="btn-ghost flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <RotateCcw size={16} />
                      Choose Another
                    </motion.button>
                    
                    <motion.button 
                      onClick={stripExifAndDownload}
                      disabled={isStripping}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/20 disabled:opacity-50"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isStripping ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Download size={16} />
                          Download Clean Image
                        </>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Main App - IDLE State */}
          {!showStripper && appState === AppState.IDLE && (
            <motion.div 
              key="idle"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              className="w-full max-w-2xl text-center"
            >
              {/* Premium Title */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h2 className="text-5xl md:text-6xl font-bold mb-4 title-gradient title-glow leading-tight">
                  Where was that photo taken?
                </h2>
              </motion.div>
              
              <motion.p 
                className="text-lg text-zinc-400 mb-12 max-w-lg mx-auto leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                Reveal hidden location data in your photos instantly.
                <span className="block mt-1 text-emerald-400/80 font-medium">100% private • Client-side processing</span>
              </motion.p>

              {/* Feature Pills */}
              <motion.div 
                className="flex flex-wrap justify-center gap-3 mb-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {[
                  { icon: Eye, label: 'EXIF Analysis' },
                  { icon: Sparkles, label: 'AI Powered' },
                  { icon: Link, label: 'Drag from Web' },
                  { icon: Shield, label: 'No Upload' }
                ].map((feature, i) => (
                  <div 
                    key={feature.label}
                    className="location-badge"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    <feature.icon size={12} />
                    {feature.label}
                  </div>
                ))}
              </motion.div>

              {/* Premium Upload Zone */}
              <motion.div 
                className={`upload-zone gradient-border w-full max-w-xl mx-auto aspect-[2/1] flex flex-col items-center justify-center cursor-pointer group ${isDraggingUrl ? 'border-indigo-500 bg-indigo-500/10' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.div 
                  className="upload-zone-icon mb-5"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  {isDraggingUrl ? (
                    <Link className="text-indigo-400" size={32} />
                  ) : (
                    <Upload className="text-emerald-400" size={32} />
                  )}
                </motion.div>
                <p className="text-zinc-100 font-semibold text-lg mb-2">
                  {isDraggingUrl ? 'Drop image URL here' : 'Drop your image here'}
                </p>
                <p className="text-zinc-500 text-sm">
                  {isDraggingUrl ? (
                    <span className="text-indigo-400 font-medium">Release to analyze from URL</span>
                  ) : (
                    <>or <span className="text-emerald-400 font-medium">click to browse</span> • drag from other tabs</>
                  )}
                </p>
                <p className="text-zinc-600 text-xs mt-4 px-4 py-2 bg-zinc-900/50 rounded-full border border-zinc-800/50">
                  Supports JPG, PNG, WebP • Max 10MB • URLs supported
                </p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/jpeg,image/png,image/webp" 
                  onChange={handleFileUpload}
                />
              </motion.div>

              {errorMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="alert-error mt-6 p-4 text-red-300 text-sm inline-flex items-center gap-3"
                >
                  <AlertCircle size={18} />
                  {errorMsg}
                </motion.div>
              )}
            </motion.div>
          )}

          {!showStripper && appState === AppState.ANALYZING && (
            <motion.div 
              key="analyzing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center"
            >
              {/* Premium Spinner */}
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 rounded-full border-4 border-zinc-800/50" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-500 animate-spin" />
                <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-indigo-500 animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                </div>
              </div>
              <motion.p 
                className="mt-8 text-2xl font-semibold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Analyzing Metadata...
              </motion.p>
              <p className="text-zinc-500 mt-3 flex items-center gap-2">
                <Shield size={14} className="text-emerald-400" />
                Processing locally in your browser
              </p>
            </motion.div>
          )}

          {!showStripper && appState === AppState.RESULT && data && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[700px]"
            >
              {/* Left Column: Image & Basic Info */}
              <div className="lg:col-span-1 flex flex-col gap-6 h-full overflow-hidden">
                <motion.div 
                  className="result-card p-5 flex flex-col h-full overflow-hidden"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {/* Image Preview */}
                  <div className="image-preview relative shrink-0 aspect-video w-full mb-5 group">
                    <img 
                      src={data.previewUrl} 
                      alt="Preview" 
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end p-4">
                      <p className="text-xs text-white/90 truncate font-medium">{data.file.name}</p>
                    </div>
                    {/* Image Type Badge */}
                    <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md text-[10px] font-bold text-zinc-300 uppercase tracking-wider">
                      {data.file.type.split('/')[1]}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-5">
                    {!data.gpsFound && !data.aiGuessed ? (
                      <motion.div 
                        className="alert-warning p-5"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 rounded-lg bg-amber-500/20">
                            <AlertCircle size={20} className="text-amber-400" />
                          </div>
                          <div>
                            <h3 className="font-bold text-amber-200">No GPS Data Found</h3>
                            <p className="text-xs text-amber-200/60">Metadata stripped or unavailable</p>
                          </div>
                        </div>
                        <p className="text-xs text-amber-200/70 mb-5 leading-relaxed">
                          This image doesn't contain standard location metadata. Common in screenshots or social media downloads.
                        </p>
                        
                        <motion.button 
                          onClick={handleAiGuess}
                          className="btn-ai w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Sparkles size={16} />
                          Guess Location with AI
                        </motion.button>
                      </motion.div>
                    ) : (
                      <div className="space-y-5">
                        {/* Location Header */}
                        <div>
                          <div className={`location-badge mb-3 ${data.aiGuessed ? 'ai-badge' : ''}`}>
                            {data.aiGuessed ? (
                              <>
                                <Sparkles size={12} />
                                AI Estimated
                              </>
                            ) : (
                              <>
                                <MapPin size={12} />
                                GPS Location
                              </>
                            )}
                          </div>
                          <p className="text-2xl font-bold text-white leading-tight">
                            {data.locationInfo?.displayName || "Unknown Location"}
                          </p>
                        </div>
                        
                        {/* Date & Time */}
                        {data.exifDate && (
                          <div className="stat-card flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <div className="p-2 rounded-lg bg-emerald-500/10">
                                <Calendar size={14} className="text-emerald-400" />
                              </div>
                              <span className="font-medium text-zinc-200 text-sm">
                                {data.exifDate.toLocaleDateString(undefined, { dateStyle: 'medium' })}
                              </span>
                            </div>
                            <div className="w-1 h-1 rounded-full bg-zinc-700" />
                            <div className="flex items-center gap-2">
                              <Clock size={14} className="text-emerald-400" />
                              <span className="font-medium text-zinc-200 text-sm">
                                {data.exifDate.toLocaleTimeString(undefined, { timeStyle: 'short' })}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Coordinates with Copy Button */}
                        {data.exifLocation && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="stat-card text-center">
                                <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-2">Latitude</p>
                                <p className="font-mono text-emerald-400 text-sm font-semibold">{data.exifLocation.lat.toFixed(6)}</p>
                              </div>
                              <div className="stat-card text-center">
                                <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-2">Longitude</p>
                                <p className="font-mono text-emerald-400 text-sm font-semibold">{data.exifLocation.lng.toFixed(6)}</p>
                              </div>
                            </div>
                            
                            {/* Copy Coordinates Button */}
                            <motion.button
                              onClick={copyCoordinates}
                              className="w-full py-2.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 text-zinc-300 text-xs font-medium flex items-center justify-center gap-2 transition-all"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Copy size={14} />
                              Copy Coordinates
                            </motion.button>
                          </div>
                        )}

                        {/* Extended EXIF Data */}
                        {data.exifDetails && (
                          <div className="pt-2">
                            <h3 className="text-zinc-400 text-xs uppercase tracking-wider font-bold mb-4 flex items-center gap-2">
                              <Camera size={12} className="text-zinc-500" /> Camera Details
                            </h3>
                             
                            <div className="info-card rounded-xl overflow-hidden">
                              {(data.exifDetails.make || data.exifDetails.model) && (
                                <div className="p-4 border-b border-zinc-800/50 flex items-center gap-4">
                                  <div className="p-2.5 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/50">
                                    <Camera size={18} className="text-zinc-400" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Device</p>
                                    <p className="text-sm font-semibold text-zinc-100">
                                      {[data.exifDetails.make, data.exifDetails.model].filter(Boolean).join(' ')}
                                    </p>
                                    {data.exifDetails.lensModel && (
                                      <p className="text-xs text-zinc-500 mt-0.5">{data.exifDetails.lensModel}</p>
                                    )}
                                  </div>
                                </div>
                              )}
                                
                              <div className="grid grid-cols-3 divide-x divide-zinc-800/30">
                                <div className="p-4 text-center hover:bg-zinc-800/20 transition-colors">
                                  <Aperture size={16} className="mx-auto text-emerald-500/70 mb-2" />
                                  <p className="text-[10px] text-zinc-500 uppercase font-bold">Aperture</p>
                                  <p className="text-sm font-semibold text-white mt-1">
                                    {data.exifDetails.fNumber ? `ƒ/${data.exifDetails.fNumber}` : '-'}
                                  </p>
                                </div>
                                <div className="p-4 text-center hover:bg-zinc-800/20 transition-colors">
                                  <Zap size={16} className="mx-auto text-amber-500/70 mb-2" />
                                  <p className="text-[10px] text-zinc-500 uppercase font-bold">ISO</p>
                                  <p className="text-sm font-semibold text-white mt-1">
                                    {data.exifDetails.iso || '-'}
                                  </p>
                                </div>
                                <div className="p-4 text-center hover:bg-zinc-800/20 transition-colors">
                                  <Timer size={16} className="mx-auto text-indigo-500/70 mb-2" />
                                  <p className="text-[10px] text-zinc-500 uppercase font-bold">Shutter</p>
                                  <p className="text-sm font-semibold text-white mt-1">
                                    {formatExposureTime(data.exifDetails.exposureTime) || '-'}
                                  </p>
                                </div>
                              </div>
                              {data.exifDetails.focalLength && (
                                <div className="p-3 bg-zinc-900/30 border-t border-zinc-800/30 text-center">
                                  <p className="text-[10px] text-zinc-400">
                                    <span className="font-bold uppercase mr-2 text-zinc-500">Focal Length</span> 
                                    <span className="font-semibold text-zinc-200">{data.exifDetails.focalLength}mm</span>
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* AI Analysis Result */}
                        {data.aiGuessed && (
                          <motion.div 
                            className="ai-result p-4"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                          >
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-indigo-300 text-xs font-bold flex items-center gap-2">
                                <Sparkles size={14} /> AI Analysis
                              </span>
                              <span className="px-2 py-1 bg-indigo-500/20 rounded-full text-indigo-300 text-[10px] font-bold">
                                {data.aiConfidence}% Confidence
                              </span>
                            </div>
                            <p className="text-sm text-indigo-200/80 italic leading-relaxed">
                              "{data.aiReasoning}"
                            </p>
                          </motion.div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <motion.button 
                    onClick={resetApp}
                    className="btn-ghost mt-5 w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shrink-0"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <RotateCcw size={16} />
                    Analyze Another Photo
                  </motion.button>
                </motion.div>
              </div>

              {/* Right Column: Map */}
              <motion.div 
                className="lg:col-span-2 h-full min-h-[400px]"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="map-container h-full w-full bg-[#09090b]">
                  {(data.exifLocation || (data.aiGuessed && data.exifLocation)) ? (
                    <MapDisplay 
                      location={data.exifLocation!} 
                      displayName={data.locationInfo?.displayName || "Location"} 
                      isEstmated={data.aiGuessed}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 space-y-5 bg-gradient-to-br from-zinc-900/50 to-zinc-950/50">
                      <div className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800/50">
                        <MapIcon size={56} className="opacity-30" />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-zinc-500">Location not available</p>
                        <p className="text-sm text-zinc-600 mt-1">Try using AI to guess the location</p>
                      </div>
                    </div>
                  )}
                  <div className="map-overlay" />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      {/* Premium Footer */}
      <footer className="header-glass py-5 text-center border-t border-zinc-800/30 relative z-10">
        <p className="text-zinc-500 text-xs flex items-center justify-center gap-2">
          <span>© {new Date().getFullYear()} GeoSnap</span>
          <span className="text-zinc-700">•</span>
          <span className="text-zinc-600">Built with ♥️ by Sathvik</span>
        </p>
      </footer>
    </div>
  );
}

export default App;