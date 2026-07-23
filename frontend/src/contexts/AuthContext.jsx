import axios from "axios";
import React, { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";

import { serverUrl } from "../environment"
export const AuthContext = createContext({});

const client = axios.create({
    baseURL: `${serverUrl}/api/v1/users`
});

export const AuthProvider = ({ children }) => {
    const authContext = useContext(AuthContext);
    const [userData, setUserData] = useState(authContext);
    const router = useNavigate();

    const handleRegister = async (name, username, password) => {
        try {
            const response = await client.post("/register", {
                name,
                username,
                password
            });

            if (response.status === 201) {
                return response.data.message;
            }
        } catch (err) {
            throw err;
        }
    };

    const handleLogin = async (username, password) => {
        try {
            let response = await client.post("/login", {
                username,
                password
            });

            if (response.status === 200) {
                localStorage.setItem("token", response.data.token);
                router("/home");
            }
        }
        catch (error) {
            console.log(error.response);
            console.log(error.response?.data);

            let message =
                error.response?.data?.message || "Login failed";

            // setError(message);
        }
    }

    const getHistoryOfUser = async () => {
        try {
            let request = await client.get("/get_all_activity", {
                params: {
                    token: localStorage.getItem("token")
                }
            });
            return request.data
        } catch (err) {
            throw err;
        }
    }

    const addToUserHistory = async (meetingCode) => {
        try {
            console.log("Join clicked");
            await client.post("/add_to_activity", {
                token: localStorage.getItem("token"),
                meeting_code: meetingCode
            });
            // return request
        } catch (err) {
            throw err;
        }
    }
    const data = {
        userData,
        setUserData,
        handleRegister,
        handleLogin,
        getHistoryOfUser,
        addToUserHistory,
    };

    return (
        <AuthContext.Provider value={data}>
            {children}
        </AuthContext.Provider>
    );
};