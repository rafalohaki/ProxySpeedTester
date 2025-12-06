import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
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
  Server,
  ArrowRight,
  Gauge,
  Settings,
  StopCircle,
  Link,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ProxyType = 'socks5' | 'socks4' | 'http' | 'https' | 'unknown';

interface ProxyNode {
  id: string;
  ip: string;
  port: number;
  type: ProxyType;
  status: 'PENDING' | 'ONLINE' | 'TIMEOUT' | 'ERROR';
  latency: number | null;
  speedTest?: {
    status: 'IDLE' | 'TESTING' | 'COMPLETED' | 'FAILED';
    downloadSpeed: number; // MB/s
    progress: number;
    fileSize: number; // MB
  };
}

// Optimized Row Components to prevent unnecessary re-renders
const LatencyRow = memo(({ proxy }: { proxy: ProxyNode }) => (
  <div
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
  </div>
));
LatencyRow.displayName = 'LatencyRow';

const SpeedRow = memo(({ proxy }: { proxy: ProxyNode }) => (
  <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 text-sm items-center hover:bg-white/5 transition-colors">
    <div className="col-span-4">
      <div className="font-medium text-foreground">{proxy.ip}</div>
      <div className="text-xs text-muted-foreground flex items-center gap-2">
        <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> PORT: {proxy.port}</span>
        <span className="text-primary">{proxy.latency}ms</span>
      </div>
    </div>
    <div className="col-span-4">
      <div className="flex justify-between text-[10px] mb-1 text-muted-foreground">
        <span>{proxy.speedTest?.status === 'TESTING' ? 'DOWNLOADING...' : 'OVH_100MB.bin'}</span>
        <span>{proxy.speedTest?.progress.toFixed(0)}%</span>
      </div>
      <Progress
        value={proxy.speedTest?.progress}
        className="h-1.5 bg-secondary/10"
        indicatorClassName={cn(
          "bg-secondary shadow-[0_0_5px_theme('colors.secondary')]",
          proxy.speedTest?.status === 'COMPLETED' && "bg-primary shadow-[0_0_5px_theme('colors.primary')]"
        )}
      />
    </div>
    <div className="col-span-2 font-mono text-right">
      {proxy.speedTest?.downloadSpeed ? (
        <span className={cn(
          "font-bold",
          proxy.speedTest.downloadSpeed > 10 ? "text-primary" :
            proxy.speedTest.downloadSpeed > 2 ? "text-secondary" : "text-yellow-500"
        )}>
          {proxy.speedTest.downloadSpeed.toFixed(1)} MB/s
        </span>
      ) : (
        <span className="text-muted-foreground">-</span>
      )}
    </div>
    <div className="col-span-2 flex justify-end">
      {proxy.speedTest?.status === 'COMPLETED' && <Badge variant="default" className="bg-primary text-black">DONE</Badge>}
      {proxy.speedTest?.status === 'TESTING' && <Badge variant="outline" className="text-secondary border-secondary animate-pulse">TESTING</Badge>}
      {proxy.speedTest?.status === 'IDLE' && <Badge variant="secondary" className="opacity-50">READY</Badge>}
      {proxy.speedTest?.status === 'FAILED' && <Badge variant="destructive">FAILED</Badge>}
    </div>
  </div>
));
SpeedRow.displayName = 'SpeedRow';

const parseProxies = (raw: string, typeFilter?: ProxyType | 'all'): ProxyNode[] => {
  // Enhanced parsing to handle formats like:
  // socks5://98.188.47.150:4145
  // socks4://184.178.172.25:15291
  // http://184.178.172.25:15291
  // 192.168.1.1:1080 (unknown type)

  const lines = raw.split(/[\n\r]+/).map(line => line.trim()).filter(Boolean);
  const results: ProxyNode[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    // Try to match protocol://ip:port format first
    const urlMatch = line.match(/^(socks5|socks4|https?):\/\/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{1,5})/i);

    if (urlMatch) {
      const type = urlMatch[1].toLowerCase() as ProxyType;
      const ip = urlMatch[2];
      const port = urlMatch[3];
      const key = `${ip}:${port}`;

      // Apply type filter
      if (typeFilter && typeFilter !== 'all' && type !== typeFilter) {
        continue;
      }

      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          id: `proxy-${results.length}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          ip,
          port: parseInt(port) || 1080,
          type,
          status: 'PENDING',
          latency: null,
          speedTest: {
            status: 'IDLE',
            downloadSpeed: 0,
            progress: 0,
            fileSize: 100
          }
        });
      }
    } else {
      // Fallback: try to match plain IP:PORT format
      const plainMatch = line.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{1,5})/);
      if (plainMatch) {
        const ip = plainMatch[1];
        const port = plainMatch[2];
        const key = `${ip}:${port}`;

        // If a specific filter is applied (not 'all'), assume plain IPs belong to that type.
        // Otherwise default to 'unknown' (or could default to http/socks5 if preferred, keeping unknown for now)
        const type: ProxyType = (typeFilter && typeFilter !== 'all') ? typeFilter : 'unknown';

        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            id: `proxy-${results.length}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            ip,
            port: parseInt(port) || 1080,
            type,
            status: 'PENDING',
            latency: null,
            speedTest: {
              status: 'IDLE',
              downloadSpeed: 0,
              progress: 0,
              fileSize: 100
            }
          });
        }
      }
    }
  }

  return results;
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
  const [isSpeedTesting, setIsSpeedTesting] = useState(false);
  const [isUrlLoading, setIsUrlLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [customList, setCustomList] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("latency");
  const [testMode, setTestMode] = useState<'CLIENT' | 'SERVER'>('CLIENT');
  const [concurrency, setConcurrency] = useState([5]);
  const [proxyTypeFilter, setProxyTypeFilter] = useState<ProxyType | 'all'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Safety refs for memory management
  const isMounted = useRef(true);
  const abortController = useRef<AbortController | null>(null);

  useEffect(() => {
    isMounted.current = true;
    // Initialize with mock data
    setProxies(parseProxies(MOCK_PROXIES_RAW));
    addLog('System initialized. Loaded default proxy list.');

    return () => {
      isMounted.current = false;
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev.slice(-20), `[${new Date().toLocaleTimeString()}] ${testMode}::${msg}`]);
  }, [testMode]);

  const stopScan = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
      addLog('Scan aborted by user.');
      setIsScanning(false);
      setIsSpeedTesting(false);
    }
  }, [addLog]);

  const startLatencyScan = useCallback(async () => {
    if (isScanning) return;

    // Setup cancellation
    abortController.current = new AbortController();
    const signal = abortController.current.signal;

    // Get current proxies snapshot
    const currentProxies = [...proxies];
    if (currentProxies.length === 0) {
      addLog('No proxies to scan.');
      return;
    }

    setIsScanning(true);
    setProgress(0);
    addLog(`Initiating LATENCY scan on ${currentProxies.length} targets (Threads: ${concurrency[0]})...`);

    setProxies(prev => prev.map(p => ({ ...p, status: 'PENDING', latency: null })));

    const total = currentProxies.length;
    let completed = 0;
    const batchSize = concurrency[0];

    try {
      for (let i = 0; i < currentProxies.length; i += batchSize) {
        if (signal.aborted || !isMounted.current) break;

        const chunk = currentProxies.slice(i, i + batchSize);

        const chunkResults = await Promise.all(chunk.map(async (proxy) => {
          if (signal.aborted) return null;

          const delay = Math.random() * 800 + 100;
          await new Promise(resolve => setTimeout(resolve, delay));

          if (signal.aborted) return null;

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

          return { id: proxy.id, status, latency };
        }));

        if (!isMounted.current || signal.aborted) break;

        // Batch update state to prevent excessive re-renders
        setProxies(prev => {
          const updates = new Map(chunkResults.filter(Boolean).map(r => [r!.id, r]));
          return prev.map(p => {
            const update = updates.get(p.id);
            return update ? { ...p, status: update.status, latency: update.latency } : p;
          });
        });

        completed += chunk.length;
        setProgress(Math.min(100, (completed / total) * 100));
      }

      if (isMounted.current && !signal.aborted) {
        setIsScanning(false);
        addLog('Latency scan complete.');
      }
    } catch (error) {
      console.error("Scan error", error);
      if (isMounted.current) setIsScanning(false);
    } finally {
      abortController.current = null;
    }
  }, [proxies, isScanning, concurrency, addLog]);

  const startSpeedTest = useCallback(async () => {
    const onlineProxies = proxies.filter(p => p.status === 'ONLINE');
    if (onlineProxies.length === 0) {
      addLog('No ONLINE proxies to test. Run latency scan first.');
      return;
    }

    if (isSpeedTesting) return;

    // Setup cancellation
    abortController.current = new AbortController();
    const signal = abortController.current.signal;

    setIsSpeedTesting(true);
    addLog(`Starting SPEED TEST on ${onlineProxies.length} targets (OVH 100MB Proof)...`);

    // Reset speed test stats
    setProxies(prev => prev.map(p => ({
      ...p,
      speedTest: { ...p.speedTest!, status: p.status === 'ONLINE' ? 'IDLE' : 'FAILED', progress: 0, downloadSpeed: 0 }
    })));

    const batchSize = Math.max(1, Math.floor(concurrency[0] / 2)); // Speed tests are heavier

    try {
      for (let i = 0; i < onlineProxies.length; i += batchSize) {
        if (signal.aborted || !isMounted.current) break;

        const chunk = onlineProxies.slice(i, i + batchSize);

        // Set chunk to TESTING state
        setProxies(prev => {
          const chunkIds = new Set(chunk.map(c => c.id));
          return prev.map(p =>
            chunkIds.has(p.id) ? { ...p, speedTest: { ...p.speedTest!, status: 'TESTING' } } : p
          );
        });

        await Promise.all(chunk.map(async (proxy) => {
          if (signal.aborted) return;

          // Simulate download progress
          let progress = 0;
          const targetSpeed = Math.random() * 15 + 0.5; // Random speed 0.5 - 15 MB/s

          while (progress < 100) {
            if (signal.aborted || !isMounted.current) break;

            await new Promise(r => setTimeout(r, 200));
            // Larger chunks for less re-renders
            progress += Math.random() * 15 + 5;
            if (progress > 100) progress = 100;

            // Update progress individually (it's okay for smoothness here, but could be optimized)
            if (isMounted.current && !signal.aborted) {
              setProxies(prev => prev.map(p =>
                p.id === proxy.id ? {
                  ...p,
                  speedTest: {
                    ...p.speedTest!,
                    progress,
                    downloadSpeed: targetSpeed + (Math.random() * 2 - 1) // Jitter
                  }
                } : p
              ));
            }
          }

          if (isMounted.current && !signal.aborted) {
            setProxies(prev => prev.map(p =>
              p.id === proxy.id ? {
                ...p,
                speedTest: { ...p.speedTest!, status: 'COMPLETED', progress: 100, downloadSpeed: targetSpeed }
              } : p
            ));
          }
        }));
      }

      if (isMounted.current && !signal.aborted) {
        setIsSpeedTesting(false);
        addLog('Speed test complete.');
      }
    } catch (error) {
      console.error("Speed test error", error);
      if (isMounted.current) setIsSpeedTesting(false);
    } finally {
      abortController.current = null;
    }
  }, [proxies, isSpeedTesting, concurrency, addLog]);

  const deduplicateProxies = (currentProxies: ProxyNode[], newProxies: ProxyNode[]) => {
    const existingKeys = new Set(currentProxies.map(p => `${p.ip}:${p.port}`));
    return newProxies.filter(p => !existingKeys.has(`${p.ip}:${p.port}`));
  };

  const handleAddProxies = () => {
    if (!customList.trim()) return;
    const allProxies = parseProxies(customList, 'all');
    const filteredProxies = parseProxies(customList, proxyTypeFilter);
    const skippedByFilter = allProxies.length - filteredProxies.length;

    setProxies(prev => {
      const uniqueNew = deduplicateProxies(prev, filteredProxies);
      const filterMsg = proxyTypeFilter !== 'all' ? ` (type filter: ${proxyTypeFilter.toUpperCase()}, skipped ${skippedByFilter})` : '';
      addLog(`Injected ${uniqueNew.length} unique targets (filtered ${filteredProxies.length - uniqueNew.length} duplicates)${filterMsg}.`);
      return [...uniqueNew, ...prev];
    });

    setCustomList('');
    setDialogOpen(false);
  };

  const loadFromUrl = async () => {
    if (!urlInput.trim()) return;
    setIsUrlLoading(true);
    addLog(`Fetching list from URL: ${urlInput}...`);

    const proxiesList = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(urlInput)}`,
      `https://corsproxy.io/?${encodeURIComponent(urlInput)}`,
      `https://thingproxy.freeboard.io/fetch/${urlInput}`
    ];

    let text = '';
    let success = false;

    for (const proxyUrl of proxiesList) {
      try {
        const response = await fetch(proxyUrl);
        if (response.ok) {
          text = await response.text();
          if (text && text.trim().length > 0) {
            success = true;
            break; // Found working proxy
          }
        }
      } catch (e) {
        console.warn(`Failed to fetch via ${proxyUrl}`, e);
      }
    }

    try {
      if (!success || !text) {
        throw new Error('All CORS proxies failed or returned empty content.');
      }

      const allFetched = parseProxies(text, 'all');
      const fetchedProxies = parseProxies(text, proxyTypeFilter);
      const skippedByFilter = allFetched.length - fetchedProxies.length;

      if (allFetched.length === 0) {
        throw new Error('No valid IP:PORT patterns found in the URL content');
      }

      setProxies(prev => {
        const uniqueNew = deduplicateProxies(prev, fetchedProxies);
        const filterMsg = proxyTypeFilter !== 'all' ? ` (type filter: ${proxyTypeFilter.toUpperCase()}, skipped ${skippedByFilter})` : '';
        addLog(`Successfully loaded ${uniqueNew.length} unique targets (filtered ${fetchedProxies.length - uniqueNew.length} duplicates)${filterMsg}.`);
        return [...uniqueNew, ...prev];
      });

      setUrlInput('');
      setDialogOpen(false);
    } catch (error) {
      console.error("URL fetch error:", error);
      addLog(`Error fetching URL: ${error instanceof Error ? error.message : 'Unknown error'}. Try a different URL.`);
    } finally {
      setIsUrlLoading(false);
    }
  };

  const loadPreset = (preset: string, name: string) => {
    const newProxies = parseProxies(preset);
    setProxies(prev => {
      const uniqueNew = deduplicateProxies(prev, newProxies);
      addLog(`Loaded preset: ${name} (${uniqueNew.length} new, ${newProxies.length - uniqueNew.length} dupes skipped)`);
      return [...uniqueNew, ...prev];
    });
  };

  const transferOnlineToSpeed = () => {
    const onlineCount = proxies.filter(p => p.status === 'ONLINE').length;
    if (onlineCount > 0) {
      setActiveTab('speed');
      addLog(`Switched to Speed Test view with ${onlineCount} active targets.`);
    } else {
      addLog('No online proxies to test.');
    }
  };

  const clearProxies = () => {
    setProxies([]);
    addLog('Memory cleared.');
  };

  const exportCSV = () => {
    const headers = "IP,Port,Status,Latency(ms),Speed(MB/s)\n";
    const rows = proxies.map(p =>
      `${p.ip},${p.port},${p.status},${p.latency || 'N/A'},${p.speedTest?.downloadSpeed.toFixed(2) || '0'}`
    ).join('\n');

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
    return (a.latency || 0) - (b.latency || 0);
  });

  const speedTestProxies = [...proxies].filter(p => p.status === 'ONLINE').sort((a, b) =>
    (b.speedTest?.downloadSpeed || 0) - (a.speedTest?.downloadSpeed || 0)
  );

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

              {/* Main Actions */}
              <div className="flex flex-col gap-2">
                {(isScanning || isSpeedTesting) ? (
                  <Button
                    size="lg"
                    onClick={stopScan}
                    className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold tracking-wider shadow-[0_0_15px_rgba(255,0,0,0.3)]"
                  >
                    <StopCircle className="mr-2 h-4 w-4 animate-pulse" /> ABORT OPERATION
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={activeTab === 'latency' ? startLatencyScan : startSpeedTest}
                    disabled={proxies.length === 0}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-wider shadow-[0_0_15px_rgba(0,255,65,0.3)] transition-all hover:shadow-[0_0_25px_rgba(0,255,65,0.5)]"
                  >
                    {activeTab === 'latency' ? <Play className="mr-2 h-4 w-4" /> : <Gauge className="mr-2 h-4 w-4" />}
                    {activeTab === 'latency' ? 'START LATENCY SCAN' : 'START SPEED TEST'}
                  </Button>
                )}

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full border-primary/30 hover:bg-primary/10 text-primary">
                      <Plus className="mr-2 h-4 w-4" /> ADD TARGETS
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-primary/20 text-foreground max-w-md">
                    <DialogHeader>
                      <DialogTitle className="font-display text-primary">INJECT TARGETS</DialogTitle>
                    </DialogHeader>

                    {/* Proxy Type Filter */}
                    <div className="flex items-center gap-3 p-3 bg-black/30 rounded-lg border border-primary/10">
                      <Filter className="w-4 h-4 text-primary" />
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">TYPE FILTER:</Label>
                      <Select value={proxyTypeFilter} onValueChange={(val) => setProxyTypeFilter(val as ProxyType | 'all')}>
                        <SelectTrigger className="flex-1 bg-black/50 border-primary/20 text-xs h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-primary/20">
                          <SelectItem value="all">ALL TYPES</SelectItem>
                          <SelectItem value="socks5">SOCKS5 ONLY</SelectItem>
                          <SelectItem value="socks4">SOCKS4 ONLY</SelectItem>
                          <SelectItem value="http">HTTP ONLY</SelectItem>
                          <SelectItem value="https">HTTPS ONLY</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Tabs defaultValue="text" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="text">TEXT INPUT</TabsTrigger>
                        <TabsTrigger value="url">URL IMPORT</TabsTrigger>
                      </TabsList>

                      <TabsContent value="text" className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                          <Button variant="secondary" size="sm" onClick={() => loadPreset(EXTRA_LIST_1, "US Nodes")} className="text-xs">
                            <Globe className="w-3 h-3 mr-1" /> US NODES
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => loadPreset(EXTRA_LIST_2, "EU Nodes")} className="text-xs">
                            <Server className="w-3 h-3 mr-1" /> EU NODES
                          </Button>
                        </div>
                        <Textarea
                          placeholder="Paste IP:PORT list here..."
                          className="min-h-[200px] font-mono bg-black/50 border-primary/20 text-xs"
                          value={customList}
                          onChange={(e) => setCustomList(e.target.value)}
                        />
                        <Button onClick={handleAddProxies} className="w-full bg-primary text-black hover:bg-primary/80">INJECT DATA</Button>
                      </TabsContent>

                      <TabsContent value="url" className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">REMOTE LIST URL (TXT/RAW)</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="https://example.com/proxies.txt"
                              className="bg-black/50 border-primary/20 font-mono text-xs"
                              value={urlInput}
                              onChange={(e) => setUrlInput(e.target.value)}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            * System attempts multiple CORS gateways automatically.
                          </p>
                        </div>
                        <Button
                          onClick={loadFromUrl}
                          disabled={isUrlLoading || !urlInput}
                          className="w-full bg-secondary text-black hover:bg-secondary/80"
                        >
                          {isUrlLoading ? <RotateCw className="mr-2 h-4 w-4 animate-spin" /> : <Link className="mr-2 h-4 w-4" />}
                          {isUrlLoading ? 'FETCHING...' : 'IMPORT FROM URL'}
                        </Button>
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>

                {activeTab === 'latency' && (
                  <Button
                    variant="secondary"
                    onClick={transferOnlineToSpeed}
                    className="w-full"
                    disabled={onlineCount === 0}
                  >
                    <ArrowRight className="mr-2 h-4 w-4" /> TEST SPEED ({onlineCount})
                  </Button>
                )}

                <div className="flex gap-2">
                  <Button variant="ghost" onClick={clearProxies} className="flex-1 text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" onClick={exportCSV} disabled={proxies.length === 0} className="flex-1 text-secondary hover:bg-secondary/10">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Settings Panel */}
              <div className="pt-4 border-t border-border/50 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Settings className="w-3 h-3" />
                    <span>MODE</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="mode-toggle" className={cn("text-[10px] font-bold", testMode === 'CLIENT' ? "text-primary" : "text-muted-foreground")}>CLI</Label>
                    <Switch
                      id="mode-toggle"
                      checked={testMode === 'SERVER'}
                      onCheckedChange={(c) => {
                        setTestMode(c ? 'SERVER' : 'CLIENT');
                        addLog(`Switched to ${c ? 'SERVER' : 'CLIENT'} mode.`);
                      }}
                    />
                    <Label htmlFor="mode-toggle" className={cn("text-[10px] font-bold", testMode === 'SERVER' ? "text-primary" : "text-muted-foreground")}>SRV</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>PARALLEL THREADS</span>
                    <span className="text-primary">{concurrency[0]}</span>
                  </div>
                  <Slider
                    value={concurrency}
                    onValueChange={setConcurrency}
                    max={50}
                    min={1}
                    step={1}
                    className="py-2"
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-2 pt-4 border-t border-border/50">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Total Targets</span>
                  <span className="font-bold">{proxies.length}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-primary">Online</span>
                  <span className="text-primary font-bold">{onlineCount}</span>
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
        </div>

        {/* Main Content - Tabs */}
        <div className="lg:col-span-3 flex flex-col h-[calc(100vh-4rem)]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <TabsList className="bg-card/50 border border-border/50">
                <TabsTrigger value="latency" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                  <Activity className="w-4 h-4 mr-2" /> LATENCY SCAN
                </TabsTrigger>
                <TabsTrigger value="speed" className="data-[state=active]:bg-secondary/20 data-[state=active]:text-secondary">
                  <Gauge className="w-4 h-4 mr-2" /> SPEED TEST
                </TabsTrigger>
              </TabsList>

              <div className="w-64 hidden md:block">
                <div className="flex justify-between text-xs mb-1 text-muted-foreground">
                  <span>GLOBAL_PROGRESS</span>
                  <span>{progress.toFixed(0)}%</span>
                </div>
                <Progress
                  value={progress}
                  className="h-2 bg-secondary/10"
                  indicatorClassName="bg-secondary shadow-[0_0_10px_theme('colors.secondary')]"
                />
              </div>
            </div>

            <TabsContent value="latency" className="flex-1 mt-0 h-full min-h-0">
              <Card className="border-border/50 bg-card/30 backdrop-blur-md h-full flex flex-col shadow-2xl overflow-hidden">
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-border/50 text-xs font-bold text-muted-foreground uppercase tracking-wider bg-black/40 shrink-0">
                  <div className="col-span-1">Stat</div>
                  <div className="col-span-4 md:col-span-5">IP Address</div>
                  <div className="col-span-3 md:col-span-2">Port</div>
                  <div className="col-span-2">Latency</div>
                  <div className="col-span-2 hidden md:block">ID</div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {sortedProxies.map((proxy) => (
                    <LatencyRow key={proxy.id} proxy={proxy} />
                  ))}
                  {sortedProxies.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                      <Activity className="w-12 h-12 mb-4 opacity-20" />
                      <p>NO TARGETS LOADED</p>
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="speed" className="flex-1 mt-0 h-full min-h-0">
              <Card className="border-border/50 bg-card/30 backdrop-blur-md h-full flex flex-col shadow-2xl overflow-hidden">
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-border/50 text-xs font-bold text-muted-foreground uppercase tracking-wider bg-black/40 shrink-0">
                  <div className="col-span-4">Node</div>
                  <div className="col-span-4">Download Progress (100MB)</div>
                  <div className="col-span-2">Speed</div>
                  <div className="col-span-2">Status</div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {speedTestProxies.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
                      <div className="p-6 rounded-full bg-white/5 border border-white/10">
                        <Gauge className="w-12 h-12 opacity-20" />
                      </div>
                      <p className="tracking-widest text-xs">NO ACTIVE NODES SELECTED</p>
                      <Button variant="outline" size="sm" onClick={() => setActiveTab('latency')} className="border-primary/20 text-primary hover:bg-primary/10">
                        RETURN TO SCANNER
                      </Button>
                    </div>
                  )}

                  {speedTestProxies.map((proxy) => (
                    <SpeedRow key={proxy.id} proxy={proxy} />
                  ))}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}