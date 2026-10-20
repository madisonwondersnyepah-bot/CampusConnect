import api from './axios';

export const login = (email, password) =>
  api.post('/auth/login', { email, password }).then((r) => r.data);
export const register = (payload) => api.post('/auth/register', payload).then((r) => r.data);
export const logout = () => api.post('/auth/logout');
export const universities = () => api.get('/auth/universities').then((r) => r.data.universities);