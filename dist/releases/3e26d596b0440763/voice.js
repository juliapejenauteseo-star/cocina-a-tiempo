// Browser recognition only. No persistence, API keys, paid service or automatic save.
const norm=s=>s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').trim();
const numbers={cero:0,un:1,una:1,uno:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12,trece:13,catorce:14,quince:15,dieciseis:16,diecisiete:17,dieciocho:18,diecinueve:19,veinte:20,veintiuno:21,veintidos:22,veintitres:23,veinticuatro:24,veinticinco:25,veintiseis:26,veintisiete:27,veintiocho:28,veintinueve:29,treinta:30,'treinta y uno':31};
export const speechNumber=s=>{s=norm(s);if(/^\d+(?:[.,]\d+)?$/.test(s))return Number(s.replace(',','.'));if(s in numbers)return numbers[s];const parts=s.split(/\s+(?:coma|punto)\s+/);if(parts.length===2){const a=speechNumber(parts[0]),b=speechNumber(parts[1]);if(Number.isFinite(a)&&Number.isInteger(b)&&b>=0)return Number(a+'.'+b);}return NaN;};
export function speechDate(text){const t=norm(text),numeric=t.match(/(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{4})/),months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];let day,month,year;if(numeric)[,day,month,year]=numeric;else{const m=t.match(/^(.*?)\s+de\s+(\w+)\s+(?:(?:de|del)\s+)?(.+?)[.,]?$/);if(!m)return '';day=speechNumber(m[1]);month=months.indexOf(m[2])+1;year=/^dos mil /.test(m[3])?2000+speechNumber(m[3].slice(8)):Number(m[3]);}if(!month||!(year>=2000&&year<=2099)||!Number.isInteger(Number(day)))return '';const iso=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`,d=new Date(iso+'T12:00:00Z');return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===iso?iso:'';}
export function parseSpeech(text){
 const t=norm(text);let body=t,dateText='';
 const explicit=t.match(/\bfecha\s*:?\s*(.+)$/);
 const trailing=t.match(/(?:\d{1,2}\s*[/.-]\s*\d{1,2}\s*[/.-]\s*\d{4}|(?:\d{1,2}|[a-z]+(?: y [a-z]+)?)\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(?:(?:de|del)\s+)?(?:\d{4}|dos mil [a-z]+))[.,]?$/);
 const dm=explicit||trailing;if(dm){dateText=explicit?dm[1]:dm[0];body=t.slice(0,dm.index).trim();}
 body=body.replace(/[,;:.]+$/,'').trim();
 const result={name:'',qty:'',unit:'',date:dateText?speechDate(dateText):'',warnings:[]};
 const um=body.match(/\b(unidades?|piezas?|ud|kilogramos?|kilos?|kg|gramos?|g|mililitros?|ml|litros?|l)\b\s*[.,;]?$/);
 if(um){result.unit=/^(unid|piez|ud)/.test(um[1])?'ud':/^(kil|kg)/.test(um[1])?'kg':/^(gram|g$)/.test(um[1])?'g':/^(mil|ml)/.test(um[1])?'ml':'l';body=body.slice(0,um.index).trim();}
 const words=body.split(/\s+/);
 for(const leading of [true,false]){for(let n=Math.min(4,words.length-1);n>=1;n--){const q=speechNumber((leading?words.slice(0,n):words.slice(-n)).join(' '));if(Number.isFinite(q)){result.qty=q;result.name=(leading?words.slice(n):words.slice(0,-n)).join(' ').replace(/^alimento\s*:\s*/,'').replace(/[,;:\s]+(?:cantidad\s*:)?\s*$/,'').trim();break;}}if(result.name)break;}
 if(!result.name)result.name=body;
 if(!result.unit)result.warnings.push('La unidad no se ha indicado. Elígela antes de revisar los datos.');
 if(!(result.qty>0)||!result.name)result.warnings.push('No se han reconocido todos los campos. Complétalos en el formulario.');
 if(result.unit==='ud'&&!Number.isInteger(result.qty))result.warnings.push('ud representa piezas enteras; revisa la cantidad sin redondear.');
 if(dateText&&!result.date)result.warnings.push('Fecha no reconocida o no válida. Escríbela manualmente.');
 return result;
}
export const voiceError=code=>({network:'Voz no disponible: falló la conexión con el servicio de reconocimiento del navegador (network). El formulario sigue disponible.','not-allowed':'Micrófono denegado o bloqueado. El formulario sigue disponible.','service-not-allowed':'Servicio de voz bloqueado o no admitido. El formulario sigue disponible.','audio-capture':'No se pudo captar audio. Revisa el micrófono o utiliza el formulario.','no-speech':'No se detectó voz. Puedes volver a pulsar el micrófono o utilizar el formulario.','language-not-supported':'El navegador no admite español en este servicio. Utiliza el formulario.',aborted:'Escucha cancelada. No se ha guardado nada.'}[code]||'No se pudo reconocer la voz. El formulario sigue disponible.');
export class VoiceTrial{
 constructor(factory,emit){this.factory=factory;this.emit=emit;this.active=false;this.run=0;}
 start(){if(this.active)return;this.active=true;this.failed=false;this.text='';this.endReason='browser';this.startedAt=Date.now();const run=++this.run;this.emit({phase:'starting',text:''});try{const r=this.factory();if(!r)throw Object.assign(Error(),{code:'unsupported'});this.r=r;r.lang='es-ES';r.continuous=true;r.interimResults=false;r.onstart=()=>{if(this.run===run)this.emit({phase:'listening',text:this.text});};r.onresult=e=>{if(this.run!==run||this.failed)return;this.text=Array.from(e.results).filter(x=>x.isFinal).map(x=>x[0].transcript).join(' ').trim();this.emit({phase:'result',text:this.text});};r.onerror=e=>{if(this.run!==run)return;this.failed=true;this.active=false;clearTimeout(this.timer);r.onstart=r.onresult=r.onend=r.onerror=null;try{r.abort();}catch{}this.emit({phase:'error',error:e.error,text:this.text});};r.onend=()=>{if(this.run!==run)return;this.active=false;clearTimeout(this.timer);if(!this.failed)this.emit({phase:this.text?'review':'ended',text:this.text,endReason:this.endReason,elapsedMs:Date.now()-this.startedAt});};r.start();this.timer=setTimeout(()=>{this.endReason='limit';this.stop();},120000);}catch(e){this.active=false;this.failed=true;this.emit({phase:'error',error:e.code||'start-failed',text:''});}}
 stop(){if(!this.active)return;if(this.endReason!=='limit')this.endReason='user';clearTimeout(this.timer);this.emit({phase:'stopping',text:this.text});try{this.r.stop();}catch{this.cancel();}}
 cancel(){++this.run;clearTimeout(this.timer);this.active=false;try{this.r?.abort();}catch{}this.emit({phase:'cancelled',text:this.text||''});}
}

