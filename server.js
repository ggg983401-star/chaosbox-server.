const http=require('http');
const WebSocket=require('ws');
const fs=require('fs');
const port=Number(process.env.PORT||3000);
const server=http.createServer((req,res)=>{
 if(req.url==='/'||req.url==='/index.html'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});fs.createReadStream(__dirname+'/index.html').pipe(res);}
 else{res.writeHead(404);res.end('Not found');}
});
const wss=new WebSocket.Server({server});
const rooms=new Map();let next=1;
function broadcast(room,obj,except){for(const c of rooms.get(room)||[])if(c!==except&&c.readyState===1)c.send(JSON.stringify(obj));}
function listing(room){const clients=[...(rooms.get(room)||[])];for(const c of clients)c.send(JSON.stringify({type:'players',you:c.id,players:clients.map(p=>({id:p.id,nick:p.nick,x:p.x||0,z:p.z||0,yaw:p.yaw||0}))}));}
wss.on('connection',ws=>{
 ws.id=String(next++);ws.last=0;
 ws.on('message',raw=>{if(raw.length>2048)return;let m;try{m=JSON.parse(raw)}catch{return;}
 if((m.type==='join'||m.type==='create')&&!ws.room){const room=m.type==='create'?Math.random().toString(36).slice(2,8).toUpperCase():String(m.room||'').replace(/[^A-Z0-9_-]/gi,'').slice(0,24);if(!room)return;if(m.type==='join'&&!rooms.has(room)){ws.send(JSON.stringify({type:'error',message:'Лобби не найдено'}));return;}
 const members=rooms.get(room)||new Set();if(members.size>=12){ws.send(JSON.stringify({type:'error',message:'Комната заполнена (12 игроков)'}));return;}
 if(m.type==='create')ws.send(JSON.stringify({type:'created',room}));ws.room=room;ws.nick=String(m.nick||'Игрок').slice(0,20);members.add(ws);rooms.set(room,members);listing(room);}
 if(m.type==='state'&&ws.room&&Date.now()-ws.last>90){ws.last=Date.now();const x=Number(m.x),z=Number(m.z),yaw=Number(m.yaw);if(![x,z,yaw].every(Number.isFinite))return;ws.x=Math.max(-40,Math.min(40,x));ws.z=Math.max(-40,Math.min(40,z));ws.yaw=yaw;broadcast(ws.room,{type:'state',id:ws.id,nick:ws.nick,x:ws.x,z:ws.z,yaw:ws.yaw},ws);}
 });
 ws.on('close',()=>{if(!ws.room)return;const members=rooms.get(ws.room);members?.delete(ws);if(!members?.size)rooms.delete(ws.room);else listing(ws.room);});
});
server.listen(port,()=>console.log('CHAOSBOX server listening on '+port));
