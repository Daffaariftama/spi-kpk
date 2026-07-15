import { useState, useEffect, useMemo } from 'react';
import MetricCard from './components/MetricCard';
import InstitutionDetail from './components/InstitutionDetail';
import ComparisonView from './components/ComparisonView';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { 
  FiSearch, 
  FiFilter, 
  FiDownload, 
  FiChevronLeft, 
  FiChevronRight, 
  FiEye
} from 'react-icons/fi';

function App() {
  const [allData, setAllData] = useState({ 2021: null, 2022: null, 2023: null, 2024: null, 2025: null });
  const [selectedYear, setSelectedYear] = useState(2025);
  const [searchInputValue, setSearchInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [sortBy, setSortBy] = useState('indeks-desc');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showCompare, setShowCompare] = useState(false);
  const [yearLoading, setYearLoading] = useState(false);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchInputValue);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInputValue]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [pageInputValue, setPageInputValue] = useState('1');

  // Fetch a single year lazily and cache it
  const fetchYear = async (year) => {
    try {
      const res = await fetch(`/${year}.json`);
      const data = await res.json();
      setAllData(prev => ({ ...prev, [year]: data }));
      return data;
    } catch (err) {
      console.error(`Gagal mengambil data SPI ${year}:`, err);
      setAllData(prev => ({ ...prev, [year]: [] }));
      return [];
    }
  };

  // Load on selected year change (lazy)
  useEffect(() => {
    const load = async () => {
      if (selectedYear === 'all') {
        // Fetch all uncached years in parallel
        const years = [2021, 2022, 2023, 2024, 2025];
        const missing = years.filter(y => allData[y] === null);
        if (missing.length === 0) return;
        setYearLoading(true);
        await Promise.all(missing.map(fetchYear));
        setYearLoading(false);
      } else {
        if (allData[selectedYear] !== null) return; // already cached
        setYearLoading(true);
        await fetchYear(selectedYear);
        setYearLoading(false);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  // Current selected data (supports 'all' to merge all years)
  const currentYearData = useMemo(() => {
    if (selectedYear === 'all') {
      return [
        ...(allData[2021] || []),
        ...(allData[2022] || []),
        ...(allData[2023] || []),
        ...(allData[2024] || []),
        ...(allData[2025] || [])
      ];
    }
    return allData[selectedYear] || [];
  }, [allData, selectedYear]);

  // Available levels for dropdown filter
  const availableLevels = useMemo(() => {
    const levels = currentYearData.map(d => d.map?.province_code === null ? 'lembaga' : d.map?.level).filter(Boolean);
    return ['all', ...Array.from(new Set(levels))];
  }, [currentYearData]);

  // Statistics calculation
  const stats = useMemo(() => {
    if (currentYearData.length === 0) return { avg: 0, highest: null, lowest: null, total: 0 };
    
    let sum = 0;
    let highest = currentYearData[0];
    let lowest = currentYearData[0];

    currentYearData.forEach(item => {
      sum += item.indeks;
      if (item.indeks > highest.indeks) highest = item;
      if (item.indeks < lowest.indeks) lowest = item;
    });

    return {
      avg: (sum / currentYearData.length).toFixed(2),
      highest,
      lowest,
      total: currentYearData.length
    };
  }, [currentYearData]);

  // Filtered and sorted data
  const filteredData = useMemo(() => {
    let result = [...currentYearData];

    // Search
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => 
        (item.nama && item.nama.toLowerCase().includes(q)) ||
        (item.instansi_id && item.instansi_id.toLowerCase().includes(q))
      );
    }

    // Level Filter
    if (selectedLevel !== 'all') {
      result = result.filter(item => {
        const category = item.map?.province_code === null ? 'lembaga' : item.map?.level;
        return category === selectedLevel;
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'indeks-desc') return b.indeks - a.indeks;
      if (sortBy === 'indeks-asc') return a.indeks - b.indeks;
      if (sortBy === 'nama-asc') return (a.nama || '').localeCompare(b.nama || '');
      if (sortBy === 'nama-desc') return (b.nama || '').localeCompare(a.nama || '');
      return 0;
    });

    return result;
  }, [currentYearData, searchQuery, selectedLevel, sortBy]);

  // Compute search suggestions
  const suggestions = useMemo(() => {
    if (searchInputValue.trim() === '') return [];
    const q = searchInputValue.toLowerCase();
    const matches = [];
    for (const item of currentYearData) {
      if (item.nama && item.nama.toLowerCase().includes(q)) {
        if (!matches.includes(item.nama)) {
          matches.push(item.nama);
        }
      }
      if (matches.length >= 8) break;
    }
    return matches;
  }, [currentYearData, searchInputValue]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredData.length / pageSize);
  }, [filteredData, pageSize]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedLevel, selectedYear, sortBy, pageSize]);

  // Export to Excel with custom year/mode choices
  const handleExport = async (exportOption) => {
    let rawData = [];
    let fileName = '';
    let sheetName = '';

    if (exportOption === 'current_filtered') {
      rawData = filteredData;
      fileName = `Data_SPI_Terfilter_Export.xlsx`;
      sheetName = 'Terfilter';
    } else if (exportOption === 'all') {
      // Fetch any uncached years first
      const years = [2021, 2022, 2023, 2024, 2025];
      const missing = years.filter(y => allData[y] === null);
      const fetched = await Promise.all(missing.map(fetchYear));
      // merge cached + freshly fetched
      const merged = years.map((y, i) => {
        const missingIdx = missing.indexOf(y);
        return missingIdx >= 0 ? fetched[missingIdx] : (allData[y] || []);
      });
      rawData = merged.flat();
      fileName = 'Data_SPI_Semua_Tahun_Export.xlsx';
      sheetName = 'Semua Tahun';
    } else {
      // Fetch if not yet cached
      const cached = allData[exportOption];
      rawData = cached !== null ? cached : await fetchYear(exportOption);
      fileName = `Data_SPI_Tahun_${exportOption}_Export.xlsx`;
      sheetName = `Tahun ${exportOption}`;
    }

    const dataToExport = rawData.map((item, idx) => ({
      'No.': idx + 1,
      'Tahun': item.tahun,
      'ID Instansi': item.instansi_id,
      'Nama Instansi': item.nama,
      'Indeks SPI': item.indeks,
      'Skor Internal': item.agregat?.internal || 0,
      'Skor Eksternal': item.agregat?.eksternal || 0,
      'Skor Eksper': item.agregat?.eksper || 0,
      'Koreksi Integritas': item.koreksi?.integritas || 0,
      'Koreksi Prevalensi': item.koreksi?.prevalensi || 0,
      'Kategori/Level': (item.map?.province_code === null ? 'lembaga' : item.map?.level) || 'lembaga'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, fileName);
    setShowDownloadDropdown(false);
  };

  // Status indicators next to index score
  const getScoreStatusBadge = (score) => {
    if (score >= 80) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> {score}
        </span>
      );
    }
    if (score >= 70) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> {score}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 border border-rose-100">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> {score}
      </span>
    );
  };

  return (
    <div className="min-h-screen pb-16 px-4 md:px-8 max-w-7xl mx-auto">
      {/* Top Navbar */}
      <nav className="flex justify-between items-center py-5 border-b border-slate-100 mb-8">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
            S
          </div>
          <span className="font-extrabold text-slate-800 text-lg tracking-tight">SPI Dashboard</span>
        </div>
        <div className="relative">
          <button 
            onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
            className="text-xs font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 border border-violet-100 cursor-pointer shadow-xs"
          >
            <FiDownload className="w-3.5 h-3.5" /> Unduh Laporan
          </button>
          
          {/* Download Selector Dropdown */}
          {showDownloadDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-xl shadow-lg z-30 py-2">
              <span className="block px-4 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">
                Pilih Tahun Laporan
              </span>
              {[2021, 2022, 2023, 2024, 2025].map(yr => (
                <button
                  key={yr}
                  onClick={() => handleExport(yr)}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Laporan Tahun {yr}
                </button>
              ))}
              <div className="border-t border-slate-50 my-1"></div>
              <button 
                onClick={() => handleExport('all')}
                className="w-full text-left px-4 py-2 text-xs font-bold text-violet-600 hover:bg-slate-50 cursor-pointer"
              >
                Semua Tahun (All Years)
              </button>
              <button 
                onClick={() => handleExport('current_filtered')}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-emerald-600 hover:bg-slate-50 cursor-pointer"
              >
                Sesuai Filter Saat Ini
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Main SaaS Hero */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white rounded-3xl p-6 md:p-10 mb-8 shadow-xl relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8 border border-indigo-900/40">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl"></div>

        <div className="z-10 max-w-xl text-left">
          <span className="inline-block bg-violet-500/10 text-violet-300 border border-violet-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
            🚀 Indeks Integritas Nasional
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight mb-4 text-white">
            Semua data penilaian integritas di satu tempat.
          </h2>
          <p className="text-sm md:text-base text-slate-300 leading-relaxed font-medium">
            Pantau secara transparan tingkat integritas, potensi suap/korupsi, dan koreksi tata kelola di berbagai lembaga negara RI secara instan dan efisien.
          </p>
        </div>

        {/* Hero Summary */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 w-full lg:w-96 text-left shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Rangkuman Kinerja</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">Nasional</span>
          </div>
          <div className="space-y-3.5">
            <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
              <span className="text-slate-300">Rata-Rata Indeks</span>
              <span className="font-bold text-white text-sm">{stats.avg}</span>
            </div>
            <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
              <span className="text-slate-300">Total Instansi</span>
              <span className="font-bold text-white text-sm">{stats.total}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300">Nilai Tertinggi</span>
              <span className="font-bold text-emerald-400 text-sm">{stats.highest?.indeks || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {yearLoading ? (
        /* ── Skeleton Loading UI ─────────────────────────────────── */
        <div className="animate-pulse">
          {/* Skeleton year select */}
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5 mb-8">
            <div className="h-3 w-28 bg-slate-100 rounded-full"></div>
            <div className="h-8 w-40 bg-slate-100 rounded-xl"></div>
          </div>

          {/* Skeleton metric cards — hidden on mobile */}
          <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col gap-3">
                <div className="h-3 w-16 bg-slate-200 rounded-full"></div>
                <div className="h-8 w-24 bg-slate-200 rounded-xl"></div>
                <div className="h-2 w-32 bg-slate-100 rounded-full"></div>
              </div>
            ))}
          </div>

          {/* Skeleton mobile metric card */}
          <div className="block sm:hidden bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100">
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex flex-col gap-2 py-2">
                  <div className="h-2 w-16 bg-slate-200 rounded-full"></div>
                  <div className="h-6 w-20 bg-slate-200 rounded-lg"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Skeleton search + filter bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="h-10 flex-1 bg-slate-100 rounded-xl"></div>
            <div className="h-10 w-36 bg-slate-100 rounded-xl"></div>
            <div className="h-10 w-36 bg-slate-100 rounded-xl"></div>
          </div>

          {/* Skeleton table */}
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
            <div className="h-10 bg-slate-50 border-b border-slate-100"></div>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-50 last:border-0">
                <div className="h-3 w-6 bg-slate-100 rounded-full shrink-0"></div>
                <div className="h-3 flex-1 bg-slate-100 rounded-full"></div>
                <div className="h-5 w-16 bg-slate-100 rounded-lg shrink-0 hidden sm:block"></div>
                <div className="h-6 w-14 bg-slate-100 rounded-lg shrink-0"></div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Year Switcher — select dropdown */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 border-b border-slate-100 pb-5 mb-8">
            <label htmlFor="year-select" className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">
              Tahun Evaluasi:
            </label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedYear(val === 'all' ? 'all' : Number(val));
              }}
              className="w-full sm:w-48 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 cursor-pointer transition-all appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236366f1' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
            >
              {[2021, 2022, 2023, 2024, 2025].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
              <option value="all">Semua Tahun</option>
            </select>
          </div>

          {/* Mobile Metrics Card (Single Card, 2x2 grid for mobile) */}
          <div className="block sm:hidden bg-white border border-slate-100 rounded-2xl p-4 mb-6 shadow-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="border-r border-b border-slate-100/50 pb-3 pr-2 text-left">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Indeks Rata-Rata</span>
                <span className="text-lg font-extrabold text-slate-800">📈 {stats.avg}</span>
                <span className="text-[8px] font-medium text-slate-400 block mt-0.5 truncate">Total: {stats.total} data</span>
              </div>
              <div className="border-b border-slate-100/50 pb-3 pl-2 text-left">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Skor Tertinggi</span>
                <span className="text-lg font-extrabold text-emerald-600">🏆 {stats.highest?.indeks || 0}</span>
                <span className="text-[8px] font-medium text-slate-400 block mt-0.5 truncate max-w-full" title={stats.highest?.nama}>{stats.highest?.nama}</span>
              </div>
              <div className="border-r border-slate-100/50 pt-3 pr-2 text-left">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Skor Terendah</span>
                <span className="text-lg font-extrabold text-rose-600">🚧 {stats.lowest?.indeks || 0}</span>
                <span className="text-[8px] font-medium text-slate-400 block mt-0.5 truncate max-w-full" title={stats.lowest?.nama}>{stats.lowest?.nama}</span>
              </div>
              <div className="pt-3 pl-2 text-left">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Lembaga</span>
                <span className="text-lg font-extrabold text-violet-600">🏛️ {stats.total}</span>
                <span className="text-[8px] font-medium text-slate-400 block mt-0.5">Kementerian & Pemda</span>
              </div>
            </div>
          </div>

          {/* Desktop/Tablet Metric Overview Grid */}
          <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <MetricCard 
              title="Indeks Rata-Rata" 
              value={stats.avg} 
              subtext={`Total: ${stats.total} instansi`} 
              color="bg-neo-cyan"
              iconType="trend"
            />
            <MetricCard 
              title="Skor Tertinggi" 
              value={stats.highest?.indeks || 0} 
              subtext={stats.highest?.nama || 'N/A'} 
              color="bg-neo-lime"
              iconType="award"
            />
            <MetricCard 
              title="Skor Terendah" 
              value={stats.lowest?.indeks || 0} 
              subtext={stats.lowest?.nama || 'N/A'} 
              color="bg-neo-pink"
              iconType="alert"
            />
            <MetricCard 
              title="Total Lembaga" 
              value={stats.total} 
              subtext="Kementerian & Pemda" 
              color="bg-neo-yellow"
              iconType="grid"
            />
          </div>

          {/* Controls Panel */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 mb-6 shadow-xs flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              {/* Search input with React icon */}
              <div className="relative w-full sm:w-80">
                <div className="relative flex items-center">
                  <FiSearch className="absolute left-3.5 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Cari nama instansi..."
                    value={searchInputValue}
                    onChange={(e) => {
                      setSearchInputValue(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 shadow-xs w-full"
                  />
                </div>

                {/* Suggestions List Popover */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute left-0 mt-2 w-full bg-white border border-slate-100 rounded-xl shadow-lg z-30 max-h-60 overflow-y-auto py-1">
                    {suggestions.map((item, idx) => (
                      <button
                        key={`suggestion-${idx}`}
                        type="button"
                        onClick={() => {
                          setSearchInputValue(item);
                          setShowSuggestions(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer block truncate"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Filter Level Dropdown */}
              <div className="relative flex items-center">
                <FiFilter className="absolute left-3.5 text-slate-400 w-4 h-4" />
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 shadow-xs cursor-pointer capitalize w-full"
                >
                  {availableLevels.map(lvl => (
                    <option key={lvl} value={lvl}>
                      {lvl === 'all' ? 'Semua Kategori' : lvl}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort By Selector */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 shadow-xs cursor-pointer w-full sm:w-auto"
              >
                <option value="indeks-desc">Urutkan: Skor Tertinggi</option>
                <option value="indeks-asc">Urutkan: Skor Terendah</option>
                <option value="nama-asc">Urutkan: Nama (A-Z)</option>
                <option value="nama-desc">Urutkan: Nama (Z-A)</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-2 w-full lg:w-auto justify-end">
              <button
                onClick={() => setShowCompare(!showCompare)}
                className={`btn-secondary text-xs ${showCompare ? 'bg-violet-50 border-violet-200 text-violet-700 font-bold' : ''}`}
              >
                ⚖️ {showCompare ? 'Tutup Perbandingan' : 'Bandingkan Instansi'}
              </button>
            </div>
          </div>

          {/* VS Mode Panel */}
          {showCompare && (
            <ComparisonView 
              currentYearData={currentYearData} 
              onClose={() => setShowCompare(false)} 
            />
          )}

          {/* Modern SaaS Table */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-4 px-5 w-12 text-center">No.</th>
                    <th className="py-4 px-5 w-20 text-center hidden sm:table-cell">Tahun</th>
                    <th className="py-4 px-5">Nama Instansi / Lembaga</th>
                    <th className="py-4 px-5 w-40 hidden sm:table-cell">Kategori</th>
                    <th className="py-4 px-5 w-32 text-center">Skor SPI</th>
                    <th className="py-4 px-5 w-28 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm text-slate-700">
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-400 font-medium">
                        Tidak ada data instansi yang cocok.
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((item, index) => {
                      const globalIndex = (currentPage - 1) * pageSize + index + 1;
                      return (
                        <tr 
                          key={`${item.instansi_id || item.nama}-${index}`} 
                          className="hover:bg-slate-50/40 transition-colors"
                        >
                          <td className="py-3.5 px-5 text-center font-semibold text-slate-400 text-xs">{globalIndex}</td>
                          <td className="py-3.5 px-5 text-center font-bold text-slate-500 hidden sm:table-cell">{item.tahun}</td>
                          <td className="py-3.5 px-5 font-bold text-slate-800 max-w-sm truncate" title={item.nama}>
                            {item.nama}
                          </td>
                          <td className="py-3.5 px-5 capitalize hidden sm:table-cell">
                            <span className="inline-block bg-slate-50 text-slate-500 px-2.5 py-0.5 rounded-lg text-xs border border-slate-100 font-semibold">
                              {(item.map?.province_code === null ? 'lembaga' : item.map?.level) || 'lembaga'}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 text-center">{getScoreStatusBadge(item.indeks)}</td>
                          <td className="py-3.5 px-5 text-center">
                            <button
                              onClick={() => setSelectedItem(item)}
                              className="text-xs font-bold text-violet-600 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1"
                            >
                              <FiEye className="w-3.5 h-3.5" /> Detail
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            {filteredData.length > 0 && (
              <div className="bg-slate-50/50 border-t border-slate-100 px-4 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Info - hidden on very small screens, shown inline on sm+ */}
                <div className="text-xs text-slate-500 font-semibold order-2 sm:order-1">
                  <span className="hidden sm:inline">Menampilkan </span>
                  <span className="text-slate-800">{((currentPage - 1) * pageSize) + 1}</span>–<span className="text-slate-800">{Math.min(currentPage * pageSize, filteredData.length)}</span>
                  <span className="hidden sm:inline"> dari </span><span className="sm:hidden"> / </span>
                  <span className="text-slate-800">{filteredData.length}</span>
                  <span className="hidden sm:inline"> instansi</span>
                </div>

                <div className="flex items-center gap-3 order-1 sm:order-2">
                  {/* Rows per page */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 font-bold hidden sm:inline">Baris:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); setPageInputValue('1'); }}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none cursor-pointer"
                    >
                      {[10, 25, 50, 100].map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>

                  {/* Prev / Manual Input / Next */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { const p = Math.max(1, currentPage - 1); setCurrentPage(p); setPageInputValue(String(p)); }}
                      disabled={currentPage === 1}
                      className="p-1.5 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 cursor-pointer transition-all"
                    >
                      <FiChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-1 px-1">
                      <input
                        type="number"
                        min="1"
                        max={totalPages}
                        value={pageInputValue}
                        onChange={(e) => setPageInputValue(e.target.value)}
                        onBlur={(e) => {
                          const val = Math.min(totalPages, Math.max(1, Number(e.target.value) || 1));
                          setCurrentPage(val);
                          setPageInputValue(String(val));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = Math.min(totalPages, Math.max(1, Number(pageInputValue) || 1));
                            setCurrentPage(val);
                            setPageInputValue(String(val));
                            e.target.blur();
                          }
                        }}
                        className="w-10 sm:w-12 text-center border border-slate-200 rounded-lg py-1 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 transition-all"
                      />
                      <span className="text-xs text-slate-400 font-semibold">/ {totalPages}</span>
                    </div>

                    <button
                      onClick={() => { const p = Math.min(totalPages, currentPage + 1); setCurrentPage(p); setPageInputValue(String(p)); }}
                      disabled={currentPage === totalPages}
                      className="p-1.5 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 cursor-pointer transition-all"
                    >
                      <FiChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Detail Modal Overlay */}
      {selectedItem && (
        <InstitutionDetail 
          item={selectedItem} 
          onClose={() => setSelectedItem(null)} 
          allData={allData}
        />
      )}
    </div>
  );
}

export default App;
