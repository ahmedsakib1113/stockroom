import {test} from 'node:test';
import assert from 'node:assert/strict';
import {integer,dateOnly,parseCSV,label} from '../lib/validation.ts';
test('quantities reject fractions, negatives, empty and unsafe numbers',()=>{for(const v of ['',null,undefined,-1,1.5,Infinity,'abc']) assert.throws(()=>integer(v,'Quantity',1));assert.equal(integer('3','Quantity',1),3);});
test('dates reject rollover and future dates',()=>{assert.throws(()=>dateOnly('2025-02-30'));assert.throws(()=>dateOnly('2099-01-01'));assert.equal(dateOnly('2024-02-29'),'2024-02-29');});
test('CSV handles BOM, CRLF and quoted commas',()=>{const rows=parseCSV('\uFEFForder_id,date,product_id,quantity\r\n"one,two",2026-01-01,P001,2\r\n');assert.equal(rows[0].order_id,'one,two');assert.equal(rows.length,1);});
test('CSV rejects malformed header, rows, unclosed quotes and no records',()=>{for(const csv of ['date,quantity\n2026-01-01,2','order_id,date,product_id,quantity\nx,2026-01-01,P001','order_id,date,product_id,quantity\n"bad','order_id,date,product_id,quantity'])assert.throws(()=>parseCSV(csv));});
test('labels trim input and enforce length',()=>{assert.equal(label(' Latte ','Name'),'Latte');assert.throws(()=>label(' ','Name'));assert.throws(()=>label('too long','Name',2));});
