import { auth, provider } from "../firebase/firebase";
import { signInWithPopup } from "firebase/auth"; // <--- esta línea
import { useState } from "react";
import "./LoginPage.css";

function LoginPage({ setUser }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

const handleLogin = async () => {
  setLoading(true);
  setError(null);

  try {
   // 1️⃣ Abre el popup de Google
      const result = await signInWithPopup(auth, provider);
      const user   = result.user;

      // 2️⃣ Saca el idToken y guárdalo
      const token = await user.getIdToken();
      localStorage.setItem("token", token);

      // 3️⃣ Llama a tu backend para crear/sincronizar el usuario
      const res = await fetch("http://localhost:4000/api/usuarios", {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify({
          uid:    user.uid,
          nombre: user.displayName,
          email:  user.email
        })
      });

      if (!res.ok) {
        // Si el backend devuelve 4xx/5xx entramos aquí
        const err = await res.json();
        throw new Error(err.error || "Error de servidor");
      }

      const data = await res.json();
      console.log("Usuario en backend:", data);

      // 4️⃣ Guarda el usuario en tu estado global y redirige al Dashboard
      setUser({
        uid:    user.uid,
        nombre: user.displayName,
        email:  user.email,
        // puedes guardar también data.id u otros campos
      });
      window.location.href = "/dashboard";  // O usa tu router: navigate("/dashboard");

    } catch (e) {
      console.error("Error en el login:", e);
      setError("No pudimos iniciar sesión. " + e.message);
    } finally {
      setLoading(false);
    }
  };
  
return (
    <div className="login-container">
      <div className="login-left-panel">
        <div className="login-content">
          <h1 className="login-title">
            Bienvenido a <span>EcoPWA ♻️</span>
          </h1>
          <p className="login-subtitle">Iniciá sesión para comenzar a reciclar</p>

          {error && <div className="login-error">{error}</div>}

          <button
            onClick={handleLogin}
            className="login-button"
            disabled={loading}
          >
            {loading ? "Cargando..." : "Iniciar sesión con Google"}
          </button>

          <p className="login-slogan">Pequeñas acciones, grandes cambios 🌍</p>
        </div>
      </div>

      <div className="login-right-panel">
        <div className="login-info">
          <h2>¿Qué es EcoPWA?</h2>
          <p>EcoPWA es una plataforma para incentivar el reciclaje mediante un sistema de recompensas y gamificación. ♻️</p>
        </div>
        <div className="login-options">
          <div className="card">
            <h3>♻️ Soy Reciclador</h3>
            <p>Registrá tus reciclajes, acumulá puntos y ganá premios por contribuir al medio ambiente.</p>
          </div>
          <div className="card">
            <h3>🏪 Soy un Comercio</h3>
            <p>Sumá tu local como punto verde, ayudá a la comunidad y aumentá la visibilidad de tu negocio sostenible.</p>
          </div>
          <div className="card">
            <h3>🏆 Gamificación</h3>
            <p>Subí de nivel, desbloqueá logros y competí con otros usuarios para ver quién recicla más.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
