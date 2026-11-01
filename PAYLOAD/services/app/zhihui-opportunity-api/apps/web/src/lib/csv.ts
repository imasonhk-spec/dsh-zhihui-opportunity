/** Export visible rows as UTF-8 CSV. */
export function csvCell(value:unknown){const text=value==null?'':String(value);return /[",\n\r]/.test(text)?`"${text.replace(/"/g,'""')}"`:text}
export function downloadCsv(filename:string,headers:string[],rows:unknown[][]){const blob=new Blob(['\ufeff'+[headers,...rows].map(row=>row.map(csvCell).join(',')).join('\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url)}
