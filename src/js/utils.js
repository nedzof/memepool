// Utility function for copying text to clipboard and updating button UI
export async function copyToClipboard(text, button, successContent = null, originalContent = null) {
    try {
        await navigator.clipboard.writeText(text);
        
        if (button) {
            const defaultSuccessContent = `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span>Copied!</span>
            `;

            const _originalContent = originalContent || button.innerHTML;
            button.innerHTML = successContent || defaultSuccessContent;
            
            setTimeout(() => {
                button.innerHTML = _originalContent;
            }, 2000);
        }
        
        return true;
    } catch (error) {
        console.error('Failed to copy text:', error);
        return false;
    }
} 