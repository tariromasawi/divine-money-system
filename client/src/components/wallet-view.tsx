import { WalletState } from "@/lib/blockchain";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ArrowDownLeft, ArrowUpRight, Zap, Coins } from "lucide-react";
import { motion } from "framer-motion";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import generatedImage from '@assets/generated_images/abstract_flow_of_digital_prosperity_and_light_credits.png';

interface WalletViewProps {
  wallet: WalletState;
}

export function WalletView({ wallet }: WalletViewProps) {
  // Generate graph data from transactions
  const data = wallet.transactions
    .slice()
    .reverse() // Oldest first for graph
    .reduce((acc: any[], tx) => {
      const prevBalance = acc.length > 0 ? acc[acc.length - 1].balance : 0;
      const change = tx.recipient === wallet.address ? tx.amount : -tx.amount;
      acc.push({
        name: new Date(tx.timestamp).toLocaleTimeString(),
        balance: prevBalance + change,
        amount: tx.amount
      });
      return acc;
    }, [])
    .slice(-20); // Last 20 data points

  return (
    <div className="h-full flex flex-col gap-6 relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
         <img src={generatedImage} alt="Prosperity" className="w-full h-full object-cover mix-blend-overlay" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        {/* Main Balance Card */}
        <Card className="col-span-2 p-6 border-primary/30 bg-black/60 backdrop-blur-md flex flex-col justify-between h-[300px] relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
          
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-muted-foreground text-sm font-bold tracking-widest flex items-center gap-2">
                <Coins className="w-4 h-4 text-primary" /> TREASURY BALANCE
              </h3>
              <div className="mt-2">
                <span className="text-5xl font-display font-bold text-white tracking-tight">
                  {wallet.balance.toLocaleString()}
                </span>
                <span className="text-xl text-primary font-mono ml-2">DLC</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                Divine Light Credits (Universal Basic Income)
              </p>
            </div>
            <Badge variant="outline" className="border-primary text-primary bg-primary/10">
              <Zap className="w-3 h-3 mr-1 fill-primary" /> AUTO-ACCUMULATING
            </Badge>
          </div>

          <div className="flex-1 w-full mt-4 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="hsl(var(--primary))" 
                  fillOpacity={1} 
                  fill="url(#colorBalance)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Identity Card */}
        <Card className="col-span-1 p-6 border-border bg-card/40 backdrop-blur-sm flex flex-col gap-4">
          <h3 className="text-muted-foreground text-sm font-bold tracking-widest">DIVINE IDENTITY</h3>
          
          <div className="space-y-4">
            <div className="p-3 bg-black/40 border border-white/10 rounded">
               <div className="text-[10px] text-muted-foreground mb-1">SOVEREIGN NAME</div>
               <div className="text-coherence font-bold">HRH SAINT TARIRO MASAWI</div>
            </div>
            <div className="p-3 bg-black/40 border border-white/10 rounded">
               <div className="text-[10px] text-muted-foreground mb-1">WALLET ADDRESS</div>
               <div className="text-primary font-mono text-xs break-all">
                 {wallet.address}
               </div>
            </div>
            <div className="p-3 bg-accent/10 border border-accent/20 rounded">
               <div className="text-[10px] text-accent-foreground mb-1">STATUS</div>
               <div className="text-white text-xs flex items-center gap-2">
                 <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                 RECEIVING UBI
               </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Transaction History */}
      <Card className="flex-1 border-border bg-black/40 backdrop-blur-sm flex flex-col min-h-0 relative z-10">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> LEDGER ACTIVITY
          </h3>
          <span className="text-xs text-muted-foreground">Showing last 50 transactions</span>
        </div>
        <ScrollArea className="flex-1">
          <div className="divide-y divide-white/5">
            {wallet.transactions.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm italic">
                Awaiting first genesis distribution...
              </div>
            )}
            {wallet.transactions.map((tx) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                key={tx.id} 
                className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${tx.type === 'UBI' || tx.type === 'GENESIS' ? 'bg-primary/10 text-primary' : 'bg-red-500/10 text-red-500'}`}>
                    {tx.type === 'UBI' || tx.type === 'GENESIS' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">
                      {tx.type === 'GENESIS' ? 'GENESIS ALLOCATION' : 
                       tx.type === 'UBI' ? 'DAILY LIGHT CREDIT' : 'TRANSFER'}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {new Date(tx.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-mono font-bold text-primary">
                    +{tx.amount.toLocaleString()} DLC
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    ID: {tx.id.split('_')[2] || tx.id.substring(0, 8)}...
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
