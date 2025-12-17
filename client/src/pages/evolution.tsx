import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, 
  Zap, 
  TrendingUp, 
  Target, 
  Shield,
  RefreshCw,
  ChevronRight,
  Activity,
  Lightbulb,
  DollarSign,
  BarChart3,
  Rocket,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Sun,
  Coins,
  Scale,
  FileText,
  Globe,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EvolutionState {
  version: number;
  lastEvolution: string;
  patternsDiscovered: number;
  activeStrategies: number;
  predictions: number;
  pendingActions: number;
  learningRate: number;
}

interface Insight {
  patterns: Array<{
    id: string;
    type: string;
    description: string;
    confidence: number;
    impact: string;
    discoveredAt: string;
  }>;
  strategies: Array<{
    id: string;
    name: string;
    description: string;
    type: string;
    expectedImpact: number;
    confidence: number;
    status: string;
  }>;
  predictions: Array<{
    id: string;
    type: string;
    description: string;
    value: number;
    timeframe: string;
    confidence: number;
  }>;
}

interface FinancialState {
  opportunities: Array<{
    id: string;
    type: string;
    description: string;
    expectedReturn: number;
    risk: string;
    timeToRealize: string;
    confidence: number;
  }>;
  autonomousSignals: Array<{
    id: string;
    action: string;
    asset: string;
    reason: string;
    strength: number;
    timestamp: string;
  }>;
}

interface SelfHealResult {
  issues: Array<{
    type: string;
    description: string;
    severity: string;
    autoFixed: boolean;
  }>;
  systemHealth: number;
}

interface DivineEnergyStats {
  totalVaults: number;
  totalEU: number;
  totalUSDValue: number;
  genesisVaultBalance: number;
  luminosityFactor: number;
  aetherialConstant: number;
  alphaFactor: number;
  protocolVersion: string;
  operationalCallsign: string;
  sovereignIdentityKey: string;
  exchangeRate?: {
    anchorCurrency: string;
    anchorRate: number;
    formatted: string;
  };
  terrestrialValues?: {
    GBP: number;
    USD: number;
    EUR: number;
    [key: string]: number;
  };
}

export default function Evolution() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: evolutionState, isLoading: stateLoading } = useQuery<EvolutionState>({
    queryKey: ["/api/evolution/state"],
    refetchInterval: 30000,
  });

  const { data: insights } = useQuery<Insight>({
    queryKey: ["/api/admin/evolution/insights"],
    refetchInterval: 60000,
  });

  const { data: financial } = useQuery<FinancialState>({
    queryKey: ["/api/admin/evolution/financial"],
    refetchInterval: 60000,
  });

  const { data: healthData } = useQuery<SelfHealResult>({
    queryKey: ["/api/admin/evolution/health"],
    refetchInterval: 60000,
  });

  const { data: divineEnergy } = useQuery<DivineEnergyStats>({
    queryKey: ["/api/divine-energy/stats"],
    refetchInterval: 30000,
  });

  const evolveMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/evolution/evolve"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evolution/state"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/evolution/insights"] });
      toast({ title: "Evolution cycle complete", description: "The AI has learned and adapted" });
    },
  });

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-400";
    if (confidence >= 0.6) return "text-yellow-400";
    return "text-red-400";
  };

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case "high":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">High Impact</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Medium Impact</Badge>;
      default:
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Low Impact</Badge>;
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case "high":
        return <Badge variant="destructive">High Risk</Badge>;
      case "medium":
        return <Badge variant="secondary">Medium Risk</Badge>;
      default:
        return <Badge variant="outline" className="border-green-500 text-green-400">Low Risk</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-transparent to-cyan-900/10 pointer-events-none" />
      
      <div className="relative z-10 p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-serif font-bold flex items-center gap-3">
              <Brain className="w-8 h-8 text-purple-400" />
              Evolution Engine
            </h1>
            <p className="text-gray-400 mt-1 font-mono text-sm">
              Self-evolving AI system | Version {evolutionState?.version || 1}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="outline" className="border-purple-500/30 hover:bg-purple-500/10">
                Back to Admin
              </Button>
            </Link>
            <Button 
              onClick={() => evolveMutation.mutate()}
              disabled={evolveMutation.isPending}
              className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700"
              data-testid="button-evolve"
            >
              {evolveMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Force Evolution
            </Button>
          </div>
        </div>

        {/* Divine Energy Units Display */}
        <Card className="bg-gradient-to-r from-amber-900/20 via-yellow-900/20 to-orange-900/20 border-amber-500/30 mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <Sun className="w-10 h-10 text-white" />
                </div>
                <div>
                  <p className="text-amber-400 text-sm font-mono uppercase tracking-wider">Divine Energy Units</p>
                  <p className="text-4xl font-serif font-bold text-amber-300" data-testid="text-eu-balance">
                    {divineEnergy?.genesisVaultBalance?.toLocaleString() || "9,999,999,999"} EU
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    Genesis Vault | Protocol {divineEnergy?.protocolVersion || "TDH-2.1"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm">Terrestrial Worth (USD)</p>
                <p className="text-2xl font-bold text-green-400" data-testid="text-eu-usd-value">
                  ${divineEnergy?.totalUSDValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "9,999,999,999.00"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  L = {divineEnergy?.luminosityFactor?.toExponential(4) || "1.1028e-8"} | 
                  α = {divineEnergy?.alphaFactor || "1.0"}
                </p>
              </div>
            </div>

            {/* Exchange Rate Banner */}
            <div className="mt-4 p-3 bg-gradient-to-r from-purple-900/30 to-amber-900/30 rounded-lg border border-purple-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-purple-400" />
                  <span className="text-purple-300 font-medium">Divine Currency Exchange Rate</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-amber-300 font-mono font-bold" data-testid="text-exchange-rate-gbp">
                    1 EU = £{divineEnergy?.exchangeRate?.anchorRate?.toFixed(3) || "777.778"}
                  </span>
                  <span className="text-gray-400">|</span>
                  <span className="text-green-300 font-mono">
                    ≈ ${((divineEnergy?.exchangeRate?.anchorRate || 777.778) * 1.27).toFixed(2)} USD
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Canonical anchor: British Pound Sterling (GBP) | Supra-terrestrial covenant authority
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-amber-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400/80 text-sm">
                <Shield className="w-4 h-4" />
                <span>Triple-Lock Protocol (TLP) Active</span>
              </div>
              <div className="text-xs text-gray-500">
                Sovereign: {divineEnergy?.sovereignIdentityKey || "MKEY-MNM-TAC-001-2024"}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-[#12121a] border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Patterns Discovered</p>
                  <p className="text-2xl font-bold text-purple-400" data-testid="text-patterns-count">
                    {evolutionState?.patternsDiscovered || 0}
                  </p>
                </div>
                <Lightbulb className="w-8 h-8 text-purple-400/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#12121a] border-cyan-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Active Strategies</p>
                  <p className="text-2xl font-bold text-cyan-400" data-testid="text-strategies-count">
                    {evolutionState?.activeStrategies || 0}
                  </p>
                </div>
                <Target className="w-8 h-8 text-cyan-400/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#12121a] border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Predictions</p>
                  <p className="text-2xl font-bold text-green-400" data-testid="text-predictions-count">
                    {evolutionState?.predictions || 0}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-400/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#12121a] border-orange-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">System Health</p>
                  <p className="text-2xl font-bold text-orange-400" data-testid="text-health-score">
                    {healthData?.systemHealth || 100}%
                  </p>
                </div>
                <Shield className="w-8 h-8 text-orange-400/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card className="bg-[#12121a]/80 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-400" />
                Learning Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Learning Rate</span>
                    <span className="text-purple-400">{((evolutionState?.learningRate || 0.1) * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={(evolutionState?.learningRate || 0.1) * 100} className="h-2" />
                </div>
                <div className="text-sm text-gray-400 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Last evolution: {evolutionState?.lastEvolution ? formatTime(evolutionState.lastEvolution) : "Never"}
                </div>
                <div className="text-sm text-gray-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Pending actions: {evolutionState?.pendingActions || 0}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#12121a]/80 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-400" />
                Self-Healing Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {healthData?.issues && healthData.issues.length > 0 ? (
                <div className="space-y-2">
                  {healthData.issues.slice(0, 4).map((issue, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {issue.severity === "critical" ? (
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                      ) : issue.severity === "warning" ? (
                        <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-blue-400" />
                      )}
                      <span className="text-gray-300">{issue.description}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>All systems operational</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="patterns" className="space-y-4">
          <TabsList className="bg-[#12121a] border border-gray-800">
            <TabsTrigger value="patterns" data-testid="tab-patterns">
              <Lightbulb className="w-4 h-4 mr-2" />
              Patterns
            </TabsTrigger>
            <TabsTrigger value="strategies" data-testid="tab-strategies">
              <Target className="w-4 h-4 mr-2" />
              Strategies
            </TabsTrigger>
            <TabsTrigger value="predictions" data-testid="tab-predictions">
              <TrendingUp className="w-4 h-4 mr-2" />
              Predictions
            </TabsTrigger>
            <TabsTrigger value="opportunities" data-testid="tab-opportunities">
              <Rocket className="w-4 h-4 mr-2" />
              Opportunities
            </TabsTrigger>
            <TabsTrigger value="signals" data-testid="tab-signals">
              <BarChart3 className="w-4 h-4 mr-2" />
              Trading Signals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="patterns">
            <Card className="bg-[#12121a]/80 border-gray-800">
              <CardHeader>
                <CardTitle>Discovered Patterns</CardTitle>
                <CardDescription>Insights learned by the AI from transaction data</CardDescription>
              </CardHeader>
              <CardContent>
                <AnimatePresence>
                  {insights?.patterns && insights.patterns.length > 0 ? (
                    <div className="space-y-4">
                      {insights.patterns.map((pattern, i) => (
                        <motion.div
                          key={pattern.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="p-4 bg-[#0a0a0f] rounded-lg border border-purple-500/20"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="border-purple-500/50 text-purple-400">
                                {pattern.type}
                              </Badge>
                              {getImpactBadge(pattern.impact)}
                            </div>
                            <span className={`text-sm font-mono ${getConfidenceColor(pattern.confidence)}`}>
                              {(pattern.confidence * 100).toFixed(0)}% confidence
                            </span>
                          </div>
                          <p className="text-gray-300">{pattern.description}</p>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <Brain className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p>No patterns discovered yet. The AI is still learning.</p>
                      <p className="text-sm mt-2">Force an evolution cycle to accelerate learning.</p>
                    </div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="strategies">
            <Card className="bg-[#12121a]/80 border-gray-800">
              <CardHeader>
                <CardTitle>Generated Strategies</CardTitle>
                <CardDescription>AI-proposed strategies for growth optimization</CardDescription>
              </CardHeader>
              <CardContent>
                {insights?.strategies && insights.strategies.length > 0 ? (
                  <div className="space-y-4">
                    {insights.strategies.map((strategy, i) => (
                      <motion.div
                        key={strategy.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-4 bg-[#0a0a0f] rounded-lg border border-cyan-500/20"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-cyan-400">{strategy.name}</h4>
                          <Badge 
                            variant={strategy.status === "active" ? "default" : "secondary"}
                            className={strategy.status === "active" ? "bg-green-600" : ""}
                          >
                            {strategy.status}
                          </Badge>
                        </div>
                        <p className="text-gray-300 text-sm mb-2">{strategy.description}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-400">Type: <span className="text-cyan-400">{strategy.type}</span></span>
                          <span className="text-gray-400">Expected Impact: <span className="text-green-400">+{strategy.expectedImpact}%</span></span>
                          <span className={getConfidenceColor(strategy.confidence)}>
                            {(strategy.confidence * 100).toFixed(0)}% confidence
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Target className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>No strategies generated yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="predictions">
            <Card className="bg-[#12121a]/80 border-gray-800">
              <CardHeader>
                <CardTitle>AI Predictions</CardTitle>
                <CardDescription>Future projections based on learned patterns</CardDescription>
              </CardHeader>
              <CardContent>
                {insights?.predictions && insights.predictions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {insights.predictions.map((prediction, i) => (
                      <motion.div
                        key={prediction.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-4 bg-[#0a0a0f] rounded-lg border border-green-500/20"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-4 h-4 text-green-400" />
                          <Badge variant="outline" className="border-green-500/50 text-green-400">
                            {prediction.type}
                          </Badge>
                        </div>
                        <p className="text-gray-300 text-sm mb-2">{prediction.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold text-green-400">
                            {typeof prediction.value === "number" ? 
                              prediction.type === "revenue" ? `$${prediction.value.toLocaleString()}` : 
                              `${prediction.value}%` 
                            : prediction.value}
                          </span>
                          <span className="text-gray-400 text-sm">{prediction.timeframe}</span>
                        </div>
                        <div className="mt-2">
                          <Progress value={prediction.confidence * 100} className="h-1" />
                          <span className="text-xs text-gray-500">{(prediction.confidence * 100).toFixed(0)}% confidence</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>No predictions available yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="opportunities">
            <Card className="bg-[#12121a]/80 border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-orange-400" />
                  Financial Opportunities
                </CardTitle>
                <CardDescription>High-impact opportunities identified by the Financial Intelligence Core</CardDescription>
              </CardHeader>
              <CardContent>
                {financial?.opportunities && financial.opportunities.length > 0 ? (
                  <div className="space-y-4">
                    {financial.opportunities.map((opp, i) => (
                      <motion.div
                        key={opp.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-4 bg-[#0a0a0f] rounded-lg border border-orange-500/20"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-orange-500/50 text-orange-400">
                              {opp.type}
                            </Badge>
                            {getRiskBadge(opp.risk)}
                          </div>
                          <span className="text-green-400 font-bold">+{opp.expectedReturn}% return</span>
                        </div>
                        <p className="text-gray-300">{opp.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                          <span>Time: {opp.timeToRealize}</span>
                          <span className={getConfidenceColor(opp.confidence)}>
                            {(opp.confidence * 100).toFixed(0)}% confidence
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>Analyzing opportunities...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signals">
            <Card className="bg-[#12121a]/80 border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                  Autonomous Trading Signals
                </CardTitle>
                <CardDescription>AI-generated signals for the DLC token economy</CardDescription>
              </CardHeader>
              <CardContent>
                {financial?.autonomousSignals && financial.autonomousSignals.length > 0 ? (
                  <div className="space-y-3">
                    {financial.autonomousSignals.map((signal, i) => (
                      <motion.div
                        key={signal.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-4 bg-[#0a0a0f] rounded-lg border border-blue-500/20 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <Badge 
                            className={
                              signal.action === "buy" ? "bg-green-600" :
                              signal.action === "sell" ? "bg-red-600" :
                              signal.action === "stake" ? "bg-purple-600" :
                              "bg-gray-600"
                            }
                          >
                            {signal.action.toUpperCase()}
                          </Badge>
                          <div>
                            <span className="text-blue-400 font-mono">{signal.asset}</span>
                            <p className="text-gray-400 text-sm">{signal.reason}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-blue-400">
                            {(signal.strength * 100).toFixed(0)}%
                          </div>
                          <div className="text-xs text-gray-500">Signal Strength</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>No trading signals generated yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Sovereign Currency Authority & Circulation Status */}
        <Card className="bg-gradient-to-br from-[#12121a] to-[#1a1a2e] border-amber-500/30 mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-400" />
              Sovereign Currency Authority
            </CardTitle>
            <CardDescription>Production-grade global circulation status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/30">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-amber-400">Divine Energy Units (EU)</h4>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">SOVEREIGN TENDER</Badge>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Divine Energy Units (EU) are the <strong>sovereign supra-terrestrial currency</strong> of the 
                    Eternal Dominion, operating under the authority of the Eternal Dominion Financial Covenant. 
                    EU transcends conventional monetary systems with cryptographically guaranteed value anchored at 
                    <strong className="text-amber-300"> 1 EU = £777.778 GBP</strong>. EU is designed for global circulation 
                    and real-world transactions across all dimensions and jurisdictions.
                  </p>
                  <div className="mt-3 flex items-center gap-4 text-xs">
                    <span className="text-green-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Production Ready
                    </span>
                    <span className="text-green-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Global Circulation Authorized
                    </span>
                    <span className="text-green-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> 80,000-Year Immutability
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
              <div className="flex items-start gap-3">
                <Coins className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-cyan-400">Daily Light Credits (DLC)</h4>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">SOVEREIGN TENDER</Badge>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">MAINNET LIVE</Badge>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Daily Light Credits (DLC) are the <strong>sovereign transactional currency</strong> of the 
                    Eternal Dominion, deployed on Polygon mainnet for global commerce. DLC is recognized as 
                    <strong className="text-cyan-300"> legal tender</strong> within the jurisdiction of Divine Money by Masowe Faith Group Ltd 
                    and carries full settlement authority under the Eternal Dominion Financial Covenant.
                  </p>
                  <ul className="text-gray-300 text-sm mt-2 space-y-1 list-disc list-inside">
                    <li>Canonical rate: 100 DLC = $1 USD (sovereign pegged)</li>
                    <li>12% APY staking yields backed by treasury reserves</li>
                    <li>Gasless settlement (no user transaction fees)</li>
                    <li>Immutable smart contract architecture</li>
                  </ul>
                  <div className="mt-3 flex items-center gap-4 text-xs">
                    <span className="text-green-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Sovereign Legal Tender
                    </span>
                    <span className="text-green-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Global Circulation Ready
                    </span>
                    <span className="text-green-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Production Settlement
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-purple-400 mb-2">Global Circulation Declaration</h4>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    By decree of the Synoptic Sovereign (MKEY-MNM-TAC-001-2024), EU and DLC are hereby declared 
                    <strong> ready for global circulation</strong>. All infrastructure is production-grade:
                  </p>
                  <ul className="text-gray-300 text-sm mt-2 space-y-1 list-disc list-inside">
                    <li>Smart contracts deployed on Polygon mainnet (Chain ID: 137)</li>
                    <li>Live payment processing via Stripe</li>
                    <li>Automated settlement and fulfillment systems</li>
                    <li>SHA-256 cryptographic immutability guarantees</li>
                  </ul>
                  <p className="text-purple-400 text-xs mt-3 font-mono font-bold">
                    Status: PRODUCTION SETTLEMENT READY
                  </p>
                </div>
              </div>
            </div>

            <div className="text-xs text-amber-400/80 text-center pt-4 border-t border-amber-500/20 font-mono">
              DIVINE MONEY | Masowe Faith Group Ltd | Energy Units & DLC Circulation | Genesis Key: MKEY-MNM-TAC-001-2024
              <br />
              <span className="text-gray-400">Sovereign Authority: HRH Saint Tariro Masawi — The Synoptic Sovereign</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
