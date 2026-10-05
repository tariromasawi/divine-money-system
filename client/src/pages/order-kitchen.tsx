import { Link, useParams } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, CircleAlert, Clock3, Download, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useOrderKitchen } from "@/hooks/use-operations";

const humanize = (value: string) => value.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const stageColor = (state: string) => state === "complete" ? "bg-[#dce9dc] text-[#4d674f]" : state === "running" ? "bg-[#e7e9d9] text-[#6e704c]" : "bg-[#ece7dc] text-[#887a65]";

export default function OrderKitchen() {
  const params = useParams<{ id: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const order = useOrderKitchen(params.id || "", isAuthenticated);
  if (authLoading) return <main className="min-h-[100dvh] bg-[#eee9de] p-6"><div className="mx-auto max-w-4xl animate-pulse"><div className="h-8 w-36 rounded bg-[#dfd9cd]" /><div className="mt-12 h-64 rounded-[2rem] bg-[#e2ddd2]" /></div></main>;
  return <main className="min-h-[100dvh] bg-[#eee9de] text-[#3b453c]">
    <header className="border-b border-[#d5d4c6] bg-[#f5f2e9]"><div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5">
      <Link href="/purchases" className="inline-flex items-center gap-2 text-sm text-[#687561] hover:text-[#3b453c]"><ArrowLeft className="h-4 w-4" />Your purchases</Link><Link href="/kitchen" className="text-[10px] uppercase tracking-[.18em] text-[#78856f] hover:text-[#3b453c]">Glass Kitchen</Link>
    </div></header>
    <div className="mx-auto max-w-4xl px-5 pb-20 pt-10 sm:pt-16">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="flex items-center gap-2 text-[10px] uppercase tracking-[.24em] text-[#71856c]"><ShieldCheck className="h-4 w-4" />Private order window</p>
        <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">Your order, in motion.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#737866]">Stages and protected downloads come from the service. Payment status is never guessed from this browser.</p>
      </motion.div>
      {!isAuthenticated ? <section className="mt-9 rounded-[1.5rem] border border-[#d5d4c6] bg-[#f7f4eb] p-8 text-center">
        <LockKeyhole className="mx-auto h-8 w-8 text-[#7c8d73]" /><h2 className="mt-4 font-display text-2xl">Sign in to view this order</h2><p className="mt-2 text-sm text-[#777969]">Order stages and files are private to the account that placed the order.</p><a href="/api/login" className="mt-5 inline-flex rounded-lg bg-[#536c57] px-5 py-3 text-sm text-white hover:bg-[#435a47]">Sign in</a>
      </section> : order.isLoading ? <div className="mt-9 space-y-4"><div className="h-40 animate-pulse rounded-[1.5rem] bg-[#e0ddd2]" /><div className="h-64 animate-pulse rounded-[1.5rem] bg-[#e0ddd2]" /></div> :
      order.isError ? <div className="mt-9 flex flex-col gap-4 rounded-2xl border border-[#d9b9a7] bg-[#f8eee8] p-6 sm:flex-row sm:items-center"><CircleAlert className="h-5 w-5 text-[#9a644e]" /><div className="flex-1"><h2 className="font-medium text-[#60483d]">Order status is unavailable</h2><p className="mt-1 text-sm text-[#795b4e]">{order.error instanceof Error ? order.error.message : "The order could not be loaded."}</p></div><Button variant="outline" onClick={() => order.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Try again</Button></div> :
      order.data && <div className="mt-9">
        <section className="overflow-hidden rounded-[1.6rem] border border-[#d5d4c6] bg-[#f7f4eb] shadow-[0_18px_50px_rgba(56,62,45,.06)]">
          <div className="flex flex-col gap-5 border-b border-[#e3dfd2] px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div><p className="font-mono text-[10px] uppercase tracking-[.17em] text-[#898a77]">Order record</p><h2 className="mt-2 break-all font-display text-2xl">{order.data.orderId}</h2></div>
            <div className="flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1.5 text-xs ${order.data.paymentVerified ? "bg-[#dce9dc] text-[#4d674f]" : "bg-[#ece7dc] text-[#887a65]"}`}>Payment · {order.data.paymentVerified ? "Verified by service" : "Not verified"}</span><span className="rounded-full bg-[#e7e9d9] px-3 py-1.5 text-xs text-[#666d4d]">Fulfilment · {humanize(order.data.fulfilmentState)}</span></div>
          </div>
          <div className="px-6 py-7 sm:px-8">
            <div className="grid gap-3 sm:grid-cols-2">
              {order.data.stages.map((stage, i) => <article key={`${stage.code}-${i}`} className="flex gap-4 rounded-xl border border-[#e5e1d5] bg-[#fbf9f2] p-4">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full font-mono text-xs ${stageColor(stage.state)}`}>{String(i + 1).padStart(2, "0")}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium">{stage.label}</h3><span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider ${stageColor(stage.state)}`}>{humanize(stage.state)}</span></div><p className="mt-1 font-mono text-[10px] text-[#8a8976]">{stage.code}</p></div>
              </article>)}
            </div>
            <div className="mt-7 border-t border-[#e3dfd2] pt-6">
              <div className="flex items-end justify-between"><div><p className="text-[10px] uppercase tracking-[.2em] text-[#858874]">Your items</p><h3 className="mt-1 font-display text-2xl">Files & fulfilment</h3></div><span className="inline-flex items-center gap-1.5 text-[10px] text-[#858874]"><Clock3 className="h-3.5 w-3.5" />Refreshes every 3 sec</span></div>
              <div className="mt-4 space-y-3">{order.data.items.map((item) => <article key={item.id} className="flex flex-col gap-4 rounded-xl border border-[#e5e1d5] bg-[#fbf9f2] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div><h4 className="font-medium">{item.name}</h4><p className="mt-1 text-xs text-[#828472]">{humanize(item.state)}{item.version == null ? "" : ` · Version ${item.version}`}</p></div>
                {item.downloadUrl ? <a href={item.downloadUrl} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#536c57] px-4 py-2.5 text-sm text-white hover:bg-[#435a47]"><Download className="h-4 w-4" />Protected download</a> : <span className="text-xs text-[#858472]">No download is available yet</span>}
              </article>)}
                {!order.data.items.length && <p className="rounded-xl border border-dashed border-[#d8d5c7] p-6 text-sm text-[#777969]">No items are listed for this order.</p>}
              </div>
            </div>
          </div>
        </section>
        <section className="mt-5 rounded-2xl border border-[#d5d4c6] bg-[#e8e8dc] p-5 sm:p-6"><p className="text-[10px] uppercase tracking-[.2em] text-[#78856f]">Chain record</p><h3 className="mt-2 font-display text-xl">Blockchain proof</h3><p className="mt-2 text-sm leading-6 text-[#6f7465]">{order.data.blockchain.description}</p><span className="mt-3 inline-block rounded-full bg-[#f1f0e8] px-3 py-1 text-[10px] uppercase tracking-wider text-[#818272]">{humanize(order.data.blockchain.state)}</span></section>
      </div>}
    </div>
  </main>;
}
