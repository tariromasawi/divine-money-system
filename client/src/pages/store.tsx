import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { AIAssistant } from "@/components/ai-assistant";
import { ShoppingCart, Package, Loader2, Plus, Minus, Trash2, CreditCard, ShieldCheck, Sparkles, Home, Settings, BookOpen, Headphones, FileText, Video, Calendar, Users, PenTool, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import type { Product, CartItem } from "@shared/schema";

function getSessionId(): string {
  let sessionId = localStorage.getItem('masowe_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('masowe_session_id', sessionId);
  }
  return sessionId;
}

const SESSION_ID = getSessionId();

const getCategoryIcon = (category: string | null) => {
  const iconClass = "w-12 h-12 text-primary/50";
  switch (category?.toLowerCase()) {
    case 'online course':
    case 'business course':
      return <Video className={iconClass} />;
    case 'e-book':
      return <BookOpen className={iconClass} />;
    case 'audio program':
      return <Headphones className={iconClass} />;
    case 'workbook':
    case 'digital planner':
      return <PenTool className={iconClass} />;
    case 'digital cards':
    case 'template kit':
      return <FileText className={iconClass} />;
    case 'coaching':
      return <Users className={iconClass} />;
    default:
      return <Sparkles className={iconClass} />;
  }
};

export default function Store() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCart, setShowCart] = useState(false);
  const [checkoutEmail, setCheckoutEmail] = useState("");
  const [checkoutName, setCheckoutName] = useState("");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: cartItems = [], isLoading: cartLoading } = useQuery<(CartItem & { product: Product })[]>({
    queryKey: ["/api/cart"],
    queryFn: async () => {
      const res = await fetch("/api/cart", {
        headers: { "x-session-id": SESSION_ID },
      });
      return res.json();
    },
  });

  const { data: org } = useQuery<{ name: string; identityKey: string; ownerName: string } | null>({
    queryKey: ["/api/organization"],
  });

  const addToCartMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": SESSION_ID,
        },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
  });

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      if (quantity <= 0) {
        await fetch(`/api/cart/${id}`, { method: "DELETE" });
      } else {
        await fetch(`/api/cart/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity }),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
  });

  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      setCheckoutError(null);
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": SESSION_ID,
        },
        body: JSON.stringify({
          customerEmail: checkoutEmail,
          customerName: checkoutName,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Checkout failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      } else {
        setOrderSuccess(data.orderId);
        setShowCart(false);
        queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
        toast({
          title: "Order Created!",
          description: "Your order has been recorded on the blockchain.",
        });
      }
    },
    onError: (error: Error) => {
      setCheckoutError(error.message);
      toast({
        title: "Checkout Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cartTotal = cartItems.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0
  );

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-background text-foreground font-ui flex flex-col">
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-primary/10 border border-primary/30 flex items-center justify-center rounded relative overflow-hidden">
              <ShieldCheck className="text-primary w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-display text-white tracking-wider" data-testid="store-title">
                {org?.name || "MASOWE FAITH GROUP LTD"}
              </h1>
              <div className="text-[10px] font-mono text-muted-foreground tracking-wider">
                VERIFIED BLOCKCHAIN COMMERCE
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="link-home">
                <Home className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/admin">
              <Button variant="ghost" size="icon" data-testid="link-admin">
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
            <Button
              variant="outline"
              className="relative"
              onClick={() => setShowCart(true)}
              data-testid="button-cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-primary text-[10px]">
                  {cartCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-1">
        {orderSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 bg-coherence/10 border border-coherence/30 rounded-lg text-center"
          >
            <ShieldCheck className="w-12 h-12 mx-auto text-coherence mb-4" />
            <h3 className="text-xl font-display text-white mb-2">Order Confirmed!</h3>
            <p className="text-muted-foreground mb-2">Your order has been recorded on our blockchain ledger.</p>
            <p className="text-xs font-mono text-coherence">Order ID: {orderSuccess}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setOrderSuccess(null)}
            >
              Continue Shopping
            </Button>
          </motion.div>
        )}

        <div className="mb-8 text-center">
          <h2 className="text-3xl font-display text-white mb-2">Our Products</h2>
          <p className="text-muted-foreground">Every purchase is verified on our immutable blockchain ledger</p>
        </div>

        {productsLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-display text-white mb-2">No Products Available</h3>
            <p className="text-muted-foreground">Check back soon for new offerings</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                data-testid={`card-product-${product.id}`}
              >
                <Card className="overflow-hidden border-border bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-colors group">
                  {product.imageUrl ? (
                    <div className="aspect-video bg-muted overflow-hidden">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 opacity-20">
                        <div className="absolute top-4 right-4 w-20 h-20 bg-primary/30 rounded-full blur-2xl" />
                        <div className="absolute bottom-4 left-4 w-16 h-16 bg-accent/30 rounded-full blur-2xl" />
                      </div>
                      {getCategoryIcon(product.category)}
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-display text-lg text-white" data-testid={`text-product-name-${product.id}`}>
                        {product.name}
                      </h3>
                      {product.category && (
                        <Badge variant="outline" className="text-[10px]">
                          {product.category}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {product.description || "Premium quality product"}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-display text-primary" data-testid={`text-price-${product.id}`}>
                        ${Number(product.price).toFixed(2)}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => addToCartMutation.mutate(product.id)}
                        disabled={addToCartMutation.isPending}
                        data-testid={`button-add-cart-${product.id}`}
                      >
                        {addToCartMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-1" /> Add to Cart
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <AnimatePresence>
        {showCart && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-end"
            onClick={() => setShowCart(false)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="w-full max-w-md bg-background border-l border-border h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h2 className="font-display text-xl text-white">Your Cart</h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowCart(false)}>
                    Close
                  </Button>
                </div>

                <ScrollArea className="flex-1 p-4">
                  {cartItems.length === 0 ? (
                    <div className="text-center py-10">
                      <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Your cart is empty</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cartItems.map((item) => (
                        <Card key={item.id} className="p-4 bg-card/50" data-testid={`cart-item-${item.id}`}>
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <h4 className="font-medium text-white">{item.product.name}</h4>
                              <p className="text-sm text-primary">
                                ${Number(item.product.price).toFixed(2)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  updateQuantityMutation.mutate({
                                    id: item.id,
                                    quantity: item.quantity - 1,
                                  })
                                }
                                data-testid={`button-decrease-${item.id}`}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-8 text-center">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  updateQuantityMutation.mutate({
                                    id: item.id,
                                    quantity: item.quantity + 1,
                                  })
                                }
                                data-testid={`button-increase-${item.id}`}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() =>
                                  updateQuantityMutation.mutate({ id: item.id, quantity: 0 })
                                }
                                data-testid={`button-remove-${item.id}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {cartItems.length > 0 && (
                  <div className="p-4 border-t border-border space-y-4">
                    <div className="flex justify-between items-center text-lg">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-display text-primary" data-testid="text-cart-total">
                        ${cartTotal.toFixed(2)}
                      </span>
                    </div>
                    <Separator />
                    <div className="space-y-3">
                      <Input
                        placeholder="Your Name"
                        value={checkoutName}
                        onChange={(e) => setCheckoutName(e.target.value)}
                        data-testid="input-checkout-name"
                      />
                      <Input
                        type="email"
                        placeholder="Your Email (required)"
                        value={checkoutEmail}
                        onChange={(e) => setCheckoutEmail(e.target.value)}
                        data-testid="input-checkout-email"
                        className={!checkoutEmail ? "border-yellow-500/50" : ""}
                      />
                      {checkoutError && (
                        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
                          <AlertCircle className="w-4 h-4" />
                          {checkoutError}
                        </div>
                      )}
                      <Button
                        className="w-full"
                        size="lg"
                        disabled={!checkoutEmail || checkoutMutation.isPending}
                        onClick={() => checkoutMutation.mutate()}
                        data-testid="button-checkout"
                      >
                        {checkoutMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <CreditCard className="w-4 h-4 mr-2" />
                        )}
                        Proceed to Checkout
                      </Button>
                      {!checkoutEmail && (
                        <p className="text-xs text-yellow-500/80 text-center">
                          Please enter your email to continue
                        </p>
                      )}
                    </div>
                    <p className="text-[10px] text-center text-muted-foreground">
                      Secured by blockchain verification
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="border-t border-border py-8 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span className="font-display text-white">{org?.name}</span>
          </div>
          <p className="text-xs font-mono text-muted-foreground mb-2">
            Operated by {org?.ownerName}
          </p>
          <p className="text-xs font-mono text-muted-foreground/50">
            Identity Key: {org?.identityKey}
          </p>
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span>Blockchain Verified</span>
            <span className="w-1 h-1 bg-muted-foreground rounded-full" />
            <span>Secure Payments</span>
            <span className="w-1 h-1 bg-muted-foreground rounded-full" />
            <span>Digital Delivery</span>
          </div>
        </div>
      </footer>

      <AIAssistant />
    </div>
  );
}
