"""No personal data or outbound host: test denied fetch and disabled APIs."""
from js import fetch, globalThis
try:
    fetch('data:text/plain,network-test')
except Exception:
    print('PASS: fetch blocked before any request')
else:
    raise AssertionError('fetch was allowed')
print('WebSocket disabled:', globalThis.WebSocket is None)
print('XMLHttpRequest disabled:', globalThis.XMLHttpRequest is None)
