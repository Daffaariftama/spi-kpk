import { useState } from 'react';
import { FiX, FiActivity, FiShield, FiPercent, FiTrendingUp, FiLoader } from 'react-icons/fi';

const ALL_YEARS = [2021, 2022, 2023, 2024, 2025];

// ── Pure SVG Line Chart ────────────────────────────────────────────────────
function TrendChart({ history }) {
  if (history.length < 2) {
    return (
      <p className="text-xs text-slate-400 text-center py-6">
        Data minimal 2 tahun diperlukan untuk menampilkan grafik tren.
      </p>
    );
  }

  const W = 480, H = 140, PAD = { top: 20, right: 20, bottom: 32, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const scores = history.map(h => h.indeks);
  const minScore = Math.max(0, Math.min(...scores) - 5);
  const maxScore = Math.min(100, Math.max(...scores) + 5);
  const range = maxScore - minScore || 1;

  const toX = (i) => PAD.left + (i / (history.length - 1)) * innerW;
  const toY = (v) => PAD.top + innerH - ((v - minScore) / range) * innerH;

  const points = history.map((h, i) => `${toX(i)},${toY(h.indeks)}`).join(' ');
  const areaPoints = [
    `${toX(0)},${PAD.top + innerH}`,
    ...history.map((h, i) => `${toX(i)},${toY(h.indeks)}`),
    `${toX(history.length - 1)},${PAD.top + innerH}`,
  ].join(' ');

  // Color based on last vs first
  const trend = scores[scores.length - 1] - scores[0];
  const lineColor = trend >= 0 ? '#7c3aed' : '#e11d48';
  const areaColor = trend >= 0 ? '#7c3aed18' : '#e11d4812';

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ minWidth: 280 }}
        aria-label="Grafik tren indeks SPI tahunan"
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const y = PAD.top + innerH * (1 - t);
          const val = (minScore + range * t).toFixed(0);
          return (
            <g key={i}>
              <line
                x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y}
                stroke="#f1f5f9" strokeWidth="1"
              />
              <text x={PAD.left - 4} y={y + 3.5} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="600">
                {val}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <polygon points={areaPoints} fill={areaColor} />

        {/* Line */}
        <polyline points={points} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {/* Dots + labels */}
        {history.map((h, i) => {
          const cx = toX(i);
          const cy = toY(h.indeks);
          return (
            <g key={h.year}>
              <circle cx={cx} cy={cy} r="4.5" fill="white" stroke={lineColor} strokeWidth="2.5" />
              <text x={cx} y={cy - 9} textAnchor="middle" fontSize="9.5" fill="#1e293b" fontWeight="800">
                {h.indeks}
              </text>
              <text x={cx} y={PAD.top + innerH + 16} textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="700">
                {h.year}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function InstitutionDetail({ item, onClose, allData = {}, fetchYear }) {
  const [showTrend, setShowTrend] = useState(false);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendData, setTrendData] = useState(null); // null = not generated yet

  if (!item) return null;

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

  const handleShowTrend = async () => {
    if (showTrend) { setShowTrend(false); return; }

    setShowTrend(true);
    if (trendData !== null) return; // already generated

    setTrendLoading(true);

    // Find which years are not yet cached
    const missing = ALL_YEARS.filter(y => allData[y] === null || allData[y] === undefined);

    // Fetch missing years in parallel (fetchYear updates allData in App via setState)
    if (missing.length > 0 && fetchYear) {
      await Promise.all(missing.map(fetchYear));
    }

    // After fetch, build history from the freshly updated allData
    // Note: because fetchYear updates state in parent, allData here may still be stale snapshot.
    // We re-read from the fetched results directly by calling again:
    const history = [];
    for (const y of ALL_YEARS) {
      // Try allData first (may already be updated via closure), fallback to re-fetch
      let list = allData[y];
      if ((list === null || list === undefined) && fetchYear) {
        list = await fetchYear(y);
      }
      if (!list) continue;
      const match = list.find(
        d => d.nama === item.nama || (d.instansi_id && d.instansi_id === item.instansi_id)
      );
      if (match) history.push({ year: y, indeks: match.indeks });
    }

    setTrendData(history);
    setTrendLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div
        className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-8 shadow-2xl relative"
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
          <h2 className="text-xl md:text-3xl font-extrabold text-slate-900 leading-tight">
            {item.nama}
          </h2>
          <p className="text-sm font-semibold text-slate-400 mt-1">
            ID: {item.instansi_id || 'N/A'} · Data Tahun {item.tahun}
          </p>
        </div>

        {/* Highlight Stats */}
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

        {/* Breakdown */}
        <div className="border border-slate-100 rounded-2xl p-5 mb-6 bg-white shadow-xs">
          <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-50 pb-2">
            📊 Rincian Nilai Agregat
          </h3>
          <div className="space-y-4">
            {[
              { label: 'Skor Internal (Karyawan)', value: item.agregat?.internal, color: 'bg-violet-600' },
              { label: 'Skor Eksternal (Pengguna Layanan)', value: item.agregat?.eksternal, color: 'bg-indigo-500' },
              { label: 'Skor Eksper (Pihak Ketiga/Ahli)', value: item.agregat?.eksper, color: 'bg-blue-500' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                  <span>{label}</span>
                  <span className="font-extrabold text-slate-800">{value || '0'}</span>
                </div>
                <div className="w-full bg-slate-50 h-3 rounded-full overflow-hidden border border-slate-100">
                  <div
                    className={`${color} h-full rounded-full transition-all duration-300`}
                    style={{ width: `${Math.min(100, parseFloat(value || 0))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tren Tahunan ── */}
        <div className="border border-slate-100 rounded-2xl overflow-hidden">
          <button
            onClick={handleShowTrend}
            className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-violet-50 transition-all cursor-pointer group"
          >
            <span className="text-sm font-bold text-slate-700 group-hover:text-violet-700 flex items-center gap-2">
              <FiTrendingUp className="w-4 h-4 text-violet-500" />
              Tren Performa Tahunan
              {trendData && (
                <span className="text-[10px] font-bold bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full">
                  {trendData.length} tahun
                </span>
              )}
            </span>
            <span className="text-xs font-bold text-slate-400 group-hover:text-violet-500">
              {showTrend ? '▲ Sembunyikan' : '▼ Lihat Grafik'}
            </span>
          </button>

          {showTrend && (
            <div className="px-5 py-5 border-t border-slate-100">
              {trendLoading ? (
                /* Skeleton while fetching */
                <div className="animate-pulse space-y-3">
                  <div className="h-3 w-40 bg-slate-100 rounded-full" />
                  <div className="h-28 bg-slate-50 rounded-xl border border-slate-100" />
                  <div className="flex justify-around">
                    {ALL_YEARS.map(y => (
                      <div key={y} className="h-2 w-8 bg-slate-100 rounded-full" />
                    ))}
                  </div>
                </div>
              ) : trendData && trendData.length > 0 ? (
                <div>
                  {/* Summary pills */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {trendData.map((h, i) => {
                      const prev = trendData[i - 1];
                      const delta = prev ? (h.indeks - prev.indeks).toFixed(2) : null;
                      return (
                        <div key={h.year} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${getScoreBadgeColor(h.indeks)}`}>
                          <span>{h.year}</span>
                          <span className="font-black">{h.indeks}</span>
                          {delta !== null && (
                            <span className={parseFloat(delta) >= 0 ? 'text-emerald-600' : 'text-rose-500'}>
                              {parseFloat(delta) >= 0 ? `▲${delta}` : `▼${Math.abs(delta)}`}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <TrendChart history={trendData} />
                </div>
              ) : trendData && trendData.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  Instansi ini tidak ditemukan di tahun-tahun lain dalam data.
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
