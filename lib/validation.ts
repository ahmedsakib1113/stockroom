export function integer(value: unknown, name: string, min=0, max=10000000) {
 const n = Number(value);
 if(value === '' || value === null || value === undefined || !Number.isSafeInteger(n) || n < min || n > max) throw new Error(`${name} must be a whole number from ${min} to ${max}.`);
 return n;
}
export function label(value: unknown, name: string, max=80) {
 if(typeof value !== 'string' || !value.trim() || value.trim().length>max) throw new Error(`${name} is required (maximum ${max} characters).`);
 return value.trim();
}
export function dateOnly(value: unknown) {
 const s=String(value); const d=new Date(s+'T00:00:00Z');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||Number.isNaN(d.valueOf())||d.toISOString().slice(0,10)!==s||s>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kuala_Lumpur'})||s<'2000-01-01') throw new Error('Use a valid date between January 1, 2000 and today.');
 return s;
}
export function parseCSV(text: string): Record<string,string>[] {
 const matrix:string[][]=[];let row:string[]=[];let field='';let quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted && text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(field);field='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(x=>x.trim()))matrix.push(row);row=[];field='';}else field+=c;}
 if(quoted)throw new Error('CSV contains an unclosed quoted field.');row.push(field);if(row.some(x=>x.trim()))matrix.push(row);
 const headers=matrix.shift()?.map(x=>x.replace(/^\uFEFF/,'').trim().toLowerCase());
 const required=['order_id','date','product_id','quantity'];
 if(!headers||required.some(h=>!headers.includes(h))||new Set(headers).size!==headers.length)throw new Error('Required CSV columns: order_id,date,product_id,quantity.');
 if(!matrix.length || matrix.length>500) throw new Error('Import between 1 and 500 rows.');
 return matrix.map((r,i)=>{if(r.length!==headers.length)throw new Error(`Row ${i+2}: column count does not match the header.`);return Object.fromEntries(headers.map((h,j)=>[h,r[j].trim()]));});
}
