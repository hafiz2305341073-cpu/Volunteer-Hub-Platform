const firebaseConfig = {
  apiKey: 'AIzaSyCrYhqNTLIWt2Gw3_UCE2eflTIJW67z5eg',
  authDomain: 'volunteer-hub-35ce3.firebaseapp.com',
  projectId: 'volunteer-hub-35ce3',
  storageBucket: 'volunteer-hub-35ce3.firebasestorage.app',
  messagingSenderId: '406896629808',
  appId: '1:406896629808:web:ce7d1be688e4cef78075f5'
};

if (!window.firebase || !window.firebase.initializeApp) {
  throw new Error('Firebase SDK failed to load. Check script tags in index.html.');
}

if (!window.firebase.apps.length) {
  window.firebase.initializeApp(firebaseConfig);
}

window.firebaseAuth = window.firebase.auth();