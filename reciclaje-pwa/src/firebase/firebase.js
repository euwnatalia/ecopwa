import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAHh1BnCPhdrSjc9lmWY8SV1O0XHSrPqaQ",
  authDomain: "reciclajeapp-b57d6.firebaseapp.com",
  projectId: "reciclajeapp-b57d6",
  storageBucket: "reciclajeapp-b57d6.firebasestorage.app",
  messagingSenderId: "818579587820",
  appId: "1:818579587820:web:7153b70d24f58535095bc9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

provider.setCustomParameters({
  prompt: 'select_account'
});

export default app;
