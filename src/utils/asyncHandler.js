
// try-catch ka wrapper ha ye
//ye high order function ha jo dusre function ko as parameter le rha
//ab hr jgha try-catch lgany ki zrorat ni just asynchandler lgao

const asyncHandler=(requestHandler)=>{


 return   (req,res,next)=>{
        
        Promise
        .resolve(requestHandler(req,res,next))
        .catch((err)=>next(err))

    }
}



export {asyncHandler}