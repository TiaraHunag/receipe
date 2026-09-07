import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCn4zWIrh7cP6XTFrlyReIoHgAlR20TrE8',
  authDomain: 'receipe-a5833.firebaseapp.com',
  projectId: 'receipe-a5833',
  storageBucket: 'receipe-a5833.firebasestorage.app',
  messagingSenderId: '643035874133',
  appId: '1:643035874133:web:8c9219c04df28e521465dc',
};

const app = initializeApp(firebaseConfig);
export { app };
export const db = getFirestore(app);