import React from 'react';
import { Lock, Package, Eye, Wallet, CheckCircle2 } from 'lucide-react';

type StepStatus = 'pending' | 'active' | 'completed';

interface Step {
  id: number;
  label: string;
  icon: React.ElementType;
  status: StepStatus;
}

interface TransactionStepperProps {
  currentStep: number;
}

export const TransactionStepper: React.FC<TransactionStepperProps> = ({ currentStep }) => {
  const steps: Step[] = [
    { id: 1, label: 'تم حجز المال', icon: Lock, status: currentStep > 1 ? 'completed' : currentStep === 1 ? 'active' : 'pending' },
    { id: 2, label: 'جاري التسليم', icon: Package, status: currentStep > 2 ? 'completed' : currentStep === 2 ? 'active' : 'pending' },
    { id: 3, label: 'تم الفحص', icon: Eye, status: currentStep > 3 ? 'completed' : currentStep === 3 ? 'active' : 'pending' },
    { id: 4, label: 'تحرير الأموال', icon: Wallet, status: currentStep > 4 ? 'completed' : currentStep === 4 ? 'active' : 'pending' },
  ];

  return (
    <div className="w-full py-8 px-4 font-arabic">
      <div className="relative flex justify-between items-center">
        {/* Progress Line */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -translate-y-1/2 z-0" />
        <div 
          className="absolute top-1/2 left-0 h-1 bg-blue-500 -translate-y-1/2 z-0 transition-all duration-500" 
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.status === 'active';
          const isCompleted = step.status === 'completed';

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center gap-2 group">
              <div 
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 border-4
                  ${isActive ? 'bg-blue-500 border-blue-200 scale-110 shadow-lg' : 
                    isCompleted ? 'bg-green-500 border-green-200' : 
                    'bg-white border-slate-200 text-slate-400'}`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="text-white" size={24} />
                ) : (
                  <Icon className={isActive ? 'text-white' : 'text-slate-400'} size={24} />
                )}
              </div>
              <span className={`text-xs font-bold transition-colors ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-slate-400'}`}>
                {step.label}
              </span>
              
              {/* Pulse effect for active step */}
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-blue-500 animate-ping opacity-20" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
