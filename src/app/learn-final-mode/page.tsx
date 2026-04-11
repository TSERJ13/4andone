"use client";

import React, { useState, useEffect } from 'react';
import { 
  Zap,
  Play,
  ArrowRight,
  Dumbbell,
  CheckCircle2,
  ListMusic,
  MousePointerClick,
  MonitorPlay,
  Disc
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LearnFinalMode() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(15);
  const [isCounting, setIsCounting] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isCounting && countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    } else if (countdown === 0) {
      setIsCounting(false);
      setCountdown(15);
    }
    return () => clearInterval(timer);
  }, [isCounting, countdown]);

  const steps = [
    {
      number: "01",
      title: "How to Launch?",
      description: "Go to your Library and select 'Final Mode'. This is your automated practice space where everything is pre-configured for your training.",
      icon: <MousePointerClick className="text-primary" size={24} />,
      demo: (
        <div className="demo-mini">
            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Zap size={20} className="text-primary" />
                </div>
                <div className="text-sm font-bold">Final Mode</div>
                <div className="ml-auto text-[10px] opacity-40">CLICK TO START</div>
            </div>
        </div>
      )
    },
    {
      number: "02",
      title: "Choose Your Routine",
      description: "Select your discipline: Latin, Standard, or Fitness. The system automatically builds a 5, 8, or 10-dance program in the correct professional sequence.",
      icon: <ListMusic className="text-blue-400" size={24} />,
      demo: (
        <div className="demo-mini">
            <div className="flex flex-col gap-2">
                {['Latin', 'Standard'].map((m, i) => (
                    <div key={i} className={`p-3 rounded-xl border text-xs font-bold ${i===0 ? 'border-primary/50 bg-primary/5' : 'border-white/10 opacity-40'}`}>
                        {m}
                    </div>
                ))}
            </div>
        </div>
      )
    },
    {
      number: "03",
      title: "Automatic Playback",
      description: "Music starts playing automatically. Between each track, the system gives you a 15-second competition break. No need to touch your device during the set.",
      icon: <MonitorPlay className="text-rose-400" size={24} />,
      demo: (
        <div className="demo-mini text-center">
             <div className="text-2xl font-black text-rose-400 mb-2">{countdown}s</div>
             <p className="text-[10px] opacity-40 mb-3">STATUS: RESTING</p>
             <button 
                onClick={() => setIsCounting(true)}
                disabled={isCounting}
                className="text-[10px] font-bold px-4 py-2 rounded-full border border-white/20 hover:bg-white/5"
              >
                {isCounting ? 'ACTIVE...' : 'PREVIEW TIMER'}
              </button>
        </div>
      )
    },
    {
      number: "04",
      title: "Fitness Training",
      description: "Need pure endurance? Choose your own session duration for a custom cardio block. This mode plays non-stop music, and you can turn it off at any time during your workout.",
      icon: <Dumbbell className="text-orange-400" size={24} />,
      demo: (
        <div className="demo-mini">
            <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-bold opacity-40">SET DURATION</span>
                <div className="px-2 py-1 rounded bg-orange-400/20 text-orange-400 text-[10px] font-black italic">STOP ANYTIME</div>
            </div>
            <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="w-[45%] h-full bg-orange-400" />
                </div>
                <span className="text-xs font-black">20:00m</span>
            </div>
            <button className="w-full py-2 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 transition-all">
                TURN OFF FITNESS
            </button>
        </div>
      )
    },
    {
      number: "05",
      title: "End the Session",
      description: "Final Mode is a full program simulation. Once you've completed your dance set or fitness block, simply press the 'Finish' button to end the session.",
      icon: <CheckCircle2 className="text-green-400" size={24} />,
      demo: (
        <div className="demo-mini text-center">
            <div className="mb-4 opacity-40 text-[10px] font-bold">SESSION COMPLETE?</div>
            <button className="w-full py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-black text-xs">
                FINISH FINAL
            </button>
        </div>
      )
    }
  ];

  return (
    <div className="learn-minimal">
      <div className="container">
        <header className="hero">
          <Link href="/" className="back-btn">
            <ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} /> BACK TO HOME
          </Link>
          <h1>How does<br/><span>Final Mode</span> work?</h1>
          <p>Your automated coaching system designed to simulate real tournament environments.</p>
        </header>

        <main className="steps-list">
            {steps.map((step, i) => (
                <div key={i} className="step-item animate-in" style={{ animationDelay: `${i * 0.1}s` }}>
                    <div className="step-header">
                        <div className="step-num">{step.number}</div>
                        <div className="step-title">
                            <div className="icon-wrap">{step.icon}</div>
                            <h2>{step.title}</h2>
                        </div>
                    </div>
                    <div className="step-content">
                        <p>{step.description}</p>
                        <div className="step-visual-wrap">
                            {step.demo}
                        </div>
                    </div>
                </div>
            ))}
        </main>

        <footer className="footer-cta animate-in" style={{ animationDelay: '0.5s' }}>
            <button onClick={() => router.push('/library/finals')} className="launch-btn">
                START PRACTICE <Play size={18} fill="currentColor" />
            </button>
        </footer>
      </div>

      <style jsx>{`
        .learn-minimal {
          min-height: 100vh;
          background: #000;
          color: white;
          padding: 60px 24px 120px;
        }

        .container {
          max-width: 600px;
          margin: 0 auto;
        }

        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 900;
          opacity: 0.4;
          margin-bottom: 40px;
          transition: opacity 0.2s;
          letter-spacing: 1px;
        }

        .back-btn:hover { opacity: 1; }

        .hero {
          margin-bottom: 80px;
        }

        h1 {
          font-size: 48px;
          font-weight: 900;
          letter-spacing: -2px;
          line-height: 1.1;
          margin-bottom: 20px;
        }

        h1 span {
            color: var(--primary);
        }

        .hero p {
            font-size: 16px;
            opacity: 0.5;
            line-height: 1.6;
        }

        .steps-list {
            display: flex;
            flex-direction: column;
            gap: 60px;
        }

        .step-item {
            position: relative;
        }

        .step-header {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 16px;
        }

        .step-num {
            font-size: 11px;
            font-weight: 900;
            color: var(--primary);
            opacity: 0.8;
            letter-spacing: 2px;
        }

        .step-title {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .icon-wrap {
            width: 40px;
            height: 40px;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.05);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        h2 {
            font-size: 20px;
            font-weight: 800;
            letter-spacing: -0.5px;
        }

        .step-content {
            padding-left: 36px;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .step-content p {
            font-size: 15px;
            line-height: 1.7;
            opacity: 0.6;
            max-width: 480px;
        }

        .step-visual-wrap {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 20px;
            padding: 20px;
            max-width: 320px;
        }

        .footer-cta {
            margin-top: 100px;
            text-align: center;
        }

        .launch-btn {
            background: var(--primary);
            color: black;
            border: none;
            padding: 20px 48px;
            border-radius: 16px;
            font-weight: 900;
            font-size: 17px;
            display: inline-flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            transition: transform 0.2s;
        }

        .launch-btn:hover { transform: scale(1.02); }

        .animate-in {
          animation: slide-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 480px) {
            h1 { font-size: 36px; }
            .step-content { padding-left: 0; }
            .step-header { gap: 12px; }
            .step-visual-wrap { max-width: 100%; }
        }
      `}</style>
    </div>
  );
}
