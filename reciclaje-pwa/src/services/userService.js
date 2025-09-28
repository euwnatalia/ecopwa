import API_URL from '../config/api.js';
import authFetch from '../utils/authFetch.js';

export const userService = {
  async getUserStats() {
    try {
      const response = await authFetch(`${API_URL}/reciclajes/historial`);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.estadisticas;
    } catch (error) {
      throw error;
    }
  },

  async getUserAchievements() {
    try {
      const response = await authFetch(`${API_URL}/reciclajes/historial`);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.logros.slice(0, 4);
    } catch (error) {
      throw error;
    }
  }
}; 