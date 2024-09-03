import express from "express";
import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: './.env'
})

const DB_NAME = "../constants.js"
const port = process.env.PORT || 8000;
connectDB()

.then(() =>{
    app.listen(port, () => {
        console.log(`App is listening on port : ${port}`);
    })
})
.catch((err) => {
    console.log("MongoDB connection failed !!!", err);
})


/*import express from "express";
const app = express()

(async() => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        c

        app.listen(process.env.PORT, () => {
            console.log(`App is listenig on port ${process.env.PORT}`);
        })

    } catch(error){
        console.log("ERROR:",error);
        throw err
    }
})()*/