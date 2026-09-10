// Rellena estos valores con los de TU proyecto de Firebase.
// Firebase Console -> Configuración del proyecto -> Tus apps -> App web -> "Config".
// Instrucciones completas en README.md.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID",
};

export const isConfigured = firebaseConfig.apiKey !== "TU_API_KEY";

export const app = isConfigured ? initializeApp(firebaseConfig) : null;
export const db = isConfigured ? getFirestore(app) : null;
