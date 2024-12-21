import { initializeSubmissions, updateSubmissionThumbnails } from './submissions.js';

// Initialize state variables
let isAnimating = false;
let animationQueue = [];
const ANIMATION_DURATION = 800; // Base duration for animations in ms
let currentBlockNumber = 803525; // This will be updated from WhatsOnChain
let upcomingStartNumber = currentBlockNumber + 1;
let pastStartNumber = currentBlockNumber - 1;

// Animation state
let animationContainer = null;
let animatedElements = [];

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

// Create animated element for transitions
function createAnimatedElement(sourceElement) {
    const rect = sourceElement.getBoundingClientRect();
    const clone = sourceElement.cloneNode(true);
    
    clone.style.cssText = `
        position: fixed;
        top: ${rect.top}px;
        left: ${rect.left}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        margin: 0;
        pointer-events: none;
        z-index: 1001;
        animation-duration: ${ANIMATION_DURATION}ms;
        animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
        animation-fill-mode: forwards;
        transform-origin: center center;
        will-change: transform;
    `;
    
    return clone;
}

// Animation container management
function addAnimationContainer() {
    let container = document.getElementById('animationContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'animationContainer';
        container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1000;
        `;
        document.body.appendChild(container);
    }
    return container;
}

// Get optimal block count based on viewport width
function getOptimalBlockCount() {
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

// Initialize blocks with proper numbers and images
export async function initializeBlocks() {
    // Fetch current block number first
    currentBlockNumber = await fetchCurrentBlockNumber();
    upcomingStartNumber = currentBlockNumber + 1;
    pastStartNumber = currentBlockNumber - 1;
    
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

    // Initialize upcoming blocks with sequential numbers
    for (let i = 0; i < optimalCount; i++) {
        // Calculate block number so the rightmost block (i=0) is current+1
        const blockNumber = currentBlockNumber + optimalCount - i;
        const block = document.createElement('div');
        block.className = 'meme-block rounded cursor-pointer relative group';
        block.innerHTML = `
            <div class="relative w-full h-full">
                <img src="${getImageForBlock(blockNumber)}" alt="Block" class="w-full h-full object-cover">
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div class="block-number-display">
                    <span>#${blockNumber}</span>
                </div>
            </div>
        `;
        upcomingBlocks.appendChild(block);
    }

    // Initialize past blocks with sequential numbers
    for (let i = 0; i < optimalCount; i++) {
        const blockNumber = currentBlockNumber - (i + 1);
        const block = document.createElement('div');
        block.className = 'meme-block rounded cursor-pointer relative group';
        block.innerHTML = `
            <div class="relative w-full h-full">
                <img src="${getImageForBlock(blockNumber)}" alt="Block" class="w-full h-full object-cover">
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div class="block-number-display">
                    <span>#${blockNumber}</span>
                </div>
            </div>
        `;
        pastBlocks.appendChild(block);
    }

    // Update current meme block number and image
    const currentMeme = document.getElementById('currentMeme');
    if (currentMeme) {
        const currentMemeImage = currentMeme.querySelector('img');
        if (currentMemeImage && !currentMemeImage.getAttribute('data-initialized')) {
            // Wait for the current meme image to load before initializing submissions
            currentMemeImage.onload = () => {
                initializeSubmissions();
                updateSubmissionThumbnails(currentMemeImage.src);
            };
            currentMemeImage.src = getImageForBlock(currentBlockNumber);
            currentMemeImage.setAttribute('data-initialized', 'true');
        }

        // Update current meme block number display
        const blockDisplay = currentMeme.querySelector('.block-number-display');
        if (blockDisplay) {
            blockDisplay.innerHTML = `<span>#${currentBlockNumber}</span>`;
        }
    }

    // Update submissions block number
    const submissionsBlockNumber = document.getElementById('currentBlockNumber');
    if (submissionsBlockNumber) {
        submissionsBlockNumber.textContent = currentBlockNumber;
    }
}

// Fetch current block number from WhatsOnChain
async function fetchCurrentBlockNumber() {
    try {
        const response = await fetch('https://api.whatsonchain.com/v1/bsv/main/chain/info');
        const data = await response.json();
        return data.blocks;
    } catch (error) {
        console.error('Error fetching block number:', error);
        return currentBlockNumber; // Return default if fetch fails
    }
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
    
    if (upcomingBlocksArray.length === 0) {
        console.error('No upcoming blocks to shift');
        isAnimating = false;
        return;
    }

    const lastUpcoming = upcomingBlocksArray[upcomingBlocksArray.length - 1];
    const newImageSrc = lastUpcoming.querySelector('img').src;

    // Hide the BEAT THIS button during animation
    const beatButton = currentMeme.querySelector('.compete-button');
    if (beatButton) {
        beatButton.style.opacity = '0';
        beatButton.style.pointerEvents = 'none';
    }

    // Clear any existing animated elements
    while (animationContainer.firstChild) {
        animationContainer.removeChild(animationContainer.firstChild);
    }

    requestAnimationFrame(() => {
        // Hide original elements
        currentMeme.style.opacity = '0';
        upcomingBlocksArray.forEach(block => block.style.opacity = '0');
        pastBlocksArray.forEach(block => block.style.opacity = '0');

        // 1. Animate current meme to past
        const animatedCurrent = createAnimatedElement(currentMeme);
        const firstPastBlock = pastBlocks.firstElementChild;
        if (firstPastBlock) {
            const currentRect = currentMeme.getBoundingClientRect();
            const targetRect = firstPastBlock.getBoundingClientRect();
            
            // Calculate center points
            const currentCenter = {
                x: currentRect.left + currentRect.width / 2,
                y: currentRect.top + currentRect.height / 2
            };
            const targetCenter = {
                x: targetRect.left + targetRect.width / 2,
                y: targetRect.top + targetRect.height / 2
            };

            // Calculate translation to align centers
            const translateX = targetCenter.x - currentCenter.x;
            const translateY = targetCenter.y - currentCenter.y;

            // Calculate scale
            const scaleX = targetRect.width / currentRect.width;
            const scaleY = targetRect.height / currentRect.height;
            const scale = Math.min(scaleX, scaleY);

            animatedCurrent.style.setProperty('--end-scale', scale);
            animatedCurrent.style.setProperty('--target-x', `${translateX}px`);
            animatedCurrent.style.setProperty('--target-y', `${translateY}px`);
            animatedCurrent.classList.add('move-to-past');
        }
        animationContainer.appendChild(animatedCurrent);

        // 2. Animate last upcoming to current
        const animatedUpcoming = createAnimatedElement(lastUpcoming);
        const lastUpcomingRect = lastUpcoming.getBoundingClientRect();
        const currentTargetRect = currentMeme.getBoundingClientRect();

        // Calculate center points for upcoming to current
        const upcomingCenter = {
            x: lastUpcomingRect.left + lastUpcomingRect.width / 2,
            y: lastUpcomingRect.top + lastUpcomingRect.height / 2
        };
        const currentTargetCenter = {
            x: currentTargetRect.left + currentTargetRect.width / 2,
            y: currentTargetRect.top + currentTargetRect.height / 2
        };

        // Calculate translation to align centers
        const upcomingTranslateX = currentTargetCenter.x - upcomingCenter.x;
        const upcomingTranslateY = currentTargetCenter.y - upcomingCenter.y;

        // Calculate scale
        const upcomingScaleX = currentTargetRect.width / lastUpcomingRect.width;
        const upcomingScaleY = currentTargetRect.height / lastUpcomingRect.height;
        const upcomingScale = Math.max(upcomingScaleX, upcomingScaleY);

        animatedUpcoming.style.setProperty('--end-scale', upcomingScale);
        animatedUpcoming.style.setProperty('--target-x', `${upcomingTranslateX}px`);
        animatedUpcoming.style.setProperty('--target-y', `${upcomingTranslateY}px`);
        animatedUpcoming.classList.add('move-to-current');
        animationContainer.appendChild(animatedUpcoming);

        // 3. Animate other upcoming blocks
        upcomingBlocksArray.slice(0, -1).forEach((block, index) => {
            const nextBlock = upcomingBlocksArray[index + 1];
            const animated = createAnimatedElement(block);
            const nextRect = nextBlock.getBoundingClientRect();
            const currentRect = block.getBoundingClientRect();
            
            animated.style.setProperty('--shift-x', `${nextRect.left - currentRect.left}px`);
            animated.style.setProperty('--shift-y', '0px');
            animated.classList.add('shift-block');
            animationContainer.appendChild(animated);
        });

        // 4. Animate past blocks
        pastBlocksArray.forEach((block, index) => {
            const nextBlock = pastBlocksArray[index + 1];
            if (nextBlock) {
                const animated = createAnimatedElement(block);
                const nextRect = nextBlock.getBoundingClientRect();
                const currentRect = block.getBoundingClientRect();
                
                animated.style.setProperty('--shift-x', `${nextRect.left - currentRect.left}px`);
                animated.style.setProperty('--shift-y', '0px');
                animated.classList.add('shift-block');
                animationContainer.appendChild(animated);
            }
        });

        // Update current meme image during animation
        const currentMemeImage = currentMeme.querySelector('img');
        if (currentMemeImage) {
            currentMemeImage.src = newImageSrc;
            // Update thumbnails in the submission grid
            updateSubmissionThumbnails(newImageSrc);
        }

        // Wait for animations to complete
        setTimeout(() => {
            // Update block numbers
            upcomingStartNumber++;
            pastStartNumber++;
            currentBlockNumber++;

            // Update block numbers and content
            upcomingBlocksArray.forEach((block, index) => {
                const blockNumber = currentBlockNumber + (upcomingBlocksArray.length - index);
                const blockDisplay = block.querySelector('.block-number-display span');
                if (blockDisplay) {
                    blockDisplay.textContent = `#${blockNumber}`;
                }
                const img = block.querySelector('img');
                if (img) {
                    img.src = getImageForBlock(blockNumber);
                }
            });

            pastBlocksArray.forEach((block, index) => {
                const blockNumber = currentBlockNumber - (index + 1);
                const blockDisplay = block.querySelector('.block-number-display span');
                if (blockDisplay) {
                    blockDisplay.textContent = `#${blockNumber}`;
                }
                const img = block.querySelector('img');
                if (img) {
                    img.src = getImageForBlock(blockNumber);
                }
            });

            // Update current meme number
            const currentMemeNumber = currentMeme.querySelector('.block-number-display span');
            if (currentMemeNumber) {
                currentMemeNumber.textContent = `#${currentBlockNumber}`;
            }

            // Update submissions block number
            const submissionsBlockNumber = document.getElementById('currentBlockNumber');
            if (submissionsBlockNumber) {
                submissionsBlockNumber.textContent = currentBlockNumber;
            }

            // Show all blocks in their new positions
            setTimeout(() => {
                // Clear animation container
                while (animationContainer.firstChild) {
                    animationContainer.removeChild(animationContainer.firstChild);
                }

                // Show original elements
                currentMeme.style.opacity = '1';
                upcomingBlocksArray.forEach(block => block.style.opacity = '1');
                pastBlocksArray.forEach(block => block.style.opacity = '1');

                // Show the BEAT THIS button
                if (beatButton) {
                    beatButton.style.opacity = '1';
                    beatButton.style.pointerEvents = 'auto';
                }

                // Reset animation state
                isAnimating = false;
            }, 50);
        }, ANIMATION_DURATION);
    });
}

// Add resize listener to update blocks when viewport changes
window.addEventListener('resize', () => {
    clearTimeout(window.resizeTimer);
    window.resizeTimer = setTimeout(() => {
        initializeBlocks();
    }, 250);
}); 