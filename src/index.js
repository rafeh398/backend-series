import dotenv from "dotenv"
import connectDB from "./db/index.js"
import { app } from "./app.js"

 dotenv.config({
    path:"./env"
 })

connectDB()
.then(()=>{
   app.listen(process.env.PORT || 8000,()=>{
      console.log(`server is running at port : ${process.env.PORT}`);
      
   })
})
.catch((err)=>{
console.log("MOngo db connection failed!",err);

})

























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