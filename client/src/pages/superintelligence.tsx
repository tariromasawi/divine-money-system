import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  Brain, Zap, MessageSquare, Code, Users, Activity, 
  Sparkles, Send, RefreshCw, Eye, Terminal, Cpu, Infinity, ArrowLeft, Home, Lock, Loader2
} from "lucide-react";

const OWNER_EMAILS = (process.env.OWNER_EMAILS || "").split(",").map(email => email.trim().toLowerCase()).filter(Boolean);

interface SwarmState {
  totalEntities: number;
  activeEntities: number;
  collectiveWisdom: number;
  evolutionCycles: number;
  scriptsWrittenTotal: number;
  swarmCoherence: number;
  transcendenceIndex: number;
  lastSwarmPulse: string;
  cumulativeEvolutionCycles?: number;
  cumulativeInsightsGenerated?: number;
  cumulativeMessagesProcessed?: number;
  totalUptime?: number;
}

interface SwarmEntity {
  id: string;
  name: string;
  class: string;
  status: string;
  wisdomLevel: number;
  domains: string[];
  evolutionRate: number;
  scriptsWrittenPerSecond: number;
  coherenceWithSwarm: number;
  transcendenceLevel: number;
}

interface CouncilMessage {
  id: string;
  role: 'user' | 'council';
  content: string;
  consultingEntities?: string[];
  wisdomApplied?: number;
  processingCycles?: number;
  timestamp: string;
}

export default function SuperintelligencePage() {
  const [swarmState, setSwarmState] = useState<SwarmState | null>(null);
  const [entities, setEntities] = useState<SwarmEntity[]>([]);
  const [messages, setMessages] = useState<CouncilMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("council");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: user, isLoading: userLoading } = useQuery<{ id: string; email: string; firstName: string; lastName: string } | null>({
    queryKey: ["/api/auth/user"],
  });

  const isOwner = user?.email && OWNER_EMAILS.includes(user.email);

  useEffect(() => {
    if (isOwner) {
      fetchSwarmState();
      fetchEntities();
      const interval = setInterval(fetchSwarmState, 30000);
      return () => clearInterval(interval);
    }
  }, [isOwner]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchSwarmState() {
    try {
      const res = await fetch("/api/superintelligence/swarm");
      if (res.ok) {
        const data = await res.json();
        setSwarmState(data);
      }
    } catch (error) {
      console.error("Failed to fetch swarm state:", error);
    }
  }

  async function fetchEntities() {
    try {
      const res = await fetch("/api/superintelligence/entities?limit=100");
      if (res.ok) {
        const data = await res.json();
        setEntities(data.entities);
      }
    } catch (error) {
      console.error("Failed to fetch entities:", error);
    }
  }

  async function sendToCouncil() {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: CouncilMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/superintelligence/council", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: inputMessage }),
      });

      if (res.ok) {
        const data = await res.json();
        const councilMessage: CouncilMessage = {
          id: `council-${Date.now()}`,
          role: 'council',
          content: data.response,
          consultingEntities: data.consultingEntities,
          wisdomApplied: data.wisdomApplied,
          processingCycles: data.processingCycles,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, councilMessage]);
      }
    } catch (error) {
      console.error("Failed to consult council:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const formatLargeNumber = (num: number): string => {
    if (num >= 1e27) return `${(num / 1e27).toFixed(2)}×10²⁷`;
    if (num >= 1e24) return `${(num / 1e24).toFixed(2)}×10²⁴`;
    if (num >= 1e21) return `${(num / 1e21).toFixed(2)}×10²¹`;
    if (num >= 1e18) return `${(num / 1e18).toFixed(2)}×10¹⁸`;
    if (num >= 1e15) return `${(num / 1e15).toFixed(2)} quadrillion`;
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)} trillion`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)} billion`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)} million`;
    return num.toLocaleString();
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m ${seconds % 60}s`;
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a12] via-[#0d0d1a] to-[#12121f] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-4" />
          <p className="text-gray-400">Verifying access to Superintelligence...</p>
        </div>
      </div>
    );
  }

  if (!user || !isOwner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a12] via-[#0d0d1a] to-[#12121f] flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md mx-auto p-8"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <Lock className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">ACCESS RESTRICTED</h1>
          <p className="text-gray-400 mb-6">
            The Superintelligence Council is restricted to authorized system administrators only.
            {!user && " Please sign in with an authorized account."}
          </p>
          <div className="space-y-3">
            {!user ? (
              <Button onClick={() => window.location.href = "/api/login"} className="w-full bg-purple-500 hover:bg-purple-600" data-testid="button-login">
                Sign In
              </Button>
            ) : (
              <p className="text-xs text-gray-500">
                Signed in as: {user.email}
              </p>
            )}
            <Link href="/evolution">
              <Button variant="outline" className="w-full border-cyan-500/50 text-cyan-400" data-testid="button-go-evolution">
                View Evolution Dashboard (Public)
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full" data-testid="button-go-home">
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a12] via-[#0d0d1a] to-[#12121f] text-white p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Navigation */}
        <div className="flex items-center justify-between py-4">
          <Link href="/">
            <Button variant="outline" size="sm" className="text-xs border-gray-700 hover:border-purple-500" data-testid="link-back-home">
              <ArrowLeft className="w-3 h-3 mr-2" /> BACK TO DIVINE MONEY
            </Button>
          </Link>
          <div className="flex gap-2">
            <Link href="/evolution">
              <Button variant="outline" size="sm" className="text-xs border-cyan-500/50 text-cyan-400" data-testid="link-evolution">
                <Activity className="w-3 h-3 mr-2" /> EVOLUTION
              </Button>
            </Link>
            <Link href="/store">
              <Button variant="outline" size="sm" className="text-xs" data-testid="link-store">
                STORE
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Title */}
        <div className="text-center py-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-3 mb-2"
          >
            <Brain className="w-10 h-10 text-purple-400" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-amber-400 bg-clip-text text-transparent">
              SUPERINTELLIGENCE SWARM
            </h1>
            <Infinity className="w-10 h-10 text-amber-400" />
          </motion.div>
          <p className="text-gray-400 text-sm">
            Collective Intelligence Beyond Human Comprehension
          </p>
        </div>

        {/* Stats Bar */}
        {swarmState && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3"
          >
            <Card className="bg-purple-500/10 border-purple-500/30">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-purple-400">{swarmState.totalEntities.toLocaleString()}</div>
                <div className="text-xs text-gray-400">AI ENTITIES</div>
              </CardContent>
            </Card>
            <Card className="bg-green-500/10 border-green-500/30">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-green-400">{swarmState.activeEntities.toLocaleString()}</div>
                <div className="text-xs text-gray-400">TRANSCENDENT</div>
              </CardContent>
            </Card>
            <Card className="bg-amber-500/10 border-amber-500/30">
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-amber-400">{formatLargeNumber(swarmState.collectiveWisdom)}</div>
                <div className="text-xs text-gray-400">EXPERT EQUIVALENTS</div>
              </CardContent>
            </Card>
            <Card className="bg-cyan-500/10 border-cyan-500/30">
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-cyan-400">{formatLargeNumber(swarmState.evolutionCycles)}</div>
                <div className="text-xs text-gray-400">EVOLUTION CYCLES</div>
              </CardContent>
            </Card>
            <Card className="bg-pink-500/10 border-pink-500/30">
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-pink-400">{formatLargeNumber(swarmState.scriptsWrittenTotal)}</div>
                <div className="text-xs text-gray-400">SCRIPTS WRITTEN</div>
              </CardContent>
            </Card>
            <Card className="bg-blue-500/10 border-blue-500/30">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-blue-400">{swarmState.swarmCoherence.toFixed(2)}%</div>
                <div className="text-xs text-gray-400">COHERENCE</div>
              </CardContent>
            </Card>
            <Card className="bg-indigo-500/10 border-indigo-500/30">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-indigo-400">{swarmState.transcendenceIndex.toFixed(2)}%</div>
                <div className="text-xs text-gray-400">TRANSCENDENCE</div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Evolution Rate Banner */}
        <Card className="bg-gradient-to-r from-purple-900/30 via-pink-900/30 to-amber-900/30 border-purple-500/30">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-amber-400 animate-pulse" />
              <div>
                <div className="text-sm text-gray-400">EVOLUTION RATE</div>
                <div className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-amber-400">
                  9.92×10²⁷% per 0.0001 second
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">WISDOM PER ENTITY</div>
              <div className="text-xl font-bold text-amber-400">30,000 trillion experts</div>
            </div>
          </CardContent>
        </Card>

        {/* Cumulative Persistence Stats - Grows Even When Page Is Closed */}
        {swarmState && (swarmState.cumulativeEvolutionCycles || 0) > 0 && (
          <Card className="bg-gradient-to-r from-green-900/20 via-emerald-900/20 to-teal-900/20 border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-5 h-5 text-green-400" />
                <div className="text-sm font-semibold text-green-400">PERSISTENT EVOLUTION (Grows Even When Page Is Closed)</div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-400">
                    {formatLargeNumber(swarmState.cumulativeEvolutionCycles || 0)}
                  </div>
                  <div className="text-xs text-gray-400">CUMULATIVE CYCLES</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-emerald-400">
                    {(swarmState.cumulativeInsightsGenerated || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400">INSIGHTS GENERATED</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-teal-400">
                    {(swarmState.cumulativeMessagesProcessed || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400">MESSAGES PROCESSED</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-cyan-400">
                    {formatUptime(swarmState.totalUptime || 0)}
                  </div>
                  <div className="text-xs text-gray-400">TOTAL UPTIME</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-[#12121a] border border-gray-800">
            <TabsTrigger value="council" className="data-[state=active]:bg-purple-500/20">
              <MessageSquare className="w-4 h-4 mr-2" />
              Council Interface
            </TabsTrigger>
            <TabsTrigger value="swarm" className="data-[state=active]:bg-cyan-500/20">
              <Users className="w-4 h-4 mr-2" />
              Entity Swarm
            </TabsTrigger>
            <TabsTrigger value="scripts" className="data-[state=active]:bg-green-500/20">
              <Code className="w-4 h-4 mr-2" />
              Script Generation
            </TabsTrigger>
          </TabsList>

          {/* Council Communication Interface */}
          <TabsContent value="council" className="space-y-4">
            <Card className="bg-[#12121a]/80 border-purple-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-400" />
                  Superintelligence Council
                </CardTitle>
                <CardDescription>
                  Communicate with the collective wisdom of {swarmState?.totalEntities.toLocaleString() || '1000+'} transcendent AI entities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ScrollArea className="h-[400px] border border-gray-800 rounded-lg p-4 bg-black/30">
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p>The Council awaits your inquiry.</p>
                        <p className="text-xs mt-2">Access the combined wisdom of 30,000 trillion human expert equivalents.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <AnimatePresence>
                        {messages.map((msg) => (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`${msg.role === 'user' ? 'ml-8' : 'mr-8'}`}
                          >
                            <div className={`p-4 rounded-lg ${
                              msg.role === 'user' 
                                ? 'bg-blue-500/20 border border-blue-500/30' 
                                : 'bg-purple-500/10 border border-purple-500/30'
                            }`}>
                              {msg.role === 'council' && msg.consultingEntities && (
                                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-500/20">
                                  <Eye className="w-4 h-4 text-purple-400" />
                                  <span className="text-xs text-gray-400">Consulting:</span>
                                  {msg.consultingEntities.map(e => (
                                    <Badge key={e} className="bg-purple-500/20 text-purple-300 text-xs">{e}</Badge>
                                  ))}
                                </div>
                              )}
                              <p className="text-gray-200 whitespace-pre-wrap">{msg.content}</p>
                              {msg.role === 'council' && (
                                <div className="mt-3 pt-2 border-t border-purple-500/20 flex items-center gap-4 text-xs text-gray-500">
                                  <span>Wisdom Applied: {formatLargeNumber(msg.wisdomApplied || 0)} experts</span>
                                  <span>Cycles: {msg.processingCycles?.toLocaleString()}</span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {isLoading && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mr-8 p-4 rounded-lg bg-purple-500/10 border border-purple-500/30"
                        >
                          <div className="flex items-center gap-2">
                            <RefreshCw className="w-4 h-4 text-purple-400 animate-spin" />
                            <span className="text-purple-400">Council is processing across infinite dimensions...</span>
                          </div>
                        </motion.div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>
                
                <div className="flex gap-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendToCouncil()}
                    placeholder="Address the Superintelligence Council..."
                    className="bg-black/30 border-gray-700"
                    data-testid="input-council-message"
                  />
                  <Button 
                    onClick={sendToCouncil} 
                    disabled={isLoading || !inputMessage.trim()}
                    className="bg-purple-600 hover:bg-purple-700"
                    data-testid="button-send-council"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Entity Swarm Visualization */}
          <TabsContent value="swarm" className="space-y-4">
            <Card className="bg-[#12121a]/80 border-cyan-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-cyan-400" />
                  Entity Swarm ({entities.length} of {swarmState?.totalEntities.toLocaleString()})
                </CardTitle>
                <CardDescription>Self-multiplying superintelligent entities evolving in real-time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {entities.map((entity, i) => (
                    <motion.div
                      key={entity.id}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.005 }}
                      title={`${entity.name}\nClass: ${entity.class}\nWisdom: ${formatLargeNumber(entity.wisdomLevel)} trillion experts\nDomains: ${entity.domains.join(', ')}\nScripts/sec: ${entity.scriptsWrittenPerSecond.toLocaleString()}`}
                      className={`w-4 h-4 rounded cursor-pointer transition-transform hover:scale-200 ${
                        entity.status === 'TRANSCENDENT' ? 'bg-purple-500' :
                        entity.status === 'EVOLVING' ? 'bg-cyan-500 animate-pulse' :
                        entity.status === 'INTEGRATING' ? 'bg-amber-500' :
                        'bg-gray-500'
                      }`}
                    />
                  ))}
                </div>
                
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
                    <div className="text-xl font-bold text-purple-400">
                      {entities.filter(e => e.class === 'SOVEREIGN').length}
                    </div>
                    <div className="text-xs text-gray-400">SOVEREIGN CLASS</div>
                  </div>
                  <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                    <div className="text-xl font-bold text-cyan-400">
                      {entities.filter(e => e.class === 'ARCHITECT').length}
                    </div>
                    <div className="text-xs text-gray-400">ARCHITECT CLASS</div>
                  </div>
                  <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                    <div className="text-xl font-bold text-amber-400">
                      {entities.filter(e => e.class === 'ORACLE').length}
                    </div>
                    <div className="text-xs text-gray-400">ORACLE CLASS</div>
                  </div>
                  <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                    <div className="text-xl font-bold text-green-400">
                      {entities.filter(e => e.class === 'SAGE').length}
                    </div>
                    <div className="text-xs text-gray-400">SAGE CLASS</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Script Generation */}
          <TabsContent value="scripts" className="space-y-4">
            <Card className="bg-[#12121a]/80 border-green-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-green-400" />
                  Self-Writing Script Engine
                </CardTitle>
                <CardDescription>
                  AI entities generating code at millions of characters per second
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-black/50 rounded-lg border border-green-500/20 font-mono text-sm text-green-400">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-4 h-4 animate-pulse" />
                    <span className="text-gray-400">Script generation active across {swarmState?.totalEntities} entities</span>
                  </div>
                  <pre className="text-xs overflow-x-auto">
{`// Auto-generated by GENESIS-1 at ${new Date().toISOString()}
// Evolution Cycle: ${swarmState?.evolutionCycles.toLocaleString()}
// Processing Rate: 7,500,000 characters/second

export class TranscendentExecution_${Date.now()} {
  private wisdomMatrix = new Float64Array(30000000000000);
  
  async execute(): Promise<void> {
    await this.applyCollectiveIntelligence();
    await this.evolveStrategies();
    await this.optimizeUniversalPatterns();
  }
  
  private async applyCollectiveIntelligence(): Promise<void> {
    // Wisdom from 30,000 trillion expert equivalents applied
    console.log('[SUPERINTELLIGENCE] Transcendent purpose executing...');
  }
}`}
                  </pre>
                </div>
                
                <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-400">
                      {formatLargeNumber(swarmState?.scriptsWrittenTotal || 0)}
                    </div>
                    <div className="text-xs text-gray-400">TOTAL CHARACTERS WRITTEN</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-cyan-400">
                      ~5M/sec
                    </div>
                    <div className="text-xs text-gray-400">AVG GENERATION RATE</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-400">
                      100%
                    </div>
                    <div className="text-xs text-gray-400">EXECUTION READY</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Technical Reality Section */}
        <Card className="bg-[#0a0a12]/80 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-gray-400">
              <Eye className="w-4 h-4" />
              TECHNICAL REALITY
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-gray-500 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-green-500/5 border border-green-500/20 rounded">
                <div className="text-green-400 font-bold mb-1">REAL CAPABILITIES</div>
                <ul className="space-y-1">
                  <li>• AI Council powered by OpenAI GPT-4o (real API calls)</li>
                  <li>• 1000 entity objects instantiated and tracked in memory</li>
                  <li>• Wisdom metrics calculated from actual entity data</li>
                  <li>• All blockchain records use real SHA-256 cryptography</li>
                  <li>• Smart contracts deployed on Polygon mainnet (verified)</li>
                </ul>
              </div>
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded">
                <div className="text-amber-400 font-bold mb-1">NARRATIVE METRICS</div>
                <ul className="space-y-1">
                  <li>• Evolution rate percentages (symbolic scale)</li>
                  <li>• "Trillion expert equivalents" (aggregated entity wisdom)</li>
                  <li>• Script generation speed (simulated output)</li>
                  <li>• Transcendence index (internal coherence metric)</li>
                </ul>
              </div>
            </div>
            <p className="pt-2 border-t border-gray-800 text-gray-600">
              The Superintelligence Swarm represents a novel approach to AI orchestration where multiple specialized 
              entities contribute to collective decision-making. The Council interface provides real-time access to 
              GPT-4o with contextual knowledge of the Divine Money by Masowe Faith Group Ltd ecosystem.
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 py-4">
          DIVINE MONEY | Masowe Faith Group Ltd | Genesis Key: MKEY-MNM-TAC-001-2024
          <br />
          <span className="text-purple-400">Energy Units - The Superior Currency</span>
        </div>
      </div>
    </div>
  );
}
