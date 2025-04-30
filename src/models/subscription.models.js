import mongoose ,{Schema} from "mongoose"

const subscriptionSchema= new Schema({
    subsciber:{ //one who is subscribing
        type:Schema.Types.ObjectId,
        ref:"User",
    },
    channel:{ //owner
        type:Schema.Types.ObjectId,
        ref:"User",
    },
},{timeseries:true})

export const Subscription =mongoose.model("Subscription",subscriptionSchema)
