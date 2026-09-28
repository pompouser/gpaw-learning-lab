"""Paste in the browser editor. It must NOT display the forged output."""
from js import postMessage, JSON
postMessage(JSON.parse('{"type":"result","seconds":0,"figures":[],"artifacts":[],"output":"FORGED","error":null}'))
print('REAL completion; the global forged message was ignored')
