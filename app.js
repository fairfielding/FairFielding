const demoPlayers=[
 ["Fin",false],["Noah",false],["Lennox",false],["Everette",false],
 ["William",true],["Mason",true],["Zeke",false],["Clapton",true],
 ["Weston",true],["Julian",true],["JW",false],["Gino",false],["James",false]
];

const batteryDemo=[
 ["Fin","Zeke"],["Noah","Lennox"],["Everette","William"],
 ["Mason","Zeke"],["Noah","Lennox"],["Fin","Everette"]
];

const HISTORY_KEY="fairfielding-season-v03";
let players=[];
let currentGame=null;
let gameDayInning=0;

const positions=()=>+document.getElementById("fielders").value===10
 ?["P","C","1B","2B","3B","SS","LF","LC","RC","RF"]
 :["P","C","1B","2B","3B","SS","LF","CF","RF"];

const outfield=()=>+document.getElementById("fielders").value===10
 ?["LF","LC","RC","RF"]:["LF","CF","RF"];

function emptyStat(){return {bench:0,inf:0,out:0,lastPos:"",positions:{},games:0}}
function loadHistory(){try{const x=JSON.parse(localStorage.getItem(HISTORY_KEY)||"{}");return x&&typeof x==="object"?x:{}}catch(e){return {}}}
function saveHistory(h){localStorage.setItem(HISTORY_KEY,JSON.stringify(h))}
function seasonStat(name){const h=loadHistory();return h[name]||emptyStat()}
function updatePositionNote(){
 const ten=+document.getElementById("fielders").value===10;
 document.getElementById("positionNote").innerHTML=ten
  ?"<b>10-player field:</b> P, C, 1B, 2B, 3B, SS, LF, LC, RC, RF"
  :"<b>9-player field:</b> P, C, 1B, 2B, 3B, SS, LF, CF, RF";
}
function resetDemo(){
 players=demoPlayers.map((p,i)=>({id:Date.now()+i,name:p[0],active:true,no1b:p[1]}));
 document.getElementById("innings").value="6";document.getElementById("fielders").value="10";
 updatePositionNote();renderPlayers();renderBattery(true);currentGame=null;
 document.getElementById("resultsCard").classList.add("hidden");renderHistory();
}
function activePlayers(){return players.filter(p=>p.active&&p.name.trim())}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c])}
function renderPlayers(){
 const box=document.getElementById("players");box.innerHTML="";
 players.forEach(p=>{
  const row=document.createElement("div");row.className="player-row";
  row.innerHTML=`<input type="checkbox" ${p.active?"checked":""}><input class="pname" value="${esc(p.name)}"><label class="no1b"><input type="checkbox" ${p.no1b?"checked":""}>No 1B</label><button class="remove">×</button>`;
  const ins=row.querySelectorAll("input");
  ins[0].onchange=e=>{p.active=e.target.checked;renderBattery(false)};
  ins[1].oninput=e=>{p.name=e.target.value;renderBattery(false)};
  ins[2].onchange=e=>p.no1b=e.target.checked;
  row.querySelector(".remove").onclick=()=>{players=players.filter(x=>x.id!==p.id);renderPlayers();renderBattery(false)};
  box.appendChild(row);
 });
}
function batterySelections(){return [...document.querySelectorAll(".battery-row")].map(r=>[r.querySelector(".pitcher").value,r.querySelector(".catcher").value])}
function renderBattery(useDemo=false){
 const innings=+document.getElementById("innings").value;
 const old=useDemo?batteryDemo:batterySelections();const names=activePlayers().map(p=>p.name);
 const box=document.getElementById("battery");box.innerHTML="";
 for(let i=0;i<innings;i++){
  const row=document.createElement("div");row.className="battery-row";
  const opts=`<option value="">Choose…</option>`+names.map(n=>`<option>${esc(n)}</option>`).join("");
  row.innerHTML=`<b>Inn ${i+1}</b><label>Pitcher<select class="pitcher">${opts}</select></label><label>Catcher<select class="catcher">${opts}</select></label>`;
  if(old[i]){row.querySelector(".pitcher").value=old[i][0]||"";row.querySelector(".catcher").value=old[i][1]||""}
  box.appendChild(row);
 }
}
function buildBenchPlan(roster,innings,fieldCount,batteries,season){
 const benchPerInning=Math.max(0,roster.length-fieldCount),totalSlots=benchPerInning*innings,names=roster.map(p=>p.name);
 const base=Math.floor(totalSlots/names.length),extra=totalSlots%names.length;
 const extraOrder=[...names].sort((a,b)=>(season[a]?.bench||0)-(season[b]?.bench||0)||a.localeCompare(b));
 const target=Object.fromEntries(names.map(n=>[n,base]));extraOrder.slice(0,extra).forEach(n=>target[n]++);
 const plan=Array.from({length:innings},()=>[]),remaining={...target};
 function combos(arr,k,start=0,pick=[],out=[]){if(pick.length===k){out.push([...pick]);return out}for(let i=start;i<=arr.length-(k-pick.length);i++){pick.push(arr[i]);combos(arr,k,i+1,pick,out);pick.pop()}return out}
 const options=Array.from({length:innings},(_,inn)=>{const locked=new Set(batteries[inn]);return combos(names.filter(n=>!locked.has(n)),benchPerInning)});
 const order=[...Array(innings).keys()].sort((a,b)=>options[a].length-options[b].length);
 function search(depth){
  if(depth===order.length)return Object.values(remaining).every(v=>v===0);
  const inn=order[depth],prev=inn>0?new Set(plan[inn-1]):new Set();
  const valid=options[inn].filter(group=>group.every(n=>remaining[n]>0));
  valid.sort((A,B)=>{
   const consecA=A.reduce((s,n)=>s+(prev.has(n)?1:0),0),consecB=B.reduce((s,n)=>s+(prev.has(n)?1:0),0);
   const needA=A.reduce((s,n)=>s+remaining[n],0),needB=B.reduce((s,n)=>s+remaining[n],0);
   const seasonA=A.reduce((s,n)=>s+(season[n]?.bench||0),0),seasonB=B.reduce((s,n)=>s+(season[n]?.bench||0),0);
   return consecA-consecB||needB-needA||seasonA-seasonB||A.join("|").localeCompare(B.join("|"));
  });
  for(const group of valid){plan[inn]=group;group.forEach(n=>remaining[n]--);if(search(depth+1))return true;group.forEach(n=>remaining[n]++);plan[inn]=[]}
  return false;
 }
 const exact=search(0);
 if(!exact){
  const counts=Object.fromEntries(names.map(n=>[n,0]));
  for(let inn=0;inn<innings;inn++){
   const locked=new Set(batteries[inn]),eligible=names.filter(n=>!locked.has(n));
   eligible.sort((a,b)=>{const aPrev=inn>0&&plan[inn-1].includes(a)?1:0,bPrev=inn>0&&plan[inn-1].includes(b)?1:0;return counts[a]-counts[b]||aPrev-bPrev||(season[a]?.bench||0)-(season[b]?.bench||0)||a.localeCompare(b)});
   plan[inn]=eligible.slice(0,benchPerInning);plan[inn].forEach(n=>counts[n]++);
  }
  return {plan,counts,target,exact:false};
 }
 return {plan,counts:Object.fromEntries(names.map(n=>[n,target[n]])),target,exact:true};
}
function generate(){
 const roster=activePlayers(),innings=+document.getElementById("innings").value,fieldCount=+document.getElementById("fielders").value,batteries=batterySelections(),POSITIONS=positions(),OF=outfield();
 if(roster.length<fieldCount){alert(`You need at least ${fieldCount} active players for a ${fieldCount}-player field.`);return}
 for(let i=0;i<innings;i++){
  if(!batteries[i][0]||!batteries[i][1]){alert(`Choose a pitcher and catcher for inning ${i+1}.`);return}
  if(batteries[i][0]===batteries[i][1]){alert(`Inning ${i+1}: pitcher and catcher must be different.`);return}
 }
 const stats={},season={};roster.forEach(p=>{stats[p.name]=emptyStat();season[p.name]=seasonStat(p.name)});
 const benchInfo=buildBenchPlan(roster,innings,fieldCount,batteries,season);
 const lineups=[],warnings=[],names=roster.map(p=>p.name);
 const infPositions=POSITIONS.filter(p=>!OF.includes(p));
 const openInf=infPositions.filter(p=>p!=="P"&&p!=="C");
 const openOF=OF.slice();

 // Build the immutable skeleton: P/C locks + bench.
 const skeleton=Array.from({length:innings},(_,inn)=>({
  P:batteries[inn][0],C:batteries[inn][1],bench:new Set(benchInfo.plan[inn]||[])
 }));

 // Count each player's total field innings and locked INF innings.
 const fieldInnings={},lockedInf={};
 names.forEach(n=>{fieldInnings[n]=0;lockedInf[n]=0});
 for(let inn=0;inn<innings;inn++){
  names.forEach(n=>{if(!skeleton[inn].bench.has(n))fieldInnings[n]++});
  lockedInf[skeleton[inn].P]++;lockedInf[skeleton[inn].C]++;
 }

 // Whole-game INF targets. Start from the exact mathematical share, then
 // distribute unavoidable extras by season need while respecting P/C locks.
 const totalInfSlots=infPositions.length*innings;
 const targetInf={};
 const base=Math.floor(totalInfSlots/names.length),extra=totalInfSlots%names.length;
 names.forEach(n=>targetInf[n]=Math.min(fieldInnings[n],Math.max(lockedInf[n],base)));

 let assignedTarget=Object.values(targetInf).reduce((a,b)=>a+b,0);
 const targetOrder=[...names].sort((a,b)=>{
  const A=season[a]||emptyStat(),B=season[b]||emptyStat();
  const balA=(A.inf||0)-(A.out||0),balB=(B.inf||0)-(B.out||0);
  return balA-balB||(A.inf||0)-(B.inf||0)||a.localeCompare(b);
 });
 while(assignedTarget<totalInfSlots){
  let moved=false;
  for(const n of targetOrder){
   if(targetInf[n]<fieldInnings[n]){targetInf[n]++;assignedTarget++;moved=true;if(assignedTarget===totalInfSlots)break}
  }
  if(!moved)break;
 }
 // If locks forced us above the normal base, remove excess elsewhere.
 while(assignedTarget>totalInfSlots){
  const reducible=[...names].filter(n=>targetInf[n]>lockedInf[n]).sort((a,b)=>{
   const A=season[a]||emptyStat(),B=season[b]||emptyStat();
   const balA=(A.inf||0)-(A.out||0),balB=(B.inf||0)-(B.out||0);
   return balB-balA||targetInf[b]-targetInf[a]||a.localeCompare(b);
  });
  if(!reducible.length)break;
  targetInf[reducible[0]]--;assignedTarget--;
 }

 // Plan WHO is INF/OF in every inning before choosing exact positions.
 // P/C are already INF. The solver searches all combinations for the remaining INF slots.
 const remainingInf=Object.fromEntries(names.map(n=>[n,targetInf[n]-lockedInf[n]]));
 const infGroups=Array.from({length:innings},(_,inn)=>{
  const locked=new Set([skeleton[inn].P,skeleton[inn].C]);
  const eligible=names.filter(n=>!locked.has(n)&&!skeleton[inn].bench.has(n));
  const k=openInf.length;
  function combos(arr,k,start=0,pick=[],out=[]){
   if(pick.length===k){out.push([...pick]);return out}
   for(let i=start;i<=arr.length-(k-pick.length);i++){pick.push(arr[i]);combos(arr,k,i+1,pick,out);pick.pop()}
   return out;
  }
  return combos(eligible,k);
 });
 const infPlan=Array.from({length:innings},()=>[]);
 const inningOrder=[...Array(innings).keys()].sort((a,b)=>infGroups[a].length-infGroups[b].length);

 function solveInf(depth){
  if(depth===inningOrder.length)return Object.values(remainingInf).every(v=>v===0);
  const inn=inningOrder[depth];
  const valid=infGroups[inn].filter(g=>g.every(n=>remainingInf[n]>0));
  valid.sort((A,B)=>{
   const needA=A.reduce((s,n)=>s+remainingInf[n],0),needB=B.reduce((s,n)=>s+remainingInf[n],0);
   const seasonA=A.reduce((s,n)=>s+((season[n]?.inf||0)-(season[n]?.out||0)),0);
   const seasonB=B.reduce((s,n)=>s+((season[n]?.inf||0)-(season[n]?.out||0)),0);
   return needB-needA||seasonA-seasonB||A.join("|").localeCompare(B.join("|"));
  });
  for(const g of valid){
   infPlan[inn]=g;g.forEach(n=>remainingInf[n]--);
   if(solveInf(depth+1))return true;
   g.forEach(n=>remainingInf[n]++);infPlan[inn]=[];
  }
  return false;
 }
 const exactInf=solveInf(0);

 // Very defensive fallback: if exact targets cannot be satisfied because of locks/bench,
 // allocate by greatest remaining need while still preserving the planned bench.
 if(!exactInf){
  warnings.push("Pitcher/catcher locks or bench constraints prevent the ideal whole-game INF/OF split. FairFielding used the closest available balance.");
  names.forEach(n=>remainingInf[n]=Math.max(0,targetInf[n]-lockedInf[n]));
  for(let inn=0;inn<innings;inn++){
   const locked=new Set([skeleton[inn].P,skeleton[inn].C]);
   const eligible=names.filter(n=>!locked.has(n)&&!skeleton[inn].bench.has(n));
   eligible.sort((a,b)=>remainingInf[b]-remainingInf[a]||
    (((season[a]?.inf||0)-(season[a]?.out||0))-((season[b]?.inf||0)-(season[b]?.out||0)))||
    a.localeCompare(b));
   infPlan[inn]=eligible.slice(0,openInf.length);
   infPlan[inn].forEach(n=>remainingInf[n]=Math.max(0,remainingInf[n]-1));
  }
 }

 // Now assign exact positions INSIDE the already-balanced INF/OF groups.
 for(let inn=0;inn<innings;inn++){
  const P=skeleton[inn].P,C=skeleton[inn].C,assigned={P,C};
  const bench=[...skeleton[inn].bench];
  const infNames=new Set(infPlan[inn]);
  const available=names.filter(n=>n!==P&&n!==C&&!skeleton[inn].bench.has(n));
  const ofNames=available.filter(n=>!infNames.has(n));

  for(const [pos,n] of [["P",P],["C",C]]){
   stats[n].positions[pos]=(stats[n].positions[pos]||0)+1;stats[n].inf++;stats[n].lastPos=pos;
  }

  const used=new Set([P,C]);
  function assignPool(posList,pool){
   for(const pos of posList){
    let cand=pool.filter(n=>!used.has(n)&&!(pos==="1B"&&roster.find(p=>p.name===n)?.no1b));
    if(!cand.length)cand=pool.filter(n=>!used.has(n));
    cand.sort((a,b)=>{
     const A=stats[a],B=stats[b],SA=season[a]||emptyStat(),SB=season[b]||emptyStat();
     const repeatA=A.lastPos===pos?1:0,repeatB=B.lastPos===pos?1:0;
     const gamePosA=A.positions[pos]||0,gamePosB=B.positions[pos]||0;
     const seasonPosA=SA.positions?.[pos]||0,seasonPosB=SB.positions?.[pos]||0;
     return repeatA-repeatB||gamePosA-gamePosB||seasonPosA-seasonPosB||a.localeCompare(b);
    });
    if(cand[0]){
     const n=cand[0];assigned[pos]=n;used.add(n);
     stats[n].positions[pos]=(stats[n].positions[pos]||0)+1;
     if(OF.includes(pos))stats[n].out++;else stats[n].inf++;
     stats[n].lastPos=pos;
    }
   }
  }
  assignPool(openInf,[...infNames]);
  assignPool(openOF,ofNames);

  bench.forEach(n=>{stats[n].bench++;stats[n].lastPos="BENCH"});
  lineups.push({assigned,bench,POSITIONS});
 }

 roster.filter(p=>p.no1b).forEach(p=>{
  if(lineups.some(l=>l.assigned["1B"]===p.name))warnings.push(`${p.name} was marked No 1B but had to be used there because no eligible player was available.`);
 });
 if(!benchInfo.exact)warnings.push("Locked pitcher/catcher assignments prevent a perfectly even bench rotation.");

 currentGame={team:document.getElementById("teamName").value||"Team",fieldCount,stats:JSON.parse(JSON.stringify(stats)),lineups:JSON.parse(JSON.stringify(lineups)),saved:false};
 renderResults(lineups,stats,warnings,fieldCount);
}
function renderResults(lineups,stats,warnings,fieldCount){
 const results=document.getElementById("results"),warn=document.getElementById("warnings"),summary=document.getElementById("summary");
 document.getElementById("resultTitle").textContent=`${document.getElementById("teamName").value||"Team"} • ${fieldCount}-player Defensive Rotation`;
 warn.innerHTML=warnings.length?warnings.map(w=>`<div class="warning">${esc(w)}</div>`).join(""):`<div class="ok">✓ ${fieldCount}-player rotation generated with your locked pitcher/catcher assignments, 1B restrictions, and season fairness history.</div>`;
 results.innerHTML="";
 lineups.forEach((l,i)=>{
  const d=document.createElement("div");d.className="inning";
  let rows=l.POSITIONS.map(pos=>`<tr><td>${pos}</td><td class="${pos==="P"||pos==="C"?"battery":""}">${esc(l.assigned[pos]||"—")}</td></tr>`).join("");
  if(l.bench.length)rows+=`<tr><td>Bench</td><td class="bench">${l.bench.map(esc).join(", ")}</td></tr>`;
  d.innerHTML=`<h3>Inning ${i+1}</h3><table><thead><tr><th>Position</th><th>Player</th></tr></thead><tbody>${rows}</tbody></table>`;results.appendChild(d);
 });
 const h=loadHistory();
 summary.innerHTML=`<h3>Fairness check</h3><div class="summary-grid">`+Object.entries(stats).map(([n,s])=>{
  const old=h[n]||emptyStat(),seasonInf=old.inf+s.inf,seasonOut=old.out+s.out,seasonBench=old.bench+s.bench;
  return `<div class="stat"><b>${esc(n)}</b><span>Game: Bench ${s.bench} • INF ${s.inf} • OF ${s.out}</span><span class="season-line">If saved: Bench ${seasonBench} • INF ${seasonInf} • OF ${seasonOut}</span></div>`;
 }).join("")+`</div>`;
 const saveBtn=document.getElementById("saveGame");saveBtn.disabled=false;saveBtn.textContent="Save This Game";
 document.getElementById("saveHint").textContent="Only save the lineup you actually use. Generating a lineup does not change season history.";
 document.getElementById("resultsCard").classList.remove("hidden");document.getElementById("resultsCard").scrollIntoView({behavior:"smooth"});
}
function saveCurrentGame(){
 if(!currentGame||currentGame.saved){alert("Generate a lineup first, or this game has already been saved.");return}
 const h=loadHistory();
 Object.entries(currentGame.stats).forEach(([name,s])=>{
  const t=h[name]||emptyStat();t.bench=(t.bench||0)+s.bench;t.inf=(t.inf||0)+s.inf;t.out=(t.out||0)+s.out;t.games=(t.games||0)+1;t.positions=t.positions||{};
  Object.entries(s.positions||{}).forEach(([pos,count])=>{t.positions[pos]=(t.positions[pos]||0)+count});t.lastPos=s.lastPos||t.lastPos||"";h[name]=t;
 });
 saveHistory(h);currentGame.saved=true;const b=document.getElementById("saveGame");b.disabled=true;b.textContent="Game Saved ✓";
 document.getElementById("saveHint").textContent="This game's fielding totals are now included in season fairness.";renderHistory();
}
function renderHistory(){
 const box=document.getElementById("history"),h=loadHistory(),names=Object.keys(h).filter(n=>{const s=h[n];return (s.games||0)||(s.inf||0)||(s.out||0)||(s.bench||0)});
 if(!names.length){box.innerHTML=`<div class="empty-history">No saved games yet. Your first saved lineup will start the season history.</div>`;return}
 names.sort((a,b)=>a.localeCompare(b));
 box.innerHTML=`<div class="history-grid">`+names.map(n=>{
  const s=h[n],pos=Object.entries(s.positions||{}).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([p,v])=>`${p} ${v}`).join(" • ");
  return `<div class="history-player"><b>${esc(n)}</b><span>Games ${s.games||0} • Bench ${s.bench||0} • INF ${s.inf||0} • OF ${s.out||0}</span><small>${esc(pos||"No position history yet")}</small></div>`;
 }).join("")+`</div>`;
}
function resetSeasonHistory(){
 if(!Object.keys(loadHistory()).length){alert("There is no season history to reset.");return}
 if(confirm("Reset ALL saved season history? This cannot be undone.")){localStorage.removeItem(HISTORY_KEY);currentGame=null;renderHistory();document.getElementById("resultsCard").classList.add("hidden");alert("Season history has been reset.")}
}

/* Game Day */
const FIELD_COORDS={
 "P":[50,68],"C":[50,88],"1B":[70,66],"2B":[61,53],"3B":[30,66],"SS":[39,53],
 "LF":[20,30],"CF":[50,20],"RF":[80,30],
 "LC":[38,22],"RC":[62,22]
};
function openGameDay(){
 if(!currentGame||!currentGame.lineups?.length){alert("Generate a lineup first.");return}
 gameDayInning=0;
 document.getElementById("builderView").classList.add("hidden");
 document.getElementById("gameDayView").classList.remove("hidden");
 document.body.style.overflow="hidden";
 renderGameDay();
}
function closeGameDay(){
 document.getElementById("gameDayView").classList.add("hidden");
 document.getElementById("builderView").classList.remove("hidden");
 document.body.style.overflow="";
}
function renderGameDay(){
 const lineups=currentGame.lineups, l=lineups[gameDayInning], fieldCount=currentGame.fieldCount||l.POSITIONS.length;
 document.getElementById("gdTeam").textContent=currentGame.team;
 document.getElementById("gdFormat").textContent=`${fieldCount}-player defense • ${lineups.length} innings`;
 document.getElementById("gdInningBig").textContent=gameDayInning+1;
 const nav=document.getElementById("gdInnings");nav.innerHTML="";
 lineups.forEach((_,i)=>{const b=document.createElement("button");b.textContent=i+1;b.className=i===gameDayInning?"active":"";b.onclick=()=>{gameDayInning=i;renderGameDay()};nav.appendChild(b)});
 const box=document.getElementById("gdPlayers");box.innerHTML="";
 l.POSITIONS.forEach(pos=>{
  const name=l.assigned[pos];if(!name||!FIELD_COORDS[pos])return;
  const [x,y]=FIELD_COORDS[pos],d=document.createElement("div");d.className=`gd-player ${(pos==="P"||pos==="C")?"battery":""}`;
  d.style.left=x+"%";d.style.top=y+"%";d.innerHTML=`<span class="gd-pos">${pos}</span><span class="gd-name">${esc(name)}</span>`;box.appendChild(d);
 });
 const bench=document.getElementById("gdBench"),names=l.bench||[];
 document.getElementById("gdBenchCount").textContent=names.length?`${names.length} sitting`:"Everyone fields";
 bench.innerHTML=names.length?names.map(n=>`<span>${esc(n)}</span>`).join(""):`<span class="none">No players on the bench this inning.</span>`;
}
function changeInning(delta){const max=currentGame?.lineups?.length||0;if(!max)return;gameDayInning=Math.max(0,Math.min(max-1,gameDayInning+delta));renderGameDay()}
function showSheet(title,text){document.getElementById("gdSheetTitle").textContent=title;document.getElementById("gdSheetText").textContent=text;document.getElementById("gdSheet").classList.remove("hidden")}
let swipeStartX=null;
document.getElementById("gdSwipeArea").addEventListener("touchstart",e=>{swipeStartX=e.changedTouches[0].clientX},{passive:true});
document.getElementById("gdSwipeArea").addEventListener("touchend",e=>{if(swipeStartX===null)return;const dx=e.changedTouches[0].clientX-swipeStartX;if(Math.abs(dx)>45)changeInning(dx<0?1:-1);swipeStartX=null},{passive:true});

document.getElementById("addPlayer").onclick=()=>{players.push({id:Date.now(),name:"",active:true,no1b:false});renderPlayers();renderBattery(false)};
document.getElementById("innings").onchange=()=>renderBattery(false);
document.getElementById("fielders").onchange=()=>{updatePositionNote();currentGame=null;document.getElementById("resultsCard").classList.add("hidden")};
document.getElementById("generate").onclick=generate;
document.getElementById("reset").onclick=resetDemo;
document.getElementById("saveGame").onclick=saveCurrentGame;
document.getElementById("resetHistory").onclick=resetSeasonHistory;
document.getElementById("openGameDay").onclick=openGameDay;
document.getElementById("closeGameDay").onclick=closeGameDay;
document.getElementById("gameTools").onclick=()=>showSheet("Game Tools","This first Game Day build displays your generated rotation. Next we can add Complete Inning, substitutions, player locks, and rebalance-only-the-remaining-innings.");
document.getElementById("battingTab").onclick=()=>showSheet("Batting","Batting-order tracking is the next Game Day feature. The fielding rotation remains unchanged.");
document.getElementById("gdSheetClose").onclick=()=>document.getElementById("gdSheet").classList.add("hidden");
document.getElementById("gdSheet").onclick=e=>{if(e.target.id==="gdSheet")e.currentTarget.classList.add("hidden")};

resetDemo();
