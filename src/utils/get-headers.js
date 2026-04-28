// utils/GetHeaders.js

/**
 * Utility function to get authentication headers from localStorage
 * @param {boolean} isFormData - Set to true for multipart/form-data requests (file uploads)
 * @returns {Object|null} Headers object or null if authentication data is missing
 */
const getHeaders = (isFormData = false) => {
    try {
        const userName = localStorage.getItem('user_username') || '';
        const token = localStorage.getItem('user_token') || '';
        const branchId = localStorage.getItem('branch_id') || '';

        if (!userName || !token || !branchId) {
            console.error('Missing authentication data in localStorage');
            return null;
        }

        const headers = {
            'username': userName,
            'token': token,
            'branch': branchId
        };

        // Only add Content-Type for non-FormData requests
        if (!isFormData) {
            headers['Content-Type'] = 'application/json';
        }

        return headers;
    } catch (error) {
        console.error('Error getting headers from localStorage:', error);
        return null;
    }
};

export default getHeaders;