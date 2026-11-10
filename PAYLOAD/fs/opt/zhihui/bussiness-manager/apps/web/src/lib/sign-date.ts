export function displaySignDate(value:string){return /^\d{4}-\d{2}-\d{2}T/.test(value)?value.slice(0,10):value}
