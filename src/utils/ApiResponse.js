
//jab b response beje gy hm yha se beje gy

class ApiResponse{
    constructor(statusCode,data,message="Success"){
        this.statusCode=statusCode;
        this.data=data;
        this.message=message;
        this.success=statusCode <400  //should be less thanj 400 for success

    }
}
export {ApiResponse}