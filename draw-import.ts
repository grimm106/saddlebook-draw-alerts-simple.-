import {parseDrawPage,nextDrawPage} from './draw-scraper';
import {chromium} from 'playwright';
import {saveCompetition} from './store';
export async function collectDraw(drawUrl:string,leaderboardUrl:string){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
 const context=await browser.newContext();
 const page=await context.newPage();
 await page.goto(drawUrl,{waitUntil:'domcontentloaded',timeout:30000});
 return {ready:true};
 }finally{await browser.close()}
}
