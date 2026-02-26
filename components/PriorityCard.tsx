import { ArrowRight } from 'lucide-react';

interface PriorityCardProps {
  rank: number;
  badge: string;
  titleAction: string;
  titleSubject: string;
  description: string;
  metric1Label: string;
  metric1Value: string;
  metric2Value: string;
  ctaText: string;
  onAction: () => void;
  isPrimary?: boolean;
  delay?: number;
}

export function PriorityCard({
  rank,
  badge,
  titleAction,
  titleSubject,
  description,
  metric1Label,
  metric1Value,
  metric2Value,
  ctaText,
  onAction,
  isPrimary = false,
  delay = 0
}: PriorityCardProps) {
  return (
    <div
      className="group opacity-0 animate-slide-up"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="relative h-full bg-white/[0.03] border border-white/10 p-8 rounded-2xl backdrop-blur-sm transition-all duration-500 flex flex-col hover:border-white/40 hover:shadow-[0_0_40px_rgba(255,255,255,0.05)]">
        <div className="flex justify-between items-start mb-12">
          <span
            style={{
              WebkitTextStroke: '1px rgba(255, 255, 255, 0.2)',
              color: 'transparent'
            }}
            className="text-6xl font-black opacity-40 group-hover:opacity-100 transition-opacity"
          >
            {rank}
          </span>
          <div className="bg-white/10 text-[10px] font-bold tracking-widest px-3 py-1 rounded-full uppercase text-white/80 border border-white/5">
            {badge}
          </div>
        </div>

        <div className="flex-1">
          <h3 className="text-2xl font-bold mb-4 leading-snug">
            {titleAction} <br />
            <span className="text-white underline decoration-white/20 underline-offset-8">
              {titleSubject}
            </span>
          </h3>
          <p className="text-white/50 mb-8 text-sm leading-relaxed">
            {description}
          </p>
        </div>

        <div className="pt-6 border-t border-white/5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-tighter text-white/30">
                {metric1Label}
              </span>
              <span className="text-xl font-bold font-mono">{metric1Value}</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[10px] uppercase tracking-tighter text-white/30">
                Confidence
              </span>
              <span className="text-xl font-bold font-mono">{metric2Value}</span>
            </div>
          </div>
          <button
            onClick={onAction}
            className={`w-full flex items-center justify-center gap-2 py-4 font-bold rounded-lg transition-all active:scale-[0.98] ${
              isPrimary
                ? 'bg-white text-black hover:bg-white/90'
                : 'border border-white/20 text-white hover:bg-white/10'
            }`}
          >
            {ctaText}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
