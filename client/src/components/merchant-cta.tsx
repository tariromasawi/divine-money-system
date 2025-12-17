import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";
import { motion } from "framer-motion";

export function MerchantCTA() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1 }}
      className="fixed bottom-6 left-6 z-50"
    >
      <Link href="/merchant-signup">
        <Button 
          size="lg" 
          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg shadow-green-500/25 gap-2"
          data-testid="floating-merchant-cta"
        >
          <Building2 className="w-5 h-5" />
          <span className="hidden sm:inline">Accept DLC Payments</span>
          <span className="sm:hidden">Merchants</span>
        </Button>
      </Link>
    </motion.div>
  );
}
