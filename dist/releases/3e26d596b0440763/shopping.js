import * as P from './planning.js';
export function validateShopping(i){if(!i.name?.trim()||i.name.trim().length>60)throw Error('Escribe un producto de entre 1 y 60 caracteres.');P.validatePieces(i.qty,i.unit);if(!Number.isFinite(i.qty)||i.qty<=0||i.qty>1e9||P.quantityRound(i.qty,i.unit)!==i.qty)throw Error('Revisa la cantidad: positiva, hasta 1000000000 y con precisión válida.');if(!['ud','g','kg','ml','l'].includes(i.unit))throw Error('Revisa la unidad.');return {...i,name:i.name.trim()};}
// Pending requests and purchased amounts remain different rows.
export function shoppingQuantity(item,before,bought=[],increment=false){validateShopping(item);const unit=before?.unit||P.unitBase(item.unit),amount=P.convert(item.qty,item.unit,unit),purchased=bought.reduce((n,s)=>n+P.convert(s.qty,s.unit,unit),0);const need=increment?amount:Math.max(0,amount-purchased),active=before?.status==='open';const qty=active?(increment?P.quantityRound(before.qty+need,unit):Math.max(before.qty,need)):need;if(qty)validateShopping({name:item.name,qty,unit});return {qty,unit,status:'open',changed:qty>0&&(!active||qty!==before.qty)};}
export const matchesRecipeTab=(r,tab,servings,lots,today)=>{const req=P.requirements(r,servings,lots,today);return tab==='ready'?req.every(i=>i.state==='sufficient'):tab==='pending'?req.some(i=>i.state==='pending'):P.missing(r,servings,lots,today).length>0;};
export const eligibleRecipe=(r,{minutes=60,vegetarian=false,excluded=[]}={})=>r.complete&&r.ingredients.length&&r.time<=minutes&&(!vegetarian||r.vegetarian)&&!r.ingredients.some(([n])=>excluded.some(x=>P.sameFood(x,n)));
export const expiredFilters=()=>({search:'',place:'Todas',value:'expired'});
export const countWord=(n,singular,plural)=>`${n} ${n===1?singular:plural}`;
export const operationMessage=changes=>changes.some(x=>x.type==='lot')?'Operación guardada. Despensa actualizada.':'Compra actualizada. La despensa no ha cambiado.';

// A notice describes one version of one product; unrelated corrections survive.
export function currentShoppingNotice(notice,home,items,now=Date.now()){if(!notice||notice.home!==home)return null;if(notice.group&&notice.expires<=now)return null;if(!notice.target)return notice;const current=items.find(x=>x.id===notice.target);return !current||current.version>notice.version?null:notice;}
