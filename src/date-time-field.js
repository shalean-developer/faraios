const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Shared server renderer; text entry works without JavaScript or a native picker.
export function dateTimeField({id,name=id,label,kind='date',value='',required=true,timeZone='UTC'}){
 if(!['date','time','datetime'].includes(kind))throw new Error('Unsupported date/time picker');
 const hint=kind==='date'?'YYYY-MM-DD':kind==='time'?'HH:mm (24-hour)':'YYYY-MM-DDTHH:mm (24-hour)';
 const pattern=kind==='date'?'[0-9]{4}-[0-9]{2}-[0-9]{2}':kind==='time'?'[0-9]{2}:[0-9]{2}':'[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}';
 return `<label for="${esc(id)}">${esc(label)}</label><input id="${esc(id)}" name="${esc(name)}" type="text" data-picker="${kind}" data-time-zone="${esc(timeZone)}" value="${esc(value)}" placeholder="${hint}" pattern="${pattern}" maxlength="${kind==='date'?10:kind==='time'?5:16}" autocomplete="off" aria-describedby="${esc(id)}-format"${required?' required':''}><span class="picker-format" id="${esc(id)}-format">${hint}</span>`;
}
