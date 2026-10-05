import { Link } from "wouter";
import { motion } from "framer-motion";
import { Activity, ArrowLeft, ArrowUpRight, CircleAlert, Clock3, RefreshCw, Sparkles, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKitchen } from "@/hooks/use-operations";

const stateName = (value: string) => value.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const stamp = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};

export default function GlassKitchen() {
  const kitchen = useKitchen();
  const data = kitchen.data;
  return <main className="min-h-[100dvh] overflow-hidden bg-[#101d1d] text-[#e7eee8]">
    <div className="pointer-events-none fixed inset-0 opacity-40" aria-hidden="true">
      <div className="absolute -right-32 -top-36 h-[34rem] w-[34rem] rounded-full border border-[#b3d6c2]/20" />
      <div className="absolute -right-16 -top-20 h-[25rem] w-[25rem] rounded-full border border-[#b3d6c2]/15" />
      <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-[#a2cdb9]/30 to-transparent" />
    </div>
    <header className="relative z-10 border-b border-[#d3e8dd]/10">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/store" className="inline-flex items-center gap-2 text-sm text-[#b8cbc1] transition hover:text-white"><ArrowLeft className="h-4 w-4" />Back to the store</Link>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[.25em] text-[#9bb8a8]"><span className="h-2 w-2 rounded-full bg-[#9bd1ad] shadow-[0_0_0_4px_rgba(155,209,173,.12)]" />Live public window</div>
      </div>
    </header>
    <div className="relative z-10 mx-auto max-w-7xl px-5 pb-20 pt-12 sm:px-8 sm:pt-20">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-12 lg:grid-cols-[1.12fr_.88fr] lg:items-end">
        <div>
          <p className="flex items-center gap-2 text-[10px] uppercase tracking-[.32em] text-[#9bc3aa]"><Sparkles className="h-3.5 w-3.5" />Divine Money · public observatory</p>
          <h1 className="mt-5 max-w-3xl font-display text-5xl leading-[.98] tracking-[-.045em] text-[#f0f3ea] sm:text-7xl">The Glass<br /><span className="text-[#a9cbb6]">Kitchen.</span></h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[#b0c1b7] sm:text-lg">A clear view into the making of digital goods. Watch the production line move, without exposing the people or private records behind it.</p>
          <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#c6ded0]/15 bg-[#a9cbb6]/[.07] px-3 py-2 text-[10px] uppercase tracking-[.18em] text-[#a8c4b3]"><Waves className="h-3.5 w-3.5" />Test environment · public projection</p>
        </div>
        <div className="relative min-h-[245px] overflow-hidden rounded-[2rem] border border-[#c8e1d2]/15 bg-[#1a2a29]/70 p-6 sm:p-8">
          <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(circle at 72% 32%, rgba(164,211,184,.2), transparent 37%), linear-gradient(130deg, transparent 48%, rgba(196,225,207,.08) 49%, transparent 50%)" }} />
          <div className="relative flex h-full min-h-[195px] flex-col justify-between">
            <div className="flex items-center justify-between"><span className="text-[10px] uppercase tracking-[.22em] text-[#92ac9d]">Production field</span><Activity className="h-4 w-4 text-[#a7cfb4]" /></div>
            <div className="flex items-center gap-2 sm:gap-3">
              {(data?.nodes || []).slice(0, 5).map((node, i) => <div key={node.id} className="flex min-w-0 flex-1 items-center gap-2">
                <div className={`relative grid aspect-square w-full max-w-[55px] place-items-center rounded-2xl border text-[10px] font-mono ${node.state.toLowerCase().includes("fail") ? "border-[#d49b88]/50 bg-[#6b4039]/40 text-[#e1ac99]" : "border-[#bad6c4]/20 bg-[#d3e9db]/[.07] text-[#c0d8c8]"}`}>
                  {String(i + 1).padStart(2, "0")}
                  {node.state.toLowerCase().includes("process") && <span className="absolute inset-0 animate-pulse rounded-2xl border border-[#a9d3b8]/40" />}
                </div>
                {i < Math.min((data?.nodes.length || 0) - 1, 4) && <span className="h-px flex-1 bg-[#b2d2bf]/25" />}
              </div>)}
              {!data?.nodes.length && [0, 1, 2, 3].map((n) => <div key={n} className="h-12 flex-1 animate-pulse rounded-xl bg-[#c5dfd0]/[.06]" />)}
            </div>
            <p className="text-xs text-[#92a99a]">{data ? `${data.nodes.length} production stations reporting` : "Waiting for public production signal"}</p>
          </div>
        </div>
      </motion.div>

      {kitchen.isLoading && <div className="mt-12 grid gap-4 sm:grid-cols-5">{[0, 1, 2, 3, 4].map((x) => <div key={x} className="h-28 animate-pulse rounded-2xl border border-[#d1e8d9]/10 bg-[#d1e8d9]/[.04]" />)}</div>}
      {kitchen.isError && <div className="mt-12 flex flex-col gap-4 rounded-2xl border border-[#b98272]/30 bg-[#522f2a]/30 p-6 sm:flex-row sm:items-center"><CircleAlert className="h-5 w-5 shrink-0 text-[#d7a492]" /><div className="flex-1"><p className="font-medium text-[#f0d9cf]">The public signal is unavailable</p><p className="mt-1 text-sm text-[#c3aaa0]">{kitchen.error instanceof Error ? kitchen.error.message : "Production status could not be retrieved."}</p></div><Button variant="outline" onClick={() => kitchen.refetch()} className="border-[#c08e7e]/30 text-[#f0d9cf] hover:bg-[#6a3f36]"><RefreshCw className="mr-2 h-4 w-4" />Reconnect</Button></div>}
      {data && <>
        <section className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            ["Ready", data.counts.ready, "Available to dispatch"],
            ["In motion", data.counts.processing, "Being produced now"],
            ["Delivered", data.counts.delivered, "Production completed"],
            ["Paused", data.counts.paused, "Awaiting safe release"],
            ["Needs care", data.counts.failed, "Held for review"],
          ].map(([name, value, caption], i) => <motion.div key={String(name)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .05 }} className="border-t border-[#c5dfd0]/20 py-5">
            <p className="text-[10px] uppercase tracking-[.2em] text-[#91ab9a]">{name}</p><p className="mt-2 font-display text-4xl text-[#e5eee6]">{value}</p><p className="mt-1 text-xs text-[#8ca196]">{caption}</p>
          </motion.div>)}
        </section>
        <section className="mt-12 grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <div className="flex items-end justify-between border-b border-[#c5dfd0]/15 pb-4"><div><p className="text-[10px] uppercase tracking-[.23em] text-[#91ab9a]">The pipeline</p><h2 className="mt-2 font-display text-2xl">Production stations</h2></div><span className="font-mono text-[10px] text-[#778f82]">REV {data.pipelineRevision}</span></div>
            <div className="mt-3 divide-y divide-[#c5dfd0]/10">
              {data.nodes.map((node, index) => <article key={node.id} className="flex gap-4 py-4">
                <span className="mt-0.5 font-mono text-xs text-[#789487]">{String(index + 1).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium text-[#dbe8df]">{node.label}</h3><span className="rounded-full border border-[#bad6c4]/15 bg-[#a3cbb2]/[.07] px-2.5 py-1 text-[10px] uppercase tracking-wider text-[#a9c9b5]">{stateName(node.state)}</span></div><p className="mt-1.5 text-sm leading-6 text-[#94a99c]">{node.description}</p></div>
              </article>)}
              {!data.nodes.length && <p className="py-8 text-sm text-[#91a59a]">No public stations are currently projected.</p>}
            </div>
          </div>
          <div>
            <div className="flex items-end justify-between border-b border-[#c5dfd0]/15 pb-4"><div><p className="text-[10px] uppercase tracking-[.23em] text-[#91ab9a]">Server projection</p><h2 className="mt-2 font-display text-2xl">Recent moments</h2></div><span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#8ea799]"><Clock3 className="h-3.5 w-3.5" />Updates every 5 sec</span></div>
            <div className="mt-3">
              {data.events.map((event) => <article key={event.id} className="grid grid-cols-[auto_1fr] gap-x-4 border-b border-[#c5dfd0]/10 py-4">
                <span className="relative mt-1 flex h-7 w-7 items-center justify-center rounded-full border border-[#a9cbb6]/25 bg-[#a9cbb6]/[.07]"><span className="h-1.5 w-1.5 rounded-full bg-[#a7cfb4]" /></span>
                <div><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-medium text-[#d8e5dc]">{event.label}</h3><time className="font-mono text-[10px] text-[#7d9688]">{stamp(event.at)}</time></div><p className="mt-1 text-sm leading-6 text-[#94a99c]">{event.description}</p><span className="mt-2 inline-block font-mono text-[9px] uppercase tracking-[.16em] text-[#759182]">{stateName(event.code)}</span></div>
              </article>)}
              {!data.events.length && <p className="py-8 text-sm text-[#91a59a]">No public production events have been projected yet.</p>}
            </div>
          </div>
        </section>
        <footer className="mt-12 flex flex-col gap-5 border-t border-[#c5dfd0]/15 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-xs leading-5 text-[#799287]">Every event shown here is a fixed, server-projected description for a test-only environment. This public window contains no customer or provider details.</p>
          <div className="flex gap-4 text-sm"><Link href="/purchases" className="inline-flex items-center gap-2 text-[#b8d0c0] hover:text-white">Your orders <ArrowUpRight className="h-4 w-4" /></Link><Link href="/admin/operations" className="inline-flex items-center gap-2 text-[#789487] hover:text-[#bfd7c7]">Owner access <ArrowUpRight className="h-4 w-4" /></Link></div>
        </footer>
        <p className="mt-5 text-right font-mono text-[9px] tracking-wider text-[#617c6e]">LAST PROJECTED · {stamp(data.generatedAt)}</p>
      </>}
    </div>
  </main>;
}
