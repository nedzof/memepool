// Header scroll behavior
let lastScrollTop = 0;
let header = null;
const scrollThreshold = 50; // Amount of pixels to scroll before showing/hiding header

function initializeHeader() {
    console.log('Initializing header behavior...');
    header = document.querySelector('header');
    
    if (!header) {
        console.error('Header element not found');
        return;
    }
    
    console.log('Header element found:', header);
    
    // Initialize header state
    handleScroll();
    
    // Add scroll event listener
    document.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                handleScroll();
                ticking = false;
            });
            ticking = true;
        }
    });
}

function handleScroll() {
    if (!header) return;
    
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
    
    // Add shadow and background when scrolled
    if (currentScroll > 0) {
        header.classList.add('shadow-xl');
        header.classList.add('bg-[#0c0620]/95');
    } else {
        header.classList.remove('shadow-xl');
        header.classList.remove('bg-[#0c0620]/95');
    }
    
    // Show/hide header based on scroll direction
    if (Math.abs(lastScrollTop - currentScroll) <= scrollThreshold) return;
    
    if (currentScroll > lastScrollTop && currentScroll > 100) {
        // Scrolling down & past threshold
        header.style.transform = 'translateY(-100%)';
    } else {
        // Scrolling up or at top
        header.style.transform = 'translateY(0)';
    }
    
    lastScrollTop = currentScroll;
}

// Throttle scroll event
let ticking = false;

// Export the initialization function
export { initializeHeader }; 