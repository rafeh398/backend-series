import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app=express()

//ap.use for configuration

app.use(cors(
    {
        origin:process.env.CORS_ORIGIN,
credentials:true
    }
))


app.use(express.json({limit:"16kb"}))

app.use(express.urlencoded({limit:"16kb",extended:true}))

app.use(express.static("public"))  //public asseets like pdfs and imgs

app.use(cookieParser())
 
//Routes
import userRouter from "./routes/user.routes.js"



//routes declaration

app.use("/api/v1/users",userRouter)  ///user tak jo ata mein handle ni krta mein userRouter ko pass krta hu

//http:localhost:8000/api/v1/user/register



export {app}

