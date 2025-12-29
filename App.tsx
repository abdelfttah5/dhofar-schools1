import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  MapPin, Phone, Search, Filter, Menu, X, CheckCircle, 
  Navigation, School as SchoolIcon, Star, Info, MessageSquare, 
  BarChart3, Globe, ExternalLink, Moon, Sun, Download, ChevronRight,
  Send, Sparkles, LayoutGrid, ListFilter, GraduationCap, Map, Share2, Home, Copy
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { School, Wilayat, SchoolType, Gender, FilterState, Shift } from './types';
import { schoolsData } from './data';
import { askGeminiAdvisor } from './services/geminiService';

// Declare Leaflet globally since it is loaded via script tag
declare global {
  interface Window {
    L: any;
  }
}

// --- Components ---

const Badge = ({ children, color, icon: Icon }: { children?: React.ReactNode, color: string, icon?: any }) => (
  <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${color}`}>
    {Icon && <Icon className="w-3 h-3" />}
    {children}
  </span>
);

const StatCard = ({ label, value, icon: Icon, subLabel, colorClass, onClick, isActive }: { label: string, value: number, icon: any, subLabel?: string, colorClass: string, onClick?: () => void, isActive?: boolean }) => (
  <div 
    onClick={onClick}
    className={`p-6 rounded-3xl border flex flex-col items-center justify-center text-center transition-all duration-300 cursor-pointer group
      ${isActive 
        ? 'bg-[#1e293b] border-dhofar-500 shadow-[0_0_20px_rgba(34,197,94,0.2)] scale-105' 
        : 'bg-[#1e293b] border-[#334155] hover:border-[#475569] hover:-translate-y-1'
      }
    `}
  >
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors ${colorClass} bg-opacity-20`}>
      <Icon className={`w-7 h-7 ${colorClass.replace('bg-', 'text-')}`} />
    </div>
    <div className="text-4xl font-black text-white mb-2 group-hover:scale-110 transition-transform">{value}</div>
    <div className="text-sm font-bold text-gray-300">{label}</div>
    {subLabel && <div className="text-xs text-gray-500 mt-1">{subLabel}</div>}
  </div>
);

const SchoolCard: React.FC<{ school: School, onSelect: (s: School) => void, onMap: (s: School) => void }> = ({ school, onSelect, onMap }) => {
  return (
    <div 
      className="group bg-[#1e293b] rounded-3xl border border-[#334155] shadow-sm hover:shadow-xl hover:border-dhofar-500/50 transition-all duration-300 flex flex-col h-full overflow-hidden animate-slide-up"
    >
      <div className="p-6 flex-1 cursor-pointer" onClick={() => onSelect(school)}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-md bg-[#334155] text-gray-300 text-[10px] font-bold tracking-wider uppercase">
                {school.wilayat}
              </span>
              {school.isVerified && (
                <CheckCircle className="w-4 h-4 text-blue-500" />
              )}
            </div>
            <h3 className="text-xl font-bold text-white leading-tight group-hover:text-dhofar-400 transition-colors">
              {school.name}
            </h3>
          </div>
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
            school.qualityScore >= 4 
            ? 'border-green-800 bg-green-900/20 text-green-400' 
            : 'border-slate-600 bg-slate-700 text-gray-400'
          }`}>
            {school.qualityScore}
          </div>
        </div>

        <p className="text-gray-400 text-sm flex items-center gap-1.5 mb-5">
          <MapPin className="w-4 h-4 text-gray-500" />
          {school.area || 'المركز'}
        </p>

        <div className="flex flex-wrap gap-2">
          <Badge color="bg-dhofar-900/20 border-dhofar-800 text-dhofar-300">
            {school.type}
          </Badge>
          <Badge color="bg-slate-800 border-slate-700 text-slate-300">
            {school.grades}
          </Badge>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-[#334155] bg-[#0f172a]/30 flex items-center gap-3">
        <button 
          onClick={(e) => { e.stopPropagation(); onMap(school); }}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#334155] border border-[#475569] text-gray-200 text-sm font-bold hover:bg-dhofar-900/30 hover:text-dhofar-400 hover:border-dhofar-500/50 transition-all"
        >
          <Navigation className="w-4 h-4" />
          <span className="hidden sm:inline">الخريطة</span>
        </button>
        {school.contact?.phone ? (
           <a 
             href={`tel:${school.contact.phone}`}
             onClick={(e) => e.stopPropagation()}
             className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-dhofar-600 text-white text-sm font-bold hover:bg-dhofar-700 shadow-lg shadow-dhofar-600/20 hover:shadow-dhofar-600/30 transition-all"
           >
             <Phone className="w-4 h-4" />
             <span className="hidden sm:inline">اتصال</span>
           </a>
        ) : (
          <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#334155] text-gray-500 text-sm font-bold cursor-not-allowed opacity-70">
             <Phone className="w-4 h-4" />
             <span className="hidden sm:inline">غير متاح</span>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Interactive Leaflet Map Component (Google Maps Styled) ---
const DhofarMap = ({ schools, onSelect }: { schools: School[], onSelect: (s: School) => void }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);

  // Initialize Map (Runs once)
  useEffect(() => {
    // Wait for Leaflet to load
    const checkForLeaflet = setInterval(() => {
        if (window.L && mapContainerRef.current && !mapInstanceRef.current) {
            clearInterval(checkForLeaflet);
            
            // Initialize Map
            const map = window.L.map(mapContainerRef.current, {
                zoomControl: false,
                attributionControl: false
            }).setView([17.0150, 54.0920], 11); // Start focused on Salalah

            // Add Zoom Control
            window.L.control.zoom({ position: 'bottomleft' }).addTo(map);

            // Use Google Maps Hybrid Tiles (Satellite + Labels)
            window.L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
                maxZoom: 20,
                attribution: '© Google Maps'
            }).addTo(map);

            mapInstanceRef.current = map;
            markersLayerRef.current = window.L.layerGroup().addTo(map);

            // Fix for map not rendering correctly until resize
            setTimeout(() => {
                map.invalidateSize();
            }, 200);
        }
    }, 100);

    return () => {
        clearInterval(checkForLeaflet);
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }
    };
  }, []);

  // Update Markers (Runs when schools change)
  useEffect(() => {
    // Need to wait for map instance
    const updateInterval = setInterval(() => {
        if (mapInstanceRef.current && markersLayerRef.current) {
            clearInterval(updateInterval);

            // Clear existing markers
            markersLayerRef.current.clearLayers();
            const bounds = window.L.latLngBounds([]);

            schools.filter(s => s.coordinates).forEach(school => {
                if (!school.coordinates) return;

                // Marker Colors
                const markerColor = school.type === SchoolType.GOVERNMENT ? '#22c55e' : (school.type === SchoolType.PRIVATE ? '#f59e0b' : '#3b82f6');
                
                // Pulsing Icon CSS
                const customIcon = window.L.divIcon({
                    className: 'custom-div-icon',
                    html: `
                        <div style="position: relative; width: 20px; height: 20px;">
                            <div style="
                                position: absolute;
                                top: 0; left: 0; right: 0; bottom: 0;
                                background-color: ${markerColor};
                                border-radius: 50%;
                                opacity: 0.4;
                                animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
                            "></div>
                            <div style="
                                position: absolute;
                                top: 4px; left: 4px; width: 12px; height: 12px;
                                background-color: ${markerColor};
                                border: 2px solid white;
                                border-radius: 50%;
                                box-shadow: 0 0 10px rgba(0,0,0,0.5);
                            "></div>
                        </div>
                    `,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                });

                const marker = window.L.marker([school.coordinates!.lat, school.coordinates!.lng], { icon: customIcon })
                    .bindPopup(`
                        <div dir="rtl" style="font-family: 'Tajawal', sans-serif; text-align: right; min-width: 150px;">
                            <h3 style="margin: 0 0 5px 0; font-size: 16px; font-weight: 800; color: #fff;">${school.name}</h3>
                            <p style="margin: 0; font-size: 12px; color: #cbd5e1;">${school.area || school.wilayat}</p>
                            <span style="
                                display: inline-block; 
                                margin-top: 8px; 
                                padding: 2px 8px; 
                                background: ${markerColor}20; 
                                border: 1px solid ${markerColor}; 
                                color: ${markerColor}; 
                                border-radius: 4px; 
                                font-size: 10px; 
                                font-weight: bold;
                            ">${school.type}</span>
                        </div>
                    `);

                marker.on('click', () => onSelect(school));
                markersLayerRef.current.addLayer(marker);
                bounds.extend([school.coordinates!.lat, school.coordinates!.lng]);
            });

            // Fit bounds
            if (schools.length > 0 && bounds.isValid()) {
                mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
            } else {
                mapInstanceRef.current.setView([17.0150, 54.0920], 11);
            }
        }
    }, 100);

    return () => clearInterval(updateInterval);
  }, [schools, onSelect]);

  return (
    <div className="w-full h-[60vh] md:h-[80vh] bg-[#1e293b] rounded-3xl relative overflow-hidden border border-[#334155] shadow-2xl group z-0">
      <style>{`
        @keyframes ping {
            75%, 100% {
                transform: scale(2);
                opacity: 0;
            }
        }
      `}</style>
      <div ref={mapContainerRef} className="absolute inset-0 z-10 bg-slate-900" id="map-container"></div>
      
      {/* Map Overlay Info */}
      <div className="absolute bottom-6 right-6 bg-black/80 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 z-[500] max-w-[200px] text-right shadow-xl">
         <p className="text-xs font-bold text-gray-300 mb-2">مفتاح الخريطة:</p>
         <div className="flex items-center justify-end gap-2 mb-1">
           <span className="text-[10px] text-gray-400">حكومي</span>
           <div className="w-3 h-3 rounded-full bg-green-500 border border-white"></div>
         </div>
         <div className="flex items-center justify-end gap-2 mb-1">
           <span className="text-[10px] text-gray-400">خاص</span>
           <div className="w-3 h-3 rounded-full bg-amber-500 border border-white"></div>
         </div>
         <div className="flex items-center justify-end gap-2">
           <span className="text-[10px] text-gray-400">روضة</span>
           <div className="w-3 h-3 rounded-full bg-blue-500 border border-white"></div>
         </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  // Always dark mode for this specific UI request
  const darkMode = true;

  // State
  const [schools, setSchools] = useState<School[]>(schoolsData);
  const [filters, setFilters] = useState<FilterState>({
    query: '',
    wilayat: 'All',
    type: 'All',
    gender: 'All'
  });
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'map' | 'stats' | 'gemini'>('list');
  const [showResults, setShowResults] = useState(false); 
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };
  
  const handleShareApp = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      const url = window.location.origin + window.location.pathname;
      navigator.clipboard.writeText(url).then(() => {
          showToast("تم نسخ رابط التطبيق بنجاح!");
      }).catch(err => {
          showToast("فشل النسخ، يرجى النسخ يدوياً");
      });
    } else {
      showToast("المتصفح لا يدعم النسخ التلقائي");
    }
  };

  const handleShareSchool = (school: School) => {
    const url = new URL(window.location.href);
    url.searchParams.set('schoolId', school.id);
    const urlString = url.toString();

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(urlString).then(() => {
        showToast(`تم نسخ رابط ${school.name}`);
      }).catch(err => {
         showToast("فشل النسخ، يرجى النسخ يدوياً");
      });
    } else {
      showToast("المتصفح لا يدعم النسخ التلقائي");
    }
  };

  // --- Deep Link Effect ---
  // Checks URL params on load to open a specific school
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedId = params.get('schoolId');
    if (sharedId) {
      const school = schoolsData.find(s => s.id === sharedId);
      if (school) {
        setSelectedSchool(school);
        // Optionally switch to list view if not already
        setActiveTab('list');
      }
    }
  }, []);

  // --- Update URL on Selection ---
  useEffect(() => {
    if (selectedSchool) {
       const url = new URL(window.location.href);
       url.searchParams.set('schoolId', selectedSchool.id);
       window.history.pushState({}, '', url);
    } else {
       const url = new URL(window.location.href);
       url.searchParams.delete('schoolId');
       window.history.pushState({}, '', url);
    }
  }, [selectedSchool]);


  // Derived State (Filtered Schools with SORTING)
  const filteredSchools = useMemo(() => {
    // 1. Filter
    const list = schools.filter(school => {
      const matchesQuery = school.name.includes(filters.query) || school.area?.includes(filters.query);
      const matchesWilayat = filters.wilayat === 'All' || school.wilayat === filters.wilayat;
      const matchesType = filters.type === 'All' || school.type === filters.type;
      const matchesGender = filters.gender === 'All' || school.gender === filters.gender;
      return matchesQuery && matchesWilayat && matchesType && matchesGender;
    });

    // 2. Sort Logic for Better Search Experience
    // Priority: Exact Match > Starts With > Contains
    if (filters.query) {
      return list.sort((a, b) => {
        const query = filters.query.trim();
        
        const aExact = a.name === query;
        const bExact = b.name === query;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        const aStart = a.name.startsWith(query);
        const bStart = b.name.startsWith(query);
        if (aStart && !bStart) return -1;
        if (!aStart && bStart) return 1;

        return 0;
      });
    }

    return list;
  }, [schools, filters]);

  // Statistics Counts
  const stats = useMemo(() => ({
    total: schools.length,
    salalah: schools.filter(s => s.wilayat === Wilayat.SALALAH).length,
    thumrait: schools.filter(s => s.wilayat === Wilayat.THUMRAIT).length,
    rakhyut: schools.filter(s => s.wilayat === Wilayat.RAKHYUT).length,
  }), [schools]);

  // Chart Data
  const chartData = useMemo(() => {
    const typeCount = filteredSchools.reduce((acc, curr) => {
      acc[curr.type] = (acc[curr.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.keys(typeCount).map(key => ({ name: key, value: typeCount[key] }));
  }, [filteredSchools]);

  const COLORS = ['#22c55e', '#f59e0b', '#3b82f6', '#ef4444'];

  // Handlers
  const handleStatClick = (wilayat: Wilayat | 'All') => {
    setFilters(prev => ({ ...prev, wilayat: wilayat }));
    setShowResults(true);
    // Switch to list view if not already
    setActiveTab('list');
    setTimeout(() => {
      // Small delay to allow render
      const el = document.getElementById('results-section');
      el?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleOpenMap = (school: School) => {
    const query = encodeURIComponent(`${school.name} ${school.wilayat} سلطنة عمان`);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    window.open(url, '_blank');
  };

  const toggleFilter = (type: keyof FilterState, value: any) => {
    setFilters(prev => ({
      ...prev,
      [type]: prev[type] === value ? 'All' : value
    }));
    setShowResults(true);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({...prev, query: e.target.value}));
    if (e.target.value.length > 0) setShowResults(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0f172a] text-white font-sans overflow-x-hidden pb-24 md:pb-0">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[1000] bg-dhofar-600 text-white px-6 py-3 rounded-full shadow-2xl animate-fade-in flex items-center gap-2 font-bold w-max max-w-[90vw]">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0f172a]/90 backdrop-blur-xl border-b border-[#1e293b]">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <button onClick={handleShareApp} className="p-2.5 rounded-xl border border-[#334155] bg-[#1e293b] text-dhofar-400 hover:bg-[#334155] transition-colors" title="مشاركة التطبيق">
               <Share2 className="w-5 h-5" />
             </button>
             <div className="hidden md:flex bg-[#1e293b] p-1 rounded-xl border border-[#334155]">
               <button onClick={() => setActiveTab('list')} className={`px-4 py-1.5 rounded-lg text-sm font-bold ${activeTab === 'list' ? 'bg-[#334155] text-white' : 'text-gray-400'}`}>الرئيسية</button>
               <button onClick={() => setActiveTab('map')} className={`px-4 py-1.5 rounded-lg text-sm font-bold ${activeTab === 'map' ? 'bg-[#334155] text-white' : 'text-gray-400'}`}>الخريطة</button>
               <button onClick={() => setActiveTab('stats')} className={`px-4 py-1.5 rounded-lg text-sm font-bold ${activeTab === 'stats' ? 'bg-[#334155] text-white' : 'text-gray-400'}`}>الإحصائيات</button>
             </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <h1 className="text-lg font-bold text-white leading-none mb-1">مدارس محافظة ظفار</h1>
              <span className="text-[10px] text-gray-400 font-medium tracking-wide block">دليل المدارس الشامل</span>
            </div>
            <div className="w-10 h-10 bg-dhofar-600 rounded-xl flex items-center justify-center shadow-lg shadow-dhofar-600/20">
              <span className="text-white font-black text-xl">م</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative w-full max-w-7xl mx-auto px-4 lg:px-8 py-8 md:py-12">
        
        {/* VIEW: DASHBOARD / LIST */}
        {activeTab === 'list' && (
          <>
            {/* Hero & Search Section */}
            <div className="text-center space-y-10 mb-12 md:mb-16">
                <div className="space-y-4 animate-slide-up">
                  <h1 className="text-4xl md:text-7xl font-black text-white tracking-tighter">
                    مدارس محافظة <span className="text-dhofar-500 relative inline-block">
                      ظفار
                      <svg className="absolute w-full h-3 -bottom-1 right-0 text-dhofar-500 opacity-40" viewBox="0 0 200 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.00025 6.99997C25.7538 4.67323 131.979 -2.33333 198 2.00001" stroke="currentColor" strokeWidth="3"/></svg>
                    </span>
                  </h1>
                  {/* Updated Text */}
                  <p className="text-lg md:text-2xl text-gray-300 max-w-2xl mx-auto font-bold leading-relaxed px-4">
                    اكتشف مدارس محافظة ظفار
                  </p>
                </div>

                {/* Search Bar */}
                <div className="max-w-3xl mx-auto relative group z-10 animate-slide-up px-2" style={{animationDelay: '0.1s'}}>
                  <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none">
                    <Search className="w-6 h-6 text-gray-400 group-focus-within:text-dhofar-500 transition-colors" />
                  </div>
                  <input 
                    type="text" 
                    className="w-full h-14 md:h-16 pr-12 md:pr-14 pl-6 rounded-2xl bg-[#1e293b] border border-[#334155] focus:border-dhofar-500 focus:ring-1 focus:ring-dhofar-500 text-base md:text-lg text-white placeholder:text-gray-500 transition-all"
                    placeholder="ابحث عن مدرسة بالاسم أو المنطقة..."
                    value={filters.query}
                    onChange={handleSearch}
                  />
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap justify-center gap-2 md:gap-3 animate-slide-up px-2" style={{animationDelay: '0.2s'}}>
                  <button onClick={() => toggleFilter('type', SchoolType.GOVERNMENT)} className={`flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-full text-xs md:text-sm font-bold transition-all border ${filters.type === SchoolType.GOVERNMENT ? 'bg-[#334155] border-dhofar-500 text-white' : 'bg-[#1e293b] border-[#334155] text-gray-400 hover:border-gray-500'}`}>
                      🎓 حكومي
                  </button>
                  <button onClick={() => toggleFilter('type', SchoolType.PRIVATE)} className={`flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-full text-xs md:text-sm font-bold transition-all border ${filters.type === SchoolType.PRIVATE ? 'bg-[#334155] border-dhofar-500 text-white' : 'bg-[#1e293b] border-[#334155] text-gray-400 hover:border-gray-500'}`}>
                      🏫 خاص
                  </button>
                  <button onClick={() => toggleFilter('type', SchoolType.KINDERGARTEN)} className={`flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-full text-xs md:text-sm font-bold transition-all border ${filters.type === SchoolType.KINDERGARTEN ? 'bg-[#334155] border-dhofar-500 text-white' : 'bg-[#1e293b] border-[#334155] text-gray-400 hover:border-gray-500'}`}>
                      👶 روضة
                  </button>
                </div>
            </div>

            {/* Stats Grid - Reordered: Salalah (Right), Thumrait, Rakhyut, Total */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 animate-slide-up px-2" style={{animationDelay: '0.3s'}}>
                <StatCard 
                  label="صلالة" 
                  value={stats.salalah} 
                  icon={MapPin} 
                  colorClass="bg-teal-500 text-teal-400" 
                  subLabel="المركز والنيابات"
                  onClick={() => handleStatClick(Wilayat.SALALAH)}
                  isActive={filters.wilayat === Wilayat.SALALAH}
                />
                <StatCard 
                  label="ثمريت" 
                  value={stats.thumrait} 
                  icon={MapPin} 
                  colorClass="bg-amber-500 text-amber-400" 
                  subLabel="والبادية"
                  onClick={() => handleStatClick(Wilayat.THUMRAIT)}
                  isActive={filters.wilayat === Wilayat.THUMRAIT}
                />
                <StatCard 
                  label="رخيوت" 
                  value={stats.rakhyut} 
                  icon={MapPin} 
                  colorClass="bg-indigo-500 text-indigo-400" 
                  subLabel="والجبال"
                  onClick={() => handleStatClick(Wilayat.RAKHYUT)}
                  isActive={filters.wilayat === Wilayat.RAKHYUT}
                />
                 <StatCard 
                  label="إجمالي المدارس" 
                  value={stats.total} 
                  icon={SchoolIcon} 
                  colorClass="bg-dhofar-500 text-dhofar-400" 
                  subLabel="في قاعدة البيانات"
                  onClick={() => handleStatClick('All')}
                  isActive={filters.wilayat === 'All'}
                />
            </div>

            {/* Results Section */}
            {showResults && (
              <div id="results-section" className="mt-16 animate-fade-in px-2">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                      <LayoutGrid className="w-6 h-6 text-dhofar-500" />
                      قائمة المدارس <span className="text-base font-normal text-gray-400 bg-[#1e293b] px-3 py-1 rounded-full">{filteredSchools.length}</span>
                    </h2>
                    {filters.wilayat !== 'All' && (
                      <button onClick={() => setFilters(prev => ({...prev, wilayat: 'All'}))} className="text-sm text-dhofar-400 hover:text-dhofar-300">
                        عرض الكل
                      </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredSchools.map(school => (
                    <SchoolCard key={school.id} school={school} onSelect={setSelectedSchool} onMap={handleOpenMap} />
                  ))}
                </div>

                {filteredSchools.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center bg-[#1e293b] rounded-3xl border border-dashed border-[#334155]">
                    <div className="bg-[#334155] p-4 rounded-full mb-4">
                      <Search className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">لا توجد مدارس مطابقة</h3>
                    <button 
                      onClick={() => setFilters({ query: '', wilayat: 'All', type: 'All', gender: 'All' })}
                      className="text-dhofar-400 font-bold hover:underline text-sm mt-2"
                    >
                      عرض جميع المدارس
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* VIEW: MAP */}
        {activeTab === 'map' && (
          <div className="animate-fade-in space-y-6">
            <h2 className="text-2xl font-bold text-white mb-4 px-2">خريطة المدارس</h2>
            <DhofarMap schools={filteredSchools} onSelect={setSelectedSchool} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6 px-2">
               {filteredSchools.slice(0, 6).map(school => (
                 <SchoolCard key={school.id} school={school} onSelect={setSelectedSchool} onMap={handleOpenMap} />
               ))}
            </div>
          </div>
        )}

        {/* VIEW: STATS */}
        {activeTab === 'stats' && (
          <div className="animate-fade-in max-w-4xl mx-auto px-2">
            <h2 className="text-2xl font-bold text-white mb-8 text-center">إحصائيات المدارس</h2>
            <div className="bg-[#1e293b] rounded-3xl p-8 border border-[#334155]">
              <div className="h-[300px] md:h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={2} stroke="#1e293b" />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#0f172a', color: '#fff' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center mt-6 text-gray-400 text-sm">
                توزيع المدارس حسب النوع (حكومي، خاص، روضة) بناءً على الفلتر الحالي.
              </div>
            </div>
          </div>
        )}

      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1e293b]/90 backdrop-blur-lg border-t border-[#334155] pb-safe z-50">
        <div className="flex justify-around items-center p-2">
          <button 
            onClick={() => setActiveTab('list')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'list' ? 'text-dhofar-500 bg-dhofar-500/10' : 'text-gray-400 hover:text-gray-300'}`}
          >
            <Home className="w-6 h-6" />
            <span className="text-[10px] font-bold">الرئيسية</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('map')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'map' ? 'text-dhofar-500 bg-dhofar-500/10' : 'text-gray-400 hover:text-gray-300'}`}
          >
            <Map className="w-6 h-6" />
            <span className="text-[10px] font-bold">الخريطة</span>
          </button>

          <button 
            onClick={() => setActiveTab('stats')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'stats' ? 'text-dhofar-500 bg-dhofar-500/10' : 'text-gray-400 hover:text-gray-300'}`}
          >
            <BarChart3 className="w-6 h-6" />
            <span className="text-[10px] font-bold">الإحصائيات</span>
          </button>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedSchool && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm transition-opacity animate-fade-in" onClick={() => setSelectedSchool(null)}>
          <div className="bg-[#1e293b] w-full max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl transform transition-transform animate-slide-up border border-[#334155]" onClick={e => e.stopPropagation()}>
            
            <div className="relative h-36 bg-dhofar-800 overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-t from-[#1e293b] to-transparent z-10"></div>
               <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
               
               <button onClick={() => setSelectedSchool(null)} className="absolute top-4 left-4 z-20 bg-black/40 text-white p-2 rounded-full hover:bg-black/60 backdrop-blur-sm transition-colors">
                <X className="w-5 h-5" />
              </button>

               {/* Add Share Button in Modal Header */}
               <button 
                 onClick={(e) => { e.stopPropagation(); handleShareSchool(selectedSchool); }} 
                 className="absolute top-4 right-4 z-20 bg-black/40 text-white p-2 rounded-full hover:bg-black/60 backdrop-blur-sm transition-colors"
                 title="مشاركة المدرسة"
               >
                 <Share2 className="w-5 h-5" />
               </button>
            </div>

            <div className="px-6 pb-8 -mt-16 relative z-20">
              <div className="bg-[#0f172a] rounded-3xl shadow-xl p-6 border border-[#334155] mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-extrabold text-white mb-2">{selectedSchool.name}</h2>
                    <p className="text-gray-400 flex items-center gap-1.5 text-sm font-medium">
                      <MapPin className="w-4 h-4 text-dhofar-500" />
                      {selectedSchool.wilayat}، {selectedSchool.area || 'المركز'}
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-dhofar-900/50 rounded-2xl flex items-center justify-center text-dhofar-400 shadow-sm border border-dhofar-900">
                    <SchoolIcon className="w-8 h-8" />
                  </div>
                </div>
              </div>

              <div className="space-y-6 max-h-[50vh] overflow-y-auto custom-scrollbar px-1">
                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3">
                   <div className="bg-[#334155]/50 p-4 rounded-2xl border border-[#475569]">
                     <p className="text-xs font-bold text-gray-400 mb-1">المرحلة الدراسية</p>
                     <p className="font-bold text-gray-100">{selectedSchool.grades}</p>
                   </div>
                   <div className="bg-[#334155]/50 p-4 rounded-2xl border border-[#475569]">
                     <p className="text-xs font-bold text-gray-400 mb-1">الجنس</p>
                     <p className="font-bold text-gray-100">{selectedSchool.gender}</p>
                   </div>
                   <div className="bg-[#334155]/50 p-4 rounded-2xl border border-[#475569]">
                     <p className="text-xs font-bold text-gray-400 mb-1">وقت الدوام</p>
                     <p className="font-bold text-gray-100">{selectedSchool.shift}</p>
                   </div>
                   <div className="bg-[#334155]/50 p-4 rounded-2xl border border-[#475569]">
                     <p className="text-xs font-bold text-gray-400 mb-1">النوع</p>
                     <p className="font-bold text-gray-100">{selectedSchool.type}</p>
                   </div>
                </div>

                {/* Additional Info */}
                {selectedSchool.contact?.managerName && (
                  <div className="flex items-center gap-4 p-4 bg-indigo-900/20 rounded-2xl border border-indigo-900/50">
                    <div className="p-3 bg-indigo-900/50 rounded-full text-indigo-300 shadow-sm">
                      <Star className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-indigo-400 mb-0.5">مدير المدرسة</p>
                      <p className="text-sm font-bold text-indigo-100">{selectedSchool.contact.managerName}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-3 pt-2">
                   <div className="flex gap-3">
                      <button 
                          onClick={() => handleOpenMap(selectedSchool)}
                          className="flex-1 flex items-center justify-center gap-2 bg-dhofar-600 text-white font-bold py-4 rounded-2xl hover:bg-dhofar-700 transition-all shadow-lg shadow-dhofar-600/20 active:scale-[0.98]"
                      >
                        <Navigation className="w-5 h-5" />
                        <span className="text-sm">خرائط جوجل</span>
                      </button>

                      <button 
                          onClick={() => handleShareSchool(selectedSchool)}
                          className="flex items-center justify-center gap-2 px-6 bg-[#334155] text-white font-bold py-4 rounded-2xl border border-[#475569] hover:border-dhofar-500 hover:bg-[#475569] transition-all active:scale-[0.98]"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                   </div>
                   
                   {selectedSchool.contact?.phone && (
                      <a href={`tel:${selectedSchool.contact.phone}`} className="w-full flex items-center justify-center gap-3 bg-[#334155] text-white font-bold py-4 rounded-2xl border border-[#475569] hover:border-dhofar-500 hover:bg-[#475569] transition-all active:scale-[0.98]">
                        <Phone className="w-5 h-5" />
                        اتصال ({selectedSchool.contact.phone})
                      </a>
                   )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}