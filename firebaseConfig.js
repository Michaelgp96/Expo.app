// firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBSNycbRFZ0HtKTzwzvfRiqWeYDkJ3oQaE",
  authDomain: "base-1-d1bae.firebaseapp.com",
  projectId: "base-1-d1bae",
  storageBucket: "base-1-d1bae.firebasestorage.app",
  messagingSenderId: "1069320271567",
  appId: "1:1069320271567:web:ff0f634b8ea9d950d0e9ba"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
