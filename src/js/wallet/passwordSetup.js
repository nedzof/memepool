import { showModal, hideModal, showError } from '../modal.js';
import { generateSecureMnemonic } from './mnemonic.js';

// Update password strength meter
function updatePasswordStrength(password) {
    const meter = document.querySelector('#passwordStrengthMeter div');
    if (!meter) return;
        
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.match(/[a-z]/)) strength += 25;
    if (password.match(/[A-Z]/)) strength += 25;
    if (password.match(/[0-9]/)) strength += 25;
    
    meter.style.width = `${strength}%`;
    meter.style.backgroundColor = 
        strength <= 25 ? '#ef4444' :
        strength <= 50 ? '#f59e0b' :
        strength <= 75 ? '#10b981' :
        '#00ffa3';
}

// Validate password match
function validatePasswords() {
    const password = document.getElementById('setupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const submitBtn = document.getElementById('confirmPasswordBtn');
    
    if (submitBtn) {
        submitBtn.disabled = password !== confirmPassword;
    }
}

// Setup password validation
export function setupPasswordValidation(onSuccess) {
    console.log('Setting up password validation with callback:', !!onSuccess);
    
    const form = document.getElementById('passwordSetupForm');
    if (!form) {
        console.error('Password setup form not found');
        return;
    }
    console.log('Found password setup form');

    // Setup input event listeners
    const setupPassword = document.getElementById('setupPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    
    if (setupPassword) {
        setupPassword.addEventListener('input', (e) => updatePasswordStrength(e.target.value));
        console.log('Added password strength listener');
    }
    if (confirmPassword) {
        confirmPassword.addEventListener('input', validatePasswords);
        console.log('Added password validation listener');
    }

    // Setup form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Password form submitted');
        
        const password = setupPassword?.value;
        const confirm = confirmPassword?.value;
        
        if (!password || !confirm) {
            showError('Please fill in both password fields');
            return;
        }
        
        if (password !== confirm) {
            showError('Passwords do not match');
            return;
        }
        
        try {
            // Generate secure mnemonic if not importing
            if (!sessionStorage.getItem('temp_mnemonic')) {
                const mnemonic = await generateSecureMnemonic();
                console.log('Generated secure mnemonic');
                sessionStorage.setItem('temp_mnemonic', mnemonic);
            }
            
            // Store password temporarily
            sessionStorage.setItem('temp_password', password);
            console.log('Stored password in session storage');
            
            // Hide password modal
            hideModal('passwordSetupModal');
            console.log('Password modal hidden');
            
            // Call success callback
            if (onSuccess) {
                console.log('Calling success callback');
                onSuccess(sessionStorage.getItem('temp_mnemonic'));
            }
        } catch (error) {
            console.error('Error in password setup:', error);
            showError(error.message);
        }
    });
    console.log('Password form submission handler setup complete');
} 