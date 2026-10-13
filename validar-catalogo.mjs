import assert from 'node:assert/strict';
import {recipes} from './src/catalogue.js';
import * as P from './src/planning.js';
const log=(text)=>console.log('PASS '+text);
assert.equal(recipes.length,15);assert.equal(new Set(recipes.map(r=>r.id)).size,15);
for(const r of recipes){
 assert.equal(r.baseServings,2);assert(r.complete&&r.time>0&&r.time<=60&&r.steps.length>=2&&r.ingredients.length>=3);
 assert.equal(new Set(r.ingredients.map(([n,,u])=>P.foodKey(n)+'|'+u)).size,r.ingredients.length);
 for(const [name,qty,unit] of r.ingredients){assert(name.trim()&&qty>0&&Number.isFinite(qty));assert(['g','ml','ud'].includes(unit));}
 for(const servings of [1,2,3,12]){const values=P.scaled(r,servings);assert(values.every(i=>i.qty>0));for(let n=0;n<values.length;n++)assert(Math.abs(values[n].qty-r.ingredients[n][1]*servings/2)<0.001);}
 log(r.name+': unidades, cantidades y escalado 1/2/3/12 raciones');
}
const today='2026-10-10',rice=recipes.find(r=>r.id==='arroz'),egg=recipes.find(r=>r.id==='tortilla');
const lots=recipes.flatMap(r=>r.ingredients.map(([name,,unit])=>({name,unit,qty:10000,date:''})));
lots.push({name:'Huevos',unit:'ud',qty:4,date:today});
const context={lots,today,noticeDays:2,servings:()=>2};
assert(P.compareRecipes(egg,rice,context)<0);log('Receta que usa huevo de hoy precede al arroz sin fecha urgente');
const far={...context,lots:[...lots.filter(l=>l.date!==today),{name:'Huevos',unit:'ud',qty:4,date:'2026-11-10'}]};
assert.equal(P.priority(egg,far.lots,today,2).date,'');log('Fechas desconocidas o fuera del aviso no se presentan como urgentes');
assert.equal(P.priority(egg,[{name:'Huevos',unit:'ud',qty:4,date:'2026-10-09'}],today,2).date,'');
assert.equal(P.available([{name:'Huevos',unit:'ud',qty:4,date:'2026-10-09'}],'Huevos','ud',today),0);log('Producto con fecha superada no aporta disponibilidad ni prioridad');
const ready=rice.ingredients.map(([name,qty,unit])=>({name,qty,unit,date:''}));
assert.equal(P.missing(rice,2,ready,today).length,0);assert(P.missing(rice,3,ready,today).length>0);log('Cambio de raciones distingue existencias suficientes y necesidad de compra');
assert.equal(P.available([{name:'Tomate',unit:'g',qty:300,date:''}],'Tomates','g',today),300);
assert.equal(P.available([{name:'Tomates',unit:'ud',qty:300,date:''}],'Tomates','g',today),0);log('Singular/plural admitido; unidades incompatibles no se suman');
assert(P.missing(rice,2,ready.filter(l=>l.name!=='Aceite de oliva'),today).some(i=>i.name==='Aceite de oliva'));log('Aceite ausente exige compra; básicos no se presuponen');
const fractions=[{name:'Arroz',qty:0.1,unit:'g',date:''},{name:'Arroz',qty:0.2,unit:'g',date:''}];assert.equal(P.available(fractions,'Arroz','g',today),0.3);log('Suma decimal redondeada evita faltantes por precisión binaria');
console.log('VALIDACIÓN CATÁLOGO Y PRIORIDAD COMPLETADA.');
