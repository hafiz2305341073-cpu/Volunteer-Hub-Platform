document.addEventListener('DOMContentLoaded', () => {
  renderNavbar('register');

  const form = document.getElementById('register-form');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const roleInput = document.getElementById('role');
  const messageDiv = document.getElementById('message');
  const submitBtn = form.querySelector('button[type="submit"]');

  // Form submission handler
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Clear previous messages
    messageDiv.innerHTML = '';
    messageDiv.className = 'note';

    // Get form values
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const role = roleInput.value;

    // Validate name
    if (!name || name.length < 3) {
      showError(messageDiv, 'Name must be at least 3 characters long.');
      nameInput.classList.add('error');
      return;
    }
    nameInput.classList.remove('error');

    // Validate email
    if (!email || !validateEmail(email)) {
      showError(messageDiv, 'Please enter a valid email address.');
      emailInput.classList.add('error');
      return;
    }
    emailInput.classList.remove('error');

    // Validate password
    if (!password || password.length < 6) {
      showError(messageDiv, 'Password must be at least 6 characters long.');
      passwordInput.classList.add('error');
      return;
    }
    passwordInput.classList.remove('error');

    // Validate role
    if (!role) {
      showError(messageDiv, 'Please select your role.');
      roleInput.classList.add('error');
      return;
    }
    roleInput.classList.remove('error');

    // Show loading state
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.innerHTML = '<span class="spinner" style="display: inline-block; margin-right: 0.5rem;"></span>Creating account...';

    try {
      const result = await registerUser({ name, email, password, role });
      const user = result.user || result;

      if (!user || !user.id) {
        throw new Error('Invalid registration response');
      }

      // Store user and show success
      setCurrentUser(user);
      showSuccess(messageDiv, 'Account created successfully! Redirecting...');

      // Redirect after a short delay
      setTimeout(() => {
        redirectByRole(user);
      }, 800);
    } catch (error) {
      console.error('Registration error:', error);
      const errorMsg = error.message || 'Registration failed. Please try again.';
      showError(messageDiv, errorMsg);
    } finally {
      // Restore button state
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });

  // Form field validation on blur
  nameInput.addEventListener('blur', () => {
    const value = nameInput.value.trim();
    if (value && value.length < 3) {
      nameInput.classList.add('error');
      updateFieldError(nameInput, 'Name must be at least 3 characters.');
    } else {
      nameInput.classList.remove('error');
      removeFieldError(nameInput);
    }
  });

  emailInput.addEventListener('blur', () => {
    const value = emailInput.value.trim();
    if (value && !validateEmail(value)) {
      emailInput.classList.add('error');
      updateFieldError(emailInput, 'Please enter a valid email address.');
    } else {
      emailInput.classList.remove('error');
      removeFieldError(emailInput);
    }
  });

  passwordInput.addEventListener('blur', () => {
    const value = passwordInput.value;
    if (value && value.length < 6) {
      passwordInput.classList.add('error');
      updateFieldError(passwordInput, 'Password must be at least 6 characters.');
    } else {
      passwordInput.classList.remove('error');
      removeFieldError(passwordInput);
    }
  });

  // Helper functions
  function showError(container, message) {
    container.innerHTML = `<strong>Error:</strong> ${message}`;
    container.style.color = 'var(--danger)';
  }

  function showSuccess(container, message) {
    container.innerHTML = `<strong>Success!</strong> ${message}`;
    container.style.color = 'var(--success)';
  }

  function updateFieldError(field, message) {
    let error = field.parentElement.querySelector('.form-error');
    if (!error) {
      error = document.createElement('p');
      error.className = 'form-error';
      field.parentElement.appendChild(error);
    }
    error.textContent = message;
  }

  function removeFieldError(field) {
    const error = field.parentElement.querySelector('.form-error');
    if (error) error.remove();
  }
});
