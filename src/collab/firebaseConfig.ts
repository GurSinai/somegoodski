/**
 * The Firebase web app config (Firebase console → Project settings → Your apps → SDK setup).
 * It is meant to be public: access is controlled by the Firestore rules in /firestore.rules.
 * Leave apiKey empty to run without collaboration (vacation files still work).
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyBhfjtBYaKglNc2OB28xeuBWaPlaO2Eym4',
  authDomain: 'somegoodski.firebaseapp.com',
  projectId: 'somegoodski',
  storageBucket: 'somegoodski.firebasestorage.app',
  messagingSenderId: '294250149636',
  appId: '1:294250149636:web:3825f5346d698fccf50251',
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
