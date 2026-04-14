document.addEventListener('DOMContentLoaded', () => {
  renderNavbar('login');

  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const messageDiv = document.getElementById('message');
  const submitBtn = form.querySelector('button[type="submit"]');

  // Form submission handler
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Clear previous messages
    messageDiv.innerHTML = '';
    messageDiv.className = 'note';

    // Get form values
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Validate email
    if (!email || !validateEmail(email)) {
      showError(messageDiv, 'Please enter a valid email address.');
      emailInput.classList.add('error');
      return;
    }
    emailInput.classList.remove('error');

    // Validate password
    if (!password || password.length < 4) {
      showError(messageDiv, 'Password must be at least 4 characters long.');
      passwordInput.classList.add('error');
      return;
    }
    passwordInput.classList.remove('error');

    // Show loading state
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.innerHTML = '<span class="spinner" style="display: inline-block; margin-right: 0.5rem;"></span>Signing in...';

    try {
      const result = await loginUser({ email, password });
      const user = result.user || result;

      if (!user || !user.id) {
        throw new Error('Invalid login response');
      }

      // Store user and show success
      setCurrentUser(user);
      showSuccess(messageDiv, 'Login successful! Redirecting...');

      // Redirect after a short delay
      setTimeout(() => {
        redirectByRole(user);
      }, 800);
    } catch (error) {
      console.error('Login error:', error);
      const errorMsg = error.message || 'Login failed. Please check your credentials and try again.';
      showError(messageDiv, errorMsg);
      emailInput.classList.add('error');
      passwordInput.classList.add('error');
    } finally {
      // Restore button state
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });

  // Form field validation on blur
  emailInput.addEventListener('blur', () => {
    if (emailInput.value && !validateEmail(emailInput.value.trim())) {
      emailInput.classList.add('error');
      const error = emailInput.parentElement.querySelector('.form-error') || document.createElement('p');
      error.className = 'form-error';
      error.textContent = 'Please enter a valid email address.';
      if (!emailInput.parentElement.querySelector('.form-error')) {
        emailInput.parentElement.appendChild(error);
      }
    } else {
      emailInput.classList.remove('error');
      const error = emailInput.parentElement.querySelector('.form-error');
      if (error) error.remove();
    }
  });

  // Helper function to show error message
  function showError(container, message) {
    container.innerHTML = `<strong>Error:</strong> ${message}`;
    container.className = 'note' + (message.includes('Error') ? ' ' : '');
    container.style.color = 'var(--danger)';
  }

  // Helper function to show success message
  function showSuccess(container, message) {
    container.innerHTML = `<strong>Success!</strong> ${message}`;
    container.style.color = 'var(--success)';
  }
});
