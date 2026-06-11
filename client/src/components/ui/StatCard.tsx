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

export default function StatCard({ label, value, icon: Icon, colorClass, bgClass, borderClass = 'border-white/5', onClick }: StatCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`p-5 rounded-2xl bg-white/[0.03] border ${borderClass} hover:bg-white/5 transition-colors ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
    >
      <div className={`w-10 h-10 rounded-xl ${bgClass} flex items-center justify-center mb-4`}>
        <Icon className={`w-5 h-5 ${colorClass}`} />
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-gray-500 text-xs mt-1 font-medium">{label}</p>
    </div>
  );
}
