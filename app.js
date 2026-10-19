
const demoPlayers = [
  ["Fin",false],["Noah",false],["Lennox",false],["Everette",false],["William",true],
  ["Mason",true],["Zeke",false],["Clapton",true],["Weston",true],["Julian",true]
];

const batteryDemo = [
  ["Fin","Zeke"],["Noah","Lennox"],["Everette","William"],
  ["Mason","Zeke"],["Noah","Lennox"],["Fin","Everette"]
];

const POSITIONS = ["P","C","1B","2B","3B","SS","LF","CF","RF"];

let players = [];

function resetDemo(){
  players = demoPlayers.map((p,i)=>({id:Date.now()+i,name:p[0],active:true,no1b:p[1]}));
  document.getElementById("innings").value="6";
  renderPlayers(); renderBattery(true);
  document.getElementById("resultsCard").classList.add("hidden");
}

function activePlayers(){ return players.filter(p=>p.active && p.name.trim()); }

function renderPlayers(){
  const box=document.getElementById("players"); box.innerHTML="";
  players.forEach(p=>{
    const row=document.createElement("div"); row.className="player-row";
    row.innerHTML=`<input type="checkbox" ${p.active?"checked":""} aria-label="active">
      <input class="pname" value="${esc(p.name)}" aria-label="player name">
      <label class="no1b"><input type="checkbox" ${p.no1b?"checked":""}>No 1B</label>
      <button class="remove">×</button>`;
    const [active,name]=row.querySelectorAll("input");
    active.onchange=e=>{p.active=e.target.checked;renderBattery(false)};
    name.oninput=e=>{p.name=e.target.value;renderBattery(false)};
    row.querySelector(".no1b input").onchange=e=>p.no1b=e.target.checked;
    row.querySelector(".remove").onclick=()=>{players=players.filter(x=>x.id!==p.id);renderPlayers();renderBattery(false)};
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
  const box=document.getElementById("battery"); box.innerHTML="";
  for(let i=0;i<innings;i++){
    const row=document.createElement("div"); row.className="battery-row";
    const opts=`<option value="">Choose…</option>`+names.map(n=>`<option>${esc(n)}</option>`).join("");
    row.innerHTML=`<b>Inn ${i+1}</b><label>P<select class="pitcher">${opts}</select></label><label>C<select class="catcher">${opts}</select></label>`;
    if(old[i]){row.querySelector(".pitcher").value=old[i][0]||"";row.querySelector(".catcher").value=old[i][1]||""}
    box.appendChild(row);
  }
}

function generate(){
  const roster=activePlayers(), innings=+document.getElementById("innings").value, batteries=batterySelections();
  if(roster.length<9){alert("You need at least 9 active players.");return}
  for(let i=0;i<innings;i++){
    if(!batteries[i][0]||!batteries[i][1]){alert(`Choose a pitcher and catcher for inning ${i+1}.`);return}
    if(batteries[i][0]===batteries[i][1]){alert(`Inning ${i+1}: pitcher and catcher must be different players.`);return}
  }

  const names=roster.map(p=>p.name), stats={};
  names.forEach(n=>stats[n]={bench:0,inf:0,out:0,lastPos:"",positions:{}});
  const lineups=[]; const warnings=[];

  for(let inn=0;inn<innings;inn++){
    const P=batteries[inn][0], C=batteries[inn][1];
    const assigned={P,C}, used=new Set([P,C]);
    stats[P].positions.P=(stats[P].positions.P||0)+1;
    stats[C].positions.C=(stats[C].positions.C||0)+1;
    stats[P].inf++; stats[C].inf++;

    const available=roster.filter(p=>!used.has(p.name));
    const fieldSlots=["1B","2B","3B","SS","LF","CF","RF"];
    const benchCount=Math.max(0,roster.length-9);

    // Pick bench first: favor players with fewer prior bench innings, while avoiding back-to-back bench.
    let benchCandidates=[...available].sort((a,b)=>{
      const sa=stats[a.name], sb=stats[b.name];
      const aBack=sa.lastPos==="BENCH"?1:0, bBack=sb.lastPos==="BENCH"?1:0;
      return aBack-bBack || sa.bench-sb.bench || (sa.inf+sa.out)-(sb.inf+sb.out);
    });
    const bench=benchCandidates.slice(0,benchCount);
    bench.forEach(p=>used.add(p.name));

    for(const pos of fieldSlots){
      let cand=roster.filter(p=>!used.has(p.name) && !(pos==="1B"&&p.no1b));
      if(!cand.length) cand=roster.filter(p=>!used.has(p.name));
      cand.sort((a,b)=>{
        const A=stats[a.name], B=stats[b.name];
        const targetOut=["LF","CF","RF"].includes(pos);
        const needA=targetOut?A.out-A.inf:A.inf-A.out;
        const needB=targetOut?B.out-B.inf:B.inf-B.out;
        const repeatA=A.lastPos===pos?1:0, repeatB=B.lastPos===pos?1:0;
        const sameCountA=A.positions[pos]||0, sameCountB=B.positions[pos]||0;
        return repeatA-repeatB || sameCountA-sameCountB || needA-needB || Math.random()-.5;
      });
      if(cand[0]){assigned[pos]=cand[0].name;used.add(cand[0].name)}
    }

    Object.entries(assigned).forEach(([pos,n])=>{
      if(pos!=="P"&&pos!=="C"){
        stats[n].positions[pos]=(stats[n].positions[pos]||0)+1;
        if(["LF","CF","RF"].includes(pos))stats[n].out++;else stats[n].inf++;
      }
      stats[n].lastPos=pos;
    });
    bench.forEach(p=>{stats[p.name].bench++;stats[p.name].lastPos="BENCH"});
    lineups.push({assigned,bench:bench.map(p=>p.name)});
  }

  // Validate restrictions.
  roster.filter(p=>p.no1b).forEach(p=>{
    if(lineups.some(l=>l.assigned["1B"]===p.name)) warnings.push(`${p.name} was marked No 1B but had to be used there because no eligible player was available.`);
  });

  renderResults(lineups,stats,warnings);
}

function renderResults(lineups,stats,warnings){
  const results=document.getElementById("results"), warn=document.getElementById("warnings"), summary=document.getElementById("summary");
  document.getElementById("resultTitle").textContent=`${document.getElementById("teamName").value || "Team"} defensive rotation`;
  warn.innerHTML=warnings.length?warnings.map(w=>`<div class="warning">${esc(w)}</div>`).join(""):`<div class="ok">✓ Rotation generated with your locked pitcher/catcher assignments and 1B restrictions.</div>`;
  results.innerHTML="";
  lineups.forEach((l,i)=>{
    const d=document.createElement("div");d.className="inning";
    let rows=POSITIONS.map(pos=>`<tr><td>${pos}</td><td class="${pos==="P"||pos==="C"?"battery":""}">${esc(l.assigned[pos]||"—")}</td></tr>`).join("");
    if(l.bench.length)rows+=`<tr><td>Bench</td><td class="bench">${l.bench.map(esc).join(", ")}</td></tr>`;
    d.innerHTML=`<h3>Inning ${i+1}</h3><table><thead><tr><th>Position</th><th>Player</th></tr></thead><tbody>${rows}</tbody></table>`;
    results.appendChild(d);
  });
  summary.innerHTML=`<h3>Fairness check</h3><div class="summary-grid">`+Object.entries(stats).map(([n,s])=>
    `<div class="stat"><b>${esc(n)}</b><span>Bench ${s.bench} • INF ${s.inf} • OF ${s.out}</span></div>`).join("")+`</div>`;
  document.getElementById("resultsCard").classList.remove("hidden");
  document.getElementById("resultsCard").scrollIntoView({behavior:"smooth"});
}

function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

document.getElementById("addPlayer").onclick=()=>{players.push({id:Date.now(),name:"",active:true,no1b:false});renderPlayers();renderBattery(false)};
document.getElementById("innings").onchange=()=>renderBattery(false);
document.getElementById("generate").onclick=generate;
document.getElementById("reset").onclick=resetDemo;
resetDemo();
