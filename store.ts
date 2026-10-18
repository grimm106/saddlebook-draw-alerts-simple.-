import { promises as fs } from 'node:fs';
export async function saveJSON(path:string,value:unknown){await fs.mkdir('/data',{recursive:true});await fs.writeFile(path,JSON.stringify(value),'utf8')}
