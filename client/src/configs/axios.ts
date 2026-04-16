import axios from 'axios';
import { auth } from '../lib/firebase';

const api = axios.create({
    baseURL: import.meta.env.VITE_PROD_BASEURL || import.meta.env.VITE_BASEURL || 'http://localhost:3000',
    withCredentials: true
})

api.interceptors.request.use(async (config) => {
    if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        config.headers.Authorization = `Bearer ${token}`
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;