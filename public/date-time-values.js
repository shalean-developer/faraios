// Shared, DOM-free validation for browser controls and server form handlers.
export function validDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||value<'0001-01-01')return false;
 const d=new Date(value+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;
}
export const validTime=value=>typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value);
export function validPickerValue(value,kind){return typeof value==='string'&&(kind==='date'?validDate(value):kind==='time'?validTime(value):kind==='datetime'&&value.length===16&&validDate(value.slice(0,10))&&value[10]==='T'&&validTime(value.slice(11)));}
