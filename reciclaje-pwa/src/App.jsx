import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/dashboard/Dashboard";
import Home from "./pages/dashboard/Home";
import Map from "./pages/dashboard/MapView";
import Scan from "./pages/dashboard/Scan";
import Achievements from "./pages/dashboard/Achievements";
import Profile from "./pages/dashboard/Profile";
import ComercioReceive from "./pages/dashboard/ComercioReceive";
import InstallApp from "./pages/dashboard/InstallApp";
import ToastContainer from "./components/ToastContainer.jsx";
import API_URL from "./config/api.js";
import { setLogoutCallback } from "./utils/authFetch.js";
import { auth } from "./firebase/firebase.js";
import { signOut } from "firebase/auth";
import "./styles/space-optimization.css";

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [userDetails, setUserDetails] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [tokenValid, setTokenValid] = useState(null);

  // Scroll al inicio en cada cambio de ruta
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);
  useEffect(() => {
    const validateTokenAndLoadUser = async () => {
      if (user && tokenValid === null) {
        setIsValidating(true);
        try {
          const token = localStorage.getItem("token");
          if (!token) {
            setUser(null);
            setUserDetails(null);
            setTokenValid(false);
            setIsValidating(false);
            return;
          }
          
          const response = await fetch(`${API_URL}/usuarios`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUserDetails(userData);
            setTokenValid(true);
          } else if (response.status === 401) {
            setUser(null);
            setUserDetails(null);
            setTokenValid(false);
            localStorage.removeItem('user');
            localStorage.removeItem('token');
          } else {
            setTokenValid(false);
          }
        } catch (error) {
          setTokenValid(false);
        } finally {
          setIsValidating(false);
        }
      }
    };
    
    validateTokenAndLoadUser();
  }, [user, tokenValid]);

  const handleLogout = async () => {
    console.log("Logout iniciado...");

    try {
      // Hacer logout de Firebase Auth para limpiar la sesión de Google
      await signOut(auth);
      console.log("Sesión de Firebase cerrada");
    } catch (error) {
      console.error("Error al cerrar sesión de Firebase:", error);
    }

    // Limpiar estado
    setUser(null);
    setUserDetails(null);
    setTokenValid(false);
    setIsValidating(false);

    // Limpiar localStorage completamente
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('selectedUserType');

    // Limpiar cualquier otra preferencia guardada
    localStorage.removeItem('userPreferences');

    console.log("Estado limpiado, redirigiendo...");

    // Usar navigate de React Router
    navigate("/", { replace: true });
  };
  useEffect(() => {
    setLogoutCallback(handleLogout);
  }, []);

  if (user && isValidating) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div>🔄 Cargando...</div>
        <div style={{ fontSize: '0.9em', color: '#666' }}>Verificando credenciales</div>
        </div>
      );
  }

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            user && tokenValid === true ? (
              <Navigate to="/dashboard" />
            ) : (
              <LoginPage setUser={setUser} onLogin={() => {setTokenValid(null); setIsValidating(false);}} />
            )
          }
        />
        <Route path="/dashboard" element={<Dashboard userDetails={userDetails || user} onLogout={handleLogout} />}>
          <Route index element={<Home userDetails={userDetails || user} />} />
          <Route path="map" element={<Map />} />
          <Route path="scan" element={<Scan />} />
          <Route path="receive" element={<ComercioReceive />} />
          <Route path="achievements" element={<Achievements userDetails={userDetails || user} />} />
          <Route path="profile" element={<Profile />} />
          <Route path="install" element={<InstallApp />} />
        </Route>
      </Routes>
      <ToastContainer />
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
