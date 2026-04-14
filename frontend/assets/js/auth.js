// Firebase Authentication Logic

class FirebaseAuthHandler {
  constructor() {
    this.auth = window.firebaseAuth || null;
    this.currentUser = null;
    this.currentToken = null;

    if (this.auth) {
      this.initAuthStateListener();
    }
  }

  /**
   * Listen to auth state changes
   */
  initAuthStateListener() {
    this.auth.onAuthStateChanged(async (user) => {
      if (user) {
        this.currentUser = user;
        this.currentToken = await user.getIdToken();
        console.log('User authenticated:', user.email);
        document.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user, token: this.currentToken } }));
      } else {
        this.currentUser = null;
        this.currentToken = null;
        console.log('User logged out.');
        document.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user: null, token: null } }));
      }
    });
  }

  /**
   * Sign up with email and password
   * @param {string} email
   * @param {string} password
   * @returns {Promise<Object>} Firebase user object
   */
  async signUp(email, password) {
    if (!this.auth) {
      return {
        success: false,
        error: 'Firebase is not initialized. Check your config.js and SDK script tags.'
      };
    }

    try {
      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
      this.currentUser = userCredential.user;
      this.currentToken = await userCredential.user.getIdToken();
      return {
        success: true,
        user: userCredential.user,
        token: this.currentToken
      };
    } catch (error) {
      return {
        success: false,
        error: this.getErrorMessage(error.code)
      };
    }
  }

  /**
   * Sign in with email and password
   * @param {string} email
   * @param {string} password
   * @returns {Promise<Object>} Firebase user object and token
   */
  async signIn(email, password) {
    if (!this.auth) {
      return {
        success: false,
        error: 'Firebase is not initialized. Check your config.js and SDK script tags.'
      };
    }

    try {
      const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
      this.currentUser = userCredential.user;
      this.currentToken = await userCredential.user.getIdToken();
      return {
        success: true,
        user: userCredential.user,
        token: this.currentToken
      };
    } catch (error) {
      return {
        success: false,
        error: this.getErrorMessage(error.code)
      };
    }
  }

  /**
   * Sign in with Google popup
   * @returns {Promise<Object>} Firebase user object and token
   */
  async signInWithGoogle() {
    if (!this.auth || !window.firebase || !window.firebase.auth) {
      return {
        success: false,
        error: 'Firebase is not initialized. Check your config.js and SDK script tags.'
      };
    }

    try {
      const provider = new window.firebase.auth.GoogleAuthProvider();
      const userCredential = await this.auth.signInWithPopup(provider);
      this.currentUser = userCredential.user;
      this.currentToken = await userCredential.user.getIdToken();

      return {
        success: true,
        user: userCredential.user,
        token: this.currentToken
      };
    } catch (error) {
      return {
        success: false,
        error: this.getErrorMessage(error.code)
      };
    }
  }

  /**
   * Sign out current user
   * @returns {Promise<void>}
   */
  async signOut() {
    if (!this.auth) {
      return {
        success: false,
        error: 'Firebase is not initialized. Check your config.js and SDK script tags.'
      };
    }

    try {
      await this.auth.signOut();
      this.currentUser = null;
      this.currentToken = null;
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get current user token
   * @returns {Promise<string>} User's ID token
   */
  async getToken() {
    if (this.currentUser) {
      return await this.currentUser.getIdToken();
    }
    return null;
  }

  /**
   * Get current user
   * @returns {Object} Current user object or null
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    return this.currentUser !== null;
  }

  /**
   * Handle user-friendly error messages
   * @param {string} code Firebase error code
   * @returns {string} User-friendly error message
   */
  getErrorMessage(code) {
    const errorMessages = {
      'auth/operation-not-allowed': 'Email/Password sign-in is disabled in Firebase Console. Enable it in Authentication > Sign-in method.',
      'auth/popup-closed-by-user': 'Google sign-in popup was closed before completion.',
      'auth/popup-blocked': 'Popup was blocked by your browser. Allow popups for this site and try again.',
      'auth/cancelled-popup-request': 'Another popup request is already in progress. Please try again.',
      'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.',
      'auth/invalid-api-key': 'Firebase API key is invalid. Verify frontend Firebase config values.',
      'auth/app-not-authorized': 'This domain is not authorized for Firebase auth. Add your local domain in Firebase Authentication settings.',
      'auth/invalid-credential': 'Invalid credentials. Please check your email and password.',
      'auth/weak-password': 'Password must be at least 6 characters.',
      'auth/email-already-in-use': 'Email is already registered.',
      'auth/invalid-email': 'Invalid email address.',
      'auth/user-not-found': 'No account found with this email.',
      'auth/wrong-password': 'Incorrect email or password.',
      'auth/network-request-failed': 'Network error. Please check your connection.',
      'auth/too-many-requests': 'Too many login attempts. Please try again later.'
    };
    return errorMessages[code] || 'Authentication error: ' + (code || 'unknown error') + '.';
  }
}

// Create global instance
window.firebaseAuthHandler = new FirebaseAuthHandler();
