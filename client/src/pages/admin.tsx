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
  DollarSign, TrendingUp, Layers, Activity, CheckCircle, Clock, XCircle, Eye
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { Link } from "wouter";
import type { Product, Order, LedgerBlock, LedgerTransaction } from "@shared/schema";

export default function Admin() {
  const queryClient = useQueryClient();
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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

  return (
    <div className="min-h-screen bg-background text-foreground font-ui flex flex-col">
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-accent/10 border border-accent/30 flex items-center justify-center rounded">
              <ShieldCheck className="text-accent w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-display text-white tracking-wider">OWNER CONSOLE</h1>
              <div className="text-[10px] font-mono text-muted-foreground">
                {stats?.organization?.identityKey || "MKEY-MNM-TAC-001-2024"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
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
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {order.customerName || order.customerEmail}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleString()}
                        </p>
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
                        {order.status === 'paid' && (
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
