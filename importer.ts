import {chromium} from 'playwright';
import {parseDrawPage,nextDrawPage} from './draw-scraper';
import {saveCompetition} from './store';
import { inspectAuthenticatedDraw } from './auth';
export const importStatus:{state:string,message:string,id?:string,count?:number,pages?:number}={state:'idle',message:'Not started'};
let running=false;
export async function importDraw(drawUrl:string,leaderboardUrl:string){
 if(running)throw Error('An import is already running');
 const d=new URL(drawUrl),l=new URL(leaderboardUrl);
 if(d.protocol!=='https:'||l.protocol!=='https:'||d.hostname!=='saddlebook.com'||l.hostname!=='saddlebook.com'||!/^\/events\/\d+\/courses\/\d+\/draws$/.test(d.pathname)||l.pathname!==d.pathname.replace('/draws','/scoreboard'))throw Error('Invalid competition URLs');
 const id=d.pathname.split('/')[4];
 running=true;Object.assign(importStatus,{state:'running',message:'Reading draw pages',id});
 let browser;
 try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage(),seen=new Set<string>(),all=new Map<number,Awaited<ReturnType<typeof parseDrawPage>>[number]>();
 let url:string|null=d.href,pages=0;
 while(url&&pages<25){
  if(seen.has(url))break;
  const u=new URL(url);if(u.origin!==d.origin||u.pathname!==d.pathname)throw Error('Unexpected pagination URL');
  seen.add(url);await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  const rows=await parseDrawPage(page);for(const r of rows)all.set(r.draw,r);
  pages++;url=await nextDrawPage(page);
 }
 if(url&&pages===25)throw Error('Draw exceeds page limit');
 const runs=[...all.values()].sort((a,b)=>a.draw-b.draw);
 if(!runs.length){const diagnostic=await inspectAuthenticatedDraw(d.href,l.href);throw Error('No riders found on draw. Authenticated diagnostic: '+diagnostic.stage+' ('+(diagnostic.parsedEntries||0)+' parsed entries)');}
 await saveCompetition(id,{drawUrl:d.href,leaderboardUrl:l.href,updatedAt:new Date().toISOString(),pages,runs});
 Object.assign(importStatus,{state:'success',message:'Saved '+runs.length+' runs',count:runs.length,pages});
 }catch(e){Object.assign(importStatus,{state:'error',message:String(e).slice(0,250)})}
 finally{await browser?.close();running=false}
 return importStatus;
}