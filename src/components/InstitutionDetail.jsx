import { FiX, FiActivity, FiShield, FiPercent, FiTrendingUp } from 'react-icons/fi';

export default function InstitutionDetail({ item, onClose, allData = {} }) {
  if (!item) return null;

  // Find historical data for this instansi
  const history = [];
  const years = [2021, 2022, 2023];
  years.forEach(y => {
    const list = allData[y] || [];
    const match = list.find(d => d.nama === item.nama || (d.instansi_id && d.instansi_id === item.instansi_id));
    if (match) {
      history.push({ year: y, indeks: match.indeks });
    }
  });

  const getScoreBadgeColor = (score) => {
    if (score >= 80) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (score >= 70) return 'bg-amber-50 text-amber-700 border-amber-100';
    return 'bg-rose-50 text-rose-700 border-rose-100';
  };

  const getScoreBarColor = (score) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 70) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <div 
        className="bg-white border border-slate-100 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 border border-slate-100 rounded-xl p-2 transition-all cursor-pointer"
        >
          <FiX className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="mb-6 mt-2 border-b border-slate-50 pb-4">
          <span className="inline-block bg-violet-50 text-violet-700 border border-violet-100 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            📂 {(item.map?.province_code === null ? 'lembaga' : item.map?.level) || 'lembaga'}
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
            {item.nama}
          </h2>
          <p className="text-sm font-semibold text-slate-400 mt-1">ID Instansi: {item.instansi_id || 'N/A'} • Data Survei Tahun {item.tahun}</p>
        </div>

        {/* Highlight Stats Box */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className={`border rounded-2xl p-4 flex flex-col justify-between ${getScoreBadgeColor(item.indeks)}`}>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 flex items-center gap-1">
              <FiActivity className="w-3.5 h-3.5" /> Indeks SPI
            </span>
            <span className="text-3xl font-black mt-2">{item.indeks}</span>
          </div>

          <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50 flex flex-col justify-between text-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
              <FiShield className="w-3.5 h-3.5" /> Koreksi Integritas
            </span>
            <span className="text-2xl font-bold mt-2 text-rose-600">-{item.koreksi?.integritas || 0}</span>
          </div>

          <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50 flex flex-col justify-between text-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
              <FiPercent className="w-3.5 h-3.5" /> Koreksi Prevalensi
            </span>
            <span className="text-2xl font-bold mt-2 text-amber-600">-{item.koreksi?.prevalensi || 0}</span>
          </div>
        </div>

        {/* Breakdown details */}
        <div className="border border-slate-100 rounded-2xl p-5 mb-6 bg-white shadow-xs">
          <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-50 pb-2">
            📊 Rincian Nilai Agregat
          </h3>
          <div className="space-y-4">
            {/* Internal */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                <span>Skor Internal (Karyawan)</span>
                <span className="font-extrabold text-slate-800">{item.agregat?.internal || '0'}</span>
              </div>
              <div className="w-full bg-slate-50 h-3 rounded-full overflow-hidden border border-slate-100">
                <div 
                  className="bg-violet-600 h-full rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min(100, parseFloat(item.agregat?.internal || 0))}%` }}
                ></div>
              </div>
            </div>

            {/* Eksternal */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                <span>Skor Eksternal (Pengguna Layanan)</span>
                <span className="font-extrabold text-slate-800">{item.agregat?.eksternal || '0'}</span>
              </div>
              <div className="w-full bg-slate-50 h-3 rounded-full overflow-hidden border border-slate-100">
                <div 
                  className="bg-indigo-500 h-full rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min(100, parseFloat(item.agregat?.eksternal || 0))}%` }}
                ></div>
              </div>
            </div>

            {/* Eksper */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                <span>Skor Eksper (Pihak Ketiga/Ahli)</span>
                <span className="font-extrabold text-slate-800">{item.agregat?.eksper || '0'}</span>
              </div>
              <div className="w-full bg-slate-50 h-3 rounded-full overflow-hidden border border-slate-100">
                <div 
                  className="bg-blue-500 h-full rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min(100, parseFloat(item.agregat?.eksper || 0))}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* History Trend */}
        {history.length > 0 && (
          <div className="border border-slate-100 rounded-2xl p-5 bg-slate-50">
            <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
              <FiTrendingUp className="w-4 h-4 text-violet-600" /> Tren Performa Tahunan
            </h3>
            <div className="flex items-end justify-around h-28 pt-4">
              {years.map(y => {
                const yearData = history.find(h => h.year === y);
                const score = yearData ? yearData.indeks : 0;
                const heightPercent = score ? `${score}%` : '5%';
                return (
                  <div key={y} className="flex flex-col items-center w-1/4 h-full justify-end">
                    {score > 0 ? (
                      <>
                        <span className="text-[10px] font-bold text-slate-700 mb-1">
                          {score}
                        </span>
                        <div 
                          className={`w-10 rounded-t-md transition-all duration-500 ${getScoreBarColor(score)}`}
                          style={{ height: `calc(${heightPercent} * 0.6)` }}
                        ></div>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400 mb-1">Tidak Ada Data</span>
                    )}
                    <span className="text-[10px] font-bold text-slate-400 mt-2 border-t border-slate-200 w-full text-center pt-1">
                      {y}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
