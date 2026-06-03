import api from './axiosConfig';

export const loginUser = async (credentials) => {
    // 'credentials' fiha {email, password}
    const response = await api.post('/auth/login', credentials);
    return response.data; // Hna l-Backend khassu isift { token, role, user }
};