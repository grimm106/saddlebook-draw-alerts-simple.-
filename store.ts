import { promises as fs } from 'node:fs';
import type {RiderRun} from './draw-scraper';
export type Competition={drawUrl:string,leaderboardUrl:string,updatedAt:string,pages:number,runs:RiderRun[]};
const file='/data/competitions.json';
const data=new Map<string,Competition>();
export async function loadSaved(){try{const o=JSON.parse(await fs.readFile(file,'utf8'));for(const [k,v] of Object.entries(o))data.set(k,v as Competition)}catch{}}
