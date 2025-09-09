// Servicio para manejar datos del usuario
const API_BASE_URL = 'http://localhost:4000/api';

export const userService = {
  // Obtener estadísticas básicas del usuario
  async getUserStats() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`${API_BASE_URL}/reciclajes/historial`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.estadisticas;
    } catch (error) {
      console.error('Error obteniendo estadísticas del usuario:', error);
      throw error;
    }
  },

  // Obtener logros básicos del usuario (solo los completados más recientes)
  async getUserAchievements() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`${API_BASE_URL}/reciclajes/historial`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      // Devolver solo los 4 logros más recientes para el perfil
      return data.logros.slice(0, 4);
    } catch (error) {
      console.error('Error obteniendo logros del usuario:', error);
      throw error;
    }
  }
}; 