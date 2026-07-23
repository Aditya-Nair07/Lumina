import express from 'express';
import {createServer} from 'node:http';
import {Server} from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import {connectToSocket} from './controllers/socketManager.js';
import userRoutes from './routes/users.routes.js';

const app=express();
const server=createServer(app);
const io=connectToSocket(server)

app.set("port",(process.env.PORT||8000))
app.use(cors());//middleware to allow frontend to access backend resources

//middleware to parse incoming request body as json and urlencoded data with a limit of 40kb
app.use(express.json({limit:"40kb"}));
app.use(express.urlencoded({extended:true,limit:"40kb"}));//specially for form submission


app.use("/api/v1/users",userRoutes)

const start=async()=>{
    const connectionDb=await mongoose.connect("mongodb+srv://anweshapal2006_db_user:nma3KHO1h92xEHaC@cluster0.zzuj4p7.mongodb.net/")
    console.log(`MONGO Connected DB Host: ${connectionDb.connection.host}`)
    server.listen(app.get("port"),()=>{
console.log("Server is running on port 8000");//equivalent to server.listen(8000)
    });
}
start();