import { initializeSubmissions, updateSubmissionThumbnails } from './submissions.js';

// Initialize state variables
let isAnimating = false;
let animationQueue = [];
const ANIMATION_DURATION = 800; // Base duration for animations in ms
let currentBlockNumber = 803525;
let upcomingStartNumber = currentBlockNumber + 5;
let pastStartNumber = currentBlockNumber - 1;

// Track images for each block
const blockImages = new Map();

// Initialize images for blocks
function getImageForBlock(blockNumber) {
    if (!blockImages.has(blockNumber)) {
        const imageIndex = (blockNumber % 10) + 1;
        blockImages.set(blockNumber, `https://picsum.photos/400/400?random=${blockNumber}`);
    }
    return blockImages.get(blockNumber);
}

function queueAnimation(callback) {
    animationQueue.push(callback);
    processAnimationQueue();
}

function processAnimationQueue() {
    if (isAnimating || animationQueue.length === 0) return;
    
    isAnimating = true;
    const nextAnimation = animationQueue.shift();
    nextAnimation(() => {
        setTimeout(() => {
            isAnimating = false;
            processAnimationQueue();
        }, ANIMATION_DURATION);
    });
}

export function initializeBlocks() {
    const upcomingBlocks = document.getElementById('upcomingBlocks');
    const pastBlocks = document.getElementById('pastBlocks');
    const optimalCount = getOptimalBlockCount();

    if (!upcomingBlocks || !pastBlocks) {
        console.error('Required DOM elements not found');
        return;
    }

    // Clear existing blocks
    upcomingBlocks.innerHTML = '';
    pastBlocks.innerHTML = '';

    // Initialize upcoming blocks
    for (let i = 0; i < optimalCount; i++) {
        const blockNumber = upcomingStartNumber - i;
        const block = document.createElement('div');
        block.className = 'meme-block rounded';
        block.innerHTML = `
            <img src="${getImageForBlock(blockNumber)}" alt="Block" class="w-full h-full object-cover">
            <div class="absolute bottom-0 left-0 right-0 text-xs text-center p-1 bg-black/70">#${blockNumber}</div>
        `;
        upcomingBlocks.appendChild(block);
    }

    // Initialize past blocks
    for (let i = 0; i < optimalCount; i++) {
        const blockNumber = pastStartNumber - i;
        const block = document.createElement('div');
        block.className = 'meme-block rounded';
        block.innerHTML = `
            <img src="${getImageForBlock(blockNumber)}" alt="Block" class="w-full h-full object-cover">
            <div class="absolute bottom-0 left-0 right-0 text-xs text-center p-1 bg-black/70">#${blockNumber}</div>
        `;
        pastBlocks.appendChild(block);
    }

    // Update current meme block number and image
    const currentMeme = document.getElementById('currentMeme');
    if (currentMeme) {
        const currentMemeNumber = currentMeme.querySelector('.text-xs');
        const currentMemeImage = currentMeme.querySelector('img');
        if (currentMemeNumber) {
            currentMemeNumber.textContent = `#${currentBlockNumber}`;
        }
        if (currentMemeImage && !currentMemeImage.getAttribute('data-initialized')) {
            currentMemeImage.src = getImageForBlock(currentBlockNumber);
            currentMemeImage.setAttribute('data-initialized', 'true');
        }
    }

    // Update submissions block number
    const submissionsBlockNumber = document.getElementById('currentBlockNumber');
    if (submissionsBlockNumber) {
        submissionsBlockNumber.textContent = `#${currentBlockNumber}`;
    }
}

export function getOptimalBlockCount() {
    const viewportWidth = window.innerWidth;
    const blockWidth = 120; // Block width
    const gap = 20; // Gap between blocks
    const currentMemeWidth = 400; // Current meme width
    const sideSpacing = 40; // Minimum spacing on each side
    
    // Calculate available width for blocks on each side
    const availableWidth = (viewportWidth - currentMemeWidth - (sideSpacing * 2)) / 2;
    
    // Calculate how many blocks can fit on each side
    return Math.max(3, Math.min(5, Math.floor(availableWidth / (blockWidth + gap))));
}

export function centerBlocks() {
    const containers = [
        document.getElementById('upcomingBlocks'),
        document.getElementById('pastBlocks')
    ];

    containers.forEach(container => {
        if (container) {
            const isUpcoming = container.id === 'upcomingBlocks';
            container.style.justifyContent = isUpcoming ? 'flex-end' : 'flex-start';
        }
    });
}

export function shiftBlocks() {
    if (isAnimating) return;
    isAnimating = true;

    const animationContainer = addAnimationContainer();
    const upcomingBlocks = document.getElementById('upcomingBlocks');
    const currentMeme = document.getElementById('currentMeme');
    const pastBlocks = document.getElementById('pastBlocks');

    if (!upcomingBlocks || !currentMeme || !pastBlocks) {
        console.error('Required DOM elements not found');
        isAnimating = false;
        return;
    }

    // Get all blocks
    const upcomingBlocksArray = Array.from(upcomingBlocks.children);
    const pastBlocksArray = Array.from(pastBlocks.children);
    const lastUpcoming = upcomingBlocksArray[upcomingBlocksArray.length - 1];
    
    if (!lastUpcoming) {
        isAnimating = false;
        return;
    }

    // Hide the BEAT THIS button during animation
    const beatButton = currentMeme.querySelector('button');
    if (beatButton) {
        beatButton.style.opacity = '0';
        beatButton.style.pointerEvents = 'none';
    }

    // Create animated clones for all blocks
    const animatedElements = [];

    // Start animation
    requestAnimationFrame(() => {
        // Hide current meme immediately as we'll show its animated clone
        currentMeme.style.opacity = '0';

        // 1. Create and animate current meme to past
        const animatedCurrent = createAnimatedElement(currentMeme);
        const firstPastBlock = pastBlocks.firstElementChild;
        if (firstPastBlock) {
            const currentRect = currentMeme.getBoundingClientRect();
            const targetRect = firstPastBlock.getBoundingClientRect();
            
            // Calculate scale factor from current size to target size
            const scaleX = targetRect.width / currentRect.width;
            const scaleY = targetRect.height / currentRect.height;
            
            // Set transform properties for the animation
            animatedCurrent.style.setProperty('--start-scale', '1');
            animatedCurrent.style.setProperty('--end-scale', `${scaleX}`);
            animatedCurrent.style.setProperty('--target-x', `${targetRect.left - currentRect.left}px`);
            animatedCurrent.style.setProperty('--target-y', `${targetRect.top - currentRect.top}px`);
        }
        animatedCurrent.classList.add('move-to-past');
        animationContainer.appendChild(animatedCurrent);
        animatedElements.push(animatedCurrent);

        // Hide original blocks after clones are created
        requestAnimationFrame(() => {
            // Hide side blocks
            upcomingBlocksArray.forEach(block => {
                if (block !== lastUpcoming) {
                    block.style.opacity = '0';
                }
            });
            pastBlocksArray.forEach(block => block.style.opacity = '0');

            // Update current meme image after its animation completes
            animatedCurrent.addEventListener('animationend', () => {
                const currentMemeImage = currentMeme.querySelector('img');
                if (currentMemeImage) {
                    currentMemeImage.src = lastUpcoming.querySelector('img').src;
                    currentMemeImage.setAttribute('data-initialized', 'true');
                    // Update submission thumbnails with the new image
                    updateSubmissionThumbnails(currentMemeImage.src);
                }
            });

            // Hide last upcoming when its clone starts moving
            const upcomingClone = animatedElements.find(el => el.classList.contains('move-to-current'));
            if (upcomingClone) {
                upcomingClone.addEventListener('animationstart', () => {
                    lastUpcoming.style.opacity = '0';
                });
            }
        });

        // 2. Create and animate last upcoming to current
        const animatedUpcoming = createAnimatedElement(lastUpcoming);
        const currentRect = currentMeme.getBoundingClientRect();
        const lastRect = lastUpcoming.getBoundingClientRect();
        
        // Calculate scale factor for upcoming to current
        const scaleX = currentRect.width / lastRect.width;
        const scaleY = currentRect.height / lastRect.height;
        
        animatedUpcoming.style.setProperty('--start-scale', '1');
        animatedUpcoming.style.setProperty('--end-scale', `${scaleX}`);
        animatedUpcoming.style.setProperty('--target-x', `${currentRect.left - lastRect.left}px`);
        animatedUpcoming.style.setProperty('--target-y', `${currentRect.top - lastRect.top}px`);
        
        animatedUpcoming.classList.add('move-to-current');
        animationContainer.appendChild(animatedUpcoming);
        animatedElements.push(animatedUpcoming);

        // 3. Create and animate upcoming blocks
        upcomingBlocksArray.slice(0, -1).forEach((block, index) => {
            const nextBlock = upcomingBlocksArray[index + 1];
            const animated = createAnimatedElement(block);
            const nextRect = nextBlock.getBoundingClientRect();
            const currentRect = block.getBoundingClientRect();
            animated.style.setProperty('--shift-x', `${nextRect.left - currentRect.left}px`);
            animated.classList.add('shift-block');
            animationContainer.appendChild(animated);
            animatedElements.push(animated);
        });

        // 4. Create and animate past blocks
        pastBlocksArray.forEach((block, index) => {
            const nextBlock = pastBlocksArray[index + 1];
            if (nextBlock) {
                const animated = createAnimatedElement(block);
                const nextRect = nextBlock.getBoundingClientRect();
                const currentRect = block.getBoundingClientRect();
                animated.style.setProperty('--shift-x', `${nextRect.left - currentRect.left}px`);
                animated.classList.add('shift-block');
                animationContainer.appendChild(animated);
                animatedElements.push(animated);
            }
        });

        // Wait for all animations to complete
        setTimeout(() => {
            // Update numbers
            upcomingStartNumber++;
            pastStartNumber++;
            currentBlockNumber++;

            // Update displays
            const currentMemeNumber = currentMeme.querySelector('.text-xs');
            if (currentMemeNumber) {
                currentMemeNumber.textContent = `#${currentBlockNumber}`;
            }

            const submissionsBlockNumber = document.getElementById('currentBlockNumber');
            if (submissionsBlockNumber) {
                submissionsBlockNumber.textContent = `#${currentBlockNumber}`;
            }

            // Remove animated elements
            animatedElements.forEach(el => el.remove());

            // Show current meme in its new state
            currentMeme.style.opacity = '1';

            // Reinitialize blocks with new positions
            initializeBlocks();

            // Show the BEAT THIS button
            if (beatButton) {
                beatButton.style.opacity = '1';
                beatButton.style.pointerEvents = 'auto';
            }

            // Reset animation state
            isAnimating = false;
        }, 800); // Match animation duration
    });
}

function createAnimatedElement(element) {
    const rect = element.getBoundingClientRect();
    const animated = element.cloneNode(true);
    animated.style.position = 'fixed';
    animated.style.top = `${rect.top}px`;
    animated.style.left = `${rect.left}px`;
    animated.style.width = `${rect.width}px`;
    animated.style.height = `${rect.height}px`;
    animated.style.margin = '0';
    animated.style.zIndex = '1000';
    animated.classList.add('animated-element');
    
    // Add Solana-style glow effect
    animated.style.boxShadow = '0 0 20px rgba(0, 255, 163, 0.4)';
    animated.style.transition = 'box-shadow 0.3s ease';
    
    return animated;
}

function addAnimationContainer() {
    let container = document.getElementById('animationContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'animationContainer';
        document.body.appendChild(container);
    }
    container.innerHTML = '';
    return container;
}

// Update CSS animations
const style = document.createElement('style');
style.textContent = `
    .animated-element {
        position: fixed;
        pointer-events: none;
        z-index: 1000;
        will-change: transform;
        transition: box-shadow 0.3s ease;
        opacity: 1 !important;
    }

    .move-to-past {
        animation: move-to-past 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    .move-to-current {
        animation: move-to-current 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    .shift-block {
        animation: shift-block 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    @keyframes move-to-past {
        0% {
            transform: translate(0, 0) scale(var(--start-scale));
            box-shadow: 0 0 30px rgba(0, 255, 163, 0.6);
            opacity: 1;
        }
        50% {
            transform: translate(calc(var(--target-x) * 0.6), calc(var(--target-y) * 0.6)) scale(calc((var(--start-scale) + var(--end-scale)) * 0.5));
            box-shadow: 0 0 40px rgba(0, 255, 163, 0.8);
            opacity: 1;
        }
        100% {
            transform: translate(var(--target-x), var(--target-y)) scale(var(--end-scale));
            box-shadow: 0 0 20px rgba(0, 255, 163, 0.4);
            opacity: 1;
        }
    }

    @keyframes move-to-current {
        0% {
            transform: translate(0, 0) scale(var(--start-scale));
        }
        50% {
            transform: translate(calc(var(--target-x) * 0.5), calc(var(--target-y) * 0.5)) scale(calc(var(--end-scale) * 1.1));
        }
        100% {
            transform: translate(var(--target-x), var(--target-y)) scale(var(--end-scale));
        }
    }

    @keyframes shift-block {
        0% {
            transform: translate(0, 0);
        }
        100% {
            transform: translate(var(--shift-x), 0);
        }
    }
`;
document.head.appendChild(style);

// Add resize listener to update blocks when viewport changes
window.addEventListener('resize', () => {
    clearTimeout(window.resizeTimer);
    window.resizeTimer = setTimeout(() => {
        initializeBlocks();
        centerBlocks();
    }, 250);
}); 