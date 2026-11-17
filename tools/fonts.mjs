import fs from "node:fs/promises"; import path from "node:path";
const ROOT="D:/truongduyen/web";
const cssFiles=["_next/static/css/6688992a3254798a.css","_next/static/css/08fc569d88870472.css"];
let css=""; for(const f of cssFiles) css+=await fs.readFile(path.join(ROOT,f),"utf8");
const refs=[...new Set([...css.matchAll(/url\("?(\/[^")]+)"?\)/g)].map(m=>m[1]))];
const q=[...refs]; let ok=0,skip=0,fail=[];
await Promise.all(Array.from({length:8},async()=>{while(q.length){const p=q.shift();const dest=path.join(ROOT,decodeURIComponent(p));try{await fs.access(dest);skip++;continue}catch{}
try{const r=await fetch("https://chungdoi.com"+p);if(!r.ok){fail.push(r.status+" "+p);continue}await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,Buffer.from(await r.arrayBuffer()));ok++}catch(e){fail.push("ERR "+p)}}}));
console.log("refs",refs.length,"ok",ok,"skip",skip,"fail",fail.length); if(fail.length) console.log(fail.slice(0,20).join("\n"));
