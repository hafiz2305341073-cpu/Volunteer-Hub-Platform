const API_BASE = 'http://localhost:5000/api';

const authToggleBtn = document.getElementById('authToggleBtn');
const heroCtaBtn = document.getElementById('heroCtaBtn');
const authModal = document.getElementById('authModal');
const closeModalBtn = document.getElementById('closeModalBtn');

const authForm = document.getElementById('authForm');
const modalTitle = document.getElementById('modalTitle');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const signUpFields = document.getElementById('signUpFields');
const authFullName = document.getElementById('authFullName');
const authRole = document.getElementById('authRole');
const authSubmitBtn = document.getElementById('authSubmitBtn');

const togglePrompt = document.getElementById('togglePrompt');
const toggleLink = document.getElementById('toggleLink');
const googleButton = document.querySelector('.google-btn');
const navLinks = document.querySelectorAll('.nav-link');
const contentSections = document.querySelectorAll('.content-section');

const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const loadingSpinner = document.getElementById('loadingSpinner');

let authMode = 'signin';

function initEventListeners() {
  authToggleBtn.addEventListener('click', handleAuthButtonClick);
  heroCtaBtn.addEventListener('click', openModal);
  closeModalBtn.addEventListener('click', closeModal);
  authModal.addEventListener('click', closeModalOnBackdrop);

  toggleLink.addEventListener('click', (event) => {
    event.preventDefault();
    setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
  });

  if (googleButton) {
    googleButton.addEventListener('click', handleGoogleSignIn);
  }

  authForm.addEventListener('submit', handleAuthSubmit);
  document.addEventListener('authStateChanged', handleAuthStateChange);
  initSpaNavigation();
}

function initSpaNavigation() {
  if (!navLinks.length || !contentSections.length) {
    return;
  }

  navLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();

      const targetId = link.dataset.target;
      const targetSection = document.getElementById(targetId);

      if (!targetSection) {
        return;
      }

      contentSections.forEach((section) => {
        section.style.display = 'none';
      });

      navLinks.forEach((navLink) => {
        navLink.classList.remove('active');
      });

      targetSection.style.display = 'block';
      link.classList.add('active');
    });
  });
}

function handleAuthButtonClick(event) {
  if (window.firebaseAuthHandler && window.firebaseAuthHandler.isAuthenticated()) {
    event.preventDefault();
    handleSignOut();
    return;
  }

  openModal();
}

function openModal() {
  setAuthMode('signin');
  authModal.classList.remove('hidden');
  clearMessages();
}

function closeModal() {
  authModal.classList.add('hidden');
  clearMessages();
  authForm.reset();
  setLoading(false);
}

function closeModalOnBackdrop(event) {
  if (event.target === authModal) {
    closeModal();
  }
}

function setAuthMode(mode) {
  authMode = mode;

  if (mode === 'signup') {
    modalTitle.textContent = 'Create Account';
    authSubmitBtn.textContent = 'Create Account';
    togglePrompt.textContent = 'Already have an account?';
    toggleLink.textContent = 'Sign In';
    signUpFields.classList.remove('hidden');
    authFullName.required = true;
    authRole.required = true;
    authPassword.placeholder = 'Create a password (min 6 characters)';
  } else {
    modalTitle.textContent = 'Sign In';
    authSubmitBtn.textContent = 'Sign In';
    togglePrompt.textContent = "Don't have an account?";
    toggleLink.textContent = 'Sign Up';
    signUpFields.classList.add('hidden');
    authFullName.required = false;
    authRole.required = false;
    authPassword.placeholder = 'Your password';
  }
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  clearMessages();
  setLoading(true);

  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (!email || !password) {
    showError('Please fill in email and password.');
    setLoading(false);
    return;
  }

  if (authMode === 'signup') {
    await submitSignUp(email, password);
  } else {
    await submitSignIn(email, password);
  }
}

async function submitSignIn(email, password) {
  try {
    const result = await window.firebaseAuthHandler.signIn(email, password);

    if (!result.success) {
      showError(result.error);
      setLoading(false);
      return;
    }

    showSuccess('Sign in successful. Syncing profile...');
    await registerUserWithBackend(result.user, result.token);
  } catch (error) {
    showError('Unexpected error: ' + error.message);
    setLoading(false);
  }
}

async function submitSignUp(email, password) {
  const fullName = authFullName.value.trim();
  const role = authRole.value;

  if (!fullName) {
    showError('Please enter your full name.');
    setLoading(false);
    return;
  }

  if (password.length < 6) {
    showError('Password must be at least 6 characters.');
    setLoading(false);
    return;
  }

  try {
    const result = await window.firebaseAuthHandler.signUp(email, password);

    if (!result.success) {
      showError(result.error);
      setLoading(false);
      return;
    }

    showSuccess('Account created. Completing registration...');
    await registerUserWithBackend(result.user, result.token, { fullName, role });
  } catch (error) {
    showError('Unexpected error: ' + error.message);
    setLoading(false);
  }
}

async function handleGoogleSignIn() {
  clearMessages();
  setLoading(true);

  try {
    const result = await window.firebaseAuthHandler.signInWithGoogle();

    if (!result.success) {
      showError(result.error);
      setLoading(false);
      return;
    }

    const fullName = authMode === 'signup' && authFullName.value.trim()
      ? authFullName.value.trim()
      : (result.user.displayName || 'User');

    const role = authMode === 'signup' ? authRole.value : 'volunteer';

    showSuccess('Google sign-in successful. Completing registration...');
    await registerUserWithBackend(result.user, result.token, { fullName, role });
  } catch (error) {
    showError('Unexpected error: ' + error.message);
    setLoading(false);
  }
}

async function registerUserWithBackend(user, token, additionalData = {}) {
  try {
    const payload = {
      email: user.email,
      fullName: additionalData.fullName || user.displayName || 'User',
      role: additionalData.role || 'volunteer',
      phone: '',
      bio: '',
      avatarUrl: '',
      location: {},
      skills: [],
      interests: []
    };

    const response = await fetch(API_BASE + '/users/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      showError(data.message || 'Profile registration failed.');
      setLoading(false);
      return;
    }

    showSuccess('Profile synced successfully. Redirecting...');
    const role = data?.user?.role || payload.role || 'volunteer';
    setTimeout(() => redirectToDashboard(role), 1200);
  } catch (error) {
    showError('Backend error: ' + error.message);
    setLoading(false);
  }
}

function redirectToDashboard(role) {
  const dashboardMap = {
    volunteer: '/pages/volunteer-dashboard.html',
    ngo: '/pages/ngo-dashboard.html',
    admin: '/pages/admin-dashboard.html'
  };

  window.location.href = dashboardMap[role] || dashboardMap.volunteer;
}

function handleAuthStateChange(event) {
  const { user } = event.detail;

  if (user) {
    authToggleBtn.textContent = user.email + ' (Sign Out)';
  } else {
    authToggleBtn.textContent = 'Sign In';
  }
}

async function handleSignOut() {
  const result = await window.firebaseAuthHandler.signOut();
  if (result.success) {
    showSuccess('Signed out successfully.');
    setTimeout(() => {
      clearMessages();
      authToggleBtn.textContent = 'Sign In';
    }, 700);
  } else {
    showError(result.error || 'Failed to sign out.');
  }
}

function setLoading(isLoading) {
  if (isLoading) {
    loadingSpinner.classList.remove('hidden');
    authForm.classList.add('hidden');
    return;
  }

  loadingSpinner.classList.add('hidden');
  authForm.classList.remove('hidden');
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');
  successMessage.classList.add('hidden');
}

function showSuccess(message) {
  successMessage.textContent = message;
  successMessage.classList.remove('hidden');
  errorMessage.classList.add('hidden');
}

function clearMessages() {
  errorMessage.classList.add('hidden');
  successMessage.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', initEventListeners);
