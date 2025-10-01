
// Import the functions you need from the SDKs you need
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/database';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBQTc1b1fdphdk2Gq8cFJCeK58FNTB1l1I",
  authDomain: "moneta-fcf20.firebaseapp.com",
  databaseURL: "https://moneta-fcf20-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "moneta-fcf20",
  storageBucket: "moneta-fcf20.appspot.com",
  messagingSenderId: "293534402243",
  appId: "1:293534402243:web:78a3c89f5c4948a3a296d9"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);

export const auth = app.auth();
export const db = app.database();
export default app;
