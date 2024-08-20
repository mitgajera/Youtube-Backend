const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHanler(req, res, next)).catch((err) => next(err))
    }
}
    
export {asyncHandler}


// const asyncHandler = () => async(req, res, next) =>{
//     try{
//         await fn(req, res, next)
//     }catch(error){
//         res.status(err.code || 400).json({
//             success: false,
//             message: err.message
//         })
//     }
// }