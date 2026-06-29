import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDSrFMZuLKoRiTyV11YuYm7ny97qfbZP-U",
  authDomain: "eamcet-predictor-e858f.firebaseapp.com",
  databaseURL: "https://eamcet-predictor-e858f-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "eamcet-predictor-e858f",
  storageBucket: "eamcet-predictor-e858f.firebasestorage.app",
  messagingSenderId: "736301195965",
  appId: "1:736301195965:web:af9cd20c4e75d99b71cdd4"
};

const app = initializeApp(firebaseConfig);

export const database = getDatabase(app);