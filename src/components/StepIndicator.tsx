'use client';

interface StepIndicatorProps {
  step: number;
  title: string;
  isActive: boolean;
  isCompleted: boolean;
}

export function StepIndicator({ step, title, isActive, isCompleted }: StepIndicatorProps) {
  return (
    <div className="flex flex-col items-center flex-1">
      <div
        className={`step-indicator ${
          isActive
            ? 'active'
            : isCompleted
            ? 'completed'
            : 'pending'
        }`}
      >
        {isCompleted ? '✓' : step}
      </div>
      <div className={`text-xs mt-2 text-center ${isActive ? 'font-semibold text-primary-600' : 'text-gray-500'}`}>
        {title}
      </div>
    </div>
  );
}


