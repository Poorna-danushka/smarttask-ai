import Link from 'next/link';
import { ArrowRight, Sparkles, Layout, Zap, BrainCircuit } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen min-h-[100svh] bg-[#0a0a0a] text-white selection:bg-purple-500/30 flex flex-col overflow-x-hidden">

      {/* Dynamic Background — fixed, covers full viewport */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen"></div>
        <div className="absolute top-[15%] right-[-10%] w-[50%] h-[60%] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen"></div>
        <div className="absolute bottom-[-20%] left-[10%] w-[70%] h-[60%] bg-indigo-600/20 rounded-full blur-[120px] mix-blend-screen"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      {/* Navbar — sticky, full-width, glass effect */}
      <nav className="sticky top-0 z-20 w-full shrink-0 bg-[#0a0a0a]/70 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between px-4 sm:px-8 lg:px-12 py-3 sm:py-4 max-w-7xl mx-auto w-full">
          <Link href="/homepage" className="flex items-center gap-2 min-w-0 group">
            <BrainCircuit className="w-6 h-6 sm:w-7 sm:h-7 text-purple-400 group-hover:text-purple-300 transition-colors shrink-0" />
            <span className="text-base sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400 whitespace-nowrap group-hover:from-purple-300 group-hover:to-blue-300 transition-all">
              SmartTask AI
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link
              href="/login"
              className="text-xs sm:text-sm font-medium text-gray-300 hover:text-white transition-colors px-2 py-1"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-xs sm:text-sm font-medium px-3 py-1.5 sm:px-5 sm:py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 transition-all backdrop-blur-md whitespace-nowrap"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section — fills remaining viewport height on mobile */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 py-10 sm:py-16 w-full max-w-5xl mx-auto min-h-[calc(100svh-56px)] sm:min-h-0">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs sm:text-sm font-medium mb-6 sm:mb-8">
          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span>The future of task management is here</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight mb-5 sm:mb-8 leading-[1.1] sm:leading-[1.15]">
          Manage work with{' '}
          <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-indigo-400">
            intelligent automation
          </span>
        </h1>

        <p className="text-sm sm:text-lg md:text-xl text-gray-400 max-w-2xl mb-8 sm:mb-12 leading-relaxed px-2">
          SmartTask AI is a professional productivity platform that combines powerful project management with cutting-edge AI to help your team work smarter, not harder.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <Link
            href="/register"
            className="group px-6 sm:px-8 py-3.5 sm:py-4 rounded-full bg-white text-black font-semibold text-base sm:text-lg hover:bg-gray-100 transition-all flex items-center justify-center gap-2 shadow-[0_0_40px_rgba(255,255,255,0.3)]"
          >
            Start for free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/login"
            className="px-6 sm:px-8 py-3.5 sm:py-4 rounded-full bg-white/5 border border-white/10 font-semibold text-base sm:text-lg hover:bg-white/10 transition-all backdrop-blur-sm text-center flex items-center justify-center"
          >
            View Live Demo
          </Link>
        </div>
      </main>

      {/* Features Grid */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-12 sm:pb-20 md:pb-24 pt-4 sm:pt-8 w-full">
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">

          <div className="p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 transition-colors group">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-5 sm:mb-6 group-hover:scale-110 transition-transform">
              <Layout className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">Intuitive Kanban</h3>
            <p className="text-gray-400 leading-relaxed text-sm">Drag and drop tasks effortlessly. Organize your workflow visually with our lightning-fast board system.</p>
          </div>

          <div className="p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 transition-colors group">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-5 sm:mb-6 group-hover:scale-110 transition-transform">
              <BrainCircuit className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">AI Summaries</h3>
            <p className="text-gray-400 leading-relaxed text-sm">Generate instant task summaries, estimated completion times, and intelligent productivity suggestions.</p>
          </div>

          <div className="p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 transition-colors group sm:col-span-2 md:col-span-1">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-5 sm:mb-6 group-hover:scale-110 transition-transform">
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">Real-time Sync</h3>
            <p className="text-gray-400 leading-relaxed text-sm">Collaborate seamlessly with your team. See updates, typing indicators, and online status instantly.</p>
          </div>

        </div>
      </section>
    </div>
  );
}
