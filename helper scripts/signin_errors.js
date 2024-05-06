const form = document.querySelector('form');
const error = document.querySelector('.login.error');
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Reset errors
    error.textContent = '';
    // Get values
    const email = form.email.value;
    const password = form.password.value;
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