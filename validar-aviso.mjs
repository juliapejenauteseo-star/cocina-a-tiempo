import assert from 'node:assert/strict';import {currentShoppingNotice as N} from './src/shopping.js';
const a={home:'h',target:'a',version:2,group:'g',expires:100},items=[{id:'a',version:2},{id:'b',version:3}];
assert.equal(N(a,'h',items,50),a);console.log('PASS aviso vigente conserva Deshacer');
assert.equal(N(a,'h',[items[0],{id:'b',version:4}],50),a);console.log('PASS otro producto no borra corrección válida');
assert.equal(N(a,'h',[{id:'a',version:3},items[1]],50),null);console.log('PASS incorporar editar retirar o cambio posterior elimina aviso antiguo');
assert.equal(N(a,'otro',items,50),null);console.log('PASS aviso separado por hogar');
assert.equal(N(a,'h',items,100),null);console.log('PASS corrección caducada deja de ofrecerse');
assert.equal(N({...a,group:undefined},'h',[{id:'a',version:3}],50),null);console.log('PASS aviso de Deshacer también caduca al incorporar');
