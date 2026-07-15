import  { useState } from 'react';

export default function ComparisonView({ currentYearData = [], onClose }) {
  const [selectA, setSelectA] = useState('');
  const [selectB, setSelectB] = useState('');

  const itemA = currentYearData.find(d => d.instansi_id === selectA || d.nama === selectA);
  const itemB = currentYearData.find(d => d.instansi_id === selectB || d.nama === selectB);

  const getScoreDiff = (valA, valB) => {
    const numA = parseFloat(valA || 0);
    const numB = parseFloat(valB || 0);
    const diff = (numA - numB).toFixed(2);
    if (diff > 0) return { text: `+${diff} (A Unggul)`, color: 'text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold' };
    if (diff < 0) return { text: `${diff} (B Unggul)`, color: 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded' };
    return { text: 'Sama', color: 'text-slate-400' };
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8 relative">
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold cursor-pointer transition-all"
      >
        ✕ Tutup
      </button>

      <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
        📊 Perbandingan Kinerja Instansi (Tahun {currentYearData[0]?.tahun || '2023'})
      </h3>

      {/* Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Pilih Instansi Pertama (A)</label>
          <select 
            value={selectA} 
            onChange={(e) => setSelectA(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 shadow-xs"
          >
            <option value="">-- Pilih Instansi A --</option>
            {currentYearData.map(d => (
              <option key={`a-${d.instansi_id || d.nama}`} value={d.instansi_id || d.nama}>
                {d.nama} (Skor: {d.indeks})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Pilih Instansi Kedua (B)</label>
          <select 
            value={selectB} 
            onChange={(e) => setSelectB(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 shadow-xs"
          >
            <option value="">-- Pilih Instansi B --</option>
            {currentYearData.map(d => (
              <option key={`b-${d.instansi_id || d.nama}`} value={d.instansi_id || d.nama}>
                {d.nama} (Skor: {d.indeks})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Comparison Grid */}
      {itemA && itemB ? (
        <div className="border border-slate-200 rounded-2xl bg-white shadow-xs overflow-hidden">
          <div className="grid grid-cols-3 gap-4 bg-slate-50/50 border-b border-slate-200 p-4 items-center">
            <div className="col-span-1 font-bold text-slate-800 text-xs md:text-sm text-left break-words">{itemA.nama}</div>
            <div className="col-span-1 font-bold text-slate-400 text-center text-[10px] tracking-widest uppercase">Komparasi</div>
            <div className="col-span-1 font-bold text-slate-800 text-xs md:text-sm text-right break-words">{itemB.nama}</div>
          </div>

          <div className="divide-y divide-slate-100 p-4 md:p-6 space-y-4">
            {/* Indeks SPI */}
            <div className="grid grid-cols-3 items-center">
              <div className="text-left font-black text-2xl md:text-3xl text-violet-700">{itemA.indeks}</div>
              <div className="text-center text-[10px] font-bold text-slate-400 tracking-wider">
                <span className="block mb-1">INDEKS SPI UTAMA</span>
                <span className={getScoreDiff(itemA.indeks, itemB.indeks).color}>
                  {getScoreDiff(itemA.indeks, itemB.indeks).text}
                </span>
              </div>
              <div className="text-right font-black text-2xl md:text-3xl text-violet-700">{itemB.indeks}</div>
            </div>

            {/* Internal */}
            <div className="grid grid-cols-3 pt-3 items-center">
              <div className="text-left font-semibold text-slate-700">{itemA.agregat?.internal || 0}</div>
              <div className="text-center text-[10px] font-bold text-slate-400 tracking-wider">
                <span className="block mb-1">SKOR INTERNAL</span>
                <span className={getScoreDiff(itemA.agregat?.internal, itemB.agregat?.internal).color}>
                  {getScoreDiff(itemA.agregat?.internal, itemB.agregat?.internal).text}
                </span>
              </div>
              <div className="text-right font-semibold text-slate-700">{itemB.agregat?.internal || 0}</div>
            </div>

            {/* Eksternal */}
            <div className="grid grid-cols-3 pt-3 items-center">
              <div className="text-left font-semibold text-slate-700">{itemA.agregat?.eksternal || 0}</div>
              <div className="text-center text-[10px] font-bold text-slate-400 tracking-wider">
                <span className="block mb-1">SKOR EKSTERNAL</span>
                <span className={getScoreDiff(itemA.agregat?.eksternal, itemB.agregat?.eksternal).color}>
                  {getScoreDiff(itemA.agregat?.eksternal, itemB.agregat?.eksternal).text}
                </span>
              </div>
              <div className="text-right font-semibold text-slate-700">{itemB.agregat?.eksternal || 0}</div>
            </div>

            {/* Eksper */}
            <div className="grid grid-cols-3 pt-3 items-center">
              <div className="text-left font-semibold text-slate-700">{itemA.agregat?.eksper || 0}</div>
              <div className="text-center text-[10px] font-bold text-slate-400 tracking-wider">
                <span className="block mb-1">SKOR EKSPER</span>
                <span className={getScoreDiff(itemA.agregat?.eksper, itemB.agregat?.eksper).color}>
                  {getScoreDiff(itemA.agregat?.eksper, itemB.agregat?.eksper).text}
                </span>
              </div>
              <div className="text-right font-semibold text-slate-700">{itemB.agregat?.eksper || 0}</div>
            </div>

            {/* Koreksi Integritas */}
            <div className="grid grid-cols-3 pt-3 items-center">
              <div className="text-left font-medium text-rose-600">-{itemA.koreksi?.integritas || 0}</div>
              <div className="text-center text-[10px] font-bold text-slate-400 tracking-wider">KOREKSI INTEGRITAS</div>
              <div className="text-right font-medium text-rose-600">-{itemB.koreksi?.integritas || 0}</div>
            </div>

            {/* Koreksi Prevalensi */}
            <div className="grid grid-cols-3 pt-3 items-center">
              <div className="text-left font-medium text-amber-600">-{itemA.koreksi?.prevalensi || 0}</div>
              <div className="text-center text-[10px] font-bold text-slate-400 tracking-wider">KOREKSI PREVALENSI</div>
              <div className="text-right font-medium text-amber-600">-{itemB.koreksi?.prevalensi || 0}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center p-6 bg-white border border-slate-200 rounded-xl text-slate-400 text-sm">
          💡 Silakan tentukan dua instansi pada pilihan di atas untuk memulai.
        </div>
      )}
    </div>
  );
}
