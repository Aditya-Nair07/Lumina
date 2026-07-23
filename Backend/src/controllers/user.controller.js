import User from "../models/user.model.js";
import bcrypt,{hash} from "bcrypt";
import httpStatus from "http-status";
import crypto from "crypto";
import Meeting from "../models/meeting.model.js"

const login=async(req,res)=>{
    //take username and password from request body
    const {username,password}=req.body;
    //if not present return bad request
    if(!username||!password){
        return res.status(400).json({message:"Username and password are required"});
    }
    try{
        //find user in db using username
        const user=await User.findOne({username});
        //if not present return not found
        if(!user){
            return res.status(httpStatus.NOT_FOUND).json({message:"User not found"});
        }
        //if found comapre password that was entered with the one already stored in db using bcrypt
        let isPasswordCorrect=await bcrypt.compare(password,user.password);
        if(isPasswordCorrect){
            //password match so generate a token and save it in db and return it to user
            let token=crypto.randomBytes(16).toString("hex");
            user.token=token;
            await user.save();
            return res.status(httpStatus.OK).json({token:token});
        }else{
            return res.status(httpStatus.UNAUTHORIZED).json({message:"Invalid username or password"});
        }
    }catch(error){
        return res.status(500).json({message:`Something went wrong ${error.message}`});
    }
}

const register=async(req,res)=>{
    //take name,username and password from request body
    const {name,username,password}=req.body;

    try{
        //check if user with the same username already exists in db
        const existingUser=await User.findOne({username});
        //if already exists return already exists
        if(existingUser){
            return res.status(httpStatus.FOUND).json({message:"User already exists"});
        }
        //if not found then hash the password entered
        const hashedPassword=await bcrypt.hash(password,10);
        //create a new user with all the data and save it in db
        const newUser=new User({
            name:name,
            username:username,
            password:hashedPassword
        });
        await newUser.save();
        res.status(httpStatus.CREATED).json({message:"User registered successfully"});

    } catch (error) {
        res.json({message:"Something went wrong"});
    }
}

const getUserHistory=async(req,res)=>{
    const {token}=req.query;
    try{
        const user=await User.findOne({token:token});
        console.log("USER =", user);
        const meetings=await Meeting.find({user_id:user.username})
        res.json(meetings)
    }catch(e){
        res.json({message:`Something went wrong ${e}`})
    }
}

    const addToUserHistory = async (req, res) => {
    console.log("BODY =", req.body);

    const { token, meeting_code } = req.body;

    try {
        const user = await User.findOne({ token });

        console.log("USER =", user);

        const newMeeting = new Meeting({
            user_id: user.username,
            meetingCode: meeting_code
        });

        await newMeeting.save();

        console.log("MEETING SAVED");

        return res.status(201).json({
            message: "Added code to history"
        });
    } catch (e) {
        console.error("ERROR =", e);
        return res.status(500).json({ message: e.message });
    }
};

export {login,register,getUserHistory,addToUserHistory};