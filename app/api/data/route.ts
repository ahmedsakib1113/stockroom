import { env } from 'cloudflare:workers';
import { integer,label,dateOnly,parseCSV } from '../../../lib/validation';
export const dynamic='force-dynamic';
const catalog=[['P001','Flat white','Coffee',1200,380,42,15],['P002','Iced latte','Coffee',1400,420,58,15],['P003','Matcha latte','Tea',1600,580,8,12],['P004','Butter croissant','Bakery',950,350,6,10],['P005','Banana bread','Bakery',850,280,24,10],['P006','Cold brew','Coffee',1300,320,35,12],['P007','Chocolate cookie','Bakery',650,180,48,15],['P008','Peach iced tea','Tea',1100,260,9,12]];
function db(){if(!env.DB)throw new Error('Database is unavailable.');return env.DB;}
async function seed(){const d=db();if(await d.prepare("SELECT value FROM settings WHERE key='seeded'").first())return;
 const statements=catalog.map(p=>d.prepare('INSERT OR IGNORE INTO products (id,name,category,price,cost,stock,threshold) VALUES (?,?,?,?,?,?,?)').bind(...p));
 const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kuala_Lumpur'}); const base=new Date(today+'T12:00:00Z');
 for(let day=89;day>=0;day--){const date=new Date(base.valueOf()-day*86400000).toISOString().slice(0,10);for(let j=0;j<catalog.length;j++){const p=catalog[j];const weekend=[0,6].includes(new Date(date).getUTCDay());const qty=2+((day*13+j*7)%9)+(weekend?4:0)+Math.floor((89-day)/30);statements.push(d.prepare('INSERT OR IGNORE INTO sales (id,product_id,quantity,unit_price,unit_cost,date,source) VALUES (?,?,?,?,?,?,?)').bind(`demo-${date}-${j}`,p[0],qty,p[3],p[4],date,'sample'));}}
 // D1 statement batches are atomic. Seed only once, with stable IDs for concurrent first loads.
 statements.push(d.prepare("INSERT OR IGNORE INTO settings (key,value) VALUES ('seeded',?)").bind(today));await d.batch(statements);
}
export async function GET(){try{await seed();const d=db();const [p,s]=await Promise.all([d.prepare('SELECT * FROM products ORDER BY name').all(),d.prepare('SELECT * FROM sales ORDER BY date DESC,id DESC').all()]);return Response.json({products:p.results,sales:s.results,readOnly:env.STOCKROOM_READ_ONLY==='true'},{headers:{'Cache-Control':'no-store'}});}catch(e){console.error(e);return Response.json({error:'Unable to load the database. Please try again.'},{status:500});}}
export async function POST(req:Request){try{
 if(env.STOCKROOM_READ_ONLY==='true')return Response.json({error:'This public demo is read-only. Explore the dashboard, filters, analytics, and exports.'},{status:403});
 const origin=req.headers.get('origin');if(origin && origin!==new URL(req.url).origin)return Response.json({error:'Invalid request origin.'},{status:403});
 if(Number(req.headers.get('content-length')||0)>200000)return Response.json({error:'Upload too large.'},{status:413});
 const bodyText=await req.text();if(bodyText.length>200000)throw new Error('Upload too large.');const b=JSON.parse(bodyText);const d=db();await seed();
 if(b.action==='product'){
 const id=b.id?label(b.id,'Product ID',40):`P-${crypto.randomUUID().slice(0,8)}`;const name=label(b.name,'Product name');const category=label(b.category,'Category',30);const price=integer(b.price,'Price');const cost=integer(b.cost,'Cost');const threshold=integer(b.threshold,'Reorder level',0,100000);
 if(b.id){const r=await d.prepare('UPDATE products SET name=?,category=?,price=?,cost=?,threshold=? WHERE id=?').bind(name,category,price,cost,threshold,id).run();if(!r.meta.changes)throw new Error('Product not found.');}
 else await d.prepare('INSERT INTO products (id,name,category,price,cost,stock,threshold) VALUES (?,?,?,?,?,?,?)').bind(id,name,category,price,cost,integer(b.stock,'Stock',0,100000),threshold).run();
 return Response.json({message:'Product saved.'});
 }
 if(b.action==='restock'){const r=await d.prepare('UPDATE products SET stock=stock+? WHERE id=?').bind(integer(b.quantity,'Restock quantity',1,100000),label(b.id,'Product ID',40)).run();if(!r.meta.changes)throw new Error('Product not found.');return Response.json({message:'Stock updated.'});}
 if(b.action==='sale'||b.action==='import'){
 let rows:{id:string;product:string;quantity:number;date:string}[];
 if(b.action==='import'){rows=parseCSV(label(b.csv,'CSV',190000)).map((r,i)=>{try{return{id:'csv-'+label(r.order_id,'Order ID',70),product:label(r.product_id,'Product ID',40),quantity:integer(r.quantity,'Quantity',1,10000),date:dateOnly(r.date)};}catch(e){throw new Error(`Row ${i+2}: ${(e as Error).message}`);}});}
 else rows=[{id:label(b.id,'Sale ID',80),product:label(b.product_id,'Product',40),quantity:integer(b.quantity,'Quantity',1,10000),date:dateOnly(b.date)}];
 if(new Set(rows.map(r=>r.id)).size!==rows.length)throw new Error('Duplicate order_id values in this CSV. Each row needs a unique ID.');
 const products=(await d.prepare('SELECT * FROM products').all()).results as any[];const byId=new Map(products.map(p=>[p.id,p]));const totals=new Map<string,number>();
 for(const r of rows){if(!byId.has(r.product))throw new Error(`Unknown product: ${r.product}.`);totals.set(r.product,(totals.get(r.product)||0)+r.quantity);}
 for(const [id,q] of totals){if(q>byId.get(id).stock)throw new Error(`Not enough stock for ${byId.get(id).name}: ${byId.get(id).stock} available, ${q} requested.`);}
 const statements=[];for(const r of rows){const p=byId.get(r.product);statements.push(d.prepare('INSERT INTO sales (id,product_id,quantity,unit_price,unit_cost,date,source) VALUES (?,?,?,?,?,?,?)').bind(r.id,r.product,r.quantity,p.price,p.cost,r.date,b.action==='import'?'import':'manual'));statements.push(d.prepare('UPDATE products SET stock=stock-? WHERE id=?').bind(r.quantity,r.product));}
 // CHECK(stock >= 0) rolls back the entire batch if concurrent sales exhaust stock.
 try{await d.batch(statements);}catch(e){const msg=String(e);if(msg.includes('UNIQUE'))throw new Error('A sale with this order ID already exists. Nothing was imported.');if(msg.includes('CHECK'))throw new Error('Stock changed. Refresh and try again. Nothing was recorded.');throw e;}
 return Response.json({message:rows.length===1?'Sale recorded.':`${rows.length} sales imported.`});
 }
 throw new Error('Unknown action.');
 }catch(e){const msg=(e as Error).message;console.error(e);return Response.json({error:/D1_|SQLITE|syntax|JSON/i.test(msg)?'The request could not be saved. Check your data and try again.':msg},{status:400});}}
