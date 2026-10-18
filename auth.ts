import { chromium } from 'playwright';
let lastRun=0;
export async function inspectAuthenticatedDraw(drawUrl:string,leaderboardUrl:string){
  const now=Date.now();
  if(now-lastRun<60000) return {ok:false,stage:'rate_limit',message:'Please wait 60 seconds between authentication checks.'};
  lastRun=now;
  const email=process.env.SADDLEBOOK_USERNAME,password=process.env.SADDLEBOOK_PASSWORD;
  if(!email||!password) return {ok:false,stage:'configuration',message:'SaddleBook credentials are not configured in Railway.'};
  let draw:URL,board:URL;
  try{
    draw=new URL(drawUrl);board=new URL(leaderboardUrl);
    if([draw,board].some(u=>u.protocol!=='https:'||u.hostname!=='saddlebook.com')||!draw.pathname.endsWith('/draws')||!board.pathname.endsWith('/scoreboard')||draw.pathname.replace(/\/(draws|scoreboard)$/,'')!==board.pathname.replace(/\/(draws|scoreboard)$/,''))throw Error('URL mismatch');
  }catch{return {ok:false,stage:'validation',message:'Enter matching SaddleBook draw and leaderboard URLs.'}};
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    const context=await browser.newContext({viewport:{width:1280,height:900}});
    const page=await context.newPage();
    await page.goto('https://saddlebook.com/users/sign_in',{waitUntil:'domcontentloaded',timeout:30000});
    const inputs=await page.locator('input').evaluateAll(els=>els.map(e=>({type:(e as HTMLInputElement).type,name:(e as HTMLInputElement).name,id:e.id})));
    const emailInput=page.locator('input[type="email"],input[name*="email"],input[id*="email"]').first();
    const passwordInput=page.locator('input[type="password"]').first();
    if(!await emailInput.count()||!await passwordInput.count())return {ok:false,stage:'login_form',message:'Could not identify SaddleBook login fields.',formFields:inputs.map(x=>({type:x.type,name:x.name}))};
    await emailInput.fill(email);
    await passwordInput.fill(password);
    const submit=page.getByRole('button',{name:/sign in|log in/i}).first();
    if(await submit.count())await submit.click({timeout:12000});
    else await passwordInput.press('Enter');
    await page.waitForLoadState('domcontentloaded',{timeout:15000}).catch(()=>{});
    await page.goto(draw.href,{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForTimeout(2500);
    const url=page.url();
    const isLogin=/\/users\/sign_in|\/login|\/sign-in/i.test(url)||await page.locator('input[type="password"]').count()>0;
    const result=await page.evaluate(()=>({title:document.title,tableRows:Array.from(document.querySelectorAll('table tr')).slice(0,500).map(x=>({text:(x as HTMLElement).innerText.trim().slice(0,250),className:(x as HTMLElement).className,background:getComputedStyle(x).backgroundColor,cells:Array.from(x.querySelectorAll('td')).map(td=>({text:(td as HTMLElement).innerText.trim(),className:(td as HTMLElement).className,background:getComputedStyle(td).backgroundColor}))})),text:document.body.innerText.slice(0,1800),links:Array.from(document.querySelectorAll('a[href]')).filter(x=>(x as HTMLElement).innerText.match(/next|page|draw/i)).slice(0,12).map(x=>({text:(x as HTMLElement).innerText.slice(0,50),href:(x as HTMLAnchorElement).href}))}));
    return {ok:!isLogin,stage:isLogin?'authentication_required':'draw_page',message:isLogin?'SaddleBook still requires sign-in; credentials may have been rejected or another verification step is required.':'Authenticated draw page reached. Data extraction must be validated before import.',finalUrl:url,tableRowCount:result.tableRows.length,sampleRows:result.tableRows.slice(0,5),drawRows:result.tableRows,paginationLinks:result.links,pageExcerpt:result.text.slice(0,650)};
  }catch(e){return {ok:false,stage:'browser',message:'Browser collection failed: '+String(e).slice(0,300)}}
  finally{await browser.close()}
}