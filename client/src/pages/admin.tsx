import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ShieldCheck, Package, ShoppingBag, BarChart3, Loader2, Plus, Edit, Trash2, 
  DollarSign, TrendingUp, Layers, Activity, CheckCircle, Clock, XCircle, Eye, Brain,
  Store, Globe, Users, Building2, Wallet, Lock, Sparkles, Send, Terminal, Zap, CreditCard
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import type { Product, Order, LedgerBlock, LedgerTransaction } from "@shared/schema";

const OWNER_EMAILS = (process.env.OWNER_EMAILS || "").split(",").map(email => email.trim().toLowerCase()).filter(Boolean);

export default function Admin() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const { data: user, isLoading: userLoading } = useQuery<{ id: string; email: string; firstName: string; lastName: string } | null>({
    queryKey: ["/api/auth/user"],
  });

  const isOwner = user?.email && OWNER_EMAILS.includes(user.email);

  const { data: stats } = useQuery<{
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    blockHeight: number;
    totalTransactions: number;
    walletBalance: number;
    organization: any;
  }>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/admin/products"],
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const { data: blocks = [] } = useQuery<LedgerBlock[]>({
    queryKey: ["/api/ledger/blocks"],
  });

  const { data: transactions = [] } = useQuery<LedgerTransaction[]>({
    queryKey: ["/api/ledger/transactions"],
  });

  const { data: systemStats } = useQuery<{
    protocol: string;
    merchants: {
      total: number;
      active: number;
      verified: number;
      fiatEnabled: number;
      byCountry: Record<string, number>;
    };
    volume: {
      totalDLC: number;
      totalEUR: number;
      totalTransactions: number;
    };
  }>({
    queryKey: ["/api/system/stats"],
  });

  const { data: merchantDirectory = { merchants: [] } } = useQuery<{
    merchants: Array<{
      id: string;
      name: string;
      walletAddress: string;
      country?: string;
      fiatEnabled: boolean;
      totalTransactions: number;
      joinedAt: string;
    }>;
  }>({
    queryKey: ["/api/merchants/directory"],
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      setProductDialogOpen(false);
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      setEditingProduct(null);
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, fulfilledAt: status === 'fulfilled' ? new Date() : null }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
  });

  const mineUBIMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/ledger/mine-ubi", { method: "POST" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ledger/blocks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ledger/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
  });

  const ProductForm = ({ onSubmit, initialData }: { onSubmit: (data: any) => void; initialData?: Product }) => {
    const [formData, setFormData] = useState({
      name: initialData?.name || "",
      description: initialData?.description || "",
      price: initialData?.price?.toString() || "",
      category: initialData?.category || "",
      imageUrl: initialData?.imageUrl || "",
      stockQuantity: initialData?.stockQuantity?.toString() || "0",
      isActive: initialData?.isActive ?? true,
    });

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Product Name</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter product name"
            data-testid="input-product-name"
          />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Product description"
            data-testid="input-product-description"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Price (USD)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0.00"
              data-testid="input-product-price"
            />
          </div>
          <div className="space-y-2">
            <Label>Stock Quantity</Label>
            <Input
              type="number"
              value={formData.stockQuantity}
              onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
              placeholder="0"
              data-testid="input-product-stock"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Input
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="e.g., Digital, Physical, Service"
            data-testid="input-product-category"
          />
        </div>
        <div className="space-y-2">
          <Label>Image URL</Label>
          <Input
            value={formData.imageUrl}
            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
            placeholder="https://..."
            data-testid="input-product-image"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            data-testid="switch-product-active"
          />
          <Label>Active (visible in store)</Label>
        </div>
        <Button
          className="w-full"
          onClick={() => onSubmit(formData)}
          data-testid="button-save-product"
        >
          {initialData ? "Update Product" : "Create Product"}
        </Button>
      </div>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'fulfilled': return <Package className="w-4 h-4 text-primary" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!user || !isOwner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md mx-auto p-8"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center">
            <Lock className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-display text-white mb-2">ACCESS DENIED</h1>
          <p className="text-muted-foreground mb-6">
            The Owner Console is restricted to authorized administrators only.
            {!user && " Please sign in with an authorized account."}
          </p>
          <div className="space-y-3">
            {!user ? (
              <Button onClick={() => window.location.href = "/api/login"} className="w-full" data-testid="button-login">
                Sign In
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Signed in as: {user.email}
              </p>
            )}
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
    <div className="min-h-screen bg-background text-foreground font-ui flex flex-col">
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-accent/10 border border-accent/30 flex items-center justify-center rounded">
              <ShieldCheck className="text-accent w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-display text-white tracking-wider">DIVINE MONEY - OWNER CONSOLE</h1>
              <div className="text-[10px] font-mono text-muted-foreground">
                Masowe Faith Group Ltd | {stats?.organization?.identityKey || "MKEY-MNM-TAC-001-2024"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/superintelligence">
              <Button variant="outline" size="sm" className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10" data-testid="link-swarm">
                <Sparkles className="w-4 h-4 mr-2" /> AI Swarm
              </Button>
            </Link>
            <Link href="/evolution">
              <Button variant="outline" size="sm" className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10" data-testid="link-evolution">
                <Brain className="w-4 h-4 mr-2" /> Evolution AI
              </Button>
            </Link>
            <Link href="/store">
              <Button variant="outline" size="sm" data-testid="link-view-store">
                <Eye className="w-4 h-4 mr-2" /> View Store
              </Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="link-network-view">
                Network View
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 border-primary/20 bg-card/50" data-testid="stat-products">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Package className="w-4 h-4" />
              <span className="text-xs">Products</span>
            </div>
            <span className="text-3xl font-display text-white">{stats?.totalProducts || 0}</span>
          </Card>
          <Card className="p-4 border-primary/20 bg-card/50" data-testid="stat-orders">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <ShoppingBag className="w-4 h-4" />
              <span className="text-xs">Orders</span>
            </div>
            <span className="text-3xl font-display text-white">{stats?.totalOrders || 0}</span>
          </Card>
          <Card className="p-4 border-primary/20 bg-card/50" data-testid="stat-revenue">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs">Revenue</span>
            </div>
            <span className="text-3xl font-display text-primary">${stats?.totalRevenue?.toFixed(2) || "0.00"}</span>
          </Card>
          <Card className="p-4 border-coherence/20 bg-card/50" data-testid="stat-wallet">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">Treasury (DLC)</span>
            </div>
            <span className="text-3xl font-display text-coherence">{stats?.walletBalance?.toLocaleString() || 0}</span>
          </Card>
        </div>

        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="products" data-testid="tab-products">
              <Package className="w-4 h-4 mr-2" /> Products
            </TabsTrigger>
            <TabsTrigger value="orders" data-testid="tab-orders">
              <ShoppingBag className="w-4 h-4 mr-2" /> Orders
            </TabsTrigger>
            <TabsTrigger value="blockchain" data-testid="tab-blockchain">
              <Layers className="w-4 h-4 mr-2" /> Blockchain
            </TabsTrigger>
            <TabsTrigger value="merchants" data-testid="tab-merchants">
              <Store className="w-4 h-4 mr-2" /> Merchants
            </TabsTrigger>
            <TabsTrigger value="ai-command" data-testid="tab-ai-command">
              <Terminal className="w-4 h-4 mr-2" /> AI Command
            </TabsTrigger>
            <TabsTrigger value="virtual-cards" data-testid="tab-virtual-cards">
              <CreditCard className="w-4 h-4 mr-2" /> Cards
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-display text-white">Product Catalog</h2>
              <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-product">
                    <Plus className="w-4 h-4 mr-2" /> Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border" aria-describedby={undefined}>
                  <DialogHeader>
                    <DialogTitle className="font-display">Add New Product</DialogTitle>
                    <DialogDescription className="sr-only">Fill in the product details below</DialogDescription>
                  </DialogHeader>
                  <ProductForm onSubmit={(data) => createProductMutation.mutate(data)} />
                </DialogContent>
              </Dialog>
            </div>

            {products.length === 0 ? (
              <Card className="p-10 text-center border-dashed">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-display text-lg text-white mb-2">No Products Yet</h3>
                <p className="text-muted-foreground mb-4">Add your first product to start selling</p>
                <Button onClick={() => setProductDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Add Product
                </Button>
              </Card>
            ) : (
              <div className="grid gap-4">
                {products.map((product) => (
                  <Card key={product.id} className="p-4 bg-card/50 hover:bg-card/70 transition-colors" data-testid={`admin-product-${product.id}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded bg-muted flex items-center justify-center overflow-hidden">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-white">{product.name}</h3>
                          <Badge variant={product.isActive ? "default" : "secondary"}>
                            {product.isActive ? "Active" : "Draft"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{product.category || "Uncategorized"}</p>
                        <div className="flex items-center gap-4 mt-1 text-sm">
                          <span className="text-primary">${Number(product.price).toFixed(2)}</span>
                          <span className="text-muted-foreground">Stock: {product.stockQuantity}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setEditingProduct(product)} data-testid={`button-edit-${product.id}`}>
                              <Edit className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-card border-border" aria-describedby={undefined}>
                            <DialogHeader>
                              <DialogTitle className="font-display">Edit Product</DialogTitle>
                              <DialogDescription className="sr-only">Edit the product details below</DialogDescription>
                            </DialogHeader>
                            <ProductForm
                              initialData={product}
                              onSubmit={(data) => updateProductMutation.mutate({ id: product.id, ...data })}
                            />
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this product?")) {
                              deleteProductMutation.mutate(product.id);
                            }
                          }}
                          data-testid={`button-delete-${product.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <h2 className="text-xl font-display text-white">Order Management</h2>
            
            {orders.length === 0 ? (
              <Card className="p-10 text-center border-dashed">
                <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-display text-lg text-white mb-2">No Orders Yet</h3>
                <p className="text-muted-foreground">Orders will appear here when customers make purchases</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id} className="p-4 bg-card/50" data-testid={`order-${order.id}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(order.status)}
                          <span className="font-mono text-sm text-white">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </span>
                          <Badge variant="outline">{order.status}</Badge>
                          {order.fulfilledAt && (
                            <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                              <CheckCircle className="w-3 h-3 mr-1" /> Auto-Delivered
                            </Badge>
                          )}
                          {order.status === 'paid' && order.paidAt && !order.fulfilledAt && (
                            <Badge variant="destructive" className="bg-red-500/20 text-red-400">
                              <XCircle className="w-3 h-3 mr-1" /> Email Failed
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {order.customerName || order.customerEmail}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Ordered: {new Date(order.createdAt).toLocaleString()}
                        </p>
                        {order.fulfilledAt && (
                          <p className="text-xs text-green-400/70">
                            Email sent: {new Date(order.fulfilledAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-display text-primary">
                          ${Number(order.totalAmount).toFixed(2)}
                        </span>
                        {order.blockHash && (
                          <p className="text-[10px] font-mono text-coherence mt-1">
                            Block: {order.blockHash.slice(0, 12)}...
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {order.status === 'paid' && !order.fulfilledAt && (
                          <Button
                            size="sm"
                            onClick={() => updateOrderMutation.mutate({ id: order.id, status: 'fulfilled' })}
                            data-testid={`button-fulfill-${order.id}`}
                          >
                            Mark Fulfilled
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="blockchain" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-display text-white">Blockchain Ledger</h2>
                <p className="text-sm text-muted-foreground">
                  Block Height: {stats?.blockHeight || 0} | Transactions: {stats?.totalTransactions || 0}
                </p>
              </div>
              <Button
                onClick={() => mineUBIMutation.mutate()}
                disabled={mineUBIMutation.isPending}
                data-testid="button-mine-ubi"
              >
                {mineUBIMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Activity className="w-4 h-4 mr-2" />
                )}
                Mine UBI Block
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-4 bg-black/50 border-border">
                <h3 className="font-display text-sm text-primary mb-4">Recent Blocks</h3>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {blocks.map((block) => (
                      <div
                        key={block.id}
                        className="p-3 bg-card/30 border border-border/50 rounded text-xs font-mono"
                        data-testid={`block-${block.id}`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-primary">Block #{block.index}</span>
                          <span className="text-coherence">{Number(block.coherenceScore).toFixed(4)}</span>
                        </div>
                        <p className="text-muted-foreground truncate">{block.hash}</p>
                        <p className="text-white/60 text-[10px] mt-1">{block.data}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>

              <Card className="p-4 bg-black/50 border-border">
                <h3 className="font-display text-sm text-primary mb-4">Recent Transactions</h3>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-3 bg-card/30 border border-border/50 rounded text-xs font-mono"
                        data-testid={`tx-${tx.id}`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <Badge variant="outline" className="text-[10px]">{tx.type}</Badge>
                          <span className="text-coherence">+{Number(tx.amount).toLocaleString()}</span>
                        </div>
                        <p className="text-muted-foreground truncate">
                          {tx.sender} → {tx.recipient}
                        </p>
                        <p className="text-white/40 text-[10px] mt-1">
                          {new Date(tx.timestamp).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="merchants" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-display text-white">Mass DLC Adoption Engine</h2>
                <p className="text-sm text-muted-foreground">
                  Protocol: {systemStats?.protocol || "MDAE-1.0"} | Global Merchant Network
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="p-4 bg-gradient-to-br from-primary/20 to-transparent border-primary/30">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Store className="w-4 h-4" />
                  <span className="text-xs">Total Merchants</span>
                </div>
                <span className="text-3xl font-display text-white">{systemStats?.merchants?.total || 0}</span>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-green-500/20 to-transparent border-green-500/30">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-xs">Verified</span>
                </div>
                <span className="text-3xl font-display text-green-400">{systemStats?.merchants?.verified || 0}</span>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-blue-500/20 to-transparent border-blue-500/30">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Globe className="w-4 h-4" />
                  <span className="text-xs">Fiat Enabled</span>
                </div>
                <span className="text-3xl font-display text-blue-400">{systemStats?.merchants?.fiatEnabled || 0}</span>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-coherence/20 to-transparent border-coherence/30">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Wallet className="w-4 h-4" />
                  <span className="text-xs">DLC Volume</span>
                </div>
                <span className="text-2xl font-display text-coherence">{systemStats?.volume?.totalDLC?.toLocaleString() || 0}</span>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-purple-500/20 to-transparent border-purple-500/30">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Activity className="w-4 h-4" />
                  <span className="text-xs">Transactions</span>
                </div>
                <span className="text-3xl font-display text-purple-400">{systemStats?.volume?.totalTransactions || 0}</span>
              </Card>
            </div>

            {Object.keys(systemStats?.merchants?.byCountry || {}).length > 0 && (
              <Card className="p-4 bg-black/50 border-border">
                <h3 className="font-display text-sm text-primary mb-4">Merchants by Country</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(systemStats?.merchants?.byCountry || {}).map(([country, count]) => (
                    <Badge key={country} variant="outline" className="text-sm">
                      {country}: {count}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            <Card className="p-4 bg-black/50 border-border">
              <h3 className="font-display text-sm text-primary mb-4">Verified Merchant Directory</h3>
              {merchantDirectory.merchants.length === 0 ? (
                <div className="text-center py-8">
                  <Store className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-display text-lg text-white mb-2">No Merchants Yet</h3>
                  <p className="text-muted-foreground">
                    Use the API to register merchants or bulk onboard via /api/merchants/bulk-register
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {merchantDirectory.merchants.map((merchant) => (
                      <div
                        key={merchant.id}
                        className="p-3 bg-card/30 border border-border/50 rounded flex items-center justify-between"
                        data-testid={`merchant-${merchant.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{merchant.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {merchant.walletAddress.slice(0, 10)}...{merchant.walletAddress.slice(-8)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          {merchant.country && (
                            <Badge variant="outline">{merchant.country}</Badge>
                          )}
                          {merchant.fiatEnabled && (
                            <Badge className="bg-blue-500/20 text-blue-400">EUR</Badge>
                          )}
                          <span className="text-muted-foreground">
                            {merchant.totalTransactions} txns
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </Card>

            <Card className="p-4 bg-gradient-to-br from-primary/10 to-coherence/10 border-primary/30">
              <h3 className="font-display text-sm text-white mb-2">Integration Guide</h3>
              <p className="text-sm text-muted-foreground mb-4">
                External businesses can integrate DLC payments using these API endpoints:
              </p>
              <div className="grid md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3 bg-black/50 rounded">
                  <p className="text-primary mb-1">GET /api/merchants/abi</p>
                  <p className="text-muted-foreground">Contract addresses & integration guide</p>
                </div>
                <div className="p-3 bg-black/50 rounded">
                  <p className="text-primary mb-1">POST /api/merchants/register</p>
                  <p className="text-muted-foreground">Register single merchant</p>
                </div>
                <div className="p-3 bg-black/50 rounded">
                  <p className="text-primary mb-1">POST /api/merchants/bulk-register</p>
                  <p className="text-muted-foreground">Bulk onboard up to 1000 merchants</p>
                </div>
                <div className="p-3 bg-black/50 rounded">
                  <p className="text-primary mb-1">POST /api/merchants/relay</p>
                  <p className="text-muted-foreground">Process DLC payment (gasless)</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="ai-command" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 bg-gradient-to-br from-amber-500/10 to-purple-500/10 border-amber-500/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg text-white">AI Swarm Council</h3>
                    <p className="text-xs text-muted-foreground">1000+ superintelligent entities</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Communicate with the Superintelligence Swarm. Send strategic queries, receive collective wisdom responses, and direct the AI entities.
                </p>
                <Link href="/superintelligence">
                  <Button className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/50" data-testid="button-open-council">
                    <Sparkles className="w-4 h-4 mr-2" /> Open Council Chamber
                  </Button>
                </Link>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border-purple-500/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg text-white">Evolution Engine</h3>
                    <p className="text-xs text-muted-foreground">Self-evolving AI system</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Monitor the autonomous evolution system. View generated strategies, predictions, and self-improvement insights.
                </p>
                <Link href="/evolution">
                  <Button className="w-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/50" data-testid="button-open-evolution">
                    <Brain className="w-4 h-4 mr-2" /> Open Evolution Dashboard
                  </Button>
                </Link>
              </Card>
            </div>

            <Card className="p-6 border-primary/30">
              <div className="flex items-center gap-3 mb-4">
                <Terminal className="w-6 h-6 text-primary" />
                <h3 className="font-display text-lg text-white">Quick Commands</h3>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => window.open('/superintelligence', '_self')}
                  data-testid="button-query-swarm"
                >
                  <Zap className="w-5 h-5 text-amber-400" />
                  <span className="text-xs">Query Swarm Intelligence</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => fetch('/api/admin/evolution/evolve', { method: 'POST' }).then(() => alert('Evolution cycle triggered!'))}
                  data-testid="button-trigger-evolution"
                >
                  <Activity className="w-5 h-5 text-purple-400" />
                  <span className="text-xs">Trigger Evolution Cycle</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => window.open('/evolution', '_self')}
                  data-testid="button-view-insights"
                >
                  <Eye className="w-5 h-5 text-cyan-400" />
                  <span className="text-xs">View AI Insights</span>
                </Button>
              </div>
            </Card>

            <Card className="p-6 bg-black/30 border-border">
              <h3 className="font-display text-sm text-white mb-3">System Capabilities</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                  <div>
                    <p className="text-white">Swarm Council Chat</p>
                    <p className="text-xs text-muted-foreground">Send messages to the collective AI intelligence</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                  <div>
                    <p className="text-white">Evolution Triggers</p>
                    <p className="text-xs text-muted-foreground">Manually trigger AI evolution cycles</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                  <div>
                    <p className="text-white">Strategy Generation</p>
                    <p className="text-xs text-muted-foreground">AI-generated business strategies</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                  <div>
                    <p className="text-white">Financial Intelligence</p>
                    <p className="text-xs text-muted-foreground">Monte Carlo simulations & forecasts</p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="virtual-cards" className="space-y-4">
            <VirtualCardsAdmin />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-border py-6 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs font-mono text-muted-foreground">
            {stats?.organization?.name} | Owner Console
          </p>
          <p className="text-xs font-mono text-muted-foreground/50 mt-1">
            Identity Key: {stats?.organization?.identityKey}
          </p>
        </div>
      </footer>
    </div>
  );
}

function VirtualCardsAdmin() {
  const queryClient = useQueryClient();
  
  const { data: cardData, isLoading } = useQuery<{
    cards: any[];
    stats: { total: number; pending: number; active: number; frozen: number };
  }>({
    queryKey: ["/api/cards/admin/requests"],
  });

  const approveMutation = useMutation({
    mutationFn: async (cardId: string) => {
      const res = await fetch(`/api/cards/admin/approve/${cardId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Failed to approve card");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cards/admin/requests"] });
    },
  });

  const freezeMutation = useMutation({
    mutationFn: async ({ cardId, permanent }: { cardId: string; permanent: boolean }) => {
      const res = await fetch(`/api/cards/admin/freeze/${cardId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permanent }),
      });
      if (!res.ok) throw new Error("Failed to freeze card");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cards/admin/requests"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const cards = cardData?.cards || [];
  const cardStats = cardData?.stats || { total: 0, pending: 0, active: 0, frozen: 0 };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-display text-white">Virtual Card Management</h2>
          <p className="text-sm text-muted-foreground">DLC-funded Visa/Mastercard cards</p>
        </div>
        <Badge variant="outline" className="border-primary text-primary">
          {process.env.KULIPA_API_KEY ? "Kulipa Connected" : "Pending Integration"}
        </Badge>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 border-border bg-card/50">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <CreditCard className="w-4 h-4" />
            <span className="text-xs">Total Cards</span>
          </div>
          <span className="text-2xl font-display text-white">{cardStats.total}</span>
        </Card>
        <Card className="p-4 border-yellow-500/30 bg-card/50">
          <div className="flex items-center gap-2 text-yellow-400 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs">Pending</span>
          </div>
          <span className="text-2xl font-display text-yellow-400">{cardStats.pending}</span>
        </Card>
        <Card className="p-4 border-green-500/30 bg-card/50">
          <div className="flex items-center gap-2 text-green-400 mb-1">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs">Active</span>
          </div>
          <span className="text-2xl font-display text-green-400">{cardStats.active}</span>
        </Card>
        <Card className="p-4 border-red-500/30 bg-card/50">
          <div className="flex items-center gap-2 text-red-400 mb-1">
            <XCircle className="w-4 h-4" />
            <span className="text-xs">Frozen</span>
          </div>
          <span className="text-2xl font-display text-red-400">{cardStats.frozen}</span>
        </Card>
      </div>

      <Card className="p-4 bg-gradient-to-r from-primary/10 to-cyan-500/10 border-primary/30">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-primary/20">
            <CreditCard className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-white mb-1">About Virtual Cards</h3>
            <p className="text-sm text-muted-foreground">
              Users can request virtual Visa/Mastercard cards funded by their DLC balance. 
              Cards work anywhere these networks are accepted. 100 DLC = $1 USD.
            </p>
          </div>
        </div>
      </Card>

      {cards.length === 0 ? (
        <Card className="p-10 text-center border-dashed">
          <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-display text-lg text-white mb-2">No Card Requests Yet</h3>
          <p className="text-muted-foreground">Card requests will appear here for approval</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => (
            <Card key={card.id} className="p-4 bg-card/50 hover:bg-card/70 transition-colors" data-testid={`card-request-${card.id}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${
                    card.cardStatus === "active" ? "bg-green-500/20" :
                    card.cardStatus === "pending" ? "bg-yellow-500/20" :
                    card.cardStatus === "frozen" ? "bg-red-500/20" :
                    "bg-gray-500/20"
                  }`}>
                    <CreditCard className={`w-5 h-5 ${
                      card.cardStatus === "active" ? "text-green-400" :
                      card.cardStatus === "pending" ? "text-yellow-400" :
                      card.cardStatus === "frozen" ? "text-red-400" :
                      "text-gray-400"
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-white">{card.userName}</p>
                    <p className="text-xs text-muted-foreground">{card.userEmail}</p>
                    <p className="text-xs font-mono text-muted-foreground mt-1">
                      {card.walletAddress?.slice(0, 10)}...{card.walletAddress?.slice(-8)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <Badge variant={
                      card.cardStatus === "active" ? "default" :
                      card.cardStatus === "pending" ? "secondary" :
                      "destructive"
                    }>
                      {card.cardStatus}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {card.currency} • ${card.dailyLimit}/day
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    {card.cardStatus === "pending" && (
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate(card.id)}
                        disabled={approveMutation.isPending}
                        data-testid={`approve-card-${card.id}`}
                      >
                        {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      </Button>
                    )}
                    {card.cardStatus === "active" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => freezeMutation.mutate({ cardId: card.id, permanent: false })}
                        disabled={freezeMutation.isPending}
                        data-testid={`freeze-card-${card.id}`}
                      >
                        <Lock className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
