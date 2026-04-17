/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Factory, 
  Trash2,
  Calendar, 
  Phone, 
  AlertTriangle, 
  History as HistoryIcon, 
  Plus, 
  Moon, 
  Sun, 
  ChevronRight, 
  Clock, 
  Bell,
  X,
  PhoneCall,
  User,
  Download,
  Pencil,
  Share2,
  ClipboardPaste,
  Check,
  ExternalLink,
  Link2
} from 'lucide-react';
import { Plant, LeaseRecord, Theme } from './types.ts';
import { cn, getLeaseStatus, calculateRemainingDays, formatPhone } from './lib/utils.ts';
import { format, addDays, parseISO } from 'date-fns';

const INITIAL_PLANTS: Plant[] = [
  { letter: 'V', name: 'Vat Leaching Plant 1' }
].map((item, index) => ({
  id: `initial-plant-${item.letter.toLowerCase()}-${index}`,
  code: item.letter,
  name: item.name,
  contactName: 'Not Assigned',
  contactPhone: '',
  history: []
}));

export default function App() {
  const [plants, setPlants] = useState<Plant[]>(() => {
    const saved = localStorage.getItem('hm_plants');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const seenIds = new Set<string>();
        
        // Migrate and deduplicate
        return parsed.map((p: any) => {
          let id = p.id;
          // If ID is a duplicate or looks like an old simple ID, ensure uniqueness
          if (!id || seenIds.has(id)) {
            id = crypto.randomUUID();
          }
          seenIds.add(id);
          
          return {
            ...p,
            id,
            code: p.code || (typeof p.id === 'string' && p.id.length === 1 ? p.id : 'P')
          };
        });
      } catch (e) {
        console.error("Failed to parse saved plants", e);
        return INITIAL_PLANTS;
      }
    }
    return INITIAL_PLANTS;
  });
  
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('hm_theme');
    return (saved as Theme) || 'dark';
  });

  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [isManagingPlant, setIsManagingPlant] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'history'>('edit');
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLanding, setIsLanding] = useState(() => {
    return !localStorage.getItem('hm_dashboard_visited');
  });
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [currentShareUrl, setCurrentShareUrl] = useState('');
  const [urgentThreshold, setUrgentThreshold] = useState<number>(() => {
    const saved = localStorage.getItem('hm_urgent_threshold');
    return saved ? parseInt(saved) : 2;
  });

  const enterDashboard = () => {
    setIsLanding(false);
    localStorage.setItem('hm_dashboard_visited', 'true');
  };

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('hm_plants', JSON.stringify(plants));
  }, [plants]);

  useEffect(() => {
    localStorage.setItem('hm_urgent_threshold', urgentThreshold.toString());
  }, [urgentThreshold]);

  useEffect(() => {
    localStorage.setItem('hm_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const selectedPlant = useMemo(() => 
    plants.find(p => p.id === selectedPlantId), [plants, selectedPlantId]
  );

  const expiringLeases = useMemo(() => {
    return plants.filter(p => {
      const currentLease = p.history[0];
      if (!currentLease) return false;
      return getLeaseStatus(currentLease.endDate, urgentThreshold) !== 'active';
    });
  }, [plants, urgentThreshold]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const updatePlant = (plantId: string, updates: Partial<Plant>) => {
    setPlants(prev => prev.map(p => p.id === plantId ? { ...p, ...updates } : p));
  };

  const addLease = (plantId: string, startDate: string, days: number) => {
    const endDate = format(addDays(parseISO(startDate), days), 'yyyy-MM-dd');
    const newRecord: LeaseRecord = {
      id: crypto.randomUUID(),
      startDate,
      endDate,
      days,
      recordedAt: new Date().toISOString()
    };
    
    setPlants(prev => prev.map(p => {
      if (p.id === plantId) {
        return {
          ...p,
          history: [newRecord, ...p.history]
        };
      }
      return p;
    }));
    setIsManagingPlant(false);
  };

  const addNewPlant = () => {
    // Generate a code based on current count + some logic for uniqueness if needed
    // But since id is UUID, name/code don't need to be strictly unique globally, 
    // just helpful. 
    const count = plants.length;
    const nextLetter = String.fromCharCode(65 + count % 26);
    const code = count < 26 ? nextLetter : `P-${count + 1}`;
    const id = crypto.randomUUID();
    
    const newPlant: Plant = {
      id,
      code,
      name: `New Recovery Unit ${code}`,
      contactName: 'Not Assigned',
      contactPhone: '',
      history: []
    };
    
    setPlants(prev => [...prev, newPlant]);
    setSelectedPlantId(id);
    setActiveTab('edit');
    setIsManagingPlant(true);
  };

  const extendLease = (plantId: string, extraDays: number) => {
    setPlants(prev => prev.map(p => {
      if (p.id === plantId && p.history.length > 0) {
        const current = p.history[0];
        const newEndDate = format(addDays(parseISO(current.endDate), extraDays), 'yyyy-MM-dd');
        const updatedRecord = {
          ...current,
          days: current.days + extraDays,
          endDate: newEndDate
        };
        return {
          ...p,
          history: [updatedRecord, ...p.history.slice(1)]
        };
      }
      return p;
    }));
    setIsManagingPlant(false);
  };

  const isLeaseActive = (plantHistory: LeaseRecord[]) => {
    if (plantHistory.length === 0) return false;
    const status = getLeaseStatus(plantHistory[0].endDate, urgentThreshold);
    return status === 'active' || status === 'expiring' || status === 'urgent';
  };

  const removePlant = (plantId: string) => {
    setPlants(prev => prev.filter(p => p.id !== plantId));
    setSelectedPlantId(null);
    setIsManagingPlant(false);
    setIsConfirmingDelete(false);
  };

  const exportToCSV = () => {
    const headers = ['Plant Code', 'Plant Name', 'Contact Name', 'Contact Phone', 'Lease ID', 'Start Date', 'End Date', 'Duration (Days)', 'Recorded At'];
    const rows = plants.flatMap(plant => 
      plant.history.map(record => [
        plant.code,
        plant.name,
        plant.contactName,
        plant.contactPhone,
        record.id,
        record.startDate,
        record.endDate,
        record.days,
        record.recordedAt
      ])
    );

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `gold_recovery_log_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getShareCode = (plant: Plant) => {
    const dataToShare = {
      id: plant.id,
      name: plant.name,
      contactName: plant.contactName,
      contactPhone: plant.contactPhone,
      history: plant.history,
      code: plant.code
    };
    try {
      const code = btoa(JSON.stringify(dataToShare));
      const url = `${window.location.origin}${window.location.pathname}#import=${code}`;
      setCurrentShareUrl(url);
      return { code, url };
    } catch (e) {
      console.error("Failed to generate share link", e);
      return { code: '', url: '' };
    }
  };

  const shareToSocial = async (plant: Plant) => {
    const { url } = getShareCode(plant);
    const shareData = {
      title: `H&M Leaching Ops: ${plant.name}`,
      text: `Import details for ${plant.name} recovery unit.`,
      url: url
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareData.text + ' ' + url)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#import=')) {
      const code = hash.replace('#import=', '');
      try {
        const decoded = JSON.parse(atob(code));
        if (decoded.name && Array.isArray(decoded.history)) {
          setImportCode(code);
          setIsImporting(true);
          // Clear hash
          window.history.replaceState(null, '', window.location.pathname);
        }
      } catch (e) {
        console.error("Auto-import failed", e);
      }
    }
  }, []);

  const handleImport = () => {
    try {
      const decoded = JSON.parse(atob(importCode.trim()));
      
      // Basic validation
      if (!decoded.name || !Array.isArray(decoded.history)) {
        throw new Error('Invalid format');
      }

      const existingPlantIndex = plants.findIndex(p => p.id === decoded.id);

      if (existingPlantIndex > -1) {
        // Update existing unit
        setPlants(prev => prev.map(p => 
          p.id === decoded.id 
            ? {
                ...p,
                name: decoded.name,
                contactName: decoded.contactName,
                contactPhone: decoded.contactPhone,
                history: decoded.history,
                code: decoded.code || p.code
              }
            : p
        ));
      } else {
        // Create new unit
        const newPlant: Plant = {
          id: decoded.id || crypto.randomUUID(),
          code: decoded.code || 'X',
          name: `${decoded.name} (Shared)`,
          contactName: decoded.contactName || 'Shared Contact',
          contactPhone: decoded.contactPhone || '',
          history: decoded.history
        };
        setPlants(prev => [...prev, newPlant]);
      }

      setIsImporting(false);
      setImportCode('');
      setImportError(null);
    } catch (e) {
      setImportError('Invalid share code. Please check and try again.');
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isLanding ? (
        <motion.div
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
        >
          {/* Hero Image Container */}
          <div className="absolute inset-0 overflow-hidden">
            <img 
              src="https://ais-dev-5vuxezmwijtczswoe6zljj-248818859403.europe-west3.run.app/input_file_0.png" 
              alt="H&M Processing Plant" 
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover opacity-40 blur-[2px]"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/60 to-background" />
          </div>

          <div className="relative z-10 flex w-full max-w-lg flex-col items-center px-8 text-center">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="mb-8 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-brand text-black shadow-2xl shadow-brand/40"
            >
              <Factory size={48} />
            </motion.div>

            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mb-4 text-4xl font-black tracking-tight sm:text-5xl"
            >
              H&M <br />
              <span className="text-brand">Gold</span> Processing
            </motion.h1>

            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mb-12 text-lg text-muted-foreground leading-relaxed"
            >
              Industrial logistics for <span className="text-foreground font-bold italic">Vat Leaching</span>, <span className="text-foreground font-bold italic">CIP</span>, and <span className="text-foreground font-bold italic">CIL</span> operations.
            </motion.p>

            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              onClick={enterDashboard}
              className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-brand py-5 text-lg font-bold text-black shadow-xl shadow-brand/30 ring-brand/50 transition-all hover:scale-[1.02] hover:shadow-brand/40 active:scale-[0.98]"
            >
              <span>Manage Plants</span>
              <ChevronRight className="transition-transform group-hover:translate-x-1" size={24} />
            </motion.button>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-8 text-[10px] uppercase tracking-widest text-muted-foreground opacity-50"
            >
              Professional Operations Dashboard v1.0
            </motion.p>
          </div>
        </motion.div>
      ) : (
        <motion.div 
          key="dashboard"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="min-h-screen bg-background text-foreground transition-colors duration-300"
        >
          {/* Header */}
      <header className="sticky top-0 z-30 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-black shadow-lg shadow-brand/20">
              <Factory size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">H&M Leaching Ops</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={exportToCSV}
              title="Export to CSV"
              className="rounded-full p-2 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <Download size={20} />
            </button>
            <button 
              onClick={() => setShowNotifications(true)}
              className="relative rounded-full p-2 hover:bg-muted transition-colors"
            >
              <Bell size={20} />
              {expiringLeases.length > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
                  {expiringLeases.length}
                </span>
              )}
            </button>
            <button 
              onClick={toggleTheme}
              className="rounded-full p-2 hover:bg-muted transition-colors"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-lg p-4 pb-24">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Plants Status</h2>
            <span className="text-xs font-mono text-muted-foreground">{plants.length} Units Active</span>
          </div>

          <div className="grid gap-4">
            {plants.map(plant => {
              const currentLease = plant.history[0];
              const status = currentLease ? getLeaseStatus(currentLease.endDate, urgentThreshold) : 'idle';
              const remaining = currentLease ? calculateRemainingDays(currentLease.endDate) : null;
              
              return (
                <motion.div
                  key={plant.id}
                  layoutId={plant.id}
                  onClick={() => setSelectedPlantId(plant.id)}
                  className={cn(
                    "group relative cursor-pointer overflow-hidden rounded-2xl border bg-card p-5 transition-all duration-500",
                    "hover:shadow-lg hover:shadow-brand/5",
                    status === 'active' && "border-border hover:border-brand/50",
                    status === 'expiring' && "border-warning/30 shadow-[0_0_15px_-5px_rgba(234,179,8,0.1)]",
                    status === 'urgent' && "border-danger/40 shadow-[0_0_20px_-5px_rgba(239,68,68,0.2)] animate-pulse-subtle",
                    status === 'expired' && "border-danger/20 opacity-80"
                  )}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-muted text-xs font-bold text-muted-foreground">
                          {plant.code || plant.id.substring(0, 1)}
                        </span>
                        <h3 className="font-semibold">{plant.name}</h3>
                        <Pencil size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const { url } = getShareCode(plant);
                            setCurrentShareUrl(url);
                            setIsSharing(true);
                          }}
                          className="flex items-center gap-1.5 rounded-lg bg-brand/10 px-2 py-1 text-[9px] font-bold text-brand transition-all hover:bg-brand/20 border border-brand/20"
                        >
                          <Link2 size={10} />
                          <span>SHARE LINK</span>
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-4 py-2">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase text-muted-foreground">Contact</span>
                          <span className="text-sm font-medium">
                            {plant.contactPhone ? formatPhone(plant.contactPhone) : 'No Phone'}
                          </span>
                        </div>
                        <div className="h-8 w-px bg-border" />
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase text-muted-foreground">Lease End</span>
                          <span className="text-sm font-mono font-medium">
                            {currentLease ? format(parseISO(currentLease.endDate), 'MMM dd, yyyy') : '--'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                       <AnimatePresence mode="wait">
                         <motion.div 
                           key={status}
                           initial={{ opacity: 0, scale: 0.9, y: 5 }}
                           animate={{ opacity: 1, scale: 1, y: 0 }}
                           exit={{ opacity: 0, scale: 0.9, y: -5 }}
                           className={cn(
                             "relative rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors duration-500",
                             status === 'active' && "bg-success/10 text-success",
                             status === 'expiring' && "bg-warning/10 text-warning",
                             status === 'urgent' && "bg-danger/20 text-danger",
                             status === 'expired' && "bg-danger/10 text-danger",
                             status === 'idle' && "bg-muted text-muted-foreground"
                           )}
                         >
                           {status === 'urgent' && (
                             <motion.span 
                               className="absolute inset-0 rounded-full bg-danger/20"
                               animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                               transition={{ duration: 2, repeat: Infinity }}
                             />
                           )}
                           <span className="relative z-10">
                             {status === 'urgent' ? 'Critical' : status === 'expiring' ? 'Action' : status}
                           </span>
                         </motion.div>
                       </AnimatePresence>
                       {remaining !== null && (
                        <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                          <Clock size={12} />
                          {remaining}d left
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  {currentLease && (
                    <div className="mt-4 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, Math.max(0, (remaining || 0) / currentLease.days * 100))}%` }}
                        className={cn(
                          "h-full rounded-full",
                          status === 'active' && "bg-success",
                          status === 'expiring' && "bg-warning",
                          status === 'urgent' && "bg-danger",
                          status === 'expired' && "bg-danger"
                        )}
                      />
                    </div>
                  )}
                </motion.div>
              );
            })}
            
            {/* Add New Plant Button */}
            <div className="grid gap-4">
              <motion.button
                onClick={addNewPlant}
                className="group flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border p-8 transition-all hover:border-brand/40 hover:bg-brand/5"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground group-hover:bg-brand/20 group-hover:text-brand">
                  <Plus size={24} />
                </div>
                <div className="text-center">
                  <p className="font-bold">Register Gold Recovery Unit</p>
                  <p className="text-xs text-muted-foreground">Add new Vat, CIP, or CIL plant</p>
                </div>
              </motion.button>
            </div>
          </div>
        </section>
      </main>

      {/* Floating Action Button (Optional, but let's use it for quick contact/add if plant selected) */}
      <AnimatePresence>
        {selectedPlant && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-x-0 bottom-0 z-40 bg-background/80 p-4 backdrop-blur-xl border-t border-border"
          >
            <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
              <button 
                onClick={() => setSelectedPlantId(null)}
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-foreground"
              >
                <X size={20} />
              </button>
              
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold">{selectedPlant.name}</h4>
                  <Pencil size={12} className="text-brand" />
                </div>
                <p className="text-xs text-muted-foreground">{formatPhone(selectedPlant.contactPhone)}</p>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setActiveTab('edit');
                    setIsManagingPlant(true);
                  }}
                  className="flex h-12 px-6 items-center justify-center gap-2 rounded-xl bg-brand text-black font-bold shadow-lg shadow-brand/20"
                >
                  <Factory size={20} />
                  <span>Manage Unit</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Modal */}
      {isImporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md overflow-hidden rounded-3xl bg-card border border-border shadow-2xl"
          >
            <div className="p-8">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-2xl font-bold tracking-tight">Import Shared Unit</h3>
                <button onClick={() => {
                  setIsImporting(false);
                  setImportCode('');
                  setImportError(null);
                }} className="rounded-full bg-muted p-2">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Paste the unique share code provided by another plant operator to import the unit and its history.
                </p>
                
                <textarea 
                  value={importCode}
                  onChange={(e) => setImportCode(e.target.value)}
                  placeholder="Paste unit share code here..."
                  className="w-full h-32 rounded-xl border border-border bg-muted/30 p-4 text-xs font-mono focus:border-brand focus:outline-none resize-none"
                />

                {importError && (
                  <p className="text-xs text-danger font-bold flex items-center gap-2">
                    <AlertTriangle size={14} />
                    {importError}
                  </p>
                )}

                <button 
                  onClick={handleImport}
                  disabled={!importCode.trim()}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand py-4 text-sm font-bold text-black shadow-lg shadow-brand/20 disabled:opacity-50 disabled:grayscale transition-all hover:scale-[1.01]"
                >
                  <ClipboardPaste size={20} />
                  <span>Finalize Import</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Share Modal */}
      {isSharing && selectedPlant && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm overflow-hidden rounded-[2.5rem] bg-card border border-border p-8 shadow-2xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold tracking-tight">Share Unit Link</h3>
                <p className="text-xs text-muted-foreground">{selectedPlant.name}</p>
              </div>
              <button 
                onClick={() => setIsSharing(false)}
                className="rounded-full bg-muted p-2"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl bg-muted/50 p-4 border border-border text-center">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-3">One-Click Import Link</p>
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand mb-1">
                    <Link2 size={24} />
                  </div>
                  <p className="text-[10px] text-muted-foreground break-all px-4 line-clamp-2">
                    {currentShareUrl}
                  </p>
                </div>
              </div>

              <div className="grid gap-3">
                <button 
                  onClick={() => shareToSocial(selectedPlant)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-4 text-sm font-bold text-black shadow-lg shadow-brand/20 transition-all active:scale-95"
                >
                  <ExternalLink size={18} />
                  <span>Send via App</span>
                </button>
                
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(currentShareUrl);
                    setCopiedId('url-copy');
                    setTimeout(() => setCopiedId(null), 2000);
                  }}
                  className="w-full py-3 rounded-xl border border-border text-sm font-bold hover:bg-muted transition-colors"
                >
                  {copiedId === 'url-copy' ? (
                    <span className="flex items-center justify-center gap-2 text-success">
                      <Check size={16} /> Link Copied
                    </span>
                  ) : 'Copy Link to Clipboard'}
                </button>
              </div>

              <p className="text-center text-[10px] text-muted-foreground leading-relaxed">
                This link allows others to instantly import this unit and its history by just clicking it.
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Notifications Panel */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md overflow-hidden rounded-3xl bg-card border border-border shadow-2xl"
          >
            <div className="flex flex-col border-b border-border p-6">
               <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Bell className="text-brand" size={20} />
                  <h3 className="text-lg font-bold">Lease Alerts</h3>
                </div>
                <button onClick={() => setShowNotifications(false)} className="rounded-full p-2 hover:bg-muted">
                  <X size={20} />
                </button>
              </div>
              <div className="rounded-xl bg-muted/30 p-3 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Urgent Threshold</span>
                  <span className="text-xs font-bold text-brand">{urgentThreshold} Days</span>
                </div>
                <input 
                  type="range"
                  min="1"
                  max="14"
                  value={urgentThreshold}
                  onChange={(e) => setUrgentThreshold(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-brand"
                />
                <p className="mt-1 text-[9px] text-muted-foreground italic">Notifications show 'URGENT' if days left are ≤ this value.</p>
              </div>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
              {expiringLeases.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <p>System clean. All leases are active.</p>
                </div>
              ) : (
                expiringLeases.map(p => {
                  const remaining = calculateRemainingDays(p.history[0].endDate);
                  const status = getLeaseStatus(p.history[0].endDate, urgentThreshold);
                  
                  return (
                    <div key={p.id} className="flex items-center gap-4 rounded-2xl bg-muted/50 p-4 border border-border">
                      <div className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                        status === 'expired' && "bg-danger/20 text-danger",
                        status === 'urgent' && "bg-danger/20 text-danger animate-pulse-subtle",
                        status === 'expiring' && "bg-warning/20 text-warning"
                      )}>
                        {status === 'expired' ? <AlertTriangle size={20} /> : <Clock size={20} />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold">{p.name}</p>
                        <p className={cn(
                          "text-[10px] font-bold",
                          status === 'urgent' ? "text-danger" : "text-muted-foreground"
                        )}>
                          {status === 'expired' ? 'Lease expired!' : 
                           status === 'urgent' && remaining === 1 ? 'EXPIRES TOMORROW' : 
                           `Expires in ${remaining} days`}
                        </p>
                      </div>
                      <button 
                         onClick={() => {
                           setSelectedPlantId(p.id);
                           setShowNotifications(false);
                         }}
                         className="text-xs font-bold text-brand hover:underline"
                      >
                        Action
                      </button>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-4 border-t border-border">
              <button 
                onClick={() => setShowNotifications(false)}
                className="w-full rounded-xl bg-muted py-3 text-sm font-bold"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isManagingPlant && selectedPlant && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div 
             initial={{ y: "100%" }}
             animate={{ y: 0 }}
             className="w-full max-w-md overflow-hidden rounded-t-[2.5rem] sm:rounded-[2.5rem] bg-card border border-border shadow-2xl"
          >
            <div className="p-8">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-2xl font-bold tracking-tight">Unit Management</h3>
                <button onClick={() => {
                  setIsManagingPlant(false);
                  setIsConfirmingDelete(false);
                }} className="rounded-full bg-muted p-2">
                  <X size={24} />
                </button>
              </div>

              {/* Tabs */}
              <div className="mb-6 flex gap-1 rounded-xl bg-muted p-1">
                <button 
                  onClick={() => setActiveTab('edit')}
                  className={cn(
                    "flex-1 rounded-lg py-2 text-xs font-bold transition-all",
                    activeTab === 'edit' ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Management
                </button>
                <button 
                  onClick={() => setActiveTab('history')}
                  className={cn(
                    "flex-1 rounded-lg py-2 text-xs font-bold transition-all",
                    activeTab === 'history' ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Full History
                </button>
              </div>

              <AnimatePresence mode="wait">
                {activeTab === 'edit' ? (
                  <motion.div
                    key="edit"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                  >
                    <form className="space-y-6" onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const name = formData.get('plantName') as string;
                      const contactPhone = formData.get('contactPhone') as string;
                      const contactName = formData.get('contactName') as string;
                      
                      const startDate = formData.get('startDate') as string;
                      const daysInput = formData.get('days') as string;
                      const days = parseInt(daysInput);
                      
                      updatePlant(selectedPlant.id, { name, contactName, contactPhone });
                      
                      // Only add lease if days are provided (making it optional for just name edits)
                      if (!isNaN(days) && days > 0) {
                        addLease(selectedPlant.id, startDate, days);
                      } else {
                        setIsManagingPlant(false);
                      }
                    }}>
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Recovery Unit Name</label>
                          <div className="relative">
                            <Factory className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                            <input 
                              name="plantName"
                              placeholder="e.g. CIP Plant #4"
                              defaultValue={selectedPlant.name}
                              className="w-full rounded-xl border border-border bg-muted/30 py-3 pl-10 pr-4 text-sm font-bold focus:border-brand focus:outline-none"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Contact Name</label>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                              <input 
                                name="contactName"
                                placeholder="Manager Name"
                                defaultValue={selectedPlant.contactName}
                                className="w-full rounded-xl border border-border bg-muted/30 py-3 pl-10 pr-4 text-sm focus:border-brand focus:outline-none"
                                required
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Phone Number</label>
                            <div className="relative">
                              <PhoneCall className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                              <input 
                                name="contactPhone"
                                placeholder="+254..."
                                defaultValue={selectedPlant.contactPhone}
                                className="w-full rounded-xl border border-border bg-muted/30 py-3 pl-10 pr-4 text-sm focus:border-brand focus:outline-none"
                                required
                              />
                            </div>
                          </div>
                        </div>

                        <div className="h-px bg-border" />

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Start Date</label>
                            <div className="relative">
                              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                              <input 
                                name="startDate"
                                type="date"
                                disabled={isLeaseActive(selectedPlant.history)}
                                defaultValue={format(new Date(), 'yyyy-MM-dd')}
                                className="w-full rounded-xl border border-border bg-muted/30 py-3 pl-10 pr-4 text-sm focus:border-brand focus:outline-none disabled:opacity-50"
                                required
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Lease Duration</label>
                            <div className="relative">
                              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                              <input 
                                name="days"
                                type="number"
                                disabled={isLeaseActive(selectedPlant.history)}
                                placeholder={isLeaseActive(selectedPlant.history) ? "Lease Active" : "Days (Optional)"}
                                className="w-full rounded-xl border border-border bg-muted/30 py-3 pl-10 pr-4 text-sm focus:border-brand focus:outline-none disabled:opacity-50"
                              />
                            </div>
                          </div>
                        </div>

                        {isLeaseActive(selectedPlant.history) && (
                          <div className="rounded-xl bg-brand/10 p-3 border border-brand/20">
                            <p className="text-[10px] text-brand font-bold text-center">
                              A lease is currently active. To add more days, use the "Extend Current Lease" section below.
                            </p>
                          </div>
                        )}

                        <div className="pt-2 border-t border-border mt-2">
                          <button
                            type="button"
                            onClick={() => {
                              const { url } = getShareCode(selectedPlant);
                              setCurrentShareUrl(url);
                              setIsSharing(true);
                            }}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand/10 border border-brand/20 py-3 text-sm font-bold text-brand transition-all hover:bg-brand/20"
                          >
                            <Link2 size={16} />
                            <span>Share Unit Link</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button 
                          type="button"
                          onClick={() => setIsManagingPlant(false)}
                          className="flex-1 rounded-2xl border border-border bg-muted/50 py-4 text-sm font-bold hover:bg-muted"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit"
                          className="flex-[2] rounded-2xl bg-brand py-4 text-sm font-bold text-black shadow-lg shadow-brand/20 hover:brightness-110"
                        >
                          Save Changes
                        </button>
                      </div>

                      {/* Danger Zone */}
                      <div className="pt-6 border-t border-border mt-6">
                        {!isConfirmingDelete ? (
                          <button
                            type="button"
                            onClick={() => setIsConfirmingDelete(true)}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-danger/30 py-3 text-xs font-bold text-danger hover:bg-danger/5"
                          >
                            <Trash2 size={14} />
                            <span>Remove Processing Plant</span>
                          </button>
                        ) : (
                          <div className="space-y-3 rounded-xl bg-danger/5 p-4 border border-danger/20">
                            <p className="text-[10px] font-bold text-danger text-center uppercase tracking-wider">Confirm Deletion</p>
                            <p className="text-[10px] text-muted-foreground text-center">This will permanently delete all logs and data for this plant.</p>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setIsConfirmingDelete(false)}
                                className="flex-1 rounded-lg border border-border bg-card py-2 text-[10px] font-bold"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => removePlant(selectedPlant.id)}
                                className="flex-1 rounded-lg bg-danger py-2 text-[10px] font-bold text-white shadow-lg shadow-danger/20"
                              >
                                Delete Forever
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </form>

                    {/* Extend Current Lease Option */}
                    {selectedPlant.history.length > 0 && (
                      <div className="mt-8 space-y-4 rounded-2xl border border-brand/20 bg-brand/5 p-6">
                        <div className="flex items-center gap-2">
                          <HistoryIcon size={18} className="text-brand" />
                          <h4 className="text-xs font-bold uppercase tracking-wider">Extend Current Lease</h4>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          Add extra days to the active lease ending on <span className="font-bold text-foreground">{format(parseISO(selectedPlant.history[0].endDate), 'MMM dd, yyyy')}</span>.
                        </p>
                        <form 
                          className="flex gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            const extraDays = parseInt(formData.get('extraDays') as string);
                            if (extraDays > 0) extendLease(selectedPlant.id, extraDays);
                          }}
                        >
                          <div className="relative flex-1">
                            <Plus className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                            <input 
                              name="extraDays"
                              type="number"
                              placeholder="Extra Days"
                              className="w-full rounded-xl border border-border bg-card py-3 pl-9 pr-4 text-xs font-bold focus:border-brand focus:outline-none"
                              required
                            />
                          </div>
                          <button 
                            type="submit"
                            className="rounded-xl bg-brand px-4 text-xs font-bold text-black hover:brightness-110"
                          >
                            Extend
                          </button>
                        </form>
                      </div>
                    )}
                    
                    {/* Compact View All History Trigger */}
                    <div className="mt-8 flex items-center justify-between rounded-2xl bg-muted/20 p-4 border border-border/50">
                      <div className="flex items-center gap-3">
                        <HistoryIcon size={18} className="text-brand" />
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider">Lease Logs</p>
                          <p className="text-[10px] text-muted-foreground">{selectedPlant.history.length ? `${selectedPlant.history.length} records available` : 'No logs yet'}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setActiveTab('history')}
                        className="text-xs font-bold text-brand hover:underline"
                      >
                        View All
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-4"
                  >
                    <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-4">
                      {selectedPlant.history.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                          <HistoryIcon className="mx-auto mb-2 opacity-20" size={48} />
                          <p className="text-sm italic">No lease records found for this plant.</p>
                        </div>
                      ) : (
                        selectedPlant.history.map((rec, idx) => (
                          <div key={rec.id} className="relative rounded-2xl border border-border bg-muted/20 p-4 transition-all hover:border-brand/30">
                            {idx === 0 && (
                              <div className="absolute -top-2 right-4 rounded-full bg-brand px-2 py-0.5 text-[8px] font-black uppercase text-black">
                                Current
                              </div>
                            )}
                            <div className="flex items-center justify-between mb-3 border-b border-border/50 pb-2">
                              <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-brand" />
                                <span className="text-xs font-bold uppercase">{idx === 0 ? 'Active Period' : `Previous Lease #${selectedPlant.history.length - idx}`}</span>
                              </div>
                              <div className="flex items-center gap-1.5 rounded-lg bg-card px-2 py-1 border border-border shadow-sm">
                                <Clock size={12} className="text-success" />
                                <span className="text-[10px] font-mono font-bold text-foreground">{rec.days} Days</span>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Start Date</span>
                                <p className="text-sm font-medium">{format(parseISO(rec.startDate), 'MMMM dd, yyyy')}</p>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">End Date</span>
                                <p className="text-sm font-medium">{format(parseISO(rec.endDate), 'MMMM dd, yyyy')}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <button 
                      onClick={() => setActiveTab('edit')}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl bg-muted py-4 text-xs font-bold transition-colors hover:bg-muted/80"
                    >
                      <Plus size={16} />
                      <span>Log New Lease</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

