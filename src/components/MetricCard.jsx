import { FiTrendingUp, FiAward, FiAlertTriangle, FiGrid } from 'react-icons/fi';

export default function MetricCard({ title, value, subtext, color = 'bg-white', iconType = 'trend' }) {
  // Map iconType to specific clean Feather icons
  const getIcon = () => {
    switch (iconType) {
      case 'trend':
        return <FiTrendingUp className="w-5 h-5" />;
      case 'award':
        return <FiAward className="w-5 h-5" />;
      case 'alert':
        return <FiAlertTriangle className="w-5 h-5" />;
      case 'grid':
        return <FiGrid className="w-5 h-5" />;
      default:
        return <FiGrid className="w-5 h-5" />;
    }
  };

  const getIconColorClass = () => {
    switch (color) {
      case 'bg-neo-cyan':
        return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'bg-neo-lime':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'bg-neo-pink':
        return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'bg-neo-yellow':
        return 'bg-amber-50 text-amber-600 border-amber-100';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  return (
    <div className="border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between h-full bg-white hover:border-violet-200 transition-all duration-200">
      <div className="flex justify-between items-center mb-3">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{title}</span>
        <span className={`p-2.5 rounded-xl border ${getIconColorClass()}`}>
          {getIcon()}
        </span>
      </div>
      <div>
        <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">{value}</h3>
        <p className="text-xs font-semibold text-slate-500 mt-2 border-t border-slate-50 pt-2">{subtext}</p>
      </div>
    </div>
  );
}
