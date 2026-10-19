import test from 'node:test';
import assert from 'node:assert/strict';
import {enhanceDropdown} from '../public/dropdown.js';
class Element extends EventTarget{
 constructor(){super();this.children=[];this.dataset={};this.attrs={};this.hidden=false;this.classList={toggle(){}};}
 append(...children){this.children.push(...children);children.forEach(c=>c.parent=this);}
 setAttribute(k,v){this.attrs[k]=String(v);}
 removeAttribute(k){delete this.attrs[k];}
 contains(node){return node===this||this.children.some(c=>c.contains(node));}
 after(node){this.sibling=node;}
 focus(){this.focused=true;}
 scrollIntoView(){}
 closest(){return this.role==='option'?this:null;}
}
const key=(element,value)=>{const event=new Event('keydown',{cancelable:true});Object.defineProperty(event,'key',{value});element.dispatchEvent(event);};
test('reusable dropdown supports keyboard commit, cancellation, validation, reset and native value',async()=>{
 const previous=globalThis.document;
 const doc=new Element();doc.createElement=()=>new Element();globalThis.document=doc;
 try{
 const select=new Element();select.id='business';select.options=[{textContent:'All',disabled:false},{textContent:'Shalean',disabled:false},{textContent:'Bokkie',disabled:false}];select.selectedIndex=0;select.labels=[new Element()];select.form=new Element();select.required=true;
 let changes=0;select.addEventListener('change',()=>changes++);
 enhanceDropdown(select);const root=select.sibling,[trigger,list]=root.children;
 assert.equal(select.hidden,true);assert.equal(trigger.attrs['aria-expanded'],'false');
 trigger.dispatchEvent(new Event('click'));assert.equal(list.hidden,false);
 const down=new Event('mousedown',{cancelable:true});list.dispatchEvent(down);assert.equal(down.defaultPrevented,true);
 const click=new Event('click');Object.defineProperty(click,'target',{value:list.children[2]});list.dispatchEvent(click);assert.equal(select.selectedIndex,2);assert.equal(list.hidden,true);assert.equal(changes,1);
 select.selectedIndex=0;changes=0;select.dispatchEvent(new Event('change'));changes=0;
 key(trigger,'ArrowDown');assert.equal(list.hidden,false);key(trigger,'Enter');assert.equal(select.selectedIndex,1);assert.equal(changes,1);assert.equal(list.hidden,true);
 key(trigger,'ArrowDown');key(trigger,'Escape');assert.equal(select.selectedIndex,1);assert.equal(list.hidden,true);
 key(trigger,'b');key(trigger,'Enter');assert.equal(select.selectedIndex,2);
 key(trigger,'Home');key(trigger,'Enter');assert.equal(select.selectedIndex,0);
 key(trigger,'End');key(trigger,'Enter');assert.equal(select.selectedIndex,2);
 key(trigger,' ');key(trigger,'Tab');assert.equal(list.hidden,true);
 select.dispatchEvent(new Event('invalid',{cancelable:true}));assert.equal(trigger.attrs['aria-invalid'],'true');assert.equal(trigger.focused,true);
 select.selectedIndex=0;select.form.dispatchEvent(new Event('reset'));await new Promise(resolve=>setTimeout(resolve,5));assert.equal(trigger.children[0].textContent,'All');assert.equal(list.hidden,true);
 const first=select.sibling;enhanceDropdown(select);assert.equal(select.sibling,first);
 }finally{globalThis.document=previous;}
});
