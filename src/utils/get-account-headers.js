/**
 * Auth headers for branch-free /account/* routes (username + token only).
 */
const getAccountHeaders = (isFormData = false) => {
    try {
        const userName = localStorage.getItem("user_username") || "";
        const token = localStorage.getItem("user_token") || "";

        if (!userName || !token) {
            console.error("Missing authentication data in localStorage");
            return null;
        }

        const headers = {
            username: userName,
            token,
        };

        if (!isFormData) {
            headers["Content-Type"] = "application/json";
        }

        return headers;
    } catch (error) {
        console.error("Error getting account headers from localStorage:", error);
        return null;
    }
};

export default getAccountHeaders;
