// src/firebase/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAHh1BnCPhdrSjc9lmWY8SV1O0XHSrPqaQ",
  authDomain: "reciclajeapp-b57d6.firebaseapp.com",
  projectId: "reciclajeapp-b57d6",
  storageBucket: "reciclajeapp-b57d6.appspot.com", // <-- Corregido
  messagingSenderId: "818579587820",
  appId: "1:818579587820:web:7153b70d24f58535095bc9"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar servicios de autenticación
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

export default app;
