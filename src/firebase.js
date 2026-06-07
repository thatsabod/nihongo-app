import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDLzE2f3OvgnwnwVzmx0ttl2zpfU25-E6k",
  authDomain: "my-japanese-ar.firebaseapp.com",
  projectId: "my-japanese-ar",
  storageBucket: "my-japanese-ar.firebasestorage.app",
  messagingSenderId: "580938722409",
  appId: "1:580938722409:web:e02642c7f8abb5bd0a46f8",
  measurementId: "G-6D9Y8X1VLS"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export { signInAnonymously }