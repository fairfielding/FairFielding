
const demoPlayers=[["Fin",false],["Noah",false],["Lennox",false],["Everette",false],["William",true],["Mason",true],["Zeke",false],["Clapton",true],["Weston",true],["Julian",true]];
const batteryDemo=[["Fin","Zeke"],["Noah","Lennox"],["Everette","William"],["Mason","Zeke"],["Noah","Lennox"],["Fin","Everette"]];
let players=[];
const positions=()=>+document.getElementById("fielders").value===10?["P","C","1B","2B","3B","SS","LF","LC","RC","RF"]:["P","C","1B","2B","3B","SS","LF","CF","RF"];
const outfield=()=>+document.getElementById("fielders").value===10?["LF","LC","RC","RF"]:["LF","CF","RF"];

function updatePositionNote(){
 const ten=+document.getElementById("fielders").value===10;
 document.getElementById("positionNote").innerHTML=ten?"<b>10-player field:</b> P, C, 1B, 2B, 3B, SS, LF, LC, RC, RF":"<b>9-player field:</b> P, C, 1B, 2B, 3B, SS, LF, CF, RF";
}
function resetDemo(){players=demoPlayers.map((p,i)=>({id:Date.now()+i,name:p[0],active:true,no1b:p[1]}));document.getElementById("innings").value="6";document.getElementById("fielders").value="10";updatePositionNote();renderPlayers();renderBattery(true);document.getElementById("resultsCard").classList.add("hidden")}
function activePlayers(){return players.filter(p=>p.active&&p.name.trim())}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function renderPlayers(){
 const box=document.getElementById("players");box.innerHTML="";
 players.forEach(p=>{const row=document.createElement("div");row.className="player-row";row.innerHTML=`<input type="checkbox" ${p.active?"checked":""}><input class="pname" value="${esc(p.name)}"><label class="no1b"><input type="checkbox" ${p.no1b?"checked":""}>No 1B</label><button class="remove">×</button>`;
 const ins=row.querySelectorAll("input");ins[0].onchange=e=>{p.active=e.target.checked;renderBattery(false)};ins[1].oninput=e=>{p.name=e.target.value;renderBattery(false)};ins[2].onchange=e=>p.no1b=e.target.checked;row.querySelector(".remove").onclick=()=>{players=players.filter(x=>x.id!==p.id);renderPlayers();renderBattery(false)};box.appendChild(row)})
}
function batterySelections(){return [...document.querySelectorAll(".battery-row")].map(r=>[r.querySelector(".pitcher").value,r.querySelector(".catcher").value])}
function renderBattery(useDemo=false){
 const innings=+document.getElementById("innings").value,old=useDemo?batteryDemo:batterySelections(),names=activePlayers().map(p=>p.name),box=document.getElementById("battery");box.innerHTML="";
 for(let i=0;i<innings;i++){const row=document.createElement("div");row.className="battery-row";const opts=`<option value="">Choose…</option>`+names.map(n=>`<option>${esc(n)}</option>`).join("");row.innerHTML=`<b>Inn ${i+1}</b><label>P<select class="pitcher">${opts}</select></label><label>C<select class="catcher">${opts}</select></label>`;if(old[i]){row.querySelector(".pitcher").value=old[i][0]||"";row.querySelector(".catcher").value=old[i][1]||""}box.appendChild(row)}
}
function generate(){
 const roster=activePlayers(),innings=+document.getElementById("innings").value,fieldCount=+document.getElementById("fielders").value,batteries=batterySelections(),POSITIONS=positions(),OF=outfield();
 if(roster.length<fieldCount){alert(`You need at least ${fieldCount} active players for a ${fieldCount}-player field.`);return}
 for(let i=0;i<innings;i++){if(!batteries[i][0]||!batteries[i][1]){alert(`Choose a pitcher and catcher for inning ${i+1}.`);return}if(batteries[i][0]===batteries[i][1]){alert(`Inning ${i+1}: pitcher and catcher must be different.`);return}}
 const stats={};roster.forEach(p=>stats[p.name]={bench:0,inf:0,out:0,lastPos:"",positions:{}});
 const lineups=[],warnings=[];
 for(let inn=0;inn<innings;inn++){
  const P=batteries[inn][0],C=batteries[inn][1],assigned={P,C},used=new Set([P,C]);
  for(const [pos,n] of [["P",P],["C",C]]){stats[n].positions[pos]=(stats[n].positions[pos]||0)+1;stats[n].inf++}
  const benchCount=Math.max(0,roster.length-fieldCount);
  let bc=roster.filter(p=>!used.has(p.name)).sort((a,b)=>(stats[a.name].lastPos==="BENCH")-(stats[b.name].lastPos==="BENCH")||stats[a.name].bench-stats[b.name].bench||(stats[a.name].inf+stats[a.name].out)-(stats[b.name].inf+stats[b.name].out));
  const bench=bc.slice(0,benchCount);bench.forEach(p=>used.add(p.name));
  for(const pos of POSITIONS.slice(2)){
   let cand=roster.filter(p=>!used.has(p.name)&&!(pos==="1B"&&p.no1b));if(!cand.length)cand=roster.filter(p=>!used.has(p.name));
   cand.sort((a,b)=>{const A=stats[a.name],B=stats[b.name],isOF=OF.includes(pos),needA=isOF?A.out-A.inf:A.inf-A.out,needB=isOF?B.out-B.inf:B.inf-B.out;return (A.lastPos===pos)-(B.lastPos===pos)||(A.positions[pos]||0)-(B.positions[pos]||0)||needA-needB||Math.random()-.5});
   if(cand[0]){assigned[pos]=cand[0].name;used.add(cand[0].name)}
  }
  Object.entries(assigned).forEach(([pos,n])=>{if(pos!=="P"&&pos!=="C"){stats[n].positions[pos]=(stats[n].positions[pos]||0)+1;if(OF.includes(pos))stats[n].out++;else stats[n].inf++}stats[n].lastPos=pos});
  bench.forEach(p=>{stats[p.name].bench++;stats[p.name].lastPos="BENCH"});lineups.push({assigned,bench:bench.map(p=>p.name),POSITIONS})
 }
 roster.filter(p=>p.no1b).forEach(p=>{if(lineups.some(l=>l.assigned["1B"]===p.name))warnings.push(`${p.name} was marked No 1B but had to be used there because no eligible player was available.`)});
 renderResults(lineups,stats,warnings,fieldCount)
}
function renderResults(lineups,stats,warnings,fieldCount){
 const results=document.getElementById("results"),warn=document.getElementById("warnings"),summary=document.getElementById("summary");
 document.getElementById("resultTitle").textContent=`${document.getElementById("teamName").value||"Team"} • ${fieldCount}-player defensive rotation`;
 warn.innerHTML=warnings.length?warnings.map(w=>`<div class="warning">${esc(w)}</div>`).join(""):`<div class="ok">✓ ${fieldCount}-player rotation generated with your locked pitcher/catcher assignments and 1B restrictions.</div>`;
 results.innerHTML="";lineups.forEach((l,i)=>{const d=document.createElement("div");d.className="inning";let rows=l.POSITIONS.map(pos=>`<tr><td>${pos}</td><td class="${pos==="P"||pos==="C"?"battery":""}">${esc(l.assigned[pos]||"—")}</td></tr>`).join("");if(l.bench.length)rows+=`<tr><td>Bench</td><td class="bench">${l.bench.map(esc).join(", ")}</td></tr>`;d.innerHTML=`<h3>Inning ${i+1}</h3><table><thead><tr><th>Position</th><th>Player</th></tr></thead><tbody>${rows}</tbody></table>`;results.appendChild(d)});
 summary.innerHTML=`<h3>Fairness check</h3><div class="summary-grid">`+Object.entries(stats).map(([n,s])=>`<div class="stat"><b>${esc(n)}</b><span>Bench ${s.bench} • INF ${s.inf} • OF ${s.out}</span></div>`).join("")+`</div>`;
 document.getElementById("resultsCard").classList.remove("hidden");document.getElementById("resultsCard").scrollIntoView({behavior:"smooth"})
}
document.getElementById("addPlayer").onclick=()=>{players.push({id:Date.now(),name:"",active:true,no1b:false});renderPlayers();renderBattery(false)};
document.getElementById("innings").onchange=()=>renderBattery(false);
document.getElementById("fielders").onchange=()=>{updatePositionNote();document.getElementById("resultsCard").classList.add("hidden")};
document.getElementById("generate").onclick=generate;document.getElementById("reset").onclick=resetDemo;resetDemo();
