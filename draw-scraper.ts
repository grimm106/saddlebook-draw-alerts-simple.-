export type RiderRun={draw:number,rider:string,horse:string,city:string,score:string,completed:boolean};
import type {Page} from 'playwright';
export async function parseDrawPage(page:Page):Promise<RiderRun[]> {
  return page.evaluate(() => Array.from(document.querySelectorAll('table tr')).map(tr => {
    const t=Array.from(tr.querySelectorAll('td')).map(td => (td as HTMLElement).innerText.trim());
    return {draw:Number(t[0]),rider:t[2]||'',horse:t[3]||'',city:t[4]||'',score:t[1]||'',completed:tr.className.includes('success')};
  }).filter(r=>Number.isInteger(r.draw)&&r.draw>0&&r.rider));
}
export async function nextDrawPage(page:Page):Promise<string|null> {
  return page.locator('a').evaluateAll(as=>{
    const next=as.find(a=>a.textContent?.toLowerCase().includes('next')&&!a.closest('.disabled'));
    return next?(next as HTMLAnchorElement).href:null;
  });
}

// Rows are parsed in their displayed draw order.
