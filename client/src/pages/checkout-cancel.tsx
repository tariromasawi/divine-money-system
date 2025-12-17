import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShieldCheck, XCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Link } from "wouter";

export default function CheckoutCancel() {
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
              DIVINE MONEY
            </h1>
            <div className="text-[10px] font-mono text-muted-foreground tracking-wider">
              MASOWE FAITH GROUP LTD | BLOCKCHAIN VERIFIED
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
          <Card className="max-w-lg w-full p-8 bg-card/50 border-border text-center" data-testid="checkout-cancel-card">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted/20 border-2 border-muted-foreground/30 flex items-center justify-center"
            >
              <XCircle className="w-10 h-10 text-muted-foreground" />
            </motion.div>

            <h2 className="text-3xl font-display text-white mb-3" data-testid="text-cancel-title">
              Payment Cancelled
            </h2>
            
            <p className="text-muted-foreground mb-6">
              Your payment was not completed. No charges have been made to your account.
              Your cart items are still saved.
            </p>

            <div className="bg-background/50 rounded-lg p-4 mb-6 border border-border">
              <p className="text-sm text-muted-foreground">
                If you experienced any issues during checkout, please try again or contact us for assistance.
              </p>
            </div>

            <div className="mt-8 flex gap-4 justify-center flex-wrap">
              <Link href="/store">
                <Button variant="outline" data-testid="button-return-store">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Return to Store
                </Button>
              </Link>
              <Link href="/store">
                <Button data-testid="button-try-again">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
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
