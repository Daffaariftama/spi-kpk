import { useState, useMemo, useRef } from 'react';
import { FiSearch } from 'react-icons/fi';

// ── Reusable searchable combobox ─────────────────────────────────────────────
function InstansiSearch({ label, value, onChange, data, excludeValue }) {
  const [inputVal, setInputVal] = useState(value ? (data.find(d => (d.instansi_id || d.nama) === value)?.nama || '') : '');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const filtered = useMemo(() => {
    const q = inputVal.trim().toLowerCase();
    if (!q) return [];
    return data
      .filter(d => d.nama && d.nama.toLowerCase().includes(q) && (d.instansi_id || d.nama) !== excludeValue)
      .slice(0, 10);
  }, [inputVal, data, excludeValue]);

  const handleSelect = (item) => {
    setInputVal(item.nama);
    onChange(item.instansi_id || item.nama);
    setOpen(false);
  };

  const handleClear = () => {
    setInputVal('');
    onChange('');
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{label}</label>
      <div className="relative flex items-center">
        <FiSearch className="absolute left-3 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
        <input
          type="text"
          value={inputVal}
          placeholder="Ketik nama instansi..."
          onChange={(e) => { setInputVal(e.target.value); setOpen(true); if (!e.target.value) onChange(''); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all"
        />
        {inputVal && (
          <button
            type="button"
            onMouseDown={handleClear}
            className="absolute right-3 text-slate-300 hover:text-slate-500 text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown suggestions */}
      {open && filtered.length > 0 && (
        <div className="absolute left-0 top-full mt-1 w-full bg-white border border-slate-100 rounded-xl shadow-xl z-40 max-h-52 overflow-y-auto py-1">
          {filtered.map((item, idx) => {
            const category = item.map?.province_code === null ? 'lembaga' : item.map?.level;
            return (
              <button
                key={`${item.instansi_id || item.nama}-${idx}`}
                type="button"
                onMouseDown={() => handleSelect(item)}
                className="w-full text-left px-4 py-2.5 hover:bg-violet-50 cursor-pointer flex items-center justify-between gap-2 group"
              >
                <span className="text-sm font-semibold text-slate-700 group-hover:text-violet-700 truncate">{item.nama}</span>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 group-hover:bg-violet-100 group-hover:text-violet-600 px-2 py-0.5 rounded-full shrink-0 capitalize">
                  {category || 'lembaga'} · {item.indeks}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {open && inputVal.trim().length > 0 && filtered.length === 0 && (
        <div className="absolute left-0 top-full mt-1 w-full bg-white border border-slate-100 rounded-xl shadow-xl z-40 py-4 text-center">
          <p className="text-xs text-slate-400 font-semibold">Tidak ditemukan</p>
        </div>
      )}

      {/* Selected badge */}
      {value && (
        <div className="mt-1.5 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-violet-500 inline-block"></span>
          <span className="text-[10px] font-bold text-violet-600 truncate max-w-full">Terpilih</span>
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
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
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 md:p-6 mb-8 relative">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold cursor-pointer transition-all"
      >
        ✕ Tutup
      </button>

      <h3 className="text-base font-bold text-slate-900 mb-5 flex items-center gap-2">
        ⚖️ Perbandingan Kinerja Instansi
        <span className="text-xs font-semibold text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded-lg">
          {currentYearData[0]?.tahun || '—'}
        </span>
      </h3>

      {/* Searchable selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <InstansiSearch
          label="Instansi A"
          value={selectA}
          onChange={setSelectA}
          data={currentYearData}
          excludeValue={selectB}
        />
        <InstansiSearch
          label="Instansi B"
          value={selectB}
          onChange={setSelectB}
          data={currentYearData}
          excludeValue={selectA}
        />
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
                <span className="block mb-1">INDEKS SPI</span>
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
          💡 Ketik dan pilih dua instansi pada kolom pencarian di atas untuk memulai perbandingan.
        </div>
      )}
    </div>
  );
}
