const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const API_URL = `${API_BASE_URL}/api`;

export { API_BASE_URL, API_URL };
export default API_URL;
