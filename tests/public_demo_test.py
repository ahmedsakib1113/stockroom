"""Check a running read-only demo without changing its data."""
import json
import sys
from urllib.error import HTTPError
from urllib.request import Request, urlopen

base = sys.argv[1].rstrip('/')


def snapshot():
    with urlopen(base + '/api/data', timeout=30) as response:
        return json.load(response)


before = snapshot()
assert before.get('readOnly') is True, 'Target must be a read-only demo.'
assert len(before['products']) == 8, 'Expected the sample product catalog.'
assert before['sales'], 'Expected sample sales.'

# Missing fields and malformed JSON must still hit the write restriction first.
for body in [json.dumps({'action': action}).encode()
             for action in ('product', 'restock', 'sale', 'import')] + [b'{']:
    request = Request(base + '/api/data', data=body,
                      headers={'Content-Type': 'application/json', 'Origin': base},
                      method='POST')
    try:
        with urlopen(request, timeout=30):
            raise AssertionError('Public demo accepted a write request.')
    except HTTPError as error:
        with error:
            message = error.read().decode()
        assert error.code == 403, f'Unexpected status: {error.code}: {message}'
        assert 'read-only' in json.loads(message)['error']

assert snapshot() == before, 'Demo data changed during rejected requests.'
print(f"Public demo passed: {len(before['products'])} products, "
      f"{len(before['sales'])} sales; all write actions rejected with unchanged data.")
