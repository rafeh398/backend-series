import dotenv from "dotenv"
import connectDB from "./db/index.js";
 dotenv.config({
    path:"./env"
 })

connectDB();

























//1st APproach to connect DB
// import express from "express";

// const app=express()

// ; (async()=>{ // IIFE start with semi collon and async function mein database connect with try-catch
//     try {
//       await  mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//       app.on("error",()=>{  //listener
//         console.log("ERROR Application can not talk to DB");
        
//       })
//       app.listen(process.env.PORT, ()=>{
//         console.log(`app is listenning on port ${process.env.PORT}`);
        
//       })
//     } catch (error) {
//         console.log(error);
        
//     }
// })()