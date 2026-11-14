'use strict';
const optionEditors=[...document.querySelectorAll('.option-editor')];
if(optionEditors.length){
 const available=optionEditors.filter((row,i)=>i>1&&!row.open);
 available.forEach(row=>row.hidden=true);
 const add=document.createElement('button');add.type='button';add.className='button secondary';add.textContent='Add room or extra';
 add.addEventListener('click',()=>{const row=available.shift();if(row){row.hidden=false;row.open=true;row.querySelector('input[type="checkbox"]').checked=true;row.querySelector('input:not([type="checkbox"]):not([type="hidden"])').focus();}add.hidden=!available.length;});
 optionEditors.at(-1).after(add);add.hidden=!available.length;
}
