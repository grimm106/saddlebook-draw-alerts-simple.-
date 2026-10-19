import { progress, alertsCrossed } from './draw-progress';
import type { DrawEntry } from './draw-progress';
export type SimulationState={competitionId:string;selectedId:string;entries:DrawEntry[];previousRemaining:number|null;sentKeys:string[];events:{threshold:number;remaining:number}[]};
export function beginSimulation(competitionId:string,entries:DrawEntry[],selectedId:string):SimulationState{
 if(!entries.some(e=>e.id===selectedId))throw Error('Selected run not found');
 return {competitionId,selectedId,entries:entries.map(e=>({...e})),previousRemaining:null,sentKeys:[],events:[]};
}
export function advanceSimulation(state:SimulationState,steps=1){
 if(!Number.isInteger(steps)||steps<1||steps>100)throw Error('Steps must be 1-100');
 let fired:{threshold:number;remaining:number}[]=[];
 for(let i=0;i<steps;i++){
  const current=progress(state.entries,state.selectedId);
  if(state.previousRemaining===null)state.previousRemaining=current.remaining;
  const target=state.entries.findIndex(e=>e.id===state.selectedId);
  const next=state.entries.findIndex((e,j)=>j<target&&!e.completed&&!e.scratched);
  if(next<0)break;
  state.entries[next].completed=true;
  const remaining=progress(state.entries,state.selectedId).remaining;
  const events=alertsCrossed(state.previousRemaining,remaining,new Set(state.sentKeys),state.selectedId,[20,15,10,5]);
  for(const event of events){state.sentKeys.push(event.key);fired.push({threshold:event.threshold,remaining:event.remaining})}
  state.previousRemaining=remaining;
 }
 state.events.push(...fired);
 return {progress:progress(state.entries,state.selectedId),fired,events:state.events};
}
