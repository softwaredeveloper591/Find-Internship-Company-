const signinForm = document.querySelector('form.signin');
const forgotPasswordForm = document.querySelector('form.forgotPassword');

signinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const error = document.querySelector('.login.error');
    // Reset errors
    error.textContent = '';
    error.style.display = 'none';
    forgotPasswordForm.querySelector('.no.user.error').textContent = '';
    forgotPasswordForm.querySelector('.no.user.error').style.display = 'none';
    // Get values
    const email = signinForm.email.value;
    const password = signinForm.password.value;
    try {
        const res = await fetch('/', { 
            method: 'POST', 
            body: JSON.stringify({ email, password }),
            headers: {'Content-Type': 'application/json'}
        });
        const data = await res.json();
        if (data.errors) {
            error.textContent = data.errors.error;
            error.style.display = 'block';
        }
        if (data.user) {
            location.assign('/'+data.user); 
        }
    } catch (err) {
        error.textContent = 'Failed to communicate with the server';
        error.style.display = 'block';
    }
});

forgotPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const error = document.querySelector('.no.user.error');
    // Reset errors
    error.textContent = '';
    error.style.display = 'none';
    signinForm.querySelector('.login.error').textContent = '';
    signinForm.querySelector('.login.error').style.display = 'none';
    // Get values
    const email = forgotPasswordForm.email.value;
    try {
        const res = await fetch('/forgotPassword', { 
            method: 'POST', 
            body: JSON.stringify({ email }),
            headers: {'Content-Type': 'application/json'}
        });
        const data = await res.json();
        if (data.error) {
            error.textContent = data.error;
            error.style.display = 'block';
        }
        if (data.success) {
            alert(data.success);
            forgotPasswordForm.reset();
        }
    } catch (err) {
        error.textContent = 'Failed to communicate with the server';
        error.style.display = 'block';
    }
    
});