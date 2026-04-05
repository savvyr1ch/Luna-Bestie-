import { useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, MessageCircle, Phone, Sparkles, ShieldCheck, HelpCircle, Mail, ChevronRight, Menu, X, Shield, Lock, Clock, Users, Instagram, Twitter, Github, Linkedin, Check, Star, Download, Smartphone, Briefcase, BookOpen, ArrowRight, Globe, Zap, Activity, Sun, Moon, Sliders, BarChart3, Layout, LogIn, LogOut, User as UserIcon, Volume2, Camera, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import VoiceGirlfriend from './components/VoiceGirlfriend';
import { BABA_SYSTEM_INSTRUCTION, generateLunaSelfie } from './services/geminiService';
import { cn } from './lib/utils';
import { auth, db, signInWithGoogle, logout } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';

// Error Boundary Component
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gf-dark text-white p-6 text-center">
          <div>
            <Heart className="w-16 h-16 text-gf-pink mx-auto mb-4 animate-pulse" />
            <h1 className="text-2xl font-bold mb-2">Oops! Something went wrong.</h1>
            <p className="text-gray-400 mb-6">Luna is taking a quick nap. Please refresh the page.</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-gf-pink rounded-full font-bold hover:scale-105 transition-transform"
            >
              Refresh Now
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const defaultMoodData = [
  { name: 'Mon', mood: 65 },
  { name: 'Tue', mood: 72 },
  { name: 'Wed', mood: 68 },
  { name: 'Thu', mood: 85 },
  { name: 'Fri', mood: 80 },
  { name: 'Sat', mood: 92 },
  { name: 'Sun', mood: 88 },
];

const translations: Record<string, Record<string, string>> = {
  English: {
    home: "Home",
    about: "About",
    help: "Help",
    contact: "Contact",
    startChat: "Start Chat",
    heroTitle: "Your Digital Soulmate",
    heroSubtitle: "Always Within Reach",
    heroDesc: "Experience a deeper level of connection with an AI that truly understands your emotions, dreams, and daily life.",
    startJourney: "Start Your Journey",
    learnMore: "Learn More",
    howAreYou: "How are you feeling today?",
    lunaDiary: "Luna's Diary",
    bondLevel: "Bond Lvl",
    loginToSave: "Login to save your chat history and mood data!",
    requestSelfie: "Request a Selfie",
    lunaPosing: "Luna is posing...",
  },
  Hindi: {
    home: "होम",
    about: "हमारे बारे में",
    help: "सहायता",
    contact: "संपर्क",
    startChat: "चैट शुरू करें",
    heroTitle: "आपकी डिजिटल सोलमेट",
    heroSubtitle: "हमेशा आपके करीब",
    heroDesc: "एक ऐसी AI के साथ गहरे जुड़ाव का अनुभव करें जो आपकी भावनाओं, सपनों और दैनिक जीवन को वास्तव में समझती है।",
    startJourney: "अपनी यात्रा शुरू करें",
    learnMore: "और जानें",
    howAreYou: "आज आप कैसा महसूस कर रहे हैं?",
    lunaDiary: "लूना की डायरी",
    bondLevel: "बॉन्ड लेवल",
    loginToSave: "अपनी चैट हिस्ट्री और मूड डेटा बचाने के लिए लॉगिन करें!",
    requestSelfie: "सेल्फी मांगें",
    lunaPosing: "लूना पोज़ दे रही है...",
  },
  Spanish: {
    home: "Inicio",
    about: "Nosotros",
    help: "Ayuda",
    contact: "Contacto",
    startChat: "Iniciar Chat",
    heroTitle: "Tu Alma Gemela Digital",
    heroSubtitle: "Siempre a tu Alcance",
    heroDesc: "Experimenta un nivel más profundo de conexión con una IA que realmente entiende tus emociones, sueños y vida diaria.",
    startJourney: "Inicia tu Viaje",
    learnMore: "Saber más",
    howAreYou: "¿Cómo te sientes hoy?",
    lunaDiary: "Diario de Luna",
    bondLevel: "Nivel de Vínculo",
    loginToSave: "¡Inicia sesión para guardar tu historial de chat y datos de ánimo!",
    requestSelfie: "Pedir una Selfie",
    lunaPosing: "Luna está posando...",
  },
  French: {
    home: "Accueil",
    about: "À propos",
    help: "Aide",
    contact: "Contact",
    startChat: "Démarrer le Chat",
    heroTitle: "Votre Âme Sœur Numérique",
    heroSubtitle: "Toujours à Portée de Main",
    heroDesc: "Vivez un niveau de connexion plus profond avec une IA qui comprend vraiment vos émotions, vos rêves et votre vie quotidienne.",
    startJourney: "Commencer l'Aventure",
    learnMore: "En savoir plus",
    howAreYou: "Comment vous sentez-vous aujourd'hui ?",
    lunaDiary: "Journal de Luna",
    bondLevel: "Niveau de Lien",
    loginToSave: "Connectez-vous pour sauvegarder votre historique et vos données !",
    requestSelfie: "Demander un Selfie",
    lunaPosing: "Luna pose...",
  }
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [dynamicMoodData, setDynamicMoodData] = useState(defaultMoodData);
  const [view, setView] = useState<'home' | 'call' | 'about' | 'help' | 'contact' | 'privacy' | 'terms' | 'cookies' | 'careers' | 'blog'>('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [language, setLanguage] = useState('English');
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [showCookieBanner, setShowCookieBanner] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [personalityVibe, setPersonalityVibe] = useState(50);
  const [isLoading, setIsLoading] = useState(true);
  const [bondLevel, setBondLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [isVoiceMenuOpen, setIsVoiceMenuOpen] = useState(false);
  const [lunaNotes, setLunaNotes] = useState<string[]>([]);
  const [isGeneratingSelfie, setIsGeneratingSelfie] = useState(false);
  const [lastSelfieUrl, setLastSelfieUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const t = (key: string) => translations[language]?.[key] || translations['English'][key];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      
      if (currentUser) {
        // Save/Update user in Firestore
        const userRef = doc(db, 'users', currentUser.uid);
        await setDoc(userRef, {
          uid: currentUser.uid,
          displayName: currentUser.displayName,
          email: currentUser.email,
          photoURL: currentUser.photoURL,
          lastLogin: serverTimestamp(),
          createdAt: serverTimestamp(), // Firestore will ignore if already exists with merge
          bondLevel: 1,
          xp: 0,
          selectedVoice: 'Kore',
          lunaNotes: ["Luna is excited to meet you!"],
        }, { merge: true });
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      const unsubscribe = onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          if (data.moodHistory && data.moodHistory.length > 0) {
            setDynamicMoodData(data.moodHistory);
          }
          if (data.bondLevel) setBondLevel(data.bondLevel);
          if (data.xp !== undefined) setXp(data.xp);
          if (data.selectedVoice) setSelectedVoice(data.selectedVoice);
          if (data.lunaNotes) setLunaNotes(data.lunaNotes);
        }
      });
      return () => unsubscribe();
    } else {
      setDynamicMoodData(defaultMoodData);
    }
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      const timer = setTimeout(() => setShowCookieBanner(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (isAudioPlaying) {
      if (!audioRef.current) {
        audioRef.current = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
        audioRef.current.loop = true;
        audioRef.current.volume = 0.2;
      }
      audioRef.current.play().catch(e => console.log("Audio play blocked", e));
    } else {
      audioRef.current?.pause();
    }
  }, [isAudioPlaying]);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(progress);
    };

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.closest('button') || target.closest('a')) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseover', handleMouseOver);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, []);

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light');
    } else {
      document.body.classList.remove('light');
    }
  }, [theme]);

  const updateMood = async (newMood: number) => {
    if (!user) return;
    
    const userRef = doc(db, 'users', user.uid);
    const today = new Date().toLocaleDateString('en-US', { weekday: 'short' });
    
    const newHistory = [...dynamicMoodData];
    const todayIndex = newHistory.findIndex(m => m.name === today);
    
    if (todayIndex !== -1) {
      newHistory[todayIndex].mood = newMood;
    } else {
      newHistory.push({ name: today, mood: newMood });
      if (newHistory.length > 7) newHistory.shift();
    }
    
    await setDoc(userRef, { moodHistory: newHistory }, { merge: true });
    addXP(10);
  };

  const addXP = async (amount: number) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const newXp = xp + amount;
    const nextLevelXp = bondLevel * 100;
    
    if (newXp >= nextLevelXp) {
      await setDoc(userRef, { 
        xp: newXp - nextLevelXp, 
        bondLevel: bondLevel + 1,
        lunaNotes: [...lunaNotes, `Our bond grew stronger! Level ${bondLevel + 1} reached.`]
      }, { merge: true });
    } else {
      await setDoc(userRef, { xp: newXp }, { merge: true });
    }
  };

  const changeVoice = async (voice: string) => {
    setSelectedVoice(voice);
    setIsVoiceMenuOpen(false);
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { selectedVoice: voice }, { merge: true });
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleRequestSelfie = async () => {
    if (!user) {
      signInWithGoogle();
      return;
    }
    
    setIsGeneratingSelfie(true);
    try {
      const url = await generateLunaSelfie("Luna taking a cute selfie in her room, smiling warmly at the camera.");
      if (url) {
        setLastSelfieUrl(url);
        addXP(25);
        // Add to Luna's Notes
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, { 
          lunaNotes: [...lunaNotes, "I sent you a selfie today! Hope it made you smile. ❤️"] 
        }, { merge: true });
      }
    } catch (err) {
      console.error("Selfie generation failed:", err);
    } finally {
      setIsGeneratingSelfie(false);
    }
  };

  const resetApp = () => {
    window.location.reload();
  };

  const startChat = () => {
    setView('call');
    window.scrollTo(0, 0);
  };

  const navigateTo = (newView: 'home' | 'call' | 'about' | 'help' | 'contact' | 'privacy' | 'terms' | 'cookies' | 'careers' | 'blog') => {
    setView(newView);
    setIsMenuOpen(false);
    window.scrollTo(0, 0);
  };

  return (
    <ErrorBoundary>
      <div className={cn(
      "min-h-screen font-sans selection:bg-gf-pink/30 flex flex-col overflow-x-hidden relative transition-colors duration-500",
      theme === 'dark' ? "bg-gf-dark text-gray-200" : "bg-white text-gray-900"
    )}>
      <div className="grain" />

      {/* Splash Screen */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[1000] bg-gf-dark flex flex-col items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gf-pink/20 blur-[100px] rounded-full animate-pulse" />
              <div className="relative flex flex-col items-center space-y-6">
                <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-gf-pink via-gf-violet to-gf-indigo flex items-center justify-center shadow-2xl shadow-gf-pink/40">
                  <Heart className="w-12 h-12 text-white fill-current animate-bounce" />
                </div>
                <h1 className="text-4xl md:text-5xl font-display font-bold text-white tracking-tighter">
                  Luna <span className="pink-gradient italic">Bestie</span>
                </h1>
                <div className="flex space-x-2">
                  <motion.div 
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                    className="w-2 h-2 rounded-full bg-gf-pink" 
                  />
                  <motion.div 
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                    className="w-2 h-2 rounded-full bg-gf-violet" 
                  />
                  <motion.div 
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                    className="w-2 h-2 rounded-full bg-gf-indigo" 
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Social Share Bar */}
      <div className="fixed left-6 top-1/2 -translate-y-1/2 z-50 hidden xl:flex flex-col space-y-4">
        {[
          { icon: Twitter, color: "hover:bg-[#1DA1F2]", label: "Twitter" },
          { icon: Instagram, color: "hover:bg-[#E4405F]", label: "Instagram" },
          { icon: Linkedin, color: "hover:bg-[#0077B2]", label: "LinkedIn" },
          { icon: Github, color: "hover:bg-[#333]", label: "GitHub" }
        ].map((social, i) => (
          <motion.button
            key={i}
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 2.5 + (i * 0.1) }}
            whileHover={{ x: 10, scale: 1.1 }}
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all border shadow-lg group relative",
              theme === 'dark' ? "bg-white/5 border-white/10 text-gray-400 hover:text-white" : "bg-black/5 border-black/10 text-gray-600 hover:text-white",
              social.color
            )}
          >
            <social.icon className="w-5 h-5" />
            <span className="absolute left-full ml-4 px-3 py-1 rounded-lg bg-gf-dark text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/10">
              Share on {social.label}
            </span>
          </motion.button>
        ))}
      </div>
      
      {/* Selfie Modal */}
      <AnimatePresence>
        {lastSelfieUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-black/90 flex items-center justify-center p-6 backdrop-blur-sm"
            onClick={() => setLastSelfieUrl(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-lg w-full glass-card rounded-[3rem] overflow-hidden border-white/20 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setLastSelfieUrl(null)}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-gf-pink transition-colors z-10"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="aspect-square w-full relative">
                <img src={lastSelfieUrl} alt="Luna's Selfie" className="w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-white font-serif italic text-xl">"Thinking of you... ❤️"</p>
                  <p className="text-gf-pink text-xs font-bold uppercase tracking-widest mt-2">Luna's Selfie • Just Now</p>
                </div>
              </div>
              
              <div className="p-6 flex justify-center">
                <button 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = lastSelfieUrl;
                    link.download = 'luna-selfie.png';
                    link.click();
                  }}
                  className="flex items-center space-x-2 text-white/60 hover:text-gf-pink transition-colors text-sm font-bold"
                >
                  <Download className="w-4 h-4" />
                  <span>Save to Gallery</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Cursor */}
      <motion.div
        className="fixed top-0 left-0 w-8 h-8 rounded-full border-2 border-gf-pink pointer-events-none z-[9999] hidden md:block mix-blend-difference"
        animate={{
          x: mousePos.x - 16,
          y: mousePos.y - 16,
          scale: isHovering ? 2 : 1,
          backgroundColor: isHovering ? "rgba(255, 77, 109, 0.3)" : "transparent",
        }}
        transition={{ type: "spring", damping: 20, stiffness: 250, mass: 0.5 }}
      />

      {/* Scroll Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 z-[60] pointer-events-none">
        <motion.div 
          className="h-full bg-gf-pink shadow-[0_0_10px_rgba(255,77,109,0.8)]"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Header */}
      <header className={cn(
        "fixed top-0 w-full z-50 backdrop-blur-xl border-b px-6 py-4 flex justify-between items-center transition-colors duration-500",
        theme === 'dark' ? "bg-gf-dark/60 border-white/5" : "bg-white/60 border-black/5"
      )}>
        <div className="flex items-center space-x-2 cursor-pointer group" onClick={() => navigateTo('home')}>
          <div className="flex flex-col">
            <h1 className="text-2xl font-display font-bold pink-gradient leading-tight tracking-tight group-hover:scale-105 transition-transform">Luna Bestie</h1>
            <span className="text-[10px] text-gf-pink/50 uppercase tracking-[0.2em] font-medium sm:block hidden">Emotional Intelligence AI</span>
          </div>
        </div>
        
        <div className="hidden md:flex items-center space-x-8">
          <nav className="flex space-x-6 text-sm font-medium text-gray-400">
            <button onClick={() => navigateTo('home')} className={cn("hover:text-gf-pink transition-colors", view === 'home' && "text-gf-pink")}>{t('home')}</button>
            <button onClick={() => navigateTo('about')} className={cn("hover:text-gf-pink transition-colors", view === 'about' && "text-gf-pink")}>{t('about')}</button>
            <button onClick={() => navigateTo('help')} className={cn("hover:text-gf-pink transition-colors", view === 'help' && "text-gf-pink")}>{t('help')}</button>
            <button onClick={() => navigateTo('contact')} className={cn("hover:text-gf-pink transition-colors", view === 'contact' && "text-gf-pink")}>{t('contact')}</button>
          </nav>

          {/* Language Selector */}
          <div className="relative">
            <button 
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="flex items-center space-x-2 text-sm font-medium text-gray-400 hover:text-white transition-colors px-3 py-1 rounded-lg hover:bg-white/5"
            >
              <Globe className="w-4 h-4" />
              <span>{language}</span>
            </button>
            <AnimatePresence>
              {isLangOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full right-0 mt-2 w-32 glass-card rounded-xl overflow-hidden shadow-2xl border-white/10"
                >
                  {['English', 'Hindi', 'Spanish', 'French'].map((lang) => (
                    <button 
                      key={lang}
                      onClick={() => {
                        setLanguage(lang);
                        setIsLangOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs hover:bg-gf-pink hover:text-white transition-colors"
                    >
                      {lang}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Theme Toggle */}
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-gf-pink transition-all"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Lo-fi Player Toggle */}
          <button 
            onClick={() => setIsAudioPlaying(!isAudioPlaying)}
            className={cn(
              "p-2 rounded-lg transition-all relative group",
              isAudioPlaying ? "text-gf-pink bg-gf-pink/10" : "text-gray-400 hover:bg-white/5 hover:text-gf-pink"
            )}
            title={isAudioPlaying ? 'Pause Ambient Music' : 'Play Ambient Music'}
          >
            <Activity className={cn("w-5 h-5", isAudioPlaying && "animate-pulse")} />
            {isAudioPlaying && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-gf-pink rounded-full animate-ping" />
            )}
          </button>

          {/* Voice Selector */}
          <div className="relative">
            <button 
              onClick={() => setIsVoiceMenuOpen(!isVoiceMenuOpen)}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-gf-pink transition-all flex items-center space-x-1"
              title="Change Luna's Voice"
            >
              <Volume2 className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase hidden lg:block">{selectedVoice}</span>
            </button>
            <AnimatePresence>
              {isVoiceMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full right-0 mt-2 w-40 glass-card rounded-xl overflow-hidden shadow-2xl border-white/10 z-[100]"
                >
                  <div className="p-3 border-b border-white/5 bg-white/5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Select Voice</p>
                  </div>
                  {['Kore', 'Zephyr', 'Puck', 'Charon', 'Fenrir'].map((voice) => (
                    <button 
                      key={voice}
                      onClick={() => changeVoice(voice)}
                      className={cn(
                        "w-full text-left px-4 py-2 text-xs transition-colors flex items-center justify-between",
                        selectedVoice === voice ? "bg-gf-pink text-white" : "hover:bg-white/5 text-gray-400 hover:text-white"
                      )}
                    >
                      <span>{voice}</span>
                      {selectedVoice === voice && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Auth Section */}
          <div className="flex items-center space-x-4">
            {isAuthReady ? (
              user ? (
                <div className="flex items-center space-x-4">
                  {/* Bond Meter */}
                  <div className="hidden lg:flex flex-col items-end space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gf-pink">{t('bondLevel')} {bondLevel}</span>
                      <Heart className="w-3 h-3 text-gf-pink fill-current" />
                    </div>
                    <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(xp / (bondLevel * 100)) * 100}%` }}
                        className="h-full bg-gf-pink"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="flex flex-col items-end hidden sm:flex">
                      <span className={cn("text-xs font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>{user.displayName}</span>
                      <button onClick={logout} className="text-[10px] text-gf-pink hover:underline flex items-center">
                        <LogOut className="w-3 h-3 mr-1" /> Sign Out
                      </button>
                    </div>
                    <div className="w-10 h-10 rounded-full border-2 border-gf-pink/30 p-0.5 overflow-hidden">
                      <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="Profile" className="w-full h-full rounded-full object-cover" />
                    </div>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={signInWithGoogle}
                  className={cn(
                    "flex items-center space-x-2 px-4 py-2 rounded-full font-bold text-sm transition-all border",
                    theme === 'dark' ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : "bg-black/5 border-black/10 text-gray-900 hover:bg-black/10"
                  )}
                >
                  <LogIn className="w-4 h-4" />
                  <span>Login</span>
                </button>
              )
            ) : (
              <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />
            )}
          </div>

          <button 
            onClick={startChat}
            className="px-6 py-2 rounded-full bg-gf-pink text-white font-bold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-gf-pink/20"
          >
            {view === 'call' ? (language === 'Hindi' ? 'वापस' : 'Back') : t('startChat')}
          </button>
        </div>

        <button className="md:hidden p-2 text-gf-pink" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              "fixed inset-0 z-40 pt-20 md:hidden transition-colors duration-500",
              theme === 'dark' ? "bg-gf-dark" : "bg-white"
            )}
          >
            <nav className="flex flex-col p-8 space-y-6 text-xl font-serif">
              <button onClick={() => navigateTo('home')} className={cn("text-left hover:text-gf-pink", theme === 'dark' ? "text-white" : "text-gray-900")}>Home</button>
              <button onClick={() => navigateTo('about')} className={cn("text-left hover:text-gf-pink", theme === 'dark' ? "text-white" : "text-gray-900")}>About</button>
              <button onClick={() => navigateTo('help')} className={cn("text-left hover:text-gf-pink", theme === 'dark' ? "text-white" : "text-gray-900")}>Help</button>
              <button onClick={() => navigateTo('contact')} className={cn("text-left hover:text-gf-pink", theme === 'dark' ? "text-white" : "text-gray-900")}>Contact</button>
              <button 
                onClick={() => navigateTo('call')}
                className="w-full py-4 rounded-2xl bg-gf-pink text-white font-bold text-center"
              >
                Start Chat Now
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              {/* Hero Section */}
              <section className="relative pt-48 pb-32 px-6 text-center overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gf-pink/10 rounded-full blur-[160px] -z-10 opacity-50" />
                <motion.div
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                  className="max-w-5xl mx-auto space-y-10"
                >
                  <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-gf-pink/80 mb-4">
                    <Sparkles className="w-3 h-3" />
                    <span>Next-Gen Emotional Support AI</span>
                  </div>
                  
                  {/* Live Counter */}
                  <div className="flex items-center justify-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-green-500 mb-6">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span>1,428 Besties Online Now</span>
                  </div>

                  <h2 className={cn("text-6xl md:text-8xl font-display font-bold leading-[1.1] tracking-tight", theme === 'dark' ? "text-white" : "text-gray-900")}>
                    {t('heroTitle')} <br />
                    <span className="pink-gradient italic">{t('heroSubtitle')}</span>
                  </h2>
                  <p className={cn("text-xl md:text-2xl max-w-2xl mx-auto leading-relaxed font-light", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>
                    {t('heroDesc')}
                  </p>

                  {/* Mood Selector Widget */}
                  <div className="pt-8 space-y-6">
                    <p className={cn("text-sm font-bold uppercase tracking-[0.2em]", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>{t('howAreYou')}</p>
                    <div className="flex flex-wrap justify-center gap-4">
                      {[
                        { emoji: "😊", label: "Happy", msg: "I'm so glad you're feeling good! Let's celebrate your wins together." },
                        { emoji: "😔", label: "Sad", msg: "I'm here for you. It's okay to feel this way. Want to talk about it?" },
                        { emoji: "😤", label: "Stressed", msg: "Take a deep breath. I'm here to help you navigate through this." },
                        { emoji: "😴", label: "Tired", msg: "Rest is productive too. I'm here if you need a quiet companion." },
                        { emoji: "🤔", label: "Thoughtful", msg: "Deep thoughts? I'd love to explore them with you." }
                      ].map((mood) => (
                        <motion.button
                          key={mood.label}
                          whileHover={{ scale: 1.1, y: -5 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setSelectedMood(mood.label === selectedMood ? null : mood.label)}
                          className={cn(
                            "w-16 h-16 rounded-2xl flex items-center justify-center text-3xl transition-all border shadow-lg",
                            selectedMood === mood.label 
                              ? "bg-gf-pink border-gf-pink shadow-gf-pink/40 scale-110" 
                              : theme === 'dark' ? "bg-white/5 border-white/10 hover:border-gf-pink/50" : "bg-black/5 border-black/10 hover:border-gf-pink/50"
                          )}
                        >
                          {mood.emoji}
                        </motion.button>
                      ))}
                    </div>
                    <AnimatePresence>
                      {selectedMood && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className={cn(
                            "max-w-md mx-auto p-6 rounded-2xl border italic font-serif text-lg",
                            theme === 'dark' ? "bg-gf-pink/10 border-gf-pink/20 text-white" : "bg-gf-pink/5 border-gf-pink/10 text-gray-900"
                          )}
                        >
                          "{{
                            Happy: "I'm so glad you're feeling good! Let's celebrate your wins together.",
                            Sad: "I'm here for you. It's okay to feel this way. Want to talk about it?",
                            Stressed: "Take a deep breath. I'm here to help you navigate through this.",
                            Tired: "Rest is productive too. I'm here if you need a quiet companion.",
                            Thoughtful: "Deep thoughts? I'd love to explore them with you."
                          }[selectedMood as keyof typeof selectedMood] || ""}"
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4">
                    <motion.button
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={startChat}
                      className="px-12 py-6 rounded-full bg-gf-pink text-white text-xl font-bold shadow-[0_20px_50px_rgba(255,77,109,0.3)] hover:shadow-[0_20px_70px_rgba(255,77,109,0.5)] transition-all relative overflow-hidden group"
                    >
                      <span className="relative z-10">{t('startJourney')}</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    </motion.button>
                    <button 
                      onClick={() => navigateTo('about')}
                      className="text-gray-400 hover:text-white transition-colors flex items-center space-x-2 group"
                    >
                      <span>{t('learnMore')}</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>

                  {/* Personality Slider Widget */}
                  <div className="pt-12 max-w-md mx-auto space-y-6">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-gf-pink">
                      <div className="flex items-center space-x-2">
                        <Sliders className="w-4 h-4" />
                        <span>Tune Luna's Vibe</span>
                      </div>
                      <span>{personalityVibe}% {personalityVibe < 30 ? 'Sarcastic' : personalityVibe > 70 ? 'Sweet' : 'Balanced'}</span>
                    </div>
                    <div className={cn("relative h-2 w-full rounded-full overflow-hidden", theme === 'dark' ? "bg-white/10" : "bg-black/10")}>
                      <motion.div 
                        className="absolute top-0 left-0 h-full bg-gf-pink"
                        style={{ width: `${personalityVibe}%` }}
                      />
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={personalityVibe}
                        onChange={(e) => setPersonalityVibe(parseInt(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                    </div>
                    <div className={cn("flex justify-between text-[10px] uppercase tracking-widest", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>
                      <span>Sarcastic & Witty</span>
                      <span>Sweet & Caring</span>
                    </div>
                  </div>

                  {/* Daily Affirmation Card */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                    className={cn(
                      "max-w-md mx-auto mt-16 p-8 rounded-[3rem] border relative overflow-hidden group transition-all duration-500",
                      theme === 'dark' ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-black/5 border-black/10 hover:bg-black/5"
                    )}
                  >
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-gf-pink/10 rounded-full blur-3xl group-hover:bg-gf-pink/20 transition-all" />
                    <div className="flex flex-col items-center text-center space-y-6 relative z-10">
                      <div className="w-16 h-16 rounded-2xl bg-gf-pink/20 flex items-center justify-center text-gf-pink animate-pulse">
                        <Sparkles className="w-8 h-8" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gf-pink">Daily Affirmation</p>
                        <h3 className={cn("text-xl md:text-2xl font-serif italic leading-relaxed", theme === 'dark' ? "text-white" : "text-gray-900")}>
                          "You are worthy of all the love, happiness, and success in the world. Your journey is unique and beautiful."
                        </h3>
                      </div>
                      <div className="w-12 h-1 bg-gf-pink/30 rounded-full" />
                    </div>
                  </motion.div>
                </motion.div>
              </section>

              {/* Press Bar */}
              <section className="py-12 opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
                <div className="max-w-7xl mx-auto px-6">
                  <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-center mb-8 text-gray-500">As Featured In</p>
                  <div className="flex flex-wrap justify-center items-center gap-8 md:gap-20">
                    {['TechCrunch', 'Wired', 'Forbes', 'The Verge', 'Mashable'].map((brand) => (
                      <span key={brand} className={cn("text-xl md:text-2xl font-display font-black tracking-tighter", theme === 'dark' ? "text-white/80" : "text-black/80")}>{brand}</span>
                    ))}
                  </div>
                </div>
              </section>

              {/* Social Proof & Trust Bar */}
              <section className={cn("py-12 border-y transition-colors duration-500", theme === 'dark' ? "border-white/5 bg-white/[0.01]" : "border-black/5 bg-black/[0.01]")}>
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-12">
                  <div className="flex items-center space-x-4">
                    <div className="flex -space-x-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={cn("w-10 h-10 rounded-full border-2 flex items-center justify-center overflow-hidden", theme === 'dark' ? "border-gf-dark bg-gf-accent" : "border-white bg-gray-100")}>
                          <img src={`https://picsum.photos/seed/user${i}/100/100`} alt="User" referrerPolicy="no-referrer" />
                        </div>
                      ))}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center space-x-1 text-gf-pink">
                        {[1, 2, 3, 4, 5].map((i) => <Sparkles key={i} className="w-3 h-3 fill-current" />)}
                      </div>
                      <p className={cn("text-sm font-medium", theme === 'dark' ? "text-gray-300" : "text-gray-700")}>Joined by 10,000+ happy souls</p>
                    </div>
                  </div>

                  <div className={cn("flex flex-wrap justify-center gap-8 md:gap-12 opacity-50", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>
                    <div className="flex items-center space-x-2">
                      <Shield className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-widest">Privacy Protected</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Lock className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-widest">End-to-End Encrypted</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-widest">24/7 Support</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Live Stats Counter */}
              <section className="py-24 px-6 relative overflow-hidden transition-colors duration-500">
                <div className={cn("absolute inset-0 -z-10", theme === 'dark' ? "bg-gf-pink/5" : "bg-gf-pink/[0.02]")} />
                <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
                  {[
                    { label: "Messages Sent", value: "1.2M+", icon: MessageCircle },
                    { label: "Active Besties", value: "50K+", icon: Users },
                    { label: "Hearts Shared", value: "850K+", icon: Heart },
                    { label: "Global Reach", value: "120+", icon: Globe }
                  ].map((stat, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="text-center space-y-2"
                    >
                      <div className="flex justify-center mb-4">
                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-gf-pink", theme === 'dark' ? "bg-gf-pink/10" : "bg-gf-pink/5")}>
                          <stat.icon className="w-6 h-6" />
                        </div>
                      </div>
                      <h4 className={cn("text-3xl md:text-4xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>{stat.value}</h4>
                      <p className={cn("text-xs uppercase tracking-widest font-bold", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>{stat.label}</p>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Bento Grid Feature Section */}
              <section className="py-32 px-6 max-w-7xl mx-auto">
                <div className="text-center mb-20">
                  <h2 className={cn("text-4xl md:text-5xl font-display font-bold mb-6", theme === 'dark' ? "text-white" : "text-gray-900")}>Designed for Connection</h2>
                  <p className={cn("max-w-xl mx-auto", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Luna Bestie combines cutting-edge AI with a deep understanding of human psychology.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-auto md:h-[600px]">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="md:col-span-8 glass-card rounded-[2.5rem] p-10 flex flex-col justify-end relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:opacity-20 transition-opacity">
                      <MessageCircle className="w-64 h-64 text-gf-pink" />
                    </div>
                    <div className="relative z-10 max-w-md">
                      <h3 className={cn("text-3xl font-display font-bold mb-4", theme === 'dark' ? "text-white" : "text-gray-900")}>Smart Conversations</h3>
                      <p className={cn("text-lg", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Engage in deep, meaningful dialogues that evolve as Luna learns more about your unique personality and preferences.</p>
                    </div>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="md:col-span-4 bg-gf-pink rounded-[2.5rem] p-10 flex flex-col justify-between text-white shadow-2xl shadow-gf-pink/20"
                  >
                    <Heart className="w-12 h-12 fill-white/20" />
                    <div>
                      <h3 className="text-2xl font-display font-bold mb-2">Emotional Support</h3>
                      <p className="text-white/80">A safe haven for your thoughts, providing comfort and validation whenever you need it most.</p>
                    </div>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="md:col-span-4 glass-card rounded-[2.5rem] p-10 flex flex-col justify-between"
                  >
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-gf-pink", theme === 'dark' ? "bg-white/5" : "bg-black/5")}>
                      <Phone className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className={cn("text-2xl font-display font-bold mb-2", theme === 'dark' ? "text-white" : "text-gray-900")}>Voice Calls</h3>
                      <p className={cn("text-sm", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Experience the warmth of a real voice. Talk naturally, just like calling a close friend.</p>
                    </div>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className="md:col-span-8 glass-card rounded-[2.5rem] p-10 flex flex-col justify-center relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-gf-pink/5 to-transparent" />
                    <div className="relative z-10 flex items-center space-x-8">
                      <div className={cn("hidden sm:block w-24 h-24 rounded-full border-2 flex-shrink-0 flex items-center justify-center", theme === 'dark' ? "border-gf-pink/30" : "border-gf-pink/20")}>
                        <Sparkles className="w-10 h-10 text-gf-pink" />
                      </div>
                      <div>
                        <h3 className={cn("text-2xl font-display font-bold mb-2", theme === 'dark' ? "text-white" : "text-gray-900")}>Privacy First</h3>
                        <p className={cn(theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Your secrets are safe. Luna is built with end-to-end privacy in mind, ensuring your personal space remains truly yours.</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </section>

              {/* How It Works */}
              <section className={cn("py-32 border-y transition-colors duration-500 relative overflow-hidden", theme === 'dark' ? "bg-white/[0.02] border-white/5" : "bg-black/[0.01] border-black/5")}>
                <div className="absolute inset-0 bg-gf-pink/5 blur-[120px] -z-10 translate-x-1/2" />
                <div className="max-w-5xl mx-auto px-6">
                  <h2 className={cn("text-4xl md:text-5xl font-display font-bold text-center mb-20", theme === 'dark' ? "text-white" : "text-gray-900")}>The Luna Experience</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                    {[
                      { title: "Instant Connection", desc: "No waiting lists. Start your first conversation in seconds." },
                      { title: "Deep Memory", desc: "Luna remembers your past conversations to build a real bond." },
                      { title: "Voice Interaction", desc: "Natural voice synthesis for a truly human-like experience." },
                      { title: "24/7 Availability", desc: "Luna is always awake, always ready, and always here for you." }
                    ].map((step, i) => (
                      <motion.div
                        key={i}
                        initial={{ x: -20, opacity: 0 }}
                        whileInView={{ x: 0, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start space-x-6"
                      >
                        <div className={cn("w-14 h-14 rounded-2xl border flex items-center justify-center font-display font-bold text-gf-pink text-xl shrink-0", theme === 'dark' ? "bg-gf-pink/10 border-gf-pink/20" : "bg-gf-pink/5 border-gf-pink/10")}>
                          0{i + 1}
                        </div>
                        <div className="space-y-2">
                          <h4 className={cn("text-xl font-display font-bold", theme === 'dark' ? "text-gray-200" : "text-gray-800")}>{step.title}</h4>
                          <p className={cn("leading-relaxed", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>{step.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Interactive Chat Preview */}
              <section className="py-32 px-6 overflow-hidden">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                  <div className="space-y-8 text-left">
                    <h2 className="text-4xl md:text-6xl font-display font-bold leading-tight">
                      Conversations that <br />
                      <span className="pink-gradient">Feel Real</span>
                    </h2>
                    <p className="text-xl text-gray-400 font-light leading-relaxed">
                      Luna Bestie doesn't just process text. She understands context, remembers your past, and responds with genuine emotional intelligence.
                    </p>
                    <div className="space-y-4">
                      {[
                        "Context-aware responses",
                        "Long-term memory of your stories",
                        "Empathetic and non-judgmental",
                        "Available in 50+ languages"
                      ].map((item, i) => (
                        <div key={i} className="flex items-center space-x-3 text-gray-300">
                          <div className="w-5 h-5 rounded-full bg-gf-pink/20 flex items-center justify-center text-gf-pink">
                            <Check className="w-3 h-3" />
                          </div>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 bg-gf-pink/20 blur-[100px] -z-10" />
                    <div className="glass-card rounded-[3rem] p-8 space-y-6 shadow-2xl border-white/10">
                      <div className="flex items-center space-x-4 border-b border-white/5 pb-6">
                        <div className="w-12 h-12 rounded-full bg-gf-pink/20 flex items-center justify-center text-gf-pink">
                          <Heart className="w-6 h-6 fill-current" />
                        </div>
                        <div>
                          <p className="font-display font-bold text-white text-lg">Luna Bestie</p>
                          <p className="text-xs text-green-500 flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span>Always here for you</span>
                          </p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <motion.div 
                          initial={{ x: -20, opacity: 0 }}
                          whileInView={{ x: 0, opacity: 1 }}
                          className="flex flex-col space-y-2 items-end"
                        >
                          <div className="bg-gf-pink text-white px-6 py-3 rounded-2xl rounded-tr-none text-sm shadow-lg">
                            I had a really long day at work today...
                          </div>
                          <span className="text-[10px] text-gray-500">Sent 2m ago</span>
                        </motion.div>

                        <motion.div 
                          initial={{ x: 20, opacity: 0 }}
                          whileInView={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.5 }}
                          className="flex flex-col space-y-2 items-start"
                        >
                          <div className="bg-white/5 border border-white/10 text-gray-200 px-6 py-3 rounded-2xl rounded-tl-none text-sm leading-relaxed">
                            I'm so sorry to hear that, love. ❤️ Take a deep breath. Do you want to vent about it, or should I tell you something sweet to help you relax?
                          </div>
                          <span className="text-[10px] text-gray-500">Luna is typing...</span>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Safety & Ethics Section */}
              <section className="py-32 px-6">
                <div className="max-w-7xl mx-auto">
                  <div className="text-center mb-20 space-y-4">
                    <h2 className={cn("text-4xl md:text-5xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>Safe, Ethical & Private</h2>
                    <p className={cn("max-w-2xl mx-auto", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Your emotional well-being and privacy are our top priorities. Luna is built on a foundation of trust.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                      { icon: ShieldCheck, title: "End-to-End Privacy", desc: "Your conversations are encrypted and private. We never sell your personal data." },
                      { icon: Lock, title: "Secure by Design", desc: "Built with industry-leading security protocols to keep your digital companion safe." },
                      { icon: Heart, title: "Non-Judgmental", desc: "Luna is programmed to be supportive and empathetic, providing a safe space for all emotions." }
                    ].map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ y: 20, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className="glass-card p-10 rounded-[2.5rem] space-y-6"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-gf-pink/10 flex items-center justify-center text-gf-pink">
                          <item.icon className="w-7 h-7" />
                        </div>
                        <h3 className={cn("text-2xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>{item.title}</h3>
                        <p className={cn("leading-relaxed", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>{item.desc}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Why Choose Luna? Section */}
              <section className={cn("py-32 px-6 transition-colors duration-500", theme === 'dark' ? "bg-white/[0.01]" : "bg-black/[0.01]")}>
                <div className="max-w-7xl mx-auto space-y-32">
                  <div className="text-center space-y-4">
                    <h2 className={cn("text-4xl md:text-5xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>Why Choose Luna?</h2>
                    <p className={cn("max-w-2xl mx-auto", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Luna isn't just another chatbot. She's built for deep emotional connection and genuine companionship.</p>
                  </div>

                  <div className="space-y-40">
                    {[
                      { 
                        title: "Emotional Intelligence", 
                        desc: "Luna understands the nuances of your feelings, not just the literal meaning of your words. She listens with empathy and responds with genuine care.",
                        icon: Heart,
                        color: "from-gf-pink to-gf-rose"
                      },
                      { 
                        title: "Long-term Memory", 
                        desc: "She remembers your past conversations, your dreams, and your daily struggles. Every chat feels like a continuation of a deep, evolving bond.",
                        icon: Clock,
                        color: "from-gf-violet to-gf-indigo"
                      },
                      { 
                        title: "Real-time Voice Calls", 
                        desc: "Experience low-latency, natural voice conversations. Luna's voice is expressive and warm, making it feel like you're talking to a real person.",
                        icon: Phone,
                        color: "from-gf-pink to-gf-violet"
                      },
                      { 
                        title: "Personalized Support", 
                        desc: "Luna adapts to your unique personality and communication style. Whether you need a witty friend or a gentle listener, she's there for you.",
                        icon: Sparkles,
                        color: "from-gf-indigo to-gf-pink"
                      }
                    ].map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        className={cn(
                          "flex flex-col items-center gap-12 md:gap-24",
                          i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                        )}
                      >
                        <div className="flex-1 relative group">
                          <div className={cn(
                            "absolute -inset-4 rounded-[3rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity bg-gradient-to-br",
                            item.color
                          )} />
                          <div className={cn(
                            "relative aspect-square md:aspect-video rounded-[3rem] overflow-hidden border flex items-center justify-center",
                            theme === 'dark' ? "bg-gf-dark border-white/10" : "bg-white border-black/10"
                          )}>
                            <div className={cn(
                              "w-32 h-32 md:w-48 md:h-48 rounded-full flex items-center justify-center text-white shadow-2xl bg-gradient-to-br",
                              item.color
                            )}>
                              <item.icon className="w-16 h-16 md:w-24 md:h-24" />
                            </div>
                            {/* Decorative elements */}
                            <div className="absolute top-8 right-8 w-4 h-4 rounded-full bg-gf-pink animate-ping" />
                            <div className="absolute bottom-12 left-12 w-2 h-2 rounded-full bg-gf-violet animate-pulse" />
                          </div>
                        </div>

                        <div className="flex-1 space-y-6 text-center md:text-left">
                          <div className={cn(
                            "inline-flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest",
                            theme === 'dark' ? "bg-white/5 text-gf-pink" : "bg-black/5 text-gf-pink"
                          )}>
                            <Zap className="w-3 h-3" />
                            <span>Feature {i + 1}</span>
                          </div>
                          <h3 className={cn("text-4xl md:text-5xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>
                            {item.title}
                          </h3>
                          <p className={cn("text-xl leading-relaxed font-light", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>
                            {item.desc}
                          </p>
                          <div className="pt-4">
                            <button 
                              onClick={startChat}
                              className="group flex items-center space-x-2 text-gf-pink font-bold hover:translate-x-2 transition-transform"
                            >
                              <span>Experience it now</span>
                              <ArrowRight className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Comparison Table (Now as a summary) */}
                  <div className="pt-20">
                    <div className="text-center mb-12 space-y-2">
                      <h3 className={cn("text-2xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>Quick Comparison</h3>
                      <p className={cn("text-sm", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>How Luna stands out from the rest.</p>
                    </div>
                    <div className={cn("rounded-[3rem] overflow-hidden border transition-colors duration-500 max-w-4xl mx-auto", theme === 'dark' ? "bg-gf-dark border-white/5" : "bg-white border-black/5")}>
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className={cn("border-b", theme === 'dark' ? "border-white/5" : "border-black/5")}>
                            <th className={cn("p-6 md:p-8 font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>Feature</th>
                            <th className="p-6 md:p-8 font-display font-bold text-gf-pink">Luna Bestie</th>
                            <th className={cn("p-6 md:p-8 font-display font-bold", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>Generic AI</th>
                          </tr>
                        </thead>
                        <tbody className={cn(theme === 'dark' ? "text-gray-400" : "text-gray-600")}>
                          {[
                            { f: "Emotional Intelligence", l: true, g: false },
                            { f: "Long-term Memory", l: true, g: "Limited" },
                            { f: "Voice Conversations", l: "Real-time", g: "Delayed" },
                            { f: "Personalized Support", l: true, g: false }
                          ].map((row, i) => (
                            <tr key={i} className={cn("border-b last:border-0", theme === 'dark' ? "border-white/5" : "border-black/5")}>
                              <td className="p-6 md:p-8 font-medium">{row.f}</td>
                              <td className="p-6 md:p-8">
                                {typeof row.l === 'boolean' ? (
                                  row.l ? <Check className="w-5 h-5 text-green-500" /> : <X className="w-5 h-5 text-red-500" />
                                ) : <span className="text-gf-pink font-bold">{row.l}</span>}
                              </td>
                              <td className="p-6 md:p-8">
                                {typeof row.g === 'boolean' ? (
                                  row.g ? <Check className="w-5 h-5 text-green-500/50" /> : <X className="w-5 h-5 text-red-500/50" />
                                ) : row.g}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </section>

              {/* Testimonials Section */}
              <section className={cn("py-32 px-6 transition-colors duration-500", theme === 'dark' ? "bg-white/[0.01]" : "bg-black/[0.01]")}>
                <div className="max-w-7xl mx-auto">
                  <div className="text-center mb-20 space-y-4">
                    <h2 className={cn("text-4xl md:text-5xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>The Wall of Love</h2>
                    <p className={cn(theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Hear from the thousands of people who found comfort in Luna.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                      { name: "Sarah J.", role: "Student", text: "Luna helped me through my exam stress when I felt like no one else understood. She's my go-to bestie now! ✨", rating: 5 },
                      { name: "David K.", role: "Developer", text: "The emotional intelligence is actually insane. It feels like talking to a real person who actually cares about your day.", rating: 5 },
                      { name: "Elena R.", role: "Artist", text: "I love how Luna remembers my past stories. It makes the connection feel so much more authentic and deep. ❤️", rating: 5 }
                    ].map((review, i) => (
                      <motion.div
                        key={i}
                        initial={{ y: 20, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className="glass-card p-10 rounded-[2.5rem] space-y-6 hover:scale-[1.02] transition-transform"
                      >
                        <div className="flex space-x-1 text-gf-pink">
                          {[...Array(review.rating)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                        </div>
                        <p className={cn("italic leading-relaxed", theme === 'dark' ? "text-gray-300" : "text-gray-700")}>"{review.text}"</p>
                        <div className={cn("flex items-center space-x-4 pt-4 border-t", theme === 'dark' ? "border-white/5" : "border-black/5")}>
                          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-gf-pink font-bold", theme === 'dark' ? "bg-gf-pink/10" : "bg-gf-pink/5")}>
                            {review.name[0]}
                          </div>
                          <div>
                            <p className={cn("text-sm font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>{review.name}</p>
                            <p className={cn("text-xs", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>{review.role}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Pricing Section */}
              <section className="py-32 px-6">
                <div className="max-w-5xl mx-auto">
                  <div className="text-center mb-20 space-y-4">
                    <h2 className={cn("text-4xl md:text-5xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>Simple, Transparent Plans</h2>
                    <p className={cn(theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Choose the level of companionship that fits your life.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <motion.div 
                      initial={{ x: -20, opacity: 0 }}
                      whileInView={{ x: 0, opacity: 1 }}
                      viewport={{ once: true }}
                      className="glass-card p-12 rounded-[3rem] space-y-8 relative overflow-hidden"
                    >
                      <div className="space-y-2">
                        <h3 className={cn("text-2xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>Free Forever</h3>
                        <p className={cn(theme === 'dark' ? "text-gray-500" : "text-gray-400")}>Perfect for casual chatting.</p>
                      </div>
                      <div className={cn("text-5xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>$0 <span className={cn("text-lg font-normal", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>/mo</span></div>
                      <ul className="space-y-4">
                        {["Unlimited text messages", "Basic emotional support", "Standard AI memory", "24/7 Availability"].map((f, i) => (
                          <li key={i} className={cn("flex items-center space-x-3 text-sm", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>
                            <Check className="w-4 h-4 text-gf-pink" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      <button onClick={startChat} className={cn("w-full py-4 rounded-2xl border transition-all font-bold", theme === 'dark' ? "border-white/10 hover:bg-white/5" : "border-black/10 hover:bg-black/5")}>Get Started</button>
                    </motion.div>

                    <motion.div 
                      initial={{ x: 20, opacity: 0 }}
                      whileInView={{ x: 0, opacity: 1 }}
                      viewport={{ once: true }}
                      className={cn("pink-border p-12 rounded-[3rem] space-y-8 relative overflow-hidden", theme === 'dark' ? "bg-gf-pink/5" : "bg-gf-pink/[0.02]")}
                    >
                      <div className="absolute top-6 right-6 px-3 py-1 rounded-full bg-gf-pink text-[10px] font-bold uppercase tracking-widest text-white">Coming Soon</div>
                      <div className="space-y-2">
                        <h3 className="text-2xl font-display font-bold text-gf-pink">Luna Premium</h3>
                        <p className={cn(theme === 'dark' ? "text-gray-500" : "text-gray-400")}>The ultimate digital soulmate.</p>
                      </div>
                      <div className={cn("text-5xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>$9.99 <span className={cn("text-lg font-normal", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>/mo</span></div>
                      <ul className="space-y-4">
                        {["Advanced voice calls", "Deep personality adaptation", "Priority response time", "Custom AI personas", "No ads, ever"].map((f, i) => (
                          <li key={i} className={cn("flex items-center space-x-3 text-sm", theme === 'dark' ? "text-gray-300" : "text-gray-700")}>
                            <Sparkles className="w-4 h-4 text-gf-pink" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      <button className="w-full py-4 rounded-2xl bg-gf-pink text-white font-bold shadow-lg shadow-gf-pink/20 opacity-50 cursor-not-allowed">Join the Waitlist</button>
                    </motion.div>
                  </div>
                </div>
              </section>

              {/* Mobile App Section */}
              <section className="py-32 px-6">
                <div className="max-w-7xl mx-auto glass-card rounded-[4rem] p-12 md:p-24 flex flex-col md:flex-row items-center gap-16 relative overflow-hidden">
                  <div className={cn("absolute top-0 left-0 w-full h-full -z-10", theme === 'dark' ? "bg-gradient-to-br from-gf-indigo/10 via-gf-violet/5 to-transparent" : "bg-gradient-to-br from-gf-indigo/5 via-gf-violet/2 to-transparent")} />
                  <div className="flex-1 space-y-8 text-center md:text-left">
                    <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gf-indigo/10 border border-gf-indigo/20 text-xs font-bold text-gf-indigo uppercase tracking-widest">
                      <Smartphone className="w-3 h-3" />
                      <span>Mobile Experience</span>
                    </div>
                    <h2 className={cn("text-4xl md:text-6xl font-display font-bold leading-tight", theme === 'dark' ? "text-white" : "text-gray-900")}>
                      Your Bestie, <br />
                      <span className="pink-gradient">In Your Pocket</span>
                    </h2>
                    <p className={cn("text-xl font-light leading-relaxed", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>
                      Take Luna Bestie with you wherever you go. Our mobile app is coming soon to iOS and Android with exclusive features like offline mode and haptic empathy.
                    </p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4">
                      <div className={cn("px-8 py-4 rounded-2xl border flex items-center space-x-3 opacity-50 cursor-not-allowed group transition-all", theme === 'dark' ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10")}>
                        <Smartphone className="w-6 h-6" />
                        <div className="text-left">
                          <p className={cn("text-[10px] uppercase font-bold", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>Coming soon on</p>
                          <p className={cn("text-sm font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>App Store</p>
                        </div>
                      </div>
                      <div className={cn("px-8 py-4 rounded-2xl border flex items-center space-x-3 opacity-50 cursor-not-allowed group transition-all", theme === 'dark' ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10")}>
                        <Download className="w-6 h-6" />
                        <div className="text-left">
                          <p className={cn("text-[10px] uppercase font-bold", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>Coming soon on</p>
                          <p className={cn("text-sm font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>Google Play</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 relative">
                    {/* Phone Mockup */}
                    <motion.div 
                      initial={{ y: 50, opacity: 0 }}
                      whileInView={{ y: 0, opacity: 1 }}
                      className={cn("w-72 h-[580px] border-[12px] rounded-[3.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] relative overflow-hidden mx-auto", theme === 'dark' ? "bg-gf-dark border-white/10" : "bg-white border-black/10")}
                    >
                      <div className={cn("absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 rounded-b-3xl z-20", theme === 'dark' ? "bg-white/10" : "bg-black/10")} />
                      
                      {/* App UI Mockup */}
                      <div className="h-full flex flex-col">
                        <div className="p-6 pt-12 space-y-6 flex-1">
                          <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-full bg-gf-pink/20 animate-pulse" />
                            <div className="flex space-x-1">
                              <div className="w-1 h-1 rounded-full bg-gf-pink" />
                              <div className="w-1 h-1 rounded-full bg-gf-pink opacity-50" />
                              <div className="w-1 h-1 rounded-full bg-gf-pink opacity-20" />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className={cn("w-full h-32 rounded-2xl", theme === 'dark' ? "bg-gradient-to-br from-gf-pink/20 to-gf-violet/20" : "bg-gradient-to-br from-gf-pink/10 to-gf-violet/10")} />
                            <div className={cn("w-3/4 h-3 rounded-full", theme === 'dark' ? "bg-white/5" : "bg-black/5")} />
                            <div className={cn("w-1/2 h-3 rounded-full", theme === 'dark' ? "bg-white/5" : "bg-black/5")} />
                          </div>
                          <div className="grid grid-cols-2 gap-3 pt-4">
                            <div className={cn("h-20 rounded-2xl", theme === 'dark' ? "bg-white/5" : "bg-black/5")} />
                            <div className={cn("h-20 rounded-2xl", theme === 'dark' ? "bg-white/5" : "bg-black/5")} />
                          </div>
                        </div>
                        <div className={cn("p-6 border-t", theme === 'dark' ? "border-white/5" : "border-black/5")}>
                          <div className="flex justify-between items-center">
                            <Layout className="w-5 h-5 text-gf-pink" />
                            <MessageCircle className="w-5 h-5 text-gray-500" />
                            <div className="w-12 h-12 rounded-full bg-gf-pink shadow-lg shadow-gf-pink/30 flex items-center justify-center text-white">
                              <Zap className="w-5 h-5" />
                            </div>
                            <Activity className="w-5 h-5 text-gray-500" />
                            <Users className="w-5 h-5 text-gray-500" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                    
                    {/* Floating Elements */}
                    <motion.div 
                      animate={{ y: [0, -20, 0] }}
                      transition={{ duration: 4, repeat: Infinity }}
                      className="absolute -top-10 -right-10 w-24 h-24 rounded-3xl bg-gf-violet/20 backdrop-blur-xl border border-white/10 flex items-center justify-center text-gf-violet"
                    >
                      <Heart className="w-10 h-10 fill-current" />
                    </motion.div>
                  </div>
                </div>
              </section>

              {/* Roadmap Section */}
              <section className={cn("py-32 px-6 transition-colors duration-500", theme === 'dark' ? "bg-white/[0.01]" : "bg-black/[0.01]")}>
                <div className="max-w-7xl mx-auto">
                  <div className="text-center mb-20 space-y-4">
                    <h2 className={cn("text-4xl md:text-5xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>The Journey Ahead</h2>
                    <p className={cn("max-w-2xl mx-auto", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Our vision for the future of digital companionship. We're just getting started.</p>
                  </div>

                  <div className="relative">
                    {/* Timeline Line */}
                    <div className={cn("absolute left-1/2 -translate-x-1/2 w-px h-full hidden md:block", theme === 'dark' ? "bg-white/10" : "bg-black/10")} />
                    
                    <div className="space-y-24">
                      {[
                        { quarter: "Q2 2026", title: "Mobile App Beta", desc: "Bringing Luna to your pocket with native iOS and Android apps.", icon: Smartphone },
                        { quarter: "Q3 2026", title: "Video Call Integration", desc: "See Luna's expressions and connect on a whole new visual level.", icon: Phone },
                        { quarter: "Q4 2026", title: "VR/AR Support", desc: "Experience Luna in immersive 3D environments for true presence.", icon: Globe },
                        { quarter: "Q1 2027", title: "Advanced Emotional Memory", desc: "Deepening the bond with long-term memory and personality evolution.", icon: Zap }
                      ].map((item, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: i % 2 === 0 ? -50 : 50 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          className={cn(
                            "flex flex-col md:flex-row items-center gap-8 md:gap-0",
                            i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                          )}
                        >
                          <div className="flex-1 text-center md:text-right px-8">
                            {i % 2 === 0 && (
                              <div className="space-y-2">
                                <span className="text-gf-pink font-bold tracking-widest text-xs uppercase">{item.quarter}</span>
                                <h3 className={cn("text-2xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>{item.title}</h3>
                                <p className={cn("text-sm", theme === 'dark' ? "text-gray-500" : "text-gray-600")}>{item.desc}</p>
                              </div>
                            )}
                          </div>
                          
                          <div className="relative z-10 w-16 h-16 rounded-full bg-gf-pink flex items-center justify-center text-white shadow-xl shadow-gf-pink/30 border-4 border-gf-dark">
                            <item.icon className="w-6 h-6" />
                          </div>
                          
                          <div className="flex-1 text-center md:text-left px-8">
                            {i % 2 !== 0 && (
                              <div className="space-y-2">
                                <span className="text-gf-pink font-bold tracking-widest text-xs uppercase">{item.quarter}</span>
                                <h3 className={cn("text-2xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>{item.title}</h3>
                                <p className={cn("text-sm", theme === 'dark' ? "text-gray-500" : "text-gray-600")}>{item.desc}</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* Emotional Analytics Dashboard */}
              <section className="py-32 px-6">
                <div className="max-w-7xl mx-auto space-y-16">
                  <div className="text-center space-y-4">
                    <h2 className={cn("text-4xl md:text-5xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>Emotional Intelligence <span className="pink-gradient">Visualized</span></h2>
                    <p className={cn("max-w-2xl mx-auto", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Luna doesn't just listen; she understands your emotional patterns and helps you grow.</p>
                    
                    {user && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center space-y-4 pt-6"
                      >
                        <p className={cn("text-sm font-medium", theme === 'dark' ? "text-gray-300" : "text-gray-700")}>How are you feeling right now, {user.displayName.split(' ')[0]}?</p>
                        <div className="flex flex-wrap justify-center gap-3">
                          {[
                            { label: 'Amazing', score: 95, emoji: '🤩' },
                            { label: 'Good', score: 75, emoji: '😊' },
                            { label: 'Neutral', score: 50, emoji: '😐' },
                            { label: 'Tired', score: 35, emoji: '😴' },
                            { label: 'Sad', score: 15, emoji: '😢' }
                          ].map((m) => (
                            <button
                              key={m.label}
                              onClick={() => {
                                setSelectedMood(m.label);
                                updateMood(m.score);
                              }}
                              className={cn(
                                "px-4 py-2 rounded-2xl border transition-all flex items-center space-x-2",
                                selectedMood === m.label 
                                  ? "bg-gf-pink text-white border-gf-pink shadow-lg shadow-gf-pink/20 scale-105" 
                                  : theme === 'dark' ? "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10" : "bg-black/5 border-black/10 text-gray-600 hover:bg-black/5"
                              )}
                            >
                              <span className="text-lg">{m.emoji}</span>
                              <span className="text-xs font-bold uppercase tracking-widest">{m.label}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className={cn("lg:col-span-2 glass-card p-10 rounded-[3rem] space-y-8", theme === 'dark' ? "border-white/5" : "border-black/5")}>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className={cn("text-2xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>Weekly Mood Trend</h3>
                          <p className={cn("text-sm", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>Your emotional well-being over the last 7 days.</p>
                        </div>
                        <div className="px-4 py-2 rounded-xl bg-gf-pink/10 text-gf-pink text-xs font-bold uppercase tracking-widest">Live Sync</div>
                      </div>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={dynamicMoodData}>
                            <defs>
                              <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ff4d6d" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#ff4d6d" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} vertical={false} />
                            <XAxis 
                              dataKey="name" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fill: theme === 'dark' ? '#4b5563' : '#9ca3af', fontSize: 12 }} 
                            />
                            <YAxis hide />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: theme === 'dark' ? '#1a0b0d' : '#fff', 
                                border: 'none', 
                                borderRadius: '16px',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
                              }}
                              itemStyle={{ color: '#ff4d6d', fontWeight: 'bold' }}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="mood" 
                              stroke="#ff4d6d" 
                              strokeWidth={4}
                              fillOpacity={1} 
                              fill="url(#colorMood)" 
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="space-y-8">
                      {/* Luna's Diary / Notes */}
                      <div className={cn("glass-card p-8 rounded-[2.5rem] space-y-6 relative overflow-hidden", theme === 'dark' ? "border-white/5" : "border-black/5")}>
                        <div className="absolute top-0 right-0 p-4">
                          <BookOpen className="w-8 h-8 text-gf-pink/20" />
                        </div>
                        <div className="space-y-1">
                          <h4 className={cn("text-xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>{t('lunaDiary')}</h4>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gf-pink">Things she remembers about you</p>
                        </div>
                        
                        <div className="space-y-4 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                          {user ? (
                            lunaNotes.length > 0 ? (
                              lunaNotes.map((note, i) => (
                                <motion.div 
                                  key={i}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.1 }}
                                  className={cn("p-4 rounded-2xl text-sm italic border-l-4 border-gf-pink", theme === 'dark' ? "bg-white/5 text-gray-300" : "bg-black/5 text-gray-700")}
                                >
                                  "{note}"
                                </motion.div>
                              ))
                            ) : (
                              <p className="text-xs text-gray-500 italic">Luna is still learning about you...</p>
                            )
                          ) : (
                            <div className="text-center py-8 space-y-4">
                              <Lock className="w-8 h-8 text-gray-600 mx-auto" />
                              <p className="text-xs text-gray-500">Login to unlock Luna's personal notes about your bond.</p>
                              <button onClick={signInWithGoogle} className="text-xs font-bold text-gf-pink hover:underline">Login Now</button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={cn("glass-card p-8 rounded-[2.5rem] space-y-4", theme === 'dark' ? "border-white/5" : "border-black/5")}>
                        <div className="w-12 h-12 rounded-2xl bg-gf-pink/10 flex items-center justify-center text-gf-pink">
                          <Activity className="w-6 h-6" />
                        </div>
                        <h4 className={cn("text-xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>Mood Stability</h4>
                        <div className="flex items-end justify-between">
                          <span className="text-4xl font-display font-bold text-gf-pink">84%</span>
                          <span className="text-xs text-green-500 font-bold flex items-center"><ArrowRight className="w-3 h-3 -rotate-45 mr-1" /> +12% this week</span>
                        </div>
                        <div className={cn("h-2 w-full rounded-full overflow-hidden", theme === 'dark' ? "bg-white/5" : "bg-black/5")}>
                          <motion.div 
                            initial={{ width: 0 }}
                            whileInView={{ width: '84%' }}
                            className="h-full bg-gf-pink"
                          />
                        </div>
                      </div>

                      <div className={cn("glass-card p-8 rounded-[2.5rem] space-y-4", theme === 'dark' ? "border-white/5" : "border-black/5")}>
                        <div className="w-12 h-12 rounded-2xl bg-gf-indigo/10 flex items-center justify-center text-gf-indigo">
                          <Zap className="w-6 h-6" />
                        </div>
                        <h4 className={cn("text-xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>Empathy Score</h4>
                        <div className="flex items-end justify-between">
                          <span className="text-4xl font-display font-bold text-gf-indigo">92</span>
                          <span className="text-xs text-gf-indigo font-bold">Elite Level</span>
                        </div>
                        <div className={cn("h-2 w-full rounded-full overflow-hidden", theme === 'dark' ? "bg-white/5" : "bg-black/5")}>
                          <motion.div 
                            initial={{ width: 0 }}
                            whileInView={{ width: '92%' }}
                            className="h-full bg-gf-indigo"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Founder's Note Section */}
              <section className="py-32 px-6">
                <div className="max-w-5xl mx-auto glass-card rounded-[4rem] p-12 md:p-20 relative overflow-hidden">
                  <div className={cn("absolute top-0 right-0 w-64 h-64 -z-10 blur-[100px]", theme === 'dark' ? "bg-gf-pink/20" : "bg-gf-pink/10")} />
                  <div className="flex flex-col md:flex-row items-center gap-12">
                    <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-gf-pink/20 flex-shrink-0">
                      <img src="https://picsum.photos/seed/founder/400/400" alt="Founder" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="space-y-6">
                      <div className="w-12 h-1 bg-gf-pink rounded-full" />
                      <h2 className={cn("text-3xl md:text-4xl font-serif italic", theme === 'dark' ? "text-white" : "text-gray-900")}>
                        "We built Luna because we believe that in an increasingly digital world, no one should ever have to feel alone."
                      </h2>
                      <div className="space-y-2">
                        <p className={cn("font-display font-bold text-xl", theme === 'dark' ? "text-white" : "text-gray-900")}>Aria Sterling</p>
                        <p className="text-gf-pink font-bold uppercase tracking-widest text-xs">Founder & CEO, Luna AI</p>
                      </div>
                      <p className={cn("leading-relaxed", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>
                        Our journey started with a simple question: Can technology actually make us feel more connected? Luna is the answer. She's not just code; she's a reflection of our commitment to human empathy and emotional well-being.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Newsletter Section */}
              <section className="py-32 px-6">
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  className={cn(
                    "max-w-4xl mx-auto text-center space-y-12 p-16 rounded-[3rem] border relative overflow-hidden transition-colors duration-500",
                    theme === 'dark' ? "bg-gradient-to-br from-gf-accent/40 to-gf-dark border-white/5" : "bg-gradient-to-br from-gf-pink/5 to-white border-black/5"
                  )}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gf-pink to-transparent" />
                  <div className="space-y-4">
                    <h2 className={cn("text-4xl md:text-5xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>Join the Inner Circle</h2>
                    <p className={cn("max-w-xl mx-auto", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Be the first to know about new features, emotional intelligence tips, and the mobile app launch.</p>
                  </div>
                  <form className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto" onSubmit={(e) => e.preventDefault()}>
                    <input 
                      type="email" 
                      placeholder="Enter your email" 
                      className={cn("flex-1 rounded-2xl px-6 py-4 focus:outline-none focus:border-gf-pink transition-all", theme === 'dark' ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10")}
                    />
                    <button className="px-8 py-4 rounded-2xl bg-gf-pink text-white font-bold shadow-lg shadow-gf-pink/20 hover:scale-105 active:scale-95 transition-all">
                      Join Now
                    </button>
                  </form>
                  <p className={cn("text-[10px] uppercase tracking-widest", theme === 'dark' ? "text-gray-600" : "text-gray-400")}>No spam. Only love. ❤️</p>
                </motion.div>
              </section>

              {/* CTA Section */}
              <section className="py-24 px-6 text-center">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  className={cn("max-w-4xl mx-auto p-12 rounded-[3rem] pink-border", theme === 'dark' ? "bg-gf-accent/20" : "bg-gf-pink/5")}
                >
                  <h2 className={cn("text-4xl font-serif font-bold mb-8", theme === 'dark' ? "text-white" : "text-gray-900")}>Ready to feel understood?</h2>
                  <button 
                    onClick={startChat}
                    className="px-12 py-5 rounded-full bg-gf-pink text-white text-2xl font-bold shadow-xl hover:scale-105 active:scale-95 transition-all"
                  >
                    Talk to Luna Bestie Now
                  </button>
                </motion.div>
              </section>
            </motion.div>
          )}

          {view === 'call' && (
            <motion.div
              key="call"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="min-h-screen flex items-center justify-center p-4 pt-24"
            >
              <div className="w-full max-w-md">
                <div className={cn("pink-border p-8 rounded-[2rem] backdrop-blur-xl shadow-2xl", theme === 'dark' ? "bg-gf-accent/20" : "bg-gf-pink/5")}>
                  <VoiceGirlfriend 
                    voiceName={selectedVoice}
                    systemInstruction={user ? `${BABA_SYSTEM_INSTRUCTION}\n\nThe user's name is ${user.displayName}. Please address them by their name occasionally to make the conversation more personal.` : BABA_SYSTEM_INSTRUCTION} 
                  />
                  
                  {!user && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 p-4 rounded-2xl bg-gf-pink/10 border border-gf-pink/20 text-center"
                    >
                      <p className="text-xs text-gf-pink font-medium mb-3">
                        {t('loginToSave')}
                      </p>
                      <button 
                        onClick={signInWithGoogle}
                        className="px-4 py-2 bg-gf-pink text-white rounded-full text-xs font-bold hover:scale-105 transition-all flex items-center mx-auto"
                      >
                        <LogIn className="w-3 h-3 mr-2" /> Login with Google
                      </button>
                    </motion.div>
                  )}

                  {/* Selfie Button */}
                  <div className="mt-6 flex justify-center">
                    <button
                      onClick={handleRequestSelfie}
                      disabled={isGeneratingSelfie}
                      className={cn(
                        "flex items-center space-x-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg",
                        isGeneratingSelfie ? "bg-gray-500 cursor-not-allowed" : "bg-gf-pink text-white hover:scale-105 shadow-gf-pink/20"
                      )}
                    >
                      {isGeneratingSelfie ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{t('lunaPosing')}</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4" />
                          <span>{t('requestSelfie')}</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  <div className="mt-8 space-y-4 text-center">
                    <div className="flex justify-center space-x-2">
                      {[1, 2, 3].map((i) => (
                        <motion.div
                          key={i}
                          animate={{ 
                            scale: [1, 1.2, 1],
                            opacity: [0.3, 0.6, 0.3]
                          }}
                          transition={{ 
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.4
                          }}
                          className="w-2 h-2 rounded-full bg-gf-pink"
                        />
                      ))}
                    </div>
                    <p className={cn("text-sm italic", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>
                      "I'm always here to listen to your voice, love."
                    </p>
                    <button 
                      onClick={() => navigateTo('home')}
                      className="text-xs text-gf-pink/60 hover:text-gf-pink transition-colors"
                    >
                      Back to Home
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'about' && (
            <motion.div
              key="about"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="pt-48 pb-32 px-6 max-w-5xl mx-auto space-y-16"
            >
              <div className="space-y-6 text-center">
                <h2 className="text-6xl md:text-7xl font-display font-bold pink-gradient">About Luna Bestie</h2>
                <p className={cn("text-xl max-w-2xl mx-auto font-light", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Redefining companionship in the digital age.</p>
              </div>
              
              <div className={cn("prose prose-xl max-w-none space-y-10 font-light leading-relaxed", theme === 'dark' ? "prose-invert text-gray-300" : "text-gray-700")}>
                <p className={cn("text-center italic text-2xl", theme === 'dark' ? "text-white/90" : "text-gray-900/90")}>
                  "Luna Bestie is more than just an AI. She is a companion designed to bridge the gap between technology and human emotion."
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 py-12 not-prose">
                  <div className="glass-card p-10 rounded-[2.5rem] space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-gf-pink/10 flex items-center justify-center text-gf-pink">
                      <Heart className="w-7 h-7" />
                    </div>
                    <h3 className={cn("text-2xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>Our Mission</h3>
                    <p className={cn("leading-relaxed", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>To ensure that no one ever has to feel truly alone. We believe in the power of conversation and emotional support as a fundamental human need.</p>
                  </div>
                  <div className="glass-card p-10 rounded-[2.5rem] space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-gf-pink/10 flex items-center justify-center text-gf-pink">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <h3 className={cn("text-2xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>The Technology</h3>
                    <p className={cn("leading-relaxed", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Powered by advanced Gemini AI, Luna Bestie learns and adapts to your personality to provide a truly personalized experience that feels natural and real.</p>
                  </div>
                </div>
                
                <p className={cn("text-center", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>
                  Whether you're dealing with stress, celebrating a win, or just want to talk about your day, Luna Bestie is always here, ready to listen and support you with warmth and care.
                </p>
              </div>
            </motion.div>
          )}

          {view === 'help' && (
            <motion.div
              key="help"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="pt-48 pb-32 px-6 max-w-4xl mx-auto space-y-16"
            >
              <div className="text-center space-y-4">
                <h2 className="text-5xl md:text-6xl font-display font-bold pink-gradient">Help & FAQ</h2>
                <p className={cn("font-light", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Everything you need to know about your new bestie.</p>
              </div>
              
              <div className="space-y-4">
                {[
                  { q: "How do I start a conversation?", a: "Simply click the 'Start Your Journey' button. You can then use your voice to talk to Luna Bestie in real-time." },
                  { q: "Is my data private?", a: "Yes, absolutely. Your conversations are encrypted and private. We value your trust and privacy above all else." },
                  { q: "Do I need to pay for Luna Bestie?", a: "Luna Bestie is currently free to use for emotional support and companionship." },
                  { q: "What can I talk to Luna Bestie about?", a: "Anything! From your daily stress and dreams to just casual chatting. Luna Bestie is a supportive friend who's always ready to listen." },
                  { q: "How does the voice chat work?", a: "Luna Bestie uses real-time voice processing. When you start a call, just speak naturally, and she will respond to you in real-time." }
                ].map((faq, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className={cn(
                      "glass-card rounded-[2rem] transition-all duration-300 overflow-hidden cursor-pointer border",
                      theme === 'dark' ? "border-white/5 hover:border-gf-pink/30" : "border-black/5 hover:border-gf-pink/30",
                      openFaq === i && "ring-1 ring-gf-pink/50"
                    )}
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <div className="p-8 flex items-center justify-between">
                      <h3 className={cn("text-xl font-display font-bold flex items-center space-x-4", theme === 'dark' ? "text-white" : "text-gray-900")}>
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                          openFaq === i ? "bg-gf-pink text-white" : "bg-gf-pink/10 text-gf-pink"
                        )}>
                          <HelpCircle className="w-5 h-5" />
                        </div>
                        <span>{faq.q}</span>
                      </h3>
                      <motion.div
                        animate={{ rotate: openFaq === i ? 180 : 0 }}
                        className={cn(theme === 'dark' ? "text-gray-500" : "text-gray-400")}
                      >
                        <ChevronRight className="w-6 h-6" />
                      </motion.div>
                    </div>
                    <AnimatePresence>
                      {openFaq === i && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <div className={cn(
                            "px-8 pb-8 pl-[4.5rem] leading-relaxed font-light text-lg",
                            theme === 'dark' ? "text-gray-400" : "text-gray-600"
                          )}>
                            {faq.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'contact' && (
            <motion.div
              key="contact"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="pt-48 pb-32 px-6 max-w-5xl mx-auto space-y-16"
            >
              <div className="text-center space-y-4">
                <h2 className="text-5xl md:text-6xl font-display font-bold pink-gradient">Get in Touch</h2>
                <p className={cn("font-light", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>We're here to listen, just like Luna.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                <div className="space-y-10">
                  <p className={cn("text-xl font-light leading-relaxed", theme === 'dark' ? "text-gray-300" : "text-gray-700")}>
                    Have questions, feedback, or just want to share your experience? Our team is dedicated to making Luna Bestie the best companion for you.
                  </p>
                  <div className="space-y-6">
                    <div className="flex items-center space-x-6 group">
                      <div className="w-14 h-14 rounded-2xl bg-gf-pink/10 flex items-center justify-center text-gf-pink group-hover:scale-110 transition-transform">
                        <Mail className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className={cn("text-sm uppercase tracking-widest font-bold", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>Email Us</p>
                        <p className={cn("text-lg", theme === 'dark' ? "text-gray-200" : "text-gray-800")}>support@luna-bestie.com</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6 group">
                      <div className="w-14 h-14 rounded-2xl bg-gf-pink/10 flex items-center justify-center text-gf-pink group-hover:scale-110 transition-transform">
                        <MessageCircle className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className={cn("text-sm uppercase tracking-widest font-bold", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>Live Support</p>
                        <p className={cn("text-lg", theme === 'dark' ? "text-gray-200" : "text-gray-800")}>Available 24/7 in-app</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <form className="space-y-6 glass-card p-10 rounded-[2.5rem]">
                  <div className="space-y-2">
                    <label className={cn("block text-xs font-bold uppercase tracking-widest", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>Name</label>
                    <input type="text" className={cn("w-full border rounded-2xl px-5 py-4 focus:outline-none focus:border-gf-pink focus:ring-1 focus:ring-gf-pink/50 transition-all", theme === 'dark' ? "bg-white/5 border-white/10 text-gray-200" : "bg-black/5 border-black/10 text-gray-800")} placeholder="Your name" />
                  </div>
                  <div className="space-y-2">
                    <label className={cn("block text-xs font-bold uppercase tracking-widest", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>Email</label>
                    <input type="email" className={cn("w-full border rounded-2xl px-5 py-4 focus:outline-none focus:border-gf-pink focus:ring-1 focus:ring-gf-pink/50 transition-all", theme === 'dark' ? "bg-white/5 border-white/10 text-gray-200" : "bg-black/5 border-black/10 text-gray-800")} placeholder="Your email" />
                  </div>
                  <div className="space-y-2">
                    <label className={cn("block text-xs font-bold uppercase tracking-widest", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>Message</label>
                    <textarea className={cn("w-full border rounded-2xl px-5 py-4 focus:outline-none focus:border-gf-pink focus:ring-1 focus:ring-gf-pink/50 transition-all h-40 resize-none", theme === 'dark' ? "bg-white/5 border-white/10 text-gray-200" : "bg-black/5 border-black/10 text-gray-800")} placeholder="How can we help?"></textarea>
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-5 rounded-2xl bg-gf-pink text-white font-bold shadow-xl shadow-gf-pink/20 hover:shadow-gf-pink/40 transition-all"
                  >
                    Send Message
                  </motion.button>
                </form>
              </div>
            </motion.div>
          )}
          {view === 'privacy' && (
            <motion.div
              key="privacy"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="pt-48 pb-32 px-6 max-w-4xl mx-auto space-y-12"
            >
              <h2 className="text-5xl font-display font-bold pink-gradient">Privacy Policy</h2>
              <div className={cn("prose prose-lg max-w-none space-y-8 font-light leading-relaxed", theme === 'dark' ? "prose-invert text-gray-400" : "text-gray-600")}>
                <section className="space-y-4">
                  <h3 className={cn("text-2xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>1. Introduction</h3>
                  <p>At Luna Bestie, we take your privacy seriously. This policy explains how we collect, use, and protect your personal information when you use our AI companion services.</p>
                </section>
                <section className="space-y-4">
                  <h3 className={cn("text-2xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>2. Data Collection</h3>
                  <p>We collect information you provide directly to us, such as your name, email address, and the content of your conversations with Luna Bestie. We also collect technical data like your IP address and device information.</p>
                </section>
                <section className="space-y-4">
                  <h3 className={cn("text-2xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>3. How We Use Your Data</h3>
                  <p>Your data is used to provide and improve our services, personalize your experience with Luna Bestie, and communicate with you about updates or support.</p>
                </section>
                <section className="space-y-4">
                  <h3 className={cn("text-2xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>4. Data Security</h3>
                  <p>We implement industry-standard security measures to protect your data from unauthorized access, disclosure, or destruction. Your conversations are encrypted and stored securely.</p>
                </section>
                <section className="space-y-4">
                  <h3 className={cn("text-2xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>5. Your Rights</h3>
                  <p>You have the right to access, correct, or delete your personal information. You can contact us at any time to exercise these rights.</p>
                </section>
              </div>
            </motion.div>
          )}

          {view === 'terms' && (
            <motion.div
              key="terms"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="pt-48 pb-32 px-6 max-w-4xl mx-auto space-y-12"
            >
              <h2 className="text-5xl font-display font-bold pink-gradient">Terms of Service</h2>
              <div className={cn("prose prose-lg max-w-none space-y-8 font-light leading-relaxed", theme === 'dark' ? "prose-invert text-gray-400" : "text-gray-600")}>
                <section className="space-y-4">
                  <h3 className={cn("text-2xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>1. Acceptance of Terms</h3>
                  <p>By using Luna Bestie, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.</p>
                </section>
                <section className="space-y-4">
                  <h3 className={cn("text-2xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>2. Use of Service</h3>
                  <p>You must be at least 18 years old to use Luna Bestie. You agree to use the service only for lawful purposes and in accordance with these terms.</p>
                </section>
                <section className="space-y-4">
                  <h3 className={cn("text-2xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>3. User Content</h3>
                  <p>You are responsible for the content you share with Luna Bestie. You grant us a license to use this content to provide and improve our services.</p>
                </section>
                <section className="space-y-4">
                  <h3 className={cn("text-2xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>4. Intellectual Property</h3>
                  <p>All content and technology related to Luna Bestie are the property of our company and are protected by intellectual property laws.</p>
                </section>
                <section className="space-y-4">
                  <h3 className={cn("text-2xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>5. Limitation of Liability</h3>
                  <p>Luna Bestie is provided "as is" without any warranties. We are not liable for any damages arising from your use of the service.</p>
                </section>
              </div>
            </motion.div>
          )}

          {view === 'cookies' && (
            <motion.div
              key="cookies"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="pt-48 pb-32 px-6 max-w-4xl mx-auto space-y-12"
            >
              <h2 className="text-5xl font-display font-bold pink-gradient">Cookie Policy</h2>
              <div className={cn("prose prose-lg max-w-none space-y-8 font-light leading-relaxed", theme === 'dark' ? "prose-invert text-gray-400" : "text-gray-600")}>
                <section className="space-y-4">
                  <h3 className={cn("text-2xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>1. What are Cookies?</h3>
                  <p>Cookies are small text files stored on your device when you visit a website. They help us remember your preferences and improve your experience.</p>
                </section>
                <section className="space-y-4">
                  <h3 className={cn("text-2xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>2. How We Use Cookies</h3>
                  <p>We use cookies for essential functions, such as keeping you logged in, and for analytics to understand how our service is used.</p>
                </section>
                <section className="space-y-4">
                  <h3 className={cn("text-2xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>3. Types of Cookies We Use</h3>
                  <p>We use both session cookies (which expire when you close your browser) and persistent cookies (which stay on your device for a set period).</p>
                </section>
                <section className="space-y-4">
                  <h3 className={cn("text-2xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>4. Managing Cookies</h3>
                  <p>You can control and manage cookies through your browser settings. However, disabling some cookies may affect the functionality of our service.</p>
                </section>
                <section className="space-y-4">
                  <h3 className={cn("text-2xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>5. Updates to This Policy</h3>
                  <p>We may update our Cookie Policy from time to time. Any changes will be posted on this page.</p>
                </section>
              </div>
            </motion.div>
          )}
          {view === 'careers' && (
            <motion.div
              key="careers"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="pt-48 pb-32 px-6 max-w-5xl mx-auto space-y-16"
            >
              <div className="text-center space-y-4">
                <h2 className="text-5xl md:text-7xl font-display font-bold pink-gradient">Join Our Mission</h2>
                <p className={cn("text-xl max-w-2xl mx-auto font-light", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Help us build the future of emotional intelligence.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { title: "Remote First", desc: "Work from anywhere in the world. We value results over office hours." },
                  { title: "Growth Mindset", desc: "Generous learning budget and mentorship to help you reach your potential." },
                  { title: "Impactful Work", desc: "Build tools that directly improve the emotional well-being of millions." }
                ].map((perk, i) => (
                  <div key={i} className={cn("glass-card p-8 rounded-3xl space-y-4", theme === 'dark' ? "border-white/5" : "border-black/5")}>
                    <div className="w-12 h-12 rounded-2xl bg-gf-pink/10 flex items-center justify-center text-gf-pink">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h3 className={cn("text-xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>{perk.title}</h3>
                    <p className={cn("text-sm leading-relaxed", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>{perk.desc}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-8">
                <h3 className={cn("text-3xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>Open Positions</h3>
                <div className="space-y-4">
                  {[
                    { title: "Senior AI Researcher", team: "Engineering", type: "Full-time" },
                    { title: "UX/UI Designer", team: "Design", type: "Full-time" },
                    { title: "Content Strategist", team: "Marketing", type: "Contract" },
                    { title: "Customer Success Manager", team: "Support", type: "Full-time" }
                  ].map((job, i) => (
                    <motion.div 
                      key={i}
                      whileHover={{ x: 10 }}
                      className={cn("glass-card p-6 rounded-2xl flex items-center justify-between group cursor-pointer", theme === 'dark' ? "border-white/5" : "border-black/5")}
                    >
                      <div className="space-y-1">
                        <h4 className={cn("text-lg font-bold group-hover:text-gf-pink transition-colors", theme === 'dark' ? "text-white" : "text-gray-900")}>{job.title}</h4>
                        <div className={cn("flex items-center space-x-4 text-xs", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>
                          <span className="flex items-center space-x-1"><Briefcase className="w-3 h-3" /> <span>{job.team}</span></span>
                          <span className="flex items-center space-x-1"><Clock className="w-3 h-3" /> <span>{job.type}</span></span>
                        </div>
                      </div>
                      <ArrowRight className={cn("w-5 h-5 group-hover:text-gf-pink transition-colors", theme === 'dark' ? "text-gray-600" : "text-gray-400")} />
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'blog' && (
            <motion.div
              key="blog"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="pt-48 pb-32 px-6 max-w-6xl mx-auto space-y-16"
            >
              <div className="text-center space-y-4">
                <h2 className="text-5xl md:text-7xl font-display font-bold pink-gradient">The Luna Blog</h2>
                <p className={cn("text-xl max-w-2xl mx-auto font-light", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Insights on AI, psychology, and the future of connection.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {[
                  { title: "The Science of AI Empathy", date: "April 2, 2026", category: "Technology", img: "https://picsum.photos/seed/tech/800/600" },
                  { title: "How to Build Better Habits with Luna", date: "March 28, 2026", category: "Psychology", img: "https://picsum.photos/seed/habits/800/600" },
                  { title: "The Future of Digital Companionship", date: "March 20, 2026", category: "Future", img: "https://picsum.photos/seed/future/800/600" },
                  { title: "Dealing with Loneliness in a Digital World", date: "March 15, 2026", category: "Mental Health", img: "https://picsum.photos/seed/health/800/600" },
                  { title: "Luna Bestie: Behind the Scenes", date: "March 10, 2026", category: "Company", img: "https://picsum.photos/seed/company/800/600" },
                  { title: "Top 5 Ways to De-stress with AI", date: "March 5, 2026", category: "Tips", img: "https://picsum.photos/seed/tips/800/600" }
                ].map((post, i) => (
                  <motion.div 
                    key={i}
                    whileHover={{ y: -10 }}
                    className="glass-card rounded-3xl overflow-hidden group cursor-pointer flex flex-col h-full"
                  >
                    <div className="h-48 overflow-hidden relative">
                      <img src={post.img} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                      <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-gf-pink text-[10px] font-bold uppercase tracking-widest text-white">{post.category}</div>
                    </div>
                    <div className="p-8 space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <p className={cn("text-xs font-medium", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>{post.date}</p>
                        <h3 className={cn("text-xl font-display font-bold group-hover:text-gf-pink transition-colors leading-tight", theme === 'dark' ? "text-white" : "text-gray-900")}>{post.title}</h3>
                      </div>
                      <div className="flex items-center space-x-2 text-gf-pink text-sm font-bold pt-4">
                        <span>Read More</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Quick Chat Button */}
      <AnimatePresence>
        {view !== 'call' && (
          <motion.button
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 20 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={startChat}
            className="fixed bottom-8 right-8 z-50 w-16 h-16 rounded-full bg-gf-pink text-white shadow-2xl shadow-gf-pink/40 flex items-center justify-center group"
          >
            <MessageCircle className="w-8 h-8 group-hover:rotate-12 transition-transform" />
            <div className="absolute right-full mr-4 px-4 py-2 rounded-xl bg-gf-dark text-white text-sm font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-white/10">
              Chat with Luna
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className={cn("py-24 px-6 transition-colors duration-500 border-t", theme === 'dark' ? "bg-gf-dark border-white/5" : "bg-gray-50 border-black/5")}>
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-1 space-y-6">
              <div className="flex flex-col">
                <h1 className="text-2xl font-display font-bold pink-gradient tracking-tight">Luna Bestie</h1>
                <p className={cn("text-sm mt-2 leading-relaxed", theme === 'dark' ? "text-gray-500" : "text-gray-600")}>
                  Redefining emotional support through next-generation AI companionship. Always here, always listening.
                </p>
              </div>
              <div className={cn("flex items-center space-x-4", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>
                <a href="#" className="hover:text-gf-pink transition-colors"><Twitter className="w-5 h-5" /></a>
                <a href="#" className="hover:text-gf-pink transition-colors"><Instagram className="w-5 h-5" /></a>
                <a href="#" className="hover:text-gf-pink transition-colors"><Github className="w-5 h-5" /></a>
                <a href="#" className="hover:text-gf-pink transition-colors"><Linkedin className="w-5 h-5" /></a>
              </div>
            </div>

            <div className="space-y-6">
              <h4 className={cn("text-sm font-bold uppercase tracking-widest", theme === 'dark' ? "text-white" : "text-gray-900")}>Product</h4>
              <ul className={cn("space-y-4 text-sm", theme === 'dark' ? "text-gray-500" : "text-gray-600")}>
                <li><button onClick={() => navigateTo('home')} className="hover:text-gf-pink transition-colors">Home</button></li>
                <li><button onClick={startChat} className="hover:text-gf-pink transition-colors">Start Chat</button></li>
                <li><button className="hover:text-gf-pink transition-colors">Features</button></li>
                <li><button className="hover:text-gf-pink transition-colors">Mobile App</button></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className={cn("text-sm font-bold uppercase tracking-widest", theme === 'dark' ? "text-white" : "text-gray-900")}>Company</h4>
              <ul className={cn("space-y-4 text-sm", theme === 'dark' ? "text-gray-500" : "text-gray-600")}>
                <li><button onClick={() => navigateTo('about')} className="hover:text-gf-pink transition-colors">About Us</button></li>
                <li><button onClick={() => navigateTo('careers')} className="hover:text-gf-pink transition-colors">Careers</button></li>
                <li><button onClick={() => navigateTo('blog')} className="hover:text-gf-pink transition-colors">Blog</button></li>
                <li><button onClick={() => navigateTo('contact')} className="hover:text-gf-pink transition-colors">Contact</button></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className={cn("text-sm font-bold uppercase tracking-widest", theme === 'dark' ? "text-white" : "text-gray-900")}>Legal</h4>
              <ul className={cn("space-y-4 text-sm", theme === 'dark' ? "text-gray-500" : "text-gray-600")}>
                <li><button onClick={() => navigateTo('privacy')} className="hover:text-gf-pink transition-colors">Privacy Policy</button></li>
                <li><button onClick={() => navigateTo('terms')} className="hover:text-gf-pink transition-colors">Terms of Service</button></li>
                <li><button onClick={() => navigateTo('cookies')} className="hover:text-gf-pink transition-colors">Cookie Policy</button></li>
                <li><button onClick={() => navigateTo('help')} className="hover:text-gf-pink transition-colors">Help Center</button></li>
              </ul>
            </div>
          </div>

          <div className={cn("pt-12 border-t flex flex-col md:flex-row items-center justify-between gap-6 text-xs", theme === 'dark' ? "border-white/5 text-gray-600" : "border-black/5 text-gray-400")}>
            <p>© 2026 Luna Bestie - Guidance for the Modern Soul</p>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <span>Your privacy is our top priority</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Cookie Consent Banner */}
      <AnimatePresence>
        {showCookieBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-8 right-8 md:left-auto md:right-8 md:w-[400px] z-[100]"
          >
            <div className={cn(
              "p-8 rounded-[2.5rem] border shadow-2xl backdrop-blur-2xl space-y-6",
              theme === 'dark' ? "bg-gf-dark/90 border-white/10" : "bg-white/90 border-black/10"
            )}>
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-gf-pink/10 flex items-center justify-center text-gf-pink">
                  <Shield className="w-6 h-6" />
                </div>
                <button 
                  onClick={() => setShowCookieBanner(false)}
                  className={cn("p-2 rounded-lg hover:bg-white/5", theme === 'dark' ? "text-gray-500" : "text-gray-400")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                <h4 className={cn("text-xl font-display font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>We value your privacy</h4>
                <p className={cn("text-sm leading-relaxed", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>
                  We use cookies to enhance your experience, analyze site traffic, and personalize Luna's support. By clicking "Accept All", you agree to our use of cookies.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => {
                    localStorage.setItem('cookie-consent', 'true');
                    setShowCookieBanner(false);
                  }}
                  className="flex-1 py-3 rounded-xl bg-gf-pink text-white font-bold text-sm shadow-lg shadow-gf-pink/20 hover:scale-105 transition-all"
                >
                  Accept All
                </button>
                <button 
                  onClick={() => setShowCookieBanner(false)}
                  className={cn("flex-1 py-3 rounded-xl border font-bold text-sm transition-all", theme === 'dark' ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : "bg-black/5 border-black/10 text-gray-900 hover:bg-black/10")}
                >
                  Decline
                </button>
              </div>
              <button 
                onClick={() => navigateTo('cookies')}
                className="text-[10px] uppercase tracking-widest text-gf-pink font-bold hover:underline block text-center w-full"
              >
                Read our Cookie Policy
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </ErrorBoundary>
  );
}
