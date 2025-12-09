import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "map-meo.firebaseapp.com",
  projectId: "map-meo",
  storageBucket: "map-meo.appspot.com",
  messagingSenderId: "667692618482",
  appId: "1:667692618482:web:fc9021d5c4f7e8842485873",
  measurementId: "G-TFJVB92XCW"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
