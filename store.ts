import { promises as fs } from 'node:fs';
import type {RiderRun} from './draw-scraper';
export type Competition={drawUrl:string,leaderboardUrl:string,updatedAt:string,pages:number,runs:RiderRun[]};
const file='/data/competitions.json';
const data=new Map<string,Competition>();
export async function loadSaved(){try{const o=JSON.parse(await fs.readFile(file,'utf8'));for(const [k,v] of Object.entries(o))data.set(k,v as Competition)}catch{}}
export async function saveCompetition(id:string,c:Competition){
 data.set(id,c);
 await fs.mkdir('/data',{recursive:true});
 await fs.writeFile(file+'.tmp',JSON.stringify(Object.fromEntries(data)),'utf8');
 await fs.rename(file+'.tmp',file);
}
export function getCompetition(id:string){return data.get(id)}
export function listCompetitions(){return [...data.entries()].map(([id,c])=>({id,updatedAt:c.updatedAt,runCount:c.runs.length,pages:c.pages}))}
