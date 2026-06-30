import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  Flame, 
  CheckCircle, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Play, 
  Pause, 
  RotateCcw, 
  Sparkles, 
  Timer, 
  ChevronRight, 
  Skull, 
  Calendar, 
  Check, 
  Activity, 
  Info, 
  Volume2, 
  VolumeX,
  PlusCircle,
  TrendingUp,
  X,
  AlertCircle,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Interfaces
interface Task {
  id: string;
  task: string;
  deadline: string; // ISO or datetime-local format
  importance: 'High' | 'Medium' | 'Low';
  description: string;
}

interface MicroTask {
  stepNumber: number;
  taskName: string;
  parentTaskName: string;
  durationMinutes: number;
  focusTip: string;
  completed?: boolean;
}

interface RescueResult {
  urgencyRating: string;
  panicModeActivated: boolean;
  proactiveAction: string;
  suggestedMicroTasks: MicroTask[];
}

export default function App() {
  // Theme state (light vs dark) - defaults to dark to match the original layout
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Current time state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Task list states
  const [primaryTask, setPrimaryTask] = useState<Task>(() => {
    const saved = localStorage.getItem('shadow_primary_task');
    if (saved) return JSON.parse(saved);
    
    // Default primary task (set to ~7 hours from now to illustrate high-urgency)
    const sevenHrsLater = new Date();
    sevenHrsLater.setHours(sevenHrsLater.getHours() + 6);
    sevenHrsLater.setMinutes(45);
    
    return {
      id: 'primary-default',
      task: 'Finalize Deep Learning Thesis Slides & Diagrams',
      deadline: sevenHrsLater.toISOString().slice(0, 16),
      importance: 'High',
      description: 'Must assemble loss curves, training hyperparameter tables, and structure the 15-minute presentation cleanly. Committee expects thorough technical drill-down.'
    };
  });

  const [secondaryTasks, setSecondaryTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('shadow_secondary_tasks');
    if (saved) return JSON.parse(saved);

    const elevenHrsLater = new Date();
    elevenHrsLater.setHours(elevenHrsLater.getHours() + 11);
    elevenHrsLater.setMinutes(15);

    const twoDaysLater = new Date();
    twoDaysLater.setDate(twoDaysLater.getDate() + 1);
    twoDaysLater.setHours(23);
    twoDaysLater.setMinutes(59);

    return [
      {
        id: 'sec-1',
        task: 'Submit Chemistry Lab Final Report Spreadsheet',
        deadline: elevenHrsLater.toISOString().slice(0, 16),
        importance: 'Medium',
        description: 'Upload raw titration data spreadsheets and answer questions 1 to 5 on post-lab analysis.'
      },
      {
        id: 'sec-2',
        task: 'Settle Outstanding Electric Utility Invoice',
        deadline: twoDaysLater.toISOString().slice(0, 16),
        importance: 'Low',
        description: 'Pay electric bill to avoid late charge fees. Amount: $145.20.'
      }
    ];
  });

  // UI / Form states
  const [isAddingSecondary, setIsAddingSecondary] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [newTaskImportance, setNewTaskImportance] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [newTaskDesc, setNewTaskDesc] = useState('');

  // Editing state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editImportance, setEditImportance] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [editDesc, setEditDesc] = useState('');

  // Rescue API states
  const [rescueResult, setRescueResult] = useState<RescueResult | null>(() => {
    const saved = localStorage.getItem('shadow_rescue_result');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState<string[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);

  // Audio configuration
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Active micro-task and timer states
  const [activeStepIdx, setActiveStepIdx] = useState<number | null>(null);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number | null>(null);
  const [timerIsRunning, setTimerIsRunning] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Persist tasks & rescue to LocalStorage
  useEffect(() => {
    localStorage.setItem('shadow_primary_task', JSON.stringify(primaryTask));
  }, [primaryTask]);

  useEffect(() => {
    localStorage.setItem('shadow_secondary_tasks', JSON.stringify(secondaryTasks));
  }, [secondaryTasks]);

  useEffect(() => {
    if (rescueResult) {
      localStorage.setItem('shadow_rescue_result', JSON.stringify(rescueResult));
    } else {
      localStorage.removeItem('shadow_rescue_result');
    }
  }, [rescueResult]);

  // Clock tick
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Timer tick
  useEffect(() => {
    if (timerIsRunning && timerSecondsLeft !== null) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSecondsLeft((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerIsRunning, timerSecondsLeft]);

  // Audio Synthesizer functions
  const initAudioCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const playSynthBeep = (freq: number, duration: number, type: OscillatorType = 'sine') => {
    if (!soundEnabled) return;
    try {
      initAudioCtx();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio synthesis failed', e);
    }
  };

  const playTacticalAlarm = () => {
    if (!soundEnabled) return;
    try {
      initAudioCtx();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(110, ctx.currentTime); // Low A
      osc2.frequency.setValueAtTime(220, ctx.currentTime); // Higher A

      // Low rumble LFO for mechanical feel
      osc1.frequency.linearRampToValueAtTime(115, ctx.currentTime + 0.4);
      osc1.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.8);

      gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 1.2);
      osc2.stop(ctx.currentTime + 1.2);
    } catch (e) {
      console.warn('Tactical alarm synth failed', e);
    }
  };

  // Timer completion
  const handleTimerComplete = () => {
    setTimerIsRunning(false);
    playSynthBeep(880, 0.2, 'square');
    setTimeout(() => playSynthBeep(1200, 0.3, 'square'), 180);
    setTimeout(() => playSynthBeep(1600, 0.5, 'triangle'), 360);
    
    // Auto-mark step as complete if appropriate or alert user
    if (activeStepIdx !== null && rescueResult) {
      const updatedSteps = [...rescueResult.suggestedMicroTasks];
      // Mark as complete and find next incomplete step
      updatedSteps[activeStepIdx].completed = true;
      setRescueResult({
        ...rescueResult,
        suggestedMicroTasks: updatedSteps
      });
      playSynthBeep(600, 0.3, 'sine');
    }
  };

  // Select a micro-task to start timer
  const handleSelectMicroTask = (idx: number) => {
    if (!rescueResult) return;
    const task = rescueResult.suggestedMicroTasks[idx];
    setActiveStepIdx(idx);
    setTimerSecondsLeft(task.durationMinutes * 60);
    setTimerIsRunning(false);
    playSynthBeep(440, 0.08, 'sine');
  };

  // Toggle step completion manually
  const handleToggleStepCompletion = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent setting timer
    if (!rescueResult) return;
    const updated = [...rescueResult.suggestedMicroTasks];
    updated[idx].completed = !updated[idx].completed;
    setRescueResult({
      ...rescueResult,
      suggestedMicroTasks: updated
    });
    if (updated[idx].completed) {
      playSynthBeep(987.77, 0.15, 'sine'); // elegant ping
      setTimeout(() => playSynthBeep(1318.51, 0.25, 'sine'), 100);
    } else {
      playSynthBeep(330, 0.15, 'triangle'); // simple lower down tone
    }
  };

  // Start / Pause timer
  const handleToggleTimer = () => {
    if (timerSecondsLeft === null) return;
    setTimerIsRunning(!timerIsRunning);
    playSynthBeep(timerIsRunning ? 440 : 550, 0.08, 'sine');
  };

  // Reset timer
  const handleResetTimer = () => {
    if (activeStepIdx === null || !rescueResult) return;
    setTimerSecondsLeft(rescueResult.suggestedMicroTasks[activeStepIdx].durationMinutes * 60);
    setTimerIsRunning(false);
    playSynthBeep(220, 0.1, 'sine');
  };

  // Time formatting utilities
  const formatTimeSeconds = (totalSeconds: number | null) => {
    if (totalSeconds === null) return '00:00';
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getRelativeDeadlineString = (deadlineStr: string) => {
    const now = currentTime.getTime();
    const target = new Date(deadlineStr).getTime();
    const diff = target - now;

    if (isNaN(target)) return 'Invalid date';

    const isOverdue = diff < 0;
    const absDiff = Math.abs(diff);

    const mins = Math.floor(absDiff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (isOverdue) {
      if (mins < 60) return `⚠️ OVERDUE by ${mins}m`;
      if (hours < 24) return `⚠️ OVERDUE by ${hours}h ${mins % 60}m`;
      return `⚠️ OVERDUE by ${days}d ${hours % 24}h`;
    } else {
      if (mins < 60) return `Due in ${mins}m`;
      if (hours < 24) return `Due in ${hours}h ${mins % 60}m`;
      return `Due in ${days}d ${hours % 24}h`;
    }
  };

  // Determine relative time status class
  const getDeadlineStatusClass = (deadlineStr: string) => {
    const diff = new Date(deadlineStr).getTime() - currentTime.getTime();
    const isLight = theme === 'light';
    if (diff < 0) return `${isLight ? 'text-red-600' : 'text-red-400'} font-bold font-mono animate-pulse`;
    if (diff < 12 * 60 * 60 * 1000) return `${isLight ? 'text-orange-600' : 'text-orange-400'} font-mono`;
    if (diff < 24 * 60 * 60 * 1000) return `${isLight ? 'text-amber-600' : 'text-yellow-400'} font-mono`;
    return `${isLight ? 'text-emerald-600' : 'text-emerald-400'} font-mono`;
  };

  // Add a new secondary deadline task
  const handleAddSecondaryTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskDeadline) {
      alert('Please fill in title and deadline fields.');
      return;
    }

    const newTask: Task = {
      id: `sec-${Date.now()}`,
      task: newTaskTitle.trim(),
      deadline: newTaskDeadline,
      importance: newTaskImportance,
      description: newTaskDesc.trim()
    };

    setSecondaryTasks([...secondaryTasks, newTask]);
    setNewTaskTitle('');
    setNewTaskDeadline('');
    setNewTaskImportance('Medium');
    setNewTaskDesc('');
    setIsAddingSecondary(false);
    playSynthBeep(659.25, 0.15, 'sine');
  };

  // Edit action
  const startEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.task);
    setEditDeadline(task.deadline);
    setEditImportance(task.importance);
    setEditDesc(task.description);
    playSynthBeep(523.25, 0.08, 'sine');
  };

  const handleSaveEdit = () => {
    if (!editTitle.trim() || !editDeadline) return;

    const updatedTaskFields = {
      task: editTitle.trim(),
      deadline: editDeadline,
      importance: editImportance,
      description: editDesc.trim()
    };

    if (editingTaskId === primaryTask.id) {
      setPrimaryTask({ ...primaryTask, ...updatedTaskFields });
    } else {
      setSecondaryTasks(
        secondaryTasks.map((t) => (t.id === editingTaskId ? { ...t, ...updatedTaskFields } : t))
      );
    }

    setEditingTaskId(null);
    playSynthBeep(783.99, 0.15, 'sine');
  };

  // Delete secondary task
  const handleDeleteSecondary = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Remove this deadline from the rescue scope?')) {
      setSecondaryTasks(secondaryTasks.filter((t) => t.id !== id));
      playSynthBeep(293.66, 0.15, 'sawtooth');
    }
  };

  // Trigger shadow scheduling calculation on backend
  const handleEngageRescueEngine = async () => {
    setIsLoading(true);
    setApiError(null);
    setLoadingLogs([]);

    const logs = [
      '⚡ INITIALIZING SHADOW COGNITIVE SYSTEM...',
      '🛰️ ESTABLISHING TELEMETRY CONNECTION TO SHADOW CORES...',
      '🔍 EXTRACTING ACTIVE FOCUS AND SECONDARY DEADLINES...',
      '📏 COMPILING ABSOLUTE RUNWAY IN MINUTES...',
      '🎯 CALCULATING TIMELINE DEFICITS LOCALLY...',
      '🧠 INITIATING GEMINI DEEP SCHEDULING SEQUENCE...',
      '📊 CONSTRAINING STEPS TO TARGETED COMPACT SIZES...',
      '🛠️ GENERATING ACTIONABLE FOCUS TIMELINES...'
    ];

    // Log scrolling simulation
    let logIndex = 0;
    const logInterval = setInterval(() => {
      if (logIndex < logs.length) {
        setLoadingLogs((prev) => [...prev, logs[logIndex]]);
        logIndex++;
        playSynthBeep(350 + logIndex * 80, 0.05, 'triangle');
      } else {
        clearInterval(logInterval);
      }
    }, 450);

    try {
      const response = await fetch('/api/rescue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentFocusTask: primaryTask,
          allDeadlines: secondaryTasks
        })
      });

      clearInterval(logInterval);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Server returned an error.');
      }

      const result: RescueResult = await response.json();
      
      // Artificial short delay to make sure logs finish displaying nicely
      await new Promise(resolve => setTimeout(resolve, 800));

      setRescueResult(result);
      setIsLoading(false);
      setActiveStepIdx(0);
      setTimerIsRunning(false);
      if (result.suggestedMicroTasks.length > 0) {
        setTimerSecondsLeft(result.suggestedMicroTasks[0].durationMinutes * 60);
      }
      playSynthBeep(880, 0.15, 'sine');
      setTimeout(() => playSynthBeep(1760, 0.3, 'sine'), 150);

    } catch (err: any) {
      clearInterval(logInterval);
      console.error(err);
      setApiError(err.message || 'Network connection failed.');
      setIsLoading(false);
      playSynthBeep(150, 0.5, 'sawtooth');
    }
  };

  // Clear current active rescue plan
  const handleResetPlan = () => {
    if (confirm('Are you sure you want to discard the active action timeline? This resets the scheduler.')) {
      setRescueResult(null);
      setActiveStepIdx(null);
      setTimerSecondsLeft(null);
      setTimerIsRunning(false);
      playSynthBeep(200, 0.3, 'sawtooth');
    }
  };

  // Sort function to match backend priority logic visually
  const getSortedDeadlinesList = () => {
    const IMPORTANCE_WEIGHT = { High: 3, Medium: 2, Low: 1 };
    const now = currentTime.getTime();
    const list = [primaryTask, ...secondaryTasks];

    return list.sort((a, b) => {
      const gapA = new Date(a.deadline).getTime() - now;
      const gapB = new Date(b.deadline).getTime() - now;

      const aOverdue = gapA < 0;
      const bOverdue = gapB < 0;
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      const aUrgent = gapA < 24 * 60 * 60 * 1000;
      const bUrgent = gapB < 24 * 60 * 60 * 1000;
      if (aUrgent || bUrgent) return gapA - gapB;

      const diffWeight = (IMPORTANCE_WEIGHT[b.importance] || 2) - (IMPORTANCE_WEIGHT[a.importance] || 2);
      return diffWeight !== 0 ? diffWeight : gapA - gapB;
    });
  };

  // Progress metrics
  const getProgressMetrics = () => {
    if (!rescueResult || rescueResult.suggestedMicroTasks.length === 0) return { percent: 0, completedCount: 0, totalCount: 0 };
    const completedCount = rescueResult.suggestedMicroTasks.filter(t => t.completed).length;
    const totalCount = rescueResult.suggestedMicroTasks.length;
    return {
      percent: Math.round((completedCount / totalCount) * 100),
      completedCount,
      totalCount
    };
  };

  const progress = getProgressMetrics();
  const sortedQueue = getSortedDeadlinesList();
  const isPanicMode = rescueResult ? rescueResult.panicModeActivated : true; // default to true visual feel

  return (
    <div className={`min-h-screen flex flex-col font-sans relative overflow-x-hidden selection:bg-rose-500 selection:text-white transition-colors duration-250 ${
      theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-[#0a0f1d] text-slate-100'
    }`}>
      {/* Background Cyber Glow & Dots Pattern */}
      <div className={`absolute inset-0 [background-size:24px_24px] pointer-events-none transition-colors duration-250 ${
        theme === 'light' 
          ? 'bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] opacity-60' 
          : 'bg-[radial-gradient(#1e293b_1px,transparent_1px)] opacity-25'
      }`} />
      <div className={`absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] pointer-events-none transition-colors duration-250 ${
        theme === 'light' ? 'bg-rose-100/30' : 'bg-rose-900/10'
      }`} />
      <div className={`absolute bottom-[-10%] right-[-15%] w-[60%] h-[60%] rounded-full blur-[150px] pointer-events-none transition-colors duration-250 ${
        theme === 'light' ? 'bg-blue-100/40' : 'bg-blue-950/20'
      }`} />

      {/* Primary Top Utility Bar */}
      <header className={`border-b backdrop-blur-md sticky top-0 z-40 transition-colors duration-250 ${
        theme === 'light' ? 'border-slate-200 bg-white/90 shadow-sm' : 'border-slate-800 bg-[#0c1224]/85'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-9 w-9 bg-rose-600 rounded-lg flex items-center justify-center font-mono font-bold text-sm text-white tracking-widest shadow-[0_0_15px_rgba(225,29,72,0.4)]">
                Ω
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
            </div>
            <div>
              <h1 className="text-md md:text-lg font-mono font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                Shadow AI <span className={theme === 'light' ? 'text-slate-600 text-xs font-normal' : 'text-slate-500 text-xs font-normal'}>:: DEADLINE RESCUE</span>
              </h1>
              <p className={`text-xs hidden sm:block ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Tactical high-urgency scheduling engine</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Clock */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-mono transition-colors ${
              theme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-[#121930] border-slate-800 text-slate-300'
            }`}>
              <Clock className={`w-3.5 h-3.5 animate-pulse ${theme === 'light' ? 'text-rose-600' : 'text-rose-400'}`} />
              <span>LOCAL TIME:</span>
              <span className={`font-bold ${theme === 'light' ? 'text-rose-600' : 'text-rose-400'}`}>{currentTime.toLocaleTimeString()}</span>
            </div>

            {/* Audio Toggle */}
            <button 
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if(!soundEnabled) setTimeout(() => playSynthBeep(440, 0.1, 'sine'), 100);
              }}
              className={`p-2 rounded border transition-colors cursor-pointer ${
                soundEnabled 
                  ? theme === 'light'
                    ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100/50'
                    : 'border-rose-900/50 bg-rose-950/20 text-rose-400 hover:bg-rose-950/40' 
                  : theme === 'light'
                    ? 'border-slate-200 bg-slate-100 text-slate-400 hover:bg-slate-200/50'
                    : 'border-slate-800 bg-slate-900 text-slate-500 hover:bg-slate-800'
              }`}
              title={soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Theme Toggle Button */}
            <button 
              onClick={() => {
                setTheme(theme === 'light' ? 'dark' : 'light');
                playSynthBeep(theme === 'light' ? 659.25 : 523.25, 0.1, 'sine');
              }}
              className={`p-2 rounded border transition-colors cursor-pointer ${
                theme === 'light' 
                  ? 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200' 
                  : 'border-slate-800 bg-slate-900 text-slate-350 hover:bg-slate-800'
              }`}
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        
        {/* LEFT COLUMN: CONTROL & INPUT PANEL (Lg spans 5) */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Active Urgency Status Dashboard */}
          <div className={`border rounded-xl p-5 relative overflow-hidden transition-all duration-200 ${
            theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0f162e] border-slate-800 shadow-xl'
          }`}>
            <div className="absolute top-0 right-0 h-16 w-16 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-rose-500/20 via-transparent to-transparent pointer-events-none" />
            
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className={`text-xs font-mono tracking-widest uppercase ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>SYS_CRITICALITY_LEVEL</span>
                <h2 className={`text-xl font-mono font-black tracking-tight flex items-center gap-2 mt-0.5 ${theme === 'light' ? 'text-slate-800' : 'text-slate-100'}`}>
                  {rescueResult ? (
                    <span className={`${theme === 'light' ? 'text-rose-600' : 'text-rose-400'} animate-pulse`}>{rescueResult.urgencyRating}</span>
                  ) : (
                    <span className={theme === 'light' ? 'text-amber-600' : 'text-yellow-400'}>🟡 DYNAMIC ESTIMATING</span>
                  )}
                </h2>
              </div>
              <button 
                onClick={playTacticalAlarm}
                className={`text-[10px] font-mono border px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  theme === 'light' 
                    ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100/50' 
                    : 'border-rose-900 bg-rose-950/20 text-rose-400 hover:bg-rose-950/50'
                }`}
                title="Siren check"
              >
                TEST ALARM SYNC
              </button>
            </div>

            {/* Proactive Action Banner */}
            <div className={`border-l-4 border-rose-500 p-3 rounded-r text-sm font-mono mb-4 transition-colors ${
              theme === 'light' ? 'bg-rose-50/40 border border-y-rose-100 border-r-rose-100 text-slate-800' : 'bg-[#1c1d35] text-slate-200'
            }`}>
              <div className="flex gap-2 items-start">
                <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${theme === 'light' ? 'text-rose-600' : 'text-rose-400'}`} />
                <div>
                  <p className={`font-semibold text-xs uppercase tracking-wide ${theme === 'light' ? 'text-rose-700' : 'text-rose-400'}`}>Proactive Recovery Directive:</p>
                  <p className={`text-xs leading-relaxed mt-0.5 ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                    {rescueResult?.proactiveAction || "📥 Engage the Rescue Scheduler below once deadlines have been compiled to construct your customized immediate timeline."}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className={`p-2.5 rounded border transition-colors ${
                theme === 'light' ? 'bg-slate-50/70 border-slate-200/80' : 'bg-[#0b0e1f] p-2.5 rounded border border-slate-800/80'
              }`}>
                <span className="text-slate-500 block">TOTAL TRACKED</span>
                <span className={`text-md font-bold flex items-center gap-1.5 mt-0.5 ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                  <Activity className="w-3.5 h-3.5 text-blue-500" />
                  {1 + secondaryTasks.length} Deadlines
                </span>
              </div>
              <div className={`p-2.5 rounded border transition-colors ${
                theme === 'light' ? 'bg-slate-50/70 border-slate-200/80' : 'bg-[#0b0e1f] p-2.5 rounded border border-slate-800/80'
              }`}>
                <span className="text-slate-500 block">STATUS</span>
                <span className={`text-md font-bold flex items-center gap-1.5 mt-0.5 ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                  <Flame className={`w-3.5 h-3.5 ${isPanicMode ? 'text-rose-500 animate-pulse' : 'text-emerald-500'}`} />
                  {isPanicMode ? 'PANIC_MODE_ARMED' : 'STANDBY_MODE'}
                </span>
              </div>
            </div>
          </div>

          {/* Active Tasks Scope / Input Panel */}
          <div className={`border rounded-xl p-5 flex flex-col gap-4 transition-all duration-200 ${
            theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0f162e] border-slate-800 shadow-xl'
          }`}>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-sm font-mono tracking-wider uppercase ${theme === 'light' ? 'text-slate-700' : 'text-slate-400'}`}>1. CHOOSE FOCUS TARGET</h3>
                <p className={`text-xs ${theme === 'light' ? 'text-slate-600' : 'text-slate-500'}`}>Your core absolute high-importance driver</p>
              </div>
              <Sparkles className="w-4 h-4 text-rose-500" />
            </div>

            {/* Core Primary Focus Card */}
            <div className={`border-2 rounded-lg p-4 relative transition-colors ${
              theme === 'light' 
                ? 'bg-rose-50/15 border-rose-200 hover:border-rose-300' 
                : 'bg-[#121a36] border-rose-500/30 hover:border-rose-500/60'
            }`}>
              <div className={`absolute top-2 right-2 text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded tracking-widest ${
                theme === 'light' ? 'bg-rose-100 text-rose-700' : 'bg-rose-500/20 text-rose-400'
              }`}>
                PRIMARY FOCUS
              </div>

              {editingTaskId === primaryTask.id ? (
                <div className="space-y-3 mt-4">
                  <div>
                    <label className={`text-[10px] font-mono block mb-1 ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>TASK NAME</label>
                    <input 
                      type="text" 
                      value={editTitle} 
                      onChange={(e) => setEditTitle(e.target.value)}
                      className={`w-full rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-rose-500 transition-colors ${
                        theme === 'light' ? 'bg-white border border-slate-300 text-slate-800' : 'bg-[#0a0f1d] border border-slate-700 text-slate-200'
                      }`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`text-[10px] font-mono block mb-1 ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>DEADLINE</label>
                      <input 
                        type="datetime-local" 
                        value={editDeadline} 
                        onChange={(e) => setEditDeadline(e.target.value)}
                        className={`w-full rounded px-2 py-1.5 text-xs focus:outline-none focus:border-rose-500 transition-colors ${
                          theme === 'light' ? 'bg-white border border-slate-300 text-slate-800' : 'bg-[#0a0f1d] border border-slate-700 text-slate-200'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`text-[10px] font-mono block mb-1 ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>IMPORTANCE</label>
                      <select 
                        value={editImportance} 
                        onChange={(e) => setEditImportance(e.target.value as any)}
                        className={`w-full rounded px-2 py-1.5 text-xs focus:outline-none focus:border-rose-500 transition-colors ${
                          theme === 'light' ? 'bg-white border border-slate-300 text-slate-800' : 'bg-[#0a0f1d] border border-slate-700 text-slate-200'
                        }`}
                      >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={`text-[10px] font-mono block mb-1 ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>CONTEXT & DETAILS</label>
                    <textarea 
                      value={editDesc} 
                      onChange={(e) => setEditDesc(e.target.value)}
                      rows={2}
                      className={`w-full rounded px-2 py-1.5 text-xs focus:outline-none focus:border-rose-500 transition-colors ${
                        theme === 'light' ? 'bg-white border border-slate-300 text-slate-800' : 'bg-[#0a0f1d] border border-slate-700 text-slate-200'
                      }`}
                    />
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <button 
                      onClick={() => setEditingTaskId(null)}
                      className={`text-[10px] font-mono px-3 py-1 rounded transition-colors ${
                        theme === 'light' ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSaveEdit}
                      className="text-[10px] font-mono bg-rose-600 hover:bg-rose-500 text-white px-3 py-1 rounded transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-2">
                  <h4 className={`font-bold text-sm tracking-tight ${theme === 'light' ? 'text-slate-800' : 'text-slate-100'}`}>{primaryTask.task}</h4>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${getDeadlineStatusClass(primaryTask.deadline)} ${
                      theme === 'light' ? 'bg-slate-100' : 'bg-slate-900/60'
                    }`}>
                      {getRelativeDeadlineString(primaryTask.deadline)}
                    </span>
                    <span className={`${theme === 'light' ? 'text-rose-600 font-semibold' : 'text-rose-400'} font-mono text-[11px] flex items-center gap-1`}>
                      <Calendar className="w-3 h-3" />
                      {new Date(primaryTask.deadline).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  {primaryTask.description && (
                    <p className={`text-xs mt-2.5 border-t pt-2 italic leading-relaxed ${
                      theme === 'light' ? 'text-slate-600 border-slate-200' : 'text-slate-400 border-slate-800/80'
                    }`}>
                      "{primaryTask.description}"
                    </p>
                  )}
                  <div className="flex justify-end mt-3 gap-2">
                    <button 
                      onClick={() => startEditTask(primaryTask)}
                      className={`text-[10px] font-mono px-2 py-1 rounded border transition-colors cursor-pointer ${
                        theme === 'light' 
                          ? 'bg-slate-100 border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900' 
                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      Edit Target Parameters
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Secondary Upcoming Deadlines Scope */}
            <div className={`border-t pt-4 transition-colors ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className={`text-xs font-mono tracking-widest uppercase ${theme === 'light' ? 'text-slate-700' : 'text-slate-400'}`}>2. SECONDARY CONFLICTS</h4>
                  <p className={`text-[11px] ${theme === 'light' ? 'text-slate-600' : 'text-slate-500'}`}>Other looming obligations contributing to urgency</p>
                </div>
                
                {!isAddingSecondary && (
                  <button 
                    onClick={() => {
                      setIsAddingSecondary(true);
                      playSynthBeep(587.33, 0.1, 'sine');
                    }}
                    className={`flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded border transition-all cursor-pointer ${
                      theme === 'light' 
                        ? 'bg-slate-100 border-slate-200 text-slate-700 hover:border-slate-300 hover:text-slate-950' 
                        : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-rose-500" />
                    ADD CONFLICT
                  </button>
                )}
              </div>

              {/* Add Secondary form inline */}
              <AnimatePresence>
                {isAddingSecondary && (
                  <motion.form 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={handleAddSecondaryTask}
                    className={`border p-3 rounded-lg mb-3 space-y-2.5 overflow-hidden text-xs transition-colors duration-200 ${
                      theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#0b0e1f] border-slate-800/80'
                    }`}
                  >
                    <div className={`flex justify-between items-center pb-1 border-b ${theme === 'light' ? 'border-slate-200' : 'border-slate-800/60'}`}>
                      <span className={`font-mono font-bold text-[10px] tracking-wider ${theme === 'light' ? 'text-rose-600' : 'text-rose-400'}`}>NEW OBLIGATION PARAMETERS</span>
                      <button 
                        type="button" 
                        onClick={() => {
                          setIsAddingSecondary(false);
                          playSynthBeep(220, 0.1, 'sine');
                        }}
                        className="text-slate-500 hover:text-slate-300"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <input 
                        type="text" 
                        placeholder="Conflict task (e.g. Submit lab work, Pay bills)" 
                        required
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        className={`w-full rounded px-2 py-1.5 text-xs focus:outline-none focus:border-rose-500 transition-colors ${
                          theme === 'light' ? 'bg-white border border-slate-300 text-slate-800 placeholder-slate-400' : 'bg-[#060a15] border border-slate-800 text-slate-200 placeholder-slate-500'
                        }`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={`text-[10px] font-mono block mb-0.5 ${theme === 'light' ? 'text-slate-500' : 'text-slate-500'}`}>TARGET DEADLINE</label>
                        <input 
                          type="datetime-local" 
                          required
                          value={newTaskDeadline}
                          onChange={(e) => setNewTaskDeadline(e.target.value)}
                          className={`w-full rounded px-2 py-1 text-xs focus:outline-none focus:border-rose-500 transition-colors ${
                            theme === 'light' ? 'bg-white border border-slate-300 text-slate-800' : 'bg-[#060a15] border border-slate-800 text-slate-200'
                          }`}
                        />
                      </div>
                      <div>
                        <label className={`text-[10px] font-mono block mb-0.5 ${theme === 'light' ? 'text-slate-500' : 'text-slate-500'}`}>IMPORTANCE WEIGHT</label>
                        <select 
                          value={newTaskImportance}
                          onChange={(e) => setNewTaskImportance(e.target.value as any)}
                          className={`w-full rounded px-2 py-1 text-xs focus:outline-none focus:border-rose-500 transition-colors ${
                            theme === 'light' ? 'bg-white border border-slate-300 text-slate-800' : 'bg-[#060a15] border border-slate-800 text-slate-200'
                          }`}
                        >
                          <option value="High">High (Multiplier: 3.0)</option>
                          <option value="Medium">Medium (Multiplier: 2.0)</option>
                          <option value="Low">Low (Multiplier: 1.0)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <input 
                        type="text" 
                        placeholder="Context notes / description (optional)" 
                        value={newTaskDesc}
                        onChange={(e) => setNewTaskDesc(e.target.value)}
                        className={`w-full rounded px-2 py-1.5 text-[11px] focus:outline-none focus:border-rose-500 transition-colors ${
                          theme === 'light' ? 'bg-white border border-slate-300 text-slate-700' : 'bg-[#060a15] border border-slate-800 text-slate-300'
                        }`}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button 
                        type="button" 
                        onClick={() => {
                          setIsAddingSecondary(false);
                          playSynthBeep(220, 0.1, 'sine');
                        }}
                        className={`text-[10px] font-mono px-3 py-1 rounded transition-colors ${
                          theme === 'light' ? 'bg-slate-200 text-slate-600 hover:bg-slate-300' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="text-[10px] font-mono bg-rose-600 text-white px-3 py-1 rounded hover:bg-rose-500 transition-colors"
                      >
                        Register Obligation
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Secondary lists */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {secondaryTasks.length === 0 ? (
                  <div className={`text-center py-6 text-xs border border-dashed rounded transition-colors ${
                    theme === 'light' ? 'border-slate-300 text-slate-500' : 'border-slate-800/80 text-slate-500'
                  }`}>
                    No secondary conflicts configured. All time resources are allocated purely to the primary target.
                  </div>
                ) : (
                  secondaryTasks.map((t) => (
                    <div 
                      key={t.id}
                      className={`border p-3 flex justify-between items-start gap-4 text-xs rounded-lg transition-colors duration-200 ${
                        theme === 'light' ? 'bg-slate-50 border-slate-200 hover:border-slate-300' : 'bg-[#0b0e1f] border border-slate-800/60 hover:border-slate-800'
                      }`}
                    >
                      {editingTaskId === t.id ? (
                        <div className="w-full space-y-2">
                          <input 
                            type="text" 
                            value={editTitle} 
                            onChange={(e) => setEditTitle(e.target.value)}
                            className={`w-full rounded px-2 py-1 text-xs focus:outline-none transition-colors ${
                              theme === 'light' ? 'bg-white border border-slate-300 text-slate-800' : 'bg-[#050711] border border-slate-800 text-slate-200'
                            }`}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input 
                              type="datetime-local" 
                              value={editDeadline} 
                              onChange={(e) => setEditDeadline(e.target.value)}
                              className={`w-full rounded px-2 py-1 text-xs focus:outline-none transition-colors ${
                                theme === 'light' ? 'bg-white border border-slate-300 text-slate-800' : 'bg-[#050711] border border-slate-800 text-slate-200'
                              }`}
                            />
                            <select 
                              value={editImportance} 
                              onChange={(e) => setEditImportance(e.target.value as any)}
                              className={`w-full rounded px-2 py-1 text-xs focus:outline-none transition-colors ${
                                theme === 'light' ? 'bg-white border border-slate-300 text-slate-800' : 'bg-[#050711] border border-slate-800 text-slate-200'
                              }`}
                            >
                              <option value="High">High</option>
                              <option value="Medium">Medium</option>
                              <option value="Low">Low</option>
                            </select>
                          </div>
                          <div className="flex justify-end gap-1.5 pt-1">
                            <button onClick={() => setEditingTaskId(null)} className={`text-[10px] font-mono px-2 py-0.5 rounded transition-colors ${
                              theme === 'light' ? 'bg-slate-200 text-slate-600' : 'bg-slate-800 text-slate-400'
                            }`}>Cancel</button>
                            <button onClick={handleSaveEdit} className="text-[10px] font-mono bg-rose-600 hover:bg-rose-500 text-white px-2 py-0.5 rounded transition-colors">Save</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`h-2 w-2 rounded-full ${
                                t.importance === 'High' ? 'bg-rose-500' : t.importance === 'Medium' ? 'bg-orange-500' : 'bg-blue-400'
                              }`} />
                              <h5 className={`font-bold truncate ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>{t.task}</h5>
                            </div>
                            {t.description && (
                              <p className={`text-[11px] mt-1 leading-relaxed line-clamp-1 italic ${
                                theme === 'light' ? 'text-slate-600' : 'text-slate-500'
                              }`}>"{t.description}"</p>
                            )}
                            
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className={`font-mono text-[10px] ${getDeadlineStatusClass(t.deadline)}`}>
                                {getRelativeDeadlineString(t.deadline)}
                              </span>
                              <span className={`text-[10px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-500'}`}>| Priority: {t.importance}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button 
                              onClick={() => startEditTask(t)}
                              className={`p-1 text-[10px] font-mono rounded border transition-colors cursor-pointer ${
                                theme === 'light' 
                                  ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-900' 
                                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                              }`}
                              title="Edit parameters"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={(e) => handleDeleteSecondary(t.id, e)}
                              className={`p-1 rounded border transition-colors cursor-pointer ${
                                theme === 'light'
                                  ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100/50'
                                  : 'bg-slate-900 border border-slate-800 text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 hover:border-rose-900'
                              }`}
                              title="Remove deadline"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Engage Trigger Button */}
            <div className={`border-t pt-4 mt-1 transition-colors ${theme === 'light' ? 'border-slate-200' : 'border-slate-800/80'}`}>
              <button 
                onClick={handleEngageRescueEngine}
                disabled={isLoading}
                className="w-full bg-rose-600 hover:bg-rose-500 active:bg-rose-700 disabled:bg-rose-900/40 text-slate-100 py-3 rounded-xl font-mono font-bold uppercase tracking-wider text-sm transition-all shadow-[0_4px_20px_rgba(225,29,72,0.3)] hover:shadow-[0_4px_25px_rgba(225,29,72,0.5)] disabled:shadow-none flex items-center justify-center gap-2 cursor-pointer"
              >
                <Flame className={`w-4 h-4 ${isLoading ? 'animate-bounce' : 'animate-pulse'}`} />
                {isLoading ? 'CALCULATING CRITICAL RUNWAYS...' : 'ENGAGE RESCUE ENGINE'}
              </button>
              {apiError && (
                <div className={`mt-3 border p-3 rounded-lg text-xs font-mono flex gap-2 items-start transition-colors ${
                  theme === 'light' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-rose-950/30 border-rose-900/80 text-rose-400'
                }`}>
                  <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${theme === 'light' ? 'text-rose-600' : 'text-rose-400'}`} />
                  <div>
                    <p className="font-bold">ENGINE DEFIANCE ERROR:</p>
                    <p>{apiError}</p>
                    <p className={`mt-1 text-[10px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>Please check your network, ensure process.env.GEMINI_API_KEY is configured in Secrets, and retry.</p>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Core System Instructions Info Panel */}
          <div className={`border rounded-lg p-4 text-xs font-mono transition-colors duration-200 ${
            theme === 'light' ? 'bg-slate-100/70 border-slate-200 text-slate-600' : 'bg-[#0b0e1f] border border-slate-900 text-slate-500'
          } space-y-2`}>
            <div className={`flex items-center gap-1.5 font-semibold uppercase text-[10px] tracking-wider ${
              theme === 'light' ? 'text-slate-800' : 'text-slate-400'
            }`}>
              <Info className="w-3.5 h-3.5 text-blue-500" />
              How the scheduling intelligence works
            </div>
            <p className="leading-relaxed">
              The Rescue Engine assesses the true relative urgency of all pending deadlines. 
              Instead of distributing steps linearly, tasks are prioritized by deadline proximity and weighted multiplier weight.
            </p>
            <p className="leading-relaxed">
              <strong>Time-Budget Caps:</strong> Shadow AI calculates how many minutes are realistically usable before your deadlines, then splits them into micro-tasks designed to spark immediate work, rather than bloat.
            </p>
          </div>

        </section>

        {/* RIGHT COLUMN: ACTION TIMELINE & WORKSPACE (Lg spans 7) */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          
          <AnimatePresence mode="wait">
            
            {/* STATE 1: LOADING TERMINAL IN-PROGRESS */}
            {isLoading && (
              <motion.div 
                key="loading"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`border-2 rounded-2xl p-6 min-h-[500px] flex flex-col justify-between shadow-2xl relative transition-colors duration-200 ${
                  theme === 'light' ? 'bg-white border-rose-500 shadow-md' : 'bg-[#0b1022] border-rose-600/50'
                }`}
              >
                <div className="absolute top-2 right-4 flex items-center gap-1.5 font-mono text-[10px] text-rose-500 animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  ANALYZING RUNWAYS
                </div>

                <div className="space-y-4">
                  <div className={`flex items-center gap-2.5 pb-3 border-b ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}>
                    <Activity className="w-5 h-5 text-rose-500 animate-spin" />
                    <div>
                      <h3 className={`font-mono font-bold ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>SHADOW AI DEEP RESOLUTION</h3>
                      <p className={`text-xs ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Processing chronological priority matrices...</p>
                    </div>
                  </div>

                  {/* Terminal Log Console */}
                  <div className={`p-4 rounded-xl font-mono text-[11px] space-y-2 min-h-[280px] max-h-[300px] overflow-y-auto select-none scrollbar-thin transition-colors ${
                    theme === 'light' ? 'bg-slate-900 border border-slate-800 text-slate-200' : 'bg-slate-950/80 border border-slate-800'
                  }`}>
                    {loadingLogs.map((log, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }}
                        key={idx} 
                        className={`${idx === loadingLogs.length - 1 ? 'text-rose-400' : 'text-slate-400'}`}
                      >
                        <span className="text-rose-500 mr-2">&gt;&gt;</span>
                        {log}
                      </motion.div>
                    ))}
                    <div className="h-4 w-1.5 bg-rose-500 animate-pulse inline-block mt-1" />
                  </div>
                </div>

                <div className={`text-center pt-4 border-t font-mono text-xs animate-pulse ${
                  theme === 'light' ? 'border-slate-200 text-slate-500' : 'border-slate-900 text-slate-500'
                }`}>
                  Calibrating task duration fractions to avoid burnout. Hang tight.
                </div>
              </motion.div>
            )}

            {/* STATE 2: EMPTY STATE (Before engagement) */}
            {!isLoading && !rescueResult && (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`border rounded-2xl p-8 min-h-[500px] flex flex-col items-center justify-center text-center relative overflow-hidden transition-all duration-200 ${
                  theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0f162e] border-slate-800 shadow-xl'
                }`}
              >
                <div className="absolute inset-0 bg-[radial-gradient(#1c1e30_1px,transparent_1px)] [background-size:16px_16px] opacity-15" />
                <div className={`h-16 w-16 border rounded-full flex items-center justify-center mb-5 relative ${
                  theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-slate-900 border-slate-800'
                }`}>
                  <Skull className="w-8 h-8 text-rose-500/80" />
                  <span className="absolute inset-0 rounded-full border border-rose-500/20 animate-ping pointer-events-none" />
                </div>
                
                <h3 className={`font-mono font-bold text-lg ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>RESCUE SCOPE DEPLOYED</h3>
                <p className={`text-sm max-w-md mt-2 leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                  The primary focus is ready. Register any additional looming obligations or secondary deadlines in the queue, then click <strong className={theme === 'light' ? 'text-rose-600 font-bold' : 'text-rose-400'}>ENGAGE RESCUE ENGINE</strong> to formulate your micro-task timeline.
                </p>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg w-full text-left font-mono text-xs">
                  <div className={`p-4 rounded-lg border transition-colors ${
                    theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#0b0e1f] border border-slate-800'
                  }`}>
                    <span className="text-rose-600 font-bold block mb-1">⏱️ ACCURATE TIMING</span>
                    Suggested steps are sized to fit your ACTUAL remaining time budget. No imaginary 8-hour blocks when you only have 2 hours.
                  </div>
                  <div className={`p-4 rounded-lg border transition-colors ${
                    theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#0b0e1f] border border-slate-800'
                  }`}>
                    <span className="text-rose-600 font-bold block mb-1">🚀 POMODORO HYPER-FOCUS</span>
                    Each micro-step incorporates a specific countdown focus timer to sustain momentum and defeat paralysis.
                  </div>
                </div>
              </motion.div>
            )}

            {/* STATE 3: DETAILED ACTION TIMELINE (Loaded) */}
            {!isLoading && rescueResult && (
              <motion.div 
                key="timeline"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className={`border rounded-2xl p-5 md:p-6 shadow-2xl flex flex-col gap-6 transition-colors duration-200 ${
                  theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#0f162e] border-slate-800'
                }`}
              >
                {/* Header of Timeline */}
                <div className={`flex flex-wrap items-center justify-between gap-4 pb-4 border-b ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-rose-600 text-white font-mono font-bold text-[10px] rounded tracking-widest animate-pulse">ACTIVE PLAN</span>
                      <h3 className={`font-mono font-bold uppercase tracking-tight ${theme === 'light' ? 'text-slate-850' : 'text-slate-200'}`}>SHADOW SCHEDULER TIMELINE</h3>
                    </div>
                    <p className={`text-xs mt-1 ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Sequential, hyper-focused blocks for maximum friction reduction</p>
                  </div>

                  <button 
                    onClick={handleResetPlan}
                    className={`text-[10px] font-mono border px-3 py-1.5 rounded transition-all cursor-pointer ${
                      theme === 'light' 
                        ? 'bg-slate-100 border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900' 
                        : 'border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    DISCARD PLAN
                  </button>
                </div>

                {/* Progress bar */}
                <div className={`p-4 rounded-xl border transition-colors ${
                  theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#0b0e1f] border border-slate-800/80'
                }`}>
                  <div className="flex justify-between items-center mb-1 text-xs font-mono">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                      TIMELINE PROGRESSION
                    </span>
                    <span className="font-bold text-emerald-600">{progress.percent}% COMPLETE</span>
                  </div>
                  <div className={`w-full h-2.5 rounded-full overflow-hidden p-0.5 border ${
                    theme === 'light' ? 'bg-slate-200 border-slate-300/60' : 'bg-slate-950 border-slate-800'
                  }`}>
                    <motion.div 
                      className="bg-gradient-to-r from-rose-500 to-emerald-500 h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress.percent}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5 font-mono">
                    Completed {progress.completedCount} out of {progress.totalCount} generated micro-tasks. Keep up the high focus.
                  </p>
                </div>

                {/* ACTIVE FOCUS STEP COUNTDOWN TIMER (If step is selected) */}
                {activeStepIdx !== null && activeStepIdx < rescueResult.suggestedMicroTasks.length && (
                  <div className={`border-2 rounded-xl p-4 md:p-5 relative overflow-hidden transition-all duration-200 ${
                    theme === 'light' ? 'bg-rose-50/20 border-rose-500/20' : 'bg-[#121933] border-emerald-500/20'
                  }`}>
                    <div className="absolute top-0 right-0 h-16 w-16 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-rose-500/10 via-transparent to-transparent pointer-events-none" />
                    
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="min-w-0">
                        <span className={`text-[10px] font-mono tracking-wider font-bold block ${theme === 'light' ? 'text-rose-600' : 'text-emerald-400'}`}>CURRENT POMODORO BURST / STEP #{rescueResult.suggestedMicroTasks[activeStepIdx].stepNumber}</span>
                        <h4 className={`font-bold text-md tracking-tight leading-snug mt-0.5 ${theme === 'light' ? 'text-slate-800' : 'text-slate-100'}`}>
                          {rescueResult.suggestedMicroTasks[activeStepIdx].taskName}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono text-slate-400">
                          <span className="text-slate-500">PARENT:</span>
                          <span className={`${theme === 'light' ? 'text-rose-600' : 'text-rose-400'} truncate`}>{rescueResult.suggestedMicroTasks[activeStepIdx].parentTaskName}</span>
                        </div>
                      </div>

                      {/* Ticking Numbers Visual */}
                      <div className={`flex items-center gap-4 px-4 py-2 rounded-xl border shrink-0 self-center md:self-auto shadow-inner transition-colors ${
                        theme === 'light' ? 'bg-white border-slate-200 shadow-slate-100' : 'bg-slate-950 border-slate-800'
                      }`}>
                        <Timer className={`w-5 h-5 ${theme === 'light' ? 'text-rose-600' : 'text-emerald-400'} ${timerIsRunning ? 'animate-spin' : ''}`} />
                        <span className={`font-mono text-2xl font-black tracking-widest min-w-[90px] text-center select-none ${
                          theme === 'light' ? 'text-rose-600' : 'text-emerald-400'
                        }`}>
                          {formatTimeSeconds(timerSecondsLeft)}
                        </span>
                      </div>
                    </div>

                    {/* Controls row */}
                    <div className={`flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t ${
                      theme === 'light' ? 'border-slate-200' : 'border-slate-800/60'
                    }`}>
                      <p className={`text-xs italic shrink min-w-0 max-w-sm ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                        💡 <strong className={`font-semibold font-mono ${theme === 'light' ? 'text-rose-700' : 'text-emerald-400'}`}>Tactical Tip:</strong> {rescueResult.suggestedMicroTasks[activeStepIdx].focusTip}
                      </p>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <button 
                          onClick={handleResetTimer}
                          className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                            theme === 'light' 
                              ? 'bg-slate-100 border-slate-200 hover:bg-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800' 
                              : 'bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                          }`}
                          title="Reset Step Timer"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={handleToggleTimer}
                          className={`flex items-center gap-2 px-4 py-2 font-mono font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-md cursor-pointer ${
                            timerIsRunning 
                              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/20' 
                              : theme === 'light'
                              ? 'bg-rose-500 hover:bg-rose-400 text-white font-black shadow-rose-950/20'
                              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-emerald-950/20'
                          }`}
                        >
                          {timerIsRunning ? (
                            <>
                              <Pause className="w-4 h-4 text-white" />
                              PAUSE
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 shrink-0" />
                              START BURST
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sequenced Checklist Flow */}
                <div className="space-y-3">
                  <h4 className={`text-xs font-mono font-bold uppercase tracking-wider ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>SEQUENCED STEP DEPLOYMENT</h4>
                  
                  <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                    {rescueResult.suggestedMicroTasks.map((step, idx) => {
                      const isCurrentActive = activeStepIdx === idx;
                      return (
                        <div 
                          key={idx}
                          onClick={() => handleSelectMicroTask(idx)}
                          className={`group relative rounded-xl border p-3.5 flex items-start gap-4 transition-all cursor-pointer ${
                            step.completed 
                              ? theme === 'light'
                                ? 'bg-slate-100/60 border-slate-200 opacity-60 hover:opacity-80'
                                : 'bg-slate-900/40 border-slate-900 opacity-60 hover:opacity-80' 
                              : isCurrentActive
                              ? theme === 'light'
                                ? 'bg-rose-50/30 border-rose-500/50 shadow-[0_4px_15px_rgba(225,29,72,0.05)]'
                                : 'bg-[#152044] border-emerald-500/60 shadow-[0_4px_15px_rgba(16,185,129,0.1)]'
                              : theme === 'light'
                              ? 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/50'
                              : 'bg-[#0d1224] border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {/* Left Number Badge or Checkbox */}
                          <div className="shrink-0 flex items-center justify-center mt-0.5">
                            <button 
                              onClick={(e) => handleToggleStepCompletion(idx, e)}
                              className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer ${
                                step.completed 
                                  ? 'bg-emerald-500 border-emerald-500 text-slate-950' 
                                  : isCurrentActive
                                  ? theme === 'light'
                                    ? 'border-rose-500 hover:bg-rose-100/30 text-rose-600'
                                    : 'border-emerald-400 hover:bg-emerald-950/30 text-emerald-400'
                                  : theme === 'light'
                                  ? 'border-slate-300 hover:border-rose-500/50 text-slate-500'
                                  : 'border-slate-700 hover:border-rose-500/50 text-slate-400'
                              }`}
                              title={step.completed ? 'Mark incomplete' : 'Mark completed'}
                            >
                              {step.completed ? (
                                <Check className="w-4 h-4 stroke-[3px]" />
                              ) : (
                                <span className="font-mono text-xs font-bold">{step.stepNumber}</span>
                              )}
                            </button>
                          </div>

                          {/* Content Details */}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <h5 className={`font-semibold text-sm leading-tight transition-colors ${
                                  step.completed 
                                    ? 'text-slate-500 line-through' 
                                    : theme === 'light'
                                    ? 'text-slate-800 font-bold'
                                    : 'text-slate-100'
                                }`}>
                                  {step.taskName}
                                </h5>
                                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-[11px] font-mono">
                                  <span className={`${theme === 'light' ? 'text-rose-600 font-semibold' : 'text-rose-400'} tracking-tight max-w-[150px] truncate`} title={step.parentTaskName}>
                                    {step.parentTaskName}
                                  </span>
                                  <span className="text-slate-600">•</span>
                                  <span className="text-slate-500 italic">Tip preview on hover</span>
                                </div>
                              </div>

                              <div className={`shrink-0 flex items-center gap-1.5 px-2 py-1 rounded border transition-colors ${
                                theme === 'light' 
                                  ? 'bg-slate-100 border-slate-200 text-slate-750' 
                                  : 'bg-slate-950/80 border-slate-800/80 text-slate-300'
                              }`}>
                                <Timer className="w-3.5 h-3.5 text-slate-400" />
                                <span className="font-mono text-xs font-bold">
                                  {step.durationMinutes}m
                                </span>
                              </div>
                            </div>

                            {/* Expanded focus tip on hover or when active */}
                            <div className={`mt-2.5 text-xs leading-relaxed border-t pt-2 transition-all ${
                              theme === 'light' ? 'text-slate-700 border-slate-200' : 'text-slate-400 border-slate-800/50'
                            } ${
                              isCurrentActive ? 'block' : 'hidden group-hover:block'
                            }`}>
                              <span className={`font-mono text-[10px] uppercase font-bold block mb-0.5 ${
                                theme === 'light' ? 'text-rose-600' : 'text-emerald-400'
                              }`}>Tactical Action directive:</span>
                              "{step.focusTip}"
                            </div>
                          </div>

                          {/* Indicator Chevron */}
                          <div className={`shrink-0 self-center transition-colors ${theme === 'light' ? 'text-slate-400 group-hover:text-slate-600' : 'text-slate-600 group-hover:text-slate-400'}`}>
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Summary stats */}
                <div className={`p-3 rounded-xl border flex justify-between items-center text-xs font-mono transition-colors ${
                  theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-[#0b0e1f] border border-slate-900 text-slate-500'
                }`}>
                  <span>TOTAL ESTIMATED DISPATCHED TIME:</span>
                  <span className={`font-bold ${theme === 'light' ? 'text-slate-800' : 'text-slate-300'}`}>
                    {rescueResult.suggestedMicroTasks.reduce((sum, s) => sum + (s.completed ? 0 : s.durationMinutes), 0)} min remaining to execute
                  </span>
                </div>

              </motion.div>
            )}

          </AnimatePresence>

        </section>

      </main>

      {/* Persistent Footer */}
      <footer className={`border-t py-5 mt-auto transition-colors duration-250 ${
        theme === 'light' ? 'border-slate-200 bg-slate-100 text-slate-600' : 'border-slate-900 bg-[#080b15]/90 text-slate-500'
      }`}>
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
          <p className="text-xs font-mono uppercase tracking-widest">
            SHADOW AI DEPLOYMENT OVERWATCH // HOSTED SYSTEM INSTANCE
          </p>
          <p className={`text-[11px] max-w-lg mx-auto ${theme === 'light' ? 'text-slate-500' : 'text-slate-600'}`}>
            This tool computes absolute urgency offsets locally and leverages server-side Gemini 3.5 models to synthesize hyper-focused step structures calibrated strictly to real timeline budgets.
          </p>
        </div>
      </footer>
    </div>
  );
}
