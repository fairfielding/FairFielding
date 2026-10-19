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

const positions=()=>+document.getElementById("fielders").value===10
 ?["P","C","1B","2B","3B","SS","LF","LC","RC","RF"]
 :["P","C","1B","2B","3B","SS","LF","CF","RF"];

const outfield=()=>+document.getElementById("fielders").value===10
 ?["LF","LC","RC","RF"]:["LF","CF","RF"];

function emptyStat(){
 return {bench:0,inf:0,out:0,lastPos:"",positions:{},games:0};
}

function loadHistory(){
 try{
  const x=JSON.parse(localStorage.getItem(HISTORY_KEY)||"{}");
  return x&&typeof x==="object"?x:{};
 }catch(e){return {}}
}

function saveHistory(h){localStorage.setItem(HISTORY_KEY,JSON.stringify(h))}

function seasonStat(name){
 const h=loadHistory();
 return h[name]||emptyStat();
}

function updatePositionNote(){
 const ten=+document.getElementById("fielders").value===10;
 document.getElementById("positionNote").innerHTML=ten
  ?"<b>10-player field:</b> P, C, 1B, 2B, 3B, SS, LF, LC, RC, RF"
  :"<b>9-player field:</b> P, C, 1B, 2B, 3B, SS, LF, CF, RF";
}

function resetDemo(){
 players=demoPlayers.map((p,i)=>({id:Date.now()+i,name:p[0],active:true,no1b:p[1]}));
 document.getElementById("innings").value="6";
 document.getElementById("fielders").value="10";
 updatePositionNote();
 renderPlayers();
 renderBattery(true);
 currentGame=null;
 document.getElementById("resultsCard").classList.add("hidden");
 renderHistory();
}

function activePlayers(){return players.filter(p=>p.active&&p.name.trim())}

function esc(s){
 return String(s??"").replace(/[&<>"']/g,c=>({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
 })[c]);
}

function renderPlayers(){
 const box=document.getElementById("players");
 box.innerHTML="";
 players.forEach(p=>{
  const row=document.createElement("div");
  row.className="player-row";
  row.innerHTML=`<input type="checkbox" ${p.active?"checked":""}>
   <input class="pname" value="${esc(p.name)}">
   <label class="no1b"><input type="checkbox" ${p.no1b?"checked":""}>No 1B</label>
   <button class="remove">×</button>`;
  const ins=row.querySelectorAll("input");
  ins[0].onchange=e=>{p.active=e.target.checked;renderBattery(false)};
  ins[1].oninput=e=>{p.name=e.target.value;renderBattery(false)};
  ins[2].onchange=e=>p.no1b=e.target.checked;
  row.querySelector(".remove").onclick=()=>{
   players=players.filter(x=>x.id!==p.id);
   renderPlayers();renderBattery(false)
  };
  box.appendChild(row);
 });
}

function batterySelections(){
 return [...document.querySelectorAll(".battery-row")].map(r=>[
  r.querySelector(".pitcher").value,r.querySelector(".catcher").value
 ]);
}

function renderBattery(useDemo=false){
 const innings=+document.getElementById("innings").value;
 const old=useDemo?batteryDemo:batterySelections();
 const names=activePlayers().map(p=>p.name);
 const box=document.getElementById("battery");
 box.innerHTML="";
 for(let i=0;i<innings;i++){
  const row=document.createElement("div");
  row.className="battery-row";
  const opts=`<option value="">Choose…</option>`+
   names.map(n=>`<option>${esc(n)}</option>`).join("");
  row.innerHTML=`<b>Inn ${i+1}</b>
   <label>P<select class="pitcher">${opts}</select></label>
   <label>C<select class="catcher">${opts}</select></label>`;
  if(old[i]){
   row.querySelector(".pitcher").value=old[i][0]||"";
   row.querySelector(".catcher").value=old[i][1]||"";
  }
  box.appendChild(row);
 }
}

function combinedScore(game,season,pos,isOF){
 const g=game, s=season;
 const inf=g.inf+s.inf, out=g.out+s.out;
 const positionCount=(g.positions[pos]||0)+(s.positions?.[pos]||0);
 const need=isOF?out-inf:inf-out;
 return {need,positionCount};
}

function buildBenchPlan(roster,innings,fieldCount,batteries,season){
 const benchPerInning=Math.max(0,roster.length-fieldCount);
 const totalSlots=benchPerInning*innings;
 const names=roster.map(p=>p.name);
 const base=Math.floor(totalSlots/names.length),extra=totalSlots%names.length;

 // Season history decides who should receive unavoidable extra bench innings.
 const extraOrder=[...names].sort((a,b)=>
  (season[a]?.bench||0)-(season[b]?.bench||0) || a.localeCompare(b)
 );
 const target=Object.fromEntries(names.map(n=>[n,base]));
 extraOrder.slice(0,extra).forEach(n=>target[n]++);

 // Search the whole game, not inning-by-inning greedily.
 // This guarantees an exact target whenever a valid schedule exists.
 const plan=Array.from({length:innings},()=>[]);
 const remaining={...target};

 function combos(arr,k,start=0,pick=[],out=[]){
  if(pick.length===k){out.push([...pick]);return out}
  for(let i=start;i<=arr.length-(k-pick.length);i++){
   pick.push(arr[i]);combos(arr,k,i+1,pick,out);pick.pop();
  }
  return out;
 }

 const options=Array.from({length:innings},(_,inn)=>{
  const locked=new Set(batteries[inn]);
  return combos(names.filter(n=>!locked.has(n)),benchPerInning);
 });

 // Most constrained innings first.
 const order=[...Array(innings).keys()].sort((a,b)=>options[a].length-options[b].length);

 function search(depth){
  if(depth===order.length)return Object.values(remaining).every(v=>v===0);
  const inn=order[depth];
  const prev=inn>0?new Set(plan[inn-1]):new Set();

  const valid=options[inn].filter(group=>group.every(n=>remaining[n]>0));
  valid.sort((A,B)=>{
   const consecA=A.reduce((s,n)=>s+(prev.has(n)?1:0),0);
   const consecB=B.reduce((s,n)=>s+(prev.has(n)?1:0),0);
   const needA=A.reduce((s,n)=>s+remaining[n],0);
   const needB=B.reduce((s,n)=>s+remaining[n],0);
   const seasonA=A.reduce((s,n)=>s+(season[n]?.bench||0),0);
   const seasonB=B.reduce((s,n)=>s+(season[n]?.bench||0),0);
   return consecA-consecB || needB-needA || seasonA-seasonB ||
    A.join("|").localeCompare(B.join("|"));
  });

  for(const group of valid){
   plan[inn]=group;
   group.forEach(n=>remaining[n]--);
   if(search(depth+1))return true;
   group.forEach(n=>remaining[n]++);
   plan[inn]=[];
  }
  return false;
 }

 const exact=search(0);

 // Rare fallback: if exact equality is mathematically blocked by P/C locks,
 // build the fairest available plan and allow the warning.
 if(!exact){
  const counts=Object.fromEntries(names.map(n=>[n,0]));
  for(let inn=0;inn<innings;inn++){
   const locked=new Set(batteries[inn]);
   const eligible=names.filter(n=>!locked.has(n));
   eligible.sort((a,b)=>{
    const aPrev=inn>0&&plan[inn-1].includes(a)?1:0;
    const bPrev=inn>0&&plan[inn-1].includes(b)?1:0;
    return counts[a]-counts[b] || aPrev-bPrev ||
     (season[a]?.bench||0)-(season[b]?.bench||0) || a.localeCompare(b);
   });
   plan[inn]=eligible.slice(0,benchPerInning);
   plan[inn].forEach(n=>counts[n]++);
  }
  return {plan,counts,target,exact:false};
 }

 const counts=Object.fromEntries(names.map(n=>[n,target[n]]));
 return {plan,counts,target,exact:true};
}
function generate(){
 const roster=activePlayers();
 const innings=+document.getElementById("innings").value;
 const fieldCount=+document.getElementById("fielders").value;
 const batteries=batterySelections();
 const POSITIONS=positions(),OF=outfield();

 if(roster.length<fieldCount){
  alert(`You need at least ${fieldCount} active players for a ${fieldCount}-player field.`);
  return;
 }
 for(let i=0;i<innings;i++){
  if(!batteries[i][0]||!batteries[i][1]){
   alert(`Choose a pitcher and catcher for inning ${i+1}.`);return;
  }
  if(batteries[i][0]===batteries[i][1]){
   alert(`Inning ${i+1}: pitcher and catcher must be different.`);return;
  }
 }

 const stats={},season={};
 roster.forEach(p=>{
  stats[p.name]=emptyStat();
  season[p.name]=seasonStat(p.name);
 });

 const benchInfo=buildBenchPlan(roster,innings,fieldCount,batteries,season);
 const lineups=[],warnings=[];

 for(let inn=0;inn<innings;inn++){
  const P=batteries[inn][0],C=batteries[inn][1];
  const assigned={P,C},used=new Set([P,C]);
  const benchNames=benchInfo.plan[inn]||[];
  const bench=roster.filter(p=>benchNames.includes(p.name));
  bench.forEach(p=>used.add(p.name));

  for(const [pos,n] of [["P",P],["C",C]]){
   stats[n].positions[pos]=(stats[n].positions[pos]||0)+1;
   stats[n].inf++;
   stats[n].lastPos=pos;
  }

  for(const pos of POSITIONS.slice(2)){
   let cand=roster.filter(p=>!used.has(p.name)&&!(pos==="1B"&&p.no1b));
   if(!cand.length)cand=roster.filter(p=>!used.has(p.name));

   cand.sort((a,b)=>{
    const A=stats[a.name],B=stats[b.name],SA=season[a.name],SB=season[b.name];
    const isOF=OF.includes(pos);

    // Season INF/OF balance is primary, including assignments already made today.
    const totalInfA=(SA.inf||0)+A.inf,totalOutA=(SA.out||0)+A.out;
    const totalInfB=(SB.inf||0)+B.inf,totalOutB=(SB.out||0)+B.out;
    const seasonNeedA=isOF?totalOutA-totalInfA:totalInfA-totalOutA;
    const seasonNeedB=isOF?totalOutB-totalInfB:totalInfB-totalOutB;
    const gameNeedA=isOF?A.out-A.inf:A.inf-A.out;
    const gameNeedB=isOF?B.out-B.inf:B.inf-B.out;
    const repeatA=A.lastPos===pos?1:0,repeatB=B.lastPos===pos?1:0;
    const gamePosA=A.positions[pos]||0,gamePosB=B.positions[pos]||0;
    const seasonPosA=SA.positions?.[pos]||0,seasonPosB=SB.positions?.[pos]||0;

    return seasonNeedA-seasonNeedB
      || gameNeedA-gameNeedB
      || repeatA-repeatB
      || gamePosA-gamePosB
      || seasonPosA-seasonPosB
      || Math.random()-.5;
   });

   if(cand[0]){
    assigned[pos]=cand[0].name;
    used.add(cand[0].name);
   }
  }

  Object.entries(assigned).forEach(([pos,n])=>{
   if(pos!=="P"&&pos!=="C"){
    stats[n].positions[pos]=(stats[n].positions[pos]||0)+1;
    if(OF.includes(pos))stats[n].out++;else stats[n].inf++;
    stats[n].lastPos=pos;
   }
  });

  bench.forEach(p=>{
   stats[p.name].bench++;
   stats[p.name].lastPos="BENCH";
  });

  lineups.push({assigned,bench:bench.map(p=>p.name),POSITIONS});
 }

 roster.filter(p=>p.no1b).forEach(p=>{
  if(lineups.some(l=>l.assigned["1B"]===p.name))
   warnings.push(`${p.name} was marked No 1B but had to be used there because no eligible player was available.`);
 });

 if(!benchInfo.exact){
  warnings.push("Locked pitcher/catcher assignments prevent a perfectly even bench rotation.");
 }

 currentGame={
  team:document.getElementById("teamName").value||"Team",
  stats:JSON.parse(JSON.stringify(stats)),
  lineups:JSON.parse(JSON.stringify(lineups)),
  saved:false
 };

 renderResults(lineups,stats,warnings,fieldCount);
}
function renderResults(lineups,stats,warnings,fieldCount){
 const results=document.getElementById("results");
 const warn=document.getElementById("warnings");
 const summary=document.getElementById("summary");

 document.getElementById("resultTitle").textContent=
  `${document.getElementById("teamName").value||"Team"} • ${fieldCount}-player defensive rotation`;

 warn.innerHTML=warnings.length
  ?warnings.map(w=>`<div class="warning">${esc(w)}</div>`).join("")
  :`<div class="ok">✓ ${fieldCount}-player rotation generated with your locked pitcher/catcher assignments, 1B restrictions, and season fairness history.</div>`;

 results.innerHTML="";
 lineups.forEach((l,i)=>{
  const d=document.createElement("div");
  d.className="inning";
  let rows=l.POSITIONS.map(pos=>`<tr><td>${pos}</td><td class="${pos==="P"||pos==="C"?"battery":""}">${esc(l.assigned[pos]||"—")}</td></tr>`).join("");
  if(l.bench.length)rows+=`<tr><td>Bench</td><td class="bench">${l.bench.map(esc).join(", ")}</td></tr>`;
  d.innerHTML=`<h3>Inning ${i+1}</h3><table><thead><tr><th>Position</th><th>Player</th></tr></thead><tbody>${rows}</tbody></table>`;
  results.appendChild(d);
 });

 const h=loadHistory();
 summary.innerHTML=`<h3>Fairness check</h3><div class="summary-grid">`+
  Object.entries(stats).map(([n,s])=>{
   const old=h[n]||emptyStat();
   const seasonInf=old.inf+s.inf,seasonOut=old.out+s.out,seasonBench=old.bench+s.bench;
   return `<div class="stat"><b>${esc(n)}</b>
    <span>Game: Bench ${s.bench} • INF ${s.inf} • OF ${s.out}</span>
    <span class="season-line">If saved: Bench ${seasonBench} • INF ${seasonInf} • OF ${seasonOut}</span></div>`;
  }).join("")+`</div>`;

 const saveBtn=document.getElementById("saveGame");
 saveBtn.disabled=false;
 saveBtn.textContent="Save This Game";
 document.getElementById("saveHint").textContent=
  "Only save the lineup you actually use. Generating a lineup does not change season history.";

 document.getElementById("resultsCard").classList.remove("hidden");
 document.getElementById("resultsCard").scrollIntoView({behavior:"smooth"});
}

function saveCurrentGame(){
 if(!currentGame||currentGame.saved){
  alert("Generate a lineup first, or this game has already been saved.");
  return;
 }
 const h=loadHistory();
 Object.entries(currentGame.stats).forEach(([name,s])=>{
  const t=h[name]||emptyStat();
  t.bench=(t.bench||0)+s.bench;
  t.inf=(t.inf||0)+s.inf;
  t.out=(t.out||0)+s.out;
  t.games=(t.games||0)+1;
  t.positions=t.positions||{};
  Object.entries(s.positions||{}).forEach(([pos,count])=>{
   t.positions[pos]=(t.positions[pos]||0)+count;
  });
  t.lastPos=s.lastPos||t.lastPos||"";
  h[name]=t;
 });
 saveHistory(h);
 currentGame.saved=true;
 const b=document.getElementById("saveGame");
 b.disabled=true;
 b.textContent="Game Saved ✓";
 document.getElementById("saveHint").textContent=
  "This game's fielding totals are now included in season fairness.";
 renderHistory();
}

function renderHistory(){
 const box=document.getElementById("history");
 const h=loadHistory();
 const names=Object.keys(h).filter(n=>{
  const s=h[n];return (s.games||0)||(s.inf||0)||(s.out||0)||(s.bench||0);
 });
 if(!names.length){
  box.innerHTML=`<div class="empty-history">No saved games yet. Your first saved lineup will start the season history.</div>`;
  return;
 }
 names.sort((a,b)=>a.localeCompare(b));
 box.innerHTML=`<div class="history-grid">`+names.map(n=>{
  const s=h[n],pos=Object.entries(s.positions||{}).filter(([,v])=>v>0)
   .sort((a,b)=>b[1]-a[1]).map(([p,v])=>`${p} ${v}`).join(" • ");
  return `<div class="history-player"><b>${esc(n)}</b>
   <span>Games ${s.games||0} • Bench ${s.bench||0} • INF ${s.inf||0} • OF ${s.out||0}</span>
   <small>${esc(pos||"No position history yet")}</small></div>`;
 }).join("")+`</div>`;
}

function resetSeasonHistory(){
 if(!Object.keys(loadHistory()).length){alert("There is no season history to reset.");return}
 if(confirm("Reset ALL saved season history? This cannot be undone.")){
  localStorage.removeItem(HISTORY_KEY);
  currentGame=null;
  renderHistory();
  document.getElementById("resultsCard").classList.add("hidden");
  alert("Season history has been reset.");
 }
}

document.getElementById("addPlayer").onclick=()=>{
 players.push({id:Date.now(),name:"",active:true,no1b:false});
 renderPlayers();renderBattery(false)
};
document.getElementById("innings").onchange=()=>renderBattery(false);
document.getElementById("fielders").onchange=()=>{
 updatePositionNote();
 currentGame=null;
 document.getElementById("resultsCard").classList.add("hidden")
};
document.getElementById("generate").onclick=generate;
document.getElementById("reset").onclick=resetDemo;
document.getElementById("saveGame").onclick=saveCurrentGame;
document.getElementById("resetHistory").onclick=resetSeasonHistory;

resetDemo();
