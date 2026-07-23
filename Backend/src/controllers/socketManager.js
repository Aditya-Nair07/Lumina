import {Server} from 'socket.io';

let connections={};
let messages={};
let timeOnline={};
let socketNames={};

function findRoom(socketId){
    return Object.entries(connections).reduce(([room,isFound],[roomKey,roomValue])=>{
        if(!isFound && roomValue.includes(socketId)){
            return [roomKey,true]
        }
        return [room,isFound];
    },["",false]);
}

export const connectToSocket=(server)=>{
    const io=new Server(server,{
        cors:{
            origin:"*",
            methods:["GET","POST"],
                allowedHeaders:["*"],
                credentials:true
        }
    });

    io.on("connection",(socket)=>{

        socket.on("join-call",(path, username)=>{
            if(connections[path]===undefined){
                connections[path]=[]
            }
            connections[path].push(socket.id);
            timeOnline[socket.id]=new Date();
            socketNames[socket.id] = (username && String(username).trim()) || "Guest";

            const nameMap = {};
            connections[path].forEach((id)=>{
                nameMap[id] = socketNames[id] || "Guest";
            });

            for(let a=0;a<connections[path].length;a++){
                io.to(connections[path][a]).emit("user-joined",socket.id,connections[path], nameMap);
            }
            if(messages[path]!==undefined){
                for(let a=0;a<messages[path].length;++a){
                    io.to(socket.id).emit("chat-message",messages[path][a]['data'],
                    messages[path][a]['sender'],
                    messages[path][a]['socket-id-sender'])
                };
            }

        })

        socket.on("signal",(toId,message)=>{
            io.to(toId).emit("signal",socket.id,message);
        })

        socket.on("chat-message",(data,sender)=>{
            const [matchingRoom,found]=findRoom(socket.id);

            if(found===true){
                if(messages[matchingRoom]===undefined){
                    messages[matchingRoom]=[]
                }
                messages[matchingRoom].push({'sender':sender,'data':data,"socket-id-sender":socket.id})
                console.log("message",matchingRoom,":",sender,data)

                connections[matchingRoom].forEach((elem)=>{
                    io.to(elem).emit("chat-message",data,sender,socket.id);
                })
            }
        })

        socket.on("reaction",(emoji)=>{
            const [matchingRoom,found]=findRoom(socket.id);
            if(!found) return;
            const name = socketNames[socket.id] || "Guest";
            connections[matchingRoom].forEach((elem)=>{
                io.to(elem).emit("reaction", {
                    emoji,
                    sender: name,
                    from: socket.id,
                    id: `${socket.id}-${Date.now()}-${Math.random()}`
                });
            });
        })

        socket.on("screen-share",(payload)=>{
            const [matchingRoom,found]=findRoom(socket.id);
            if(!found) return;
            connections[matchingRoom].forEach((elem)=>{
                io.to(elem).emit("screen-share", {
                    from: socket.id,
                    sharing: Boolean(payload?.sharing),
                    name: socketNames[socket.id] || "Guest"
                });
            });
        })
        
        socket.on("disconnect",()=>{
            var key
            for(const[k,v] of JSON.parse(JSON.stringify(Object.entries(connections)))){
                for(let a=0;a<v.length;a++){
                    if(v[a]===socket.id){
                        key=k;
                        for(let b=0;b<connections[k].length;b++){
                            io.to(connections[k][b]).emit("user-left",socket.id);
                        }
                        var index=connections[k].indexOf(socket.id);
                        connections[key].splice(index,1);
                        if(connections[key].length===0){
                            delete connections[key];
                        }
                    }
                }
            }
            delete timeOnline[socket.id];
            delete socketNames[socket.id];
        })
    })

    return io;
}
