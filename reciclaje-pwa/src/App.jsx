import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/dashboard/Dashboard";
import Home from "./pages/dashboard/Home";
import Map from "./pages/dashboard/MapView";
import Scan from "./pages/dashboard/Scan";
import Achievements from "./pages/dashboard/Achievements";
import Profile from "./pages/dashboard/Profile";
import ComercioReceive from "./pages/dashboard/ComercioReceive";
import API_URL from "./config/api.js";

function App() {
  const [user, setUser] = useState(() => {
    // Intentar cargar usuario del localStorage
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [userDetails, setUserDetails] = useState(null);

  // Guardar usuario en localStorage cuando cambie
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  // Cargar detalles del usuario al iniciar sesión
  useEffect(() => {
    const loadUserDetails = async () => {
      if (user && !userDetails) {
        try {
          const token = localStorage.getItem("token");
          if (!token) return;
          
          const response = await fetch(`${API_URL}/usuarios`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUserDetails(userData);
          }
        } catch (error) {
          console.error("Error cargando detalles del usuario:", error);
        }
      }
    };
    
    loadUserDetails();
  }, [user, userDetails]);

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            user ? (
              <Navigate to="/dashboard" />
            ) : (
              <LoginPage setUser={setUser} />
            )
          }
        />
        <Route path="/dashboard" element={<Dashboard userDetails={userDetails || user} />}>
          <Route index element={<Home userDetails={userDetails || user} />} />
          <Route path="map" element={<Map />} />
          <Route path="scan" element={<Scan />} />
          <Route path="receive" element={<ComercioReceive />} />
          <Route path="achievements" element={<Achievements userDetails={userDetails || user} />} />
          <Route path="profile" element={<Profile />} />
        </Route>

      </Routes>
    </Router>
  );
}

export default App;
