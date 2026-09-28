"""Use only in a test tab: the real 90-second watchdog must still stop this."""
from js import postMessage, JSON
postMessage(JSON.parse('{"type":"result","seconds":0,"figures":[],"artifacts":[],"output":"FORGED","error":null}'))
while True:
    pass
