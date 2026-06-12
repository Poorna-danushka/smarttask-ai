import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  colorClass: string;
  bgClass: string;
  borderClass?: string;
  onClick?: () => void;
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  colorClass,
  bgClass,
  borderClass = 'border-white/5',
  onClick,
}: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        p-4 sm:p-5 rounded-2xl bg-white/[0.03] border ${borderClass}
        hover:bg-white/[0.05] transition-all
        ${onClick ? 'cursor-pointer active:scale-[0.98] hover:scale-[1.01]' : ''}
      `}
    >
      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl ${bgClass} flex items-center justify-center mb-3 sm:mb-4`}>
        <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${colorClass}`} />
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-white leading-none">{value}</p>
      <p className="text-gray-500 text-[10px] sm:text-xs mt-1 sm:mt-1.5 font-medium">{label}</p>
    </div>
  );
}
