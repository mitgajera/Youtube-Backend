import dotenv from "dotenv";
import connectDB from "./db/index.js";

dotenv.config({
    path: './env'
})

connectDB()
.then(() =>{
    app.listen(process.env.PORT, () => {
        console.log(`App is listenig on port ${process.env.PORT}`);
    })
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running on port ${process.env.PORT || 8000}`
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