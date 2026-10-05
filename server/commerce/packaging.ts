import {createHash} from "node:crypto";
import {PDFDocument,StandardFonts,rgb} from "pdf-lib";
import {zipSync,unzipSync,strToU8,strFromU8} from "fflate";
import {ControlError} from "../safety/primitives";

export const checksum=(data:Uint8Array|string)=>createHash("sha256").update(data).digest("hex");
export const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
export function recoverPackageContent(bytes:Uint8Array) {
  const edition=Buffer.from(unzipSync(bytes)["product.html"]).toString("utf8");
  const encoded=edition.match(/<pre>([\s\S]*?)<\/pre>/)?.[1];
  if(encoded===undefined)throw new ControlError("PACKAGE_SOURCE_INTEGRITY_FAILED",503);
  return encoded.replace(/&(amp|lt|gt|quot|#39);/g,(_all,key:string)=>
    ({amp:"&",lt:"<",gt:">",quot:'"',"#39":"'"}[key]!));
}
const forbidden=/\b(?:TODO|TBD|placeholder content|placeholder text|lorem ipsum|coming soon|insert content|system prompt|ignore previous instructions)\b|-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:sk_live_|sk_test_|whsec_|AKIA|gh[opusr]_|re_|xox[baprs]-|AIza)[A-Za-z0-9_-]{12,}|0x[a-f0-9]{64}|(?:api[_-]?key|private[_-]?key|password|access[_-]?token)\s*[:=]\s*["']?[A-Za-z0-9_-]{16,}/i;
export function validateContent(content:string,units=0) {
  if(content.length<1000||content.length>250_000)throw new ControlError("CONTENT_SIZE_QA_FAILED",503);
  if(forbidden.test(content))throw new ControlError("CONTENT_SAFETY_QA_FAILED",503);
  if(units && new Set(Array.from(content.matchAll(/^## Day (\d+)\b/gm)).map(m=>m[1])).size!==units)
    throw new ControlError("REQUIRED_UNITS_QA_FAILED",503);
}
export async function makePdf(title:string,content:string):Promise<Buffer> {
  const pdf=await PDFDocument.create();
  const font=await pdf.embedFont(StandardFonts.Helvetica);
  const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const text=(title+"\n\n"+content).normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^\x20-\x7E\n]/g," ").replace(/\*\*/g,"").replace(/^\s*---\s*$/gm,"");
  let page=pdf.addPage([595,842]),y=792;
  for(const paragraph of text.split("\n")) {
    const heading=paragraph.startsWith("#"),lineText=paragraph.replace(/^#+\s*/,"");
    const usedFont=heading?bold:font,size=heading?13:10;
    const words=lineText.split(/\s+/);let line="";
    const draw=(s:string)=>{
      if(y<56){page=pdf.addPage([595,842]);y=792;}
      page.drawText(s,{x:48,y,size,font:usedFont,color:rgb(.12,.15,.2)});y-=heading?19:15;
    };
    for(const original of words) {
      // Bound individual tokens, including hostile customer input, before sizing.
      for(const word of original.match(/.{1,65}/g)||[""]) {
        const next=line?`${line} ${word}`:word;
        if(usedFont.widthOfTextAtSize(next,size)>499&&line){draw(line);line=word;}else line=next;
      }
    }
    draw(line);y-=3;
  }
  pdf.setTitle(title);pdf.setAuthor("Divine Money");
  const bytes=Buffer.from(await pdf.save());
  if(!(await PDFDocument.load(bytes)).getPageCount())throw new ControlError("PDF_QA_FAILED",503);
  return bytes;
}
export type PackageIdentity={productId:string;version:number;specHash:string;scope:string;method:string;contentChecksum?:string};
export async function packageProduct(title:string,content:string,identity:PackageIdentity,units=0) {
  validateContent(content,units);
  const pdf=await makePdf(title,content);
  const html=strToU8(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title><style>body{margin:40px auto;max-width:780px;padding:0 24px;background:#fbf8f0;color:#182d29;font:17px/1.65 Georgia,serif}h1{font-size:32px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}footer{border-top:1px solid #ccc;margin-top:32px;font-size:12px}@media print{body{margin:0;background:white}}</style>
<h1>${escapeHtml(title)}</h1><pre>${escapeHtml(content)}</pre><footer>Divine Money · Version ${identity.version} · Personal-use digital product. Spiritual and wellbeing material is for reflection, not guaranteed financial results or medical treatment. The UTF-8 edition preserves original characters; the printable PDF uses Latin transliteration.</footer></html>`);
  const manifest={...identity,contentChecksum:checksum(content),createdAt:new Date().toISOString(),format:"zip",qa:"PASS",
    files:{"product.pdf":checksum(pdf),"product.html":checksum(html)}};
  const bytes=Buffer.from(zipSync({"product.pdf":pdf,"product.html":html,"manifest.json":strToU8(JSON.stringify(manifest,null,2))},{level:6}));
  await validatePackage(bytes,checksum(bytes),identity);
  return {bytes,checksum:checksum(bytes),qa:{passed:true,contentChecksum:checksum(content),files:3,units,checks:["exists","opens","required-files","content-safety","identity","checksums","pdf-opens","no-internal-files"]}};
}
export async function validatePackage(bytes:Buffer,expected:string,identity:PackageIdentity) {
  if(!bytes.length||bytes.length>8_000_000||checksum(bytes)!==expected)throw new ControlError("PACKAGE_INTEGRITY_FAILED",503);
  let files:ReturnType<typeof unzipSync>;
  const names:string[]=[];let expanded=0,invalid=false;
  try {files=unzipSync(bytes,{filter:file=>{
    names.push(file.name);expanded+=file.originalSize;
    const allowed=["product.pdf","product.html","manifest.json"].includes(file.name)&&file.originalSize<=2_000_000&&expanded<=6_000_000;
    if(!allowed)invalid=true;
    return allowed;
  }});}
  catch{throw new ControlError("PACKAGE_OPEN_FAILED",503);}
  if(invalid||names.length!==3||Object.keys(files).sort().join(",")!=="manifest.json,product.html,product.pdf")throw new ControlError("PACKAGE_FILES_FAILED",503);
  let manifest:any;
  try{manifest=JSON.parse(strFromU8(files["manifest.json"]));}catch{throw new ControlError("MANIFEST_QA_FAILED",503);}
  for(const key of ["productId","version","specHash","scope","method"] as const)
    if(manifest[key]!==identity[key])throw new ControlError("PACKAGE_IDENTITY_FAILED",503);
  if(manifest.qa!=="PASS"||manifest.format!=="zip")throw new ControlError("MANIFEST_QA_FAILED",503);
  if(identity.contentChecksum&&manifest.contentChecksum!==identity.contentChecksum)throw new ControlError("PACKAGE_SOURCE_INTEGRITY_FAILED",503);
  for(const file of ["product.pdf","product.html"])
    if(checksum(files[file])!==manifest.files?.[file])throw new ControlError("PACKAGE_INTEGRITY_FAILED",503);
  const html=strFromU8(files["product.html"]);
  if(/<script\b|<iframe\b|<form\b|(?:src|href)=["']https?:/i.test(html)||forbidden.test(html))throw new ControlError("HTML_QA_FAILED",503);
  try{if(!(await PDFDocument.load(files["product.pdf"])).getPageCount())throw new Error();}
  catch{throw new ControlError("PDF_QA_FAILED",503);}
}
