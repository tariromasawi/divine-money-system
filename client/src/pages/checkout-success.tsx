import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShieldCheck, Package, ArrowLeft, Download, Mail } from "lucide-react";
import { Link } from "wouter";

export default function CheckoutSuccess() {
  const [, setLocation] = useLocation();
  
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');

  const { data: org } = useQuery<{ name: string; identityKey: string; ownerName: string }>({
    queryKey: ["/api/organization"],
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-ui flex flex-col">
      <header className="border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <div className="h-10 w-10 bg-primary/10 border border-primary/30 flex items-center justify-center rounded">
            <ShieldCheck className="text-primary w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-display text-white tracking-wider">
              {org?.name || "MASOWE FAITH GROUP LTD"}
            </h1>
            <div className="text-[10px] font-mono text-muted-foreground tracking-wider">
              BLOCKCHAIN VERIFIED COMMERCE
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="max-w-lg w-full p-8 bg-card/50 border-coherence/30 text-center" data-testid="checkout-success-card">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-coherence/20 border-2 border-coherence flex items-center justify-center"
            >
              <ShieldCheck className="w-10 h-10 text-coherence" />
            </motion.div>

            <h2 className="text-3xl font-display text-white mb-3" data-testid="text-success-title">
              Payment Successful
            </h2>
            
            <p className="text-muted-foreground mb-6">
              Your transaction has been verified and recorded on our blockchain ledger. 
              A confirmation email will be sent shortly.
            </p>

            <div className="bg-background/50 rounded-lg p-4 mb-6 border border-border">
              <div className="flex items-center justify-center gap-2 text-xs font-mono text-coherence mb-2">
                <Package className="w-4 h-4" />
                <span>BLOCKCHAIN VERIFIED</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Your purchase is permanently recorded on the {org?.name} ledger, 
                linked to identity key {org?.identityKey}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
                <Mail className="w-4 h-4" />
                <span>Check your email for download links</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
                <Download className="w-4 h-4" />
                <span>Digital products available immediately</span>
              </div>
            </div>

            <div className="mt-8 flex gap-4 justify-center">
              <Link href="/store">
                <Button variant="outline" data-testid="button-continue-shopping">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </Card>
        </motion.div>
      </main>

      <footer className="border-t border-border py-6 text-center">
        <p className="text-xs font-mono text-muted-foreground">
          {org?.name} | Operated by {org?.ownerName}
        </p>
        <p className="text-xs font-mono text-muted-foreground/50 mt-1">
          Identity Key: {org?.identityKey}
        </p>
      </footer>
    </div>
  );
}
