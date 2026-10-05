import {spawn} from "node:child_process";
// Supervisor exits when either essential service fails; the deployment restarts
// the complete unit. No financial scheduler from the legacy web replica runs.
const children=[spawn(process.execPath,["dist/index.cjs"],{stdio:"inherit",env:{...process.env,NODE_ENV:"production"}}),
  spawn(process.execPath,["dist/commerce-worker.cjs"],{stdio:"inherit",env:{...process.env,NODE_ENV:"production"}})];
let stopping=false;
const stop=(code:number)=>{
  if(stopping)return;stopping=true;
  for(const child of children)child.kill("SIGTERM");
  const timer=setTimeout(()=>{for(const child of children)child.kill("SIGKILL");process.exit(code);},15_000);
  timer.unref();
  Promise.all(children.map(child=>new Promise<void>(resolve=>child.exitCode!==null?resolve():child.once("exit",()=>resolve()))))
    .then(()=>process.exit(code));
};
for(const child of children){child.on("error",()=>stop(1));child.on("exit",code=>stop(code||1));}
process.on("SIGTERM",()=>stop(0));process.on("SIGINT",()=>stop(0));
