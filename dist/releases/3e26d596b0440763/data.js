import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js';
import * as U from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';
import * as D from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
export {U,D};
import {quantityRound,validatePieces} from './planning.js';
export const config={apiKey:'AIzaSyAaVppOGG3YXBFEwbyddDr8FuSTIIBlGV4',authDomain:'cocina-a-tiempo-prueba.firebaseapp.com',projectId:'cocina-a-tiempo-prueba',appId:'1:643645142401:web:1658a8d5307b752f21e480'};
export function context(name='cocina'){const app=initializeApp(config,name);return {app,auth:U.getAuth(app),db:D.getFirestore(app)};}
export const reference=(c,path)=>D.doc(c.db,path);
export const homeRef=(c,h)=>reference(c,`homes/${h}`);
export const profileRef=c=>reference(c,`accounts/${c.auth.currentUser.uid}`);
export const entryRef=(c,h,type,id)=>reference(c,`homes/${h}/${type==='lot'?'lots':'shopping'}/${id}`);
export const receiptRef=(c,h,id)=>reference(c,`homes/${h}/receipts/${id}`);
export const id=()=>crypto.randomUUID();
export const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
export const round=n=>Math.round(n*1000)/1000;
export function validateLot(l){if(!l.name?.trim()||l.name.length>60)throw Error('Escribe el nombre del alimento, con un máximo de 60 caracteres.');if(!Number.isFinite(l.qty)||l.qty<=0||l.qty>1e9)throw Error('La cantidad debe ser mayor que cero y no superar 1000000000.');if(!['g','ml','ud','kg','l'].includes(l.unit)||!['Nevera','Congelador','Despensa'].includes(l.place))throw Error('Revisa la unidad y la ubicación.');validatePieces(l.qty,l.unit);if(quantityRound(l.qty,l.unit)!==l.qty)throw Error('Usa como máximo seis decimales en kg/l y tres en las demás unidades.');if(l.date){const d=new Date(l.date+'T12:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(l.date)||Number.isNaN(d.valueOf())||d.toISOString().slice(0,10)!==l.date||!['Caducidad','Consumo preferente'].includes(l.dateType))throw Error('Revisa la fecha y su tipo.');}else l.dateType='';return l;}
export function validateName(name,max=60){if(typeof name!=='string'||!name.trim()||name.trim().length>max)throw Error('Escribe un nombre válido, sin dejarlo en blanco.');return name.trim();}
export async function createHome(c,name,alias){name=validateName(name);alias=validateName(alias,40);const h=id(),uid=c.auth.currentUser.uid;const batch=D.writeBatch(c.db);batch.set(profileRef(c),{homeId:h});batch.set(homeRef(c,h),{name:name.trim().slice(0,60),owner:uid,members:[uid],memberNames:{[uid]:alias.trim().slice(0,40)||'Administración'},servings:2,noticeDays:2,vegetarian:false,excludedIngredients:[],timezone:'Europe/Madrid',version:0,lastInvite:'',createdAt:D.Timestamp.now()});await batch.commit();return h;}
export async function invitation(c,h){const t=token();await D.setDoc(reference(c,`links/${t}`),{homeId:h,owner:c.auth.currentUser.uid,expiresAt:D.Timestamp.fromMillis(Date.now()+7*864e5),usedBy:'',createdAt:D.Timestamp.now()});return t;}
export async function join(c,t,alias){alias=validateName(alias,40);return D.runTransaction(c.db,async tx=>{const ir=reference(c,`links/${t}`),inv=await tx.get(ir);if(!inv.exists())throw Error('Invitación no encontrada.');const i=inv.data();if(i.usedBy||i.expiresAt.toMillis()<=Date.now())throw Error('Invitación utilizada o caducada.');const p=await tx.get(profileRef(c));if(p.exists()&&p.data().homeId!==i.homeId)throw Error('Tu cuenta ya pertenece a otro hogar.');const uid=c.auth.currentUser.uid;tx.set(profileRef(c),{homeId:i.homeId});tx.update(homeRef(c,i.homeId),{members:D.arrayUnion(uid),[`memberNames.${uid}`]:alias.trim().slice(0,40)||'Miembro',lastInvite:t});tx.update(ir,{usedBy:uid});return i.homeId;});}
export async function removeMember(c,h,uid){await D.getDocFromServer(homeRef(c,h));return D.runTransaction(c.db,async tx=>{const snap=await tx.get(homeRef(c,h));const n={...snap.data().memberNames};delete n[uid];tx.update(homeRef(c,h),{members:snap.data().members.filter(x=>x!==uid),memberNames:n});});}
export async function settings(c,h,changes,version){return D.runTransaction(c.db,async tx=>{const s=await tx.get(homeRef(c,h));if(s.data().version!==version)throw Error('Los ajustes han cambiado. Revisa otra vez.');tx.update(homeRef(c,h),{...changes,version:version+1});});}
// A logical action has a stable group ID. All receipts and entities commit together.
// The expected full snapshots bind the user review to the server state.
export async function commit(c,h,changes,{group=id(),kind='edit',undoOf='',expectations=[]}={}){
 if(!changes.length)throw Error('No hay cambios que guardar.');
 for(const x of changes){validatePieces(x.after.qty,x.after.unit);if(['cook','consume','discard'].includes(kind)&&x.before?.unit==='ud')validatePieces(x.before.qty-x.after.qty,'ud');}
 if(!navigator.onLine)throw Error('Sin conexión. No se ha guardado la operación.');
 await D.getDocFromServer(homeRef(c,h));
 if(kind==='undo')return correct(c,h,changes,{group,undoOf});
 const uid=c.auth.currentUser.uid;
 const opIds=changes.map(x=>`${group}_${x.type}_${x.id}`);
 try{return await D.runTransaction(c.db,async tx=>{
  const receipts=await Promise.all(opIds.map(o=>tx.get(receiptRef(c,h,o))));
  if(receipts.every(s=>s.exists()))return {state:'duplicate',group};
  if(receipts.some(s=>s.exists()))throw Error('Operación parcialmente registrada. Revisa antes de continuar.');
  const entries=await Promise.all(changes.map(x=>tx.get(entryRef(c,h,x.type,x.id))));
  const reviewed=await Promise.all(expectations.map(x=>tx.get(entryRef(c,h,x.type,x.id))));
  if(reviewed.some((s,n)=>!equal(s.exists()?s.data():null,expectations[n].before)))return {state:'review',group};
  for(let n=0;n<changes.length;n++){const current=entries[n].exists()?entries[n].data():null;if(!equal(current,changes[n].before))return {state:'review',group};}
  for(let n=0;n<changes.length;n++){const x=changes[n],before=x.before,after={...x.after,version:before?before.version+1:0,lastOp:opIds[n]};const receipt={actor:uid,type:x.type,target:x.id,before,after,group,kind,undoOf,createdAt:D.serverTimestamp()};tx.set(entryRef(c,h,x.type,x.id),after);tx.set(receiptRef(c,h,opIds[n]),receipt);}
  return {state:'applied',group};
 });}catch(e){if(e.code!=='permission-denied')throw e;const saved=await Promise.all(opIds.map(o=>D.getDocFromServer(receiptRef(c,h,o))));if(saved.every(s=>s.exists()&&s.data().actor===uid))return {state:'duplicate',group};const now=await Promise.all(changes.map(x=>D.getDocFromServer(entryRef(c,h,x.type,x.id))));if(now.some((s,n)=>!equal(s.exists()?s.data():null,changes[n].before)))return {state:'review',group};throw e;}
}
export function equal(a,b){const normalize=v=>v&&typeof v==='object'?v instanceof D.Timestamp?v.toMillis():Array.isArray(v)?v.map(normalize):Object.fromEntries(Object.keys(v).sort().map(k=>[k,normalize(v[k])])):v;return JSON.stringify(normalize(a))===JSON.stringify(normalize(b));}
async function correct(c,h,changes,{group,undoOf}){
 const uid=c.auth.currentUser.uid;if(group!=='undo-'+undoOf)throw Error('Identificador de corrección no válido.');
 const refs=changes.map(x=>receiptRef(c,h,`${undoOf}_${x.type}_${x.id}`));
 try{return await D.runTransaction(c.db,async tx=>{const records=await Promise.all(refs.map(r=>tx.get(r)));if(records.every(s=>s.exists()&&s.data().undoAfter&&s.data().actor===uid))return {state:'duplicate',group};if(records.some(s=>!s.exists()||s.data().undoAfter))throw Error('La operación ya se ha corregido o no está completa.');const current=await Promise.all(changes.map(x=>tx.get(entryRef(c,h,x.type,x.id))));for(let n=0;n<changes.length;n++){const r=records[n].data();if(r.actor!==uid||r.kind==='undo'||Date.now()-r.createdAt.toMillis()>=30*60000)throw Error('Solo puedes corregir tus operaciones de los últimos 30 minutos.');if(!equal(current[n].data(),changes[n].before)||!equal(r.after,changes[n].before))return {state:'review',group};}for(let n=0;n<changes.length;n++){const x=changes[n],after={...x.after,version:x.before.version+1,lastOp:`${group}_${x.type}_${x.id}`};tx.set(entryRef(c,h,x.type,x.id),after);tx.update(refs[n],{undoAfter:after,undoAt:D.serverTimestamp()});}return {state:'applied',group};});}catch(e){if(e.code!=='permission-denied')throw e;const saved=await Promise.all(refs.map(r=>D.getDocFromServer(r)));if(saved.every(s=>s.exists()&&s.data().undoAfter&&s.data().actor===uid))return {state:'duplicate',group};const current=await Promise.all(changes.map(x=>D.getDocFromServer(entryRef(c,h,x.type,x.id))));if(current.some((s,n)=>!equal(s.data(),changes[n].before)))return {state:'review',group};throw e;}
}
export function newLot(data,sourceShop=''){validatePieces(Number(data.qty),data.unit);const v=validateLot({...data,name:data.name.trim(),qty:quantityRound(Number(data.qty),data.unit)});return {...v,sourceShop,createdAt:D.Timestamp.now()};}
export async function addLot(c,h,data,{group=id(),lotId=id()}={}){return commit(c,h,[{type:'lot',id:lotId,before:null,after:newLot(data)}],{group,kind:'add'});}
export async function incorporate(c,h,shopId,shop,data,{group=id(),lotId=id()}={}){if(!['open','bought'].includes(shop.status))throw Error('Este producto ya no está pendiente de guardar en despensa. Actualiza la compra.');const lot=newLot({...data,name:data.name??shop.name,qty:data.qty??shop.qty,unit:data.unit??shop.unit},shopId);return commit(c,h,[{type:'lot',id:lotId,before:null,after:lot},{type:'shop',id:shopId,before:shop,after:{...shop,name:lot.name,qty:lot.qty,unit:lot.unit,status:'incorporated',lotId}}],{group,kind:'incorporate'});}
export async function undo(c,h,receipts){if(!receipts.length)throw Error('No hay una operación que corregir.');const group='undo-'+receipts[0].data.group;const changes=receipts.map(({data:r})=>{if(r.actor!==c.auth.currentUser.uid||r.kind==='undo'||Date.now()-r.createdAt.toMillis()>30*60000)throw Error('Solo puedes deshacer tus operaciones de los últimos 30 minutos.');return {type:r.type,id:r.target,before:r.after,after:r.before??{...r.after,...(r.type==='lot'?{qty:0}:{status:'removed'})}};});return commit(c,h,changes,{group,kind:'undo',undoOf:receipts[0].data.group});}
export function watch(c,h,callback,error){const stop=[];const value={home:null,lots:[],shop:[],receipts:[],server:false};const emit=()=>callback({...value});stop.push(D.onSnapshot(homeRef(c,h),{includeMetadataChanges:true},s=>{value.home=s.data();value.server=!s.metadata.fromCache;emit();},error));for(const [collection,key] of [['lots','lots'],['shopping','shop'],['receipts','receipts']]){const q=collection==='receipts'?D.query(D.collection(c.db,`homes/${h}/${collection}`),D.orderBy('createdAt','desc'),D.limit(100)):D.collection(c.db,`homes/${h}/${collection}`);stop.push(D.onSnapshot(q,s=>{value[key]=s.docs.map(d=>({id:d.id,...d.data()}));emit();},error));}return ()=>stop.forEach(f=>f());}
export function today(zone='Europe/Madrid'){return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function foodState(l,day=today()){if(!l.date)return 'unknown';if(l.date<day)return l.dateType==='Caducidad'?'expired':'preferPast';if(l.date===day)return 'today';return 'dated';}
export const usable=(l,day=today())=>l.qty>0&&!['expired','preferPast'].includes(foodState(l,day));
