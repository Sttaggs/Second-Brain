/* Second Brain v2.1: additive enhancements. Existing IndexedDB schema is unchanged. */
(()=>{'use strict';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;'}[c]));
const date=(offset=0)=>{const d=new Date();d.setDate(d.getDate()+offset);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
let db,items=[],tasks=[],tomorrow=[],mode='today';
const req=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
function open(){return new Promise((resolve,reject)=>{const r=indexedDB.open('second-brain-v1');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
const read=(table,key)=>req(db.transaction(table).objectStore(table).get(key));
const all=table=>req(db.transaction(table).objectStore(table).getAll());
const put=(table,item)=>req(db.transaction(table,'readwrite').objectStore(table).put(item));
const remove=(table,key)=>req(db.transaction(table,'readwrite').objectStore(table).delete(key));
async function refresh(){tasks=await all('tasks');items=tasks.filter(t=>t.reusable===true&&!t.archived);tomorrow=(await read('days',date(1)))?.suggestions||[];renderReusable();renderTomorrow();renderPicker()}
function candidates(){const seen=new Set();return [...items,...tasks.filter(t=>!t.archived)].filter(t=>{const key=t.title.trim().toLowerCase();if(seen.has(key))return false;seen.add(key);return true})}
function renderReusable(){$('reusableList').innerHTML=items.map(t=>'<span class="activity-chip">'+esc(t.title)+'<button data-unreuse="'+esc(t.id)+'" aria-label="Remove reusable activity">×</button></span>').join('')||'<p class="muted">No saved activities yet.</p>'}
function renderTomorrow(){$('tomorrowSuggestions').innerHTML=tomorrow.map((t,i)=>'<div class="pickrow"><span>'+esc(t.title)+'</span><button class="action ghost small" data-unplan="'+i+'">Remove</button></div>').join('')||'<p class="muted">No suggestions planned.</p>';$('addTomorrow').disabled=tomorrow.length>=2}
function renderPicker(){const q=$('pickerSearch').value.trim().toLowerCase();$('pickerResults').innerHTML=candidates().filter(t=>t.title.toLowerCase().includes(q)).map(t=>'<div class="pickrow"><span>'+esc(t.title)+(t.reusable?' <small style="color:#60A5FA">Reusable</small>':'')+'</span><button class="action small" data-choose="'+esc(t.id)+'">Select</button></div>').join('')||'<p class="muted">No matching activities. Create a new task instead.</p>'}
function show(which){mode=which;$('picker').classList.remove('hidden');$('pickerSearch').value='';renderPicker();$('pickerSearch').focus()}
async function saveTomorrow(){let d=await read('days',date(1));if(!d)d={id:date(1),morning:'',evening:'',vitality:null,primary:[],bonus:[]};d.suggestions=tomorrow;await put('days',d);renderTomorrow()}
async function choose(id){const t=tasks.find(t=>t.id===id);if(!t)return;if(mode==='tomorrow'){if(tomorrow.length>=2||tomorrow.some(x=>x.title.toLowerCase()===t.title.toLowerCase()))return;tomorrow.push({title:t.title,taskId:t.id});await saveTomorrow();$('picker').classList.add('hidden');return}
const d=await read('days',date())||{id:date(),morning:'',evening:'',vitality:null,primary:[],bonus:[]};if(d.primary.length>=2){alert('The Daily Two already contains two activities.');return}if(d.primary.some(a=>a.taskId===t.id)){alert('Already selected.');return}d.primary.push({id:crypto.randomUUID(),taskId:t.id,done:false});await put('days',d);$('picker').classList.add('hidden');location.reload()}
async function init(){db=await open();await refresh();
document.addEventListener('click',e=>{if(e.target.closest('#addPrimary')){e.stopImmediatePropagation();e.preventDefault();show('today')}},true);
$('closePicker').addEventListener('click',()=>$('picker').classList.add('hidden'));$('pickerSearch').addEventListener('input',renderPicker);
$('addTomorrow').addEventListener('click',()=>show('tomorrow'));
$('saveReusable').addEventListener('click',async()=>{const title=$('reusableName').value.trim();if(!title)return;let t=tasks.find(t=>t.title.toLowerCase()===title.toLowerCase());if(t){t.reusable=true;t.archived=false}else t={id:crypto.randomUUID(),title,archived:false,reusable:true,created:Date.now()};await put('tasks',t);$('reusableName').value='';await refresh()});
document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.choose)await choose(b.dataset.choose);if(b.dataset.unreuse){const t=tasks.find(t=>t.id===b.dataset.unreuse);if(t){t.reusable=false;await put('tasks',t);await refresh()}}if(b.dataset.unplan!==undefined){tomorrow.splice(Number(b.dataset.unplan),1);await saveTomorrow()}});
document.addEventListener('click',()=>{if(!$('picker').classList.contains('hidden'))renderPicker()},false);
}
init().catch(err=>console.error('v2.1 enhancement unavailable',err));
})();