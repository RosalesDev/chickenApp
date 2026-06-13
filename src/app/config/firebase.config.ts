import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { environment } from '../../environments/environment';

// Angular le pasará automáticamente las credenciales de dev o prod según corresponda
const app = initializeApp(environment.firebaseConfig);

// Exportamos un único db. Tus servicios no necesitan saber en qué entorno están.
export const db = getFirestore(app);
