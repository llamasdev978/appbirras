// Rellena estos valores con los de TU proyecto de Firebase.
// Firebase Console -> Configuración del proyecto -> Tus apps -> App web -> "Config".
// Instrucciones completas en README.md.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyCGRXn3VdUVPrdAbrQbP-aEK6N3YOkcO6s",
  authDomain: "appbirras.firebaseapp.com",
  projectId: "appbirras",
  storageBucket: "appbirras.firebasestorage.app",
  messagingSenderId: "506682950794",
  appId: "1:506682950794:web:09f0d3e0a25d8b65309973",
};

export const isConfigured = firebaseConfig.apiKey !== "TU_API_KEY";

export const app = isConfigured ? initializeApp(firebaseConfig) : null;
export const db = isConfigured ? getFirestore(app) : null;
