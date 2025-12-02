import React, { useState, useEffect, useRef } from 'react';
import { MOCK_PROXIES_RAW } from '@/lib/mock-proxies';
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  Download, 
  Play, 
  RotateCw, 
  Terminal,
  Trophy,
  Plus,
  Trash2,
  Globe,
  Server
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';

interface ProxyNode {
  id: string;
  ip: string;
  port: number;
  status: 'PENDING' | 'ONLINE' | 'TIMEOUT' | 'ERROR';
  latency: number | null;
}

const parseProxies = (raw: string): ProxyNode[] => {
  return raw.trim().split('\n').filter(line => line.trim()).map((line, idx) => {
    const [ip, port] = line.trim().split(':');
    return {
      id: `proxy-${idx}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ip,
      port: parseInt(port) || 1080,
      status: 'PENDING',
      latency: null
    };
  });
};

const EXTRA_LIST_1 = `
104.248.50.10:1080
167.99.241.20:1080
178.128.144.30:8080
206.189.12.60:1080
51.15.227.230:1080
139.59.53.110:1080
165.227.215.70:1080
159.65.162.20:1080
`;

const EXTRA_LIST_2 = `
45.55.133.20:1080
192.241.155.30:1080
138.197.144.40:1080
104.236.222.50:1080
165.22.222.60:1080
128.199.222.70:1080
178.62.222.80:1080
`;

export function ProxyTester() {
  const [proxies, setProxies] = useState<ProxyNode[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [customList, setCustomList] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize with mock data
    setProxies(parseProxies(MOCK_PROXIES_RAW));
    addLog('System initialized. Loaded default proxy list.');
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-20), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const startScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setProgress(0);
    addLog(`Initiating scanning sequence on ${proxies.length} targets...`);

    // Reset statuses
    setProxies(prev => prev.map(p => ({ ...p, status: 'PENDING', latency: null })));

    const total = proxies.length;
    let completed = 0;
    const chunkSize = 5;
    
    for (let i = 0; i < proxies.length; i += chunkSize) {
      const chunk = proxies.slice(i, i + chunkSize);
      
      await Promise.all(chunk.map(async (proxy) => {
        const delay = Math.random() * 1000 + 200; 
        await new Promise(resolve => setTimeout(resolve, delay));

        const rand = Math.random();
        let status: ProxyNode['status'] = 'ONLINE';
        let latency: number | null = Math.floor(Math.random() * 400) + 50;

        if (rand > 0.7) {
          status = 'TIMEOUT';
          latency = 2000;
        } else if (rand > 0.6) {
          status = 'ERROR';
          latency = null;
        } else if (rand < 0.1) {
           latency = Math.floor(Math.random() * 50) + 10;
        }

        setProxies(prev => prev.map(p => 
          p.id === proxy.id ? { ...p, status, latency } : p
        ));
        
        completed++;
        setProgress((completed / total) * 100);
      }));
    }

    setIsScanning(false);
    addLog('Scan complete.');
  };

  const handleAddProxies = () => {
    if (!customList.trim()) return;
    const newProxies = parseProxies(customList);
    setProxies(prev => [...newProxies, ...prev]); 
    setCustomList('');
    setDialogOpen(false);
    addLog(`Injected ${newProxies.length} new targets into the matrix.`);
  };

  const loadPreset = (preset: string, name: string) => {
     const newProxies = parseProxies(preset);
     setProxies(prev => [...newProxies, ...prev]);
     addLog(`Loaded preset: ${name}`);
  };

  const clearProxies = () => {
    setProxies([]);
    addLog('All targets cleared from memory.');
  };

  const exportCSV = () => {
    const headers = "IP,Port,Status,Latency(ms)\n";
    const rows = proxies.map(p => `${p.ip},${p.port},${p.status},${p.latency || 'N/A'}`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proxy_scan_${Date.now()}.csv`;
    a.click();
    addLog('Exported results to CSV.');
  };

  const onlineCount = proxies.filter(p => p.status === 'ONLINE').length;
  const timeoutCount = proxies.filter(p => p.status === 'TIMEOUT').length;
  const errorCount = proxies.filter(p => p.status === 'ERROR').length;
  const avgLatency = proxies.filter(p => p.status === 'ONLINE' && p.latency).reduce((acc, curr) => acc + (curr.latency || 0), 0) / (onlineCount || 1);
  
  const sortedProxies = [...proxies].sort((a, b) => {
    if (a.status === 'ONLINE' && b.status !== 'ONLINE') return -1;
    if (a.status !== 'ONLINE' && b.status === 'ONLINE') return 1;
    if (a.status === 'ONLINE' && b.status === 'ONLINE') return (a.latency || 0) - (b.latency || 0);
    return 0;
  });

  const topProxies = sortedProxies.filter(p => p.status === 'ONLINE').slice(0, 5);

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6 font-mono relative overflow-hidden flex flex-col">
      <div className="scan-line" />

      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-4 gap-6 relative z-10 flex-1">
        
        {/* Sidebar / Controls */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm neon-border">
            <CardHeader>
              <CardTitle className="font-display text-2xl text-primary tracking-widest neon-text">NET_MONITOR</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2">
                 <Button 
                  size="lg" 
                  onClick={startScan} 
                  disabled={isScanning || proxies.length === 0}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-wider shadow-[0_0_15px_rgba(0,255,65,0.3)] transition-all hover:shadow-[0_0_25px_rgba(0,255,65,0.5)]"
                >
                  {isScanning ? <RotateCw className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                  {isScanning ? 'SCANNING...' : 'START SCAN'}
                </Button>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full border-primary/30 hover:bg-primary/10 text-primary">
                      <Plus className="mr-2 h-4 w-4" /> ADD TARGETS
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-primary/20 text-foreground">
                    <DialogHeader>
                      <DialogTitle className="font-display text-primary">INJECT TARGETS</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        <Button variant="secondary" size="sm" onClick={() => loadPreset(EXTRA_LIST_1, "US Nodes")} className="text-xs">
                           <Globe className="w-3 h-3 mr-1"/> US NODES
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => loadPreset(EXTRA_LIST_2, "EU Nodes")} className="text-xs">
                           <Server className="w-3 h-3 mr-1"/> EU NODES
                        </Button>
                    </div>
                    <Textarea 
                      placeholder="Paste IP:PORT list here..." 
                      className="min-h-[200px] font-mono bg-black/50 border-primary/20 text-xs"
                      value={customList}
                      onChange={(e) => setCustomList(e.target.value)}
                    />
                    <Button onClick={handleAddProxies} className="bg-primary text-black hover:bg-primary/80">INJECT DATA</Button>
                  </DialogContent>
                </Dialog>

                <Button variant="ghost" onClick={clearProxies} className="w-full text-destructive hover:bg-destructive/10">
                  <Trash2 className="mr-2 h-4 w-4" /> CLEAR ALL
                </Button>

                <Button variant="secondary" onClick={exportCSV} disabled={proxies.length === 0} className="w-full">
                  <Download className="mr-2 h-4 w-4" /> EXPORT CSV
                </Button>
              </div>

              <div className="space-y-2 pt-4 border-t border-border">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Total Targets</span>
                  <span className="font-bold">{proxies.length}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-primary">Online</span>
                  <span className="text-primary font-bold">{onlineCount}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-destructive">Offline</span>
                  <span className="text-destructive font-bold">{timeoutCount + errorCount}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-secondary">Avg Latency</span>
                  <span className="text-secondary font-bold">{isNaN(avgLatency) ? '-' : avgLatency.toFixed(0)}ms</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Terminal Log */}
          <Card className="border-border/50 bg-black/80 font-mono text-xs h-[200px] flex flex-col shadow-inner">
            <CardHeader className="py-2 border-b border-border/30 bg-white/5">
              <CardTitle className="text-xs flex items-center text-muted-foreground">
                <Terminal className="w-3 h-3 mr-2" /> SYSTEM_LOG
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-2 space-y-1 text-primary/80 font-light" ref={scrollRef}>
              {logs.map((log, i) => (
                <div key={i} className="break-words border-l-2 border-primary/20 pl-2">{log}</div>
              ))}
            </CardContent>
          </Card>

          {/* Top Performers */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center text-primary font-display">
                <Trophy className="w-4 h-4 mr-2" /> TOP PERFORMERS
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {topProxies.map((proxy, i) => (
                <div key={proxy.id} className="px-4 py-2 border-b border-primary/10 flex justify-between items-center text-sm last:border-0 hover:bg-primary/10 transition-colors">
                  <div className="flex items-center">
                    <span className="w-5 h-5 rounded bg-primary/20 text-primary flex items-center justify-center text-[10px] mr-3 font-bold font-display">{i + 1}</span>
                    <span className="text-foreground/80">{proxy.ip}</span>
                  </div>
                  <span className="text-primary font-bold text-xs">{proxy.latency}ms</span>
                </div>
              ))}
              {topProxies.length === 0 && (
                <div className="p-4 text-center text-muted-foreground text-xs italic">No online targets yet</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Table */}
        <div className="lg:col-span-3 space-y-4 flex flex-col h-[calc(100vh-4rem)]">
          <div className="flex items-center justify-between shrink-0">
            <h2 className="text-xl font-display text-foreground tracking-wider neon-text">TARGET_MATRIX</h2>
            <div className="w-64">
               <div className="flex justify-between text-xs mb-1 text-muted-foreground">
                 <span>SCAN_PROGRESS</span>
                 <span>{progress.toFixed(0)}%</span>
               </div>
               <Progress 
                 value={progress} 
                 className="h-2 bg-secondary/10" 
                 indicatorClassName="bg-secondary shadow-[0_0_10px_theme('colors.secondary')]" 
               />
            </div>
          </div>

          <Card className="border-border/50 bg-card/30 backdrop-blur-md flex-1 overflow-hidden flex flex-col shadow-2xl">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-border/50 text-xs font-bold text-muted-foreground uppercase tracking-wider bg-black/40 shrink-0">
              <div className="col-span-1">Stat</div>
              <div className="col-span-4 md:col-span-5">IP Address</div>
              <div className="col-span-3 md:col-span-2">Port</div>
              <div className="col-span-2">Latency</div>
              <div className="col-span-2 hidden md:block">ID</div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <AnimatePresence initial={false}>
                {sortedProxies.map((proxy) => (
                  <motion.div 
                    key={proxy.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "grid grid-cols-12 gap-4 p-3 border-b border-white/5 text-sm items-center hover:bg-white/5 transition-colors font-mono group",
                      proxy.status === 'ONLINE' && "text-foreground bg-primary/5",
                      proxy.status === 'TIMEOUT' && "text-muted-foreground opacity-50",
                      proxy.status === 'ERROR' && "text-destructive bg-destructive/5"
                    )}
                  >
                    <div className="col-span-1">
                      {proxy.status === 'PENDING' && <div className="w-2 h-2 rounded-full bg-yellow-500/50 animate-pulse" />}
                      {proxy.status === 'ONLINE' && <Wifi className="w-4 h-4 text-primary drop-shadow-[0_0_3px_rgba(0,255,65,0.5)]" />}
                      {proxy.status === 'TIMEOUT' && <WifiOff className="w-4 h-4" />}
                      {proxy.status === 'ERROR' && <AlertTriangle className="w-4 h-4" />}
                    </div>
                    <div className="col-span-4 md:col-span-5 tracking-wide font-medium group-hover:text-white transition-colors">{proxy.ip}</div>
                    <div className="col-span-3 md:col-span-2 text-muted-foreground">{proxy.port}</div>
                    <div className="col-span-2">
                      {proxy.latency ? (
                        <Badge variant="outline" className={cn(
                          "border-0 bg-opacity-20 font-mono",
                          proxy.latency < 100 ? "bg-primary text-primary" : 
                          proxy.latency < 300 ? "bg-yellow-500 text-yellow-500" : 
                          "bg-red-500 text-red-500"
                        )}>
                          {proxy.latency}ms
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">--</span>
                      )}
                    </div>
                    <div className="col-span-2 text-xs text-muted-foreground truncate hidden md:block opacity-30">#{proxy.id.split('-')[1]}</div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {sortedProxies.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
                  <div className="p-6 rounded-full bg-white/5 border border-white/10">
                    <Activity className="w-12 h-12 opacity-20" />
                  </div>
                  <p className="tracking-widest text-xs">NO TARGETS LOADED</p>
                  <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)} className="border-primary/20 text-primary hover:bg-primary/10">
                     ADD TARGETS TO BEGIN
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}