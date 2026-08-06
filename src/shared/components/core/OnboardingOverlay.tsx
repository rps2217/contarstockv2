import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Zap, Cloud, Users, ArrowRight, CheckCircle2 } from 'lucide-react';

export const OnboardingOverlay: React.FC = () => {
  const [step, setStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('logicount_onboarding_seen');
    if (!hasSeenOnboarding) {
      setIsVisible(true);
    }
  }, []);

  const steps = [
    {
      title: 'Bienvenido a LogiCount Pro',
      description:
        'Tu nuevo centro de control logístico de alto rendimiento. Diseñado para ser rápido, confiable y profesional.',
      icon: <LayoutDashboard className="w-12 h-12 text-brand-warning" />,
      color: 'amber',
    },
    {
      title: 'Sincronización Inteligente',
      description:
        'Tus datos se guardan localmente y se sincronizan automáticamente con la nube cuando hay conexión.',
      icon: <Cloud className="w-12 h-12 text-blue-500" />,
      color: 'blue',
    },
    {
      title: 'Modo Hammer (Ráfaga)',
      description:
        'Escanea cientos de productos en segundos sin interrupciones. Ideal para inventarios masivos.',
      icon: <Zap className="w-12 h-12 text-rose-500" />,
      color: 'rose',
    },
    {
      title: 'Gestión de Clientes',
      description:
        'Notifica a tus clientes automáticamente cuando sus pedidos estén listos para retiro.',
      icon: <Users className="w-12 h-12 text-emerald-500" />,
      color: 'emerald',
    },
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    localStorage.setItem('logicount_onboarding_seen', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const current = steps[step];

  return (
    <div className="fixed inset-0 z-[300] bg-base/90 backdrop-blur-xl flex items-center justify-center p-6">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-brand-surface max-w-md w-full rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10"
      >
        <div className="p-10 text-center">
          <motion.div
            key={step}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex justify-center mb-8"
          >
            <div
              className={`p-6 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5`}
            >
              {current.icon}
            </div>
          </motion.div>

          <motion.div
            key={`text-${step}`}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-2xl font-black tracking-tighter italic uppercase mb-4 dark:text-white">
              {current.title}
            </h2>
            <p className="text-slate-500 dark:text-muted text-sm leading-relaxed mb-10">
              {current.description}
            </p>
          </motion.div>

          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    i === step ? 'w-8 bg-brand-warning' : 'w-1.5 bg-slate-200 dark:bg-white/10'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="bg-brand-warning hover:bg-amber-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-brand-warning/20"
            >
              {step === steps.length - 1 ? 'Comenzar' : 'Siguiente'}
              {step === steps.length - 1 ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
