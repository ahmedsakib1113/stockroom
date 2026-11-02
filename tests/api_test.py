"""Integration tests; writes only to the local preview specified by the caller."""
import sys,json,urllib.request,urllib.error,uuid,datetime
base=sys.argv[1].rstrip('/')
assert base.startswith(('http://localhost:','http://127.0.0.1:','http://terminal.local:')), 'Local preview only'
def get():
 return json.load(urllib.request.urlopen(base+'/api/data',timeout=15))
def post(body,status=200):
 req=urllib.request.Request(base+'/api/data',data=json.dumps(body).encode(),headers={'Content-Type':'application/json'},method='POST')
 try:r=urllib.request.urlopen(req,timeout=15);code=r.status;data=json.load(r)
 except urllib.error.HTTPError as e:code=e.code;data=json.load(e)
 assert code==status,(code,data)
 return data
name='QA-'+uuid.uuid4().hex[:8];date=datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).date().isoformat()
post(dict(action='product',name=name,category='Other',price=1200,cost=400,stock=5,threshold=2))
p=next(p for p in get()['products'] if p['name']==name);pid=p['id'];sid='qa-'+uuid.uuid4().hex
post(dict(action='sale',id=sid,product_id=pid,quantity=2,date=date))
assert next(p for p in get()['products'] if p['id']==pid)['stock']==3
post(dict(action='sale',id=sid,product_id=pid,quantity=2,date=date),400)
post(dict(action='sale',id=sid+'x',product_id=pid,quantity=4,date=date),400)
post(dict(action='product',id=pid,name=name,category='Other',price=1500,cost=600,threshold=2))
s=next(s for s in get()['sales'] if s['id']==sid);assert (s['unit_price'],s['unit_cost'])==(1200,400)
order='qa-'+uuid.uuid4().hex
csv=f'order_id,date,product_id,quantity\n{order},{date},{pid},1\n'
post(dict(action='import',csv=csv));post(dict(action='import',csv=csv),400)
post(dict(action='import',csv=f'order_id,date,product_id,quantity\n{order}a,{date},{pid},1\n{order}b,{date},UNKNOWN,1\n'),400)
assert next(p for p in get()['products'] if p['id']==pid)['stock']==2
post(dict(action='restock',id=pid,quantity=8))
assert next(p for p in get()['products'] if p['id']==pid)['stock']==10
print('PASS: create, sale, persistence, duplicate rejection, oversell rejection, immutable price/cost, CSV import, batch rejection, restock')
