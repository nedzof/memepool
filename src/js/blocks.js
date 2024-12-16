import { initializeSubmissions, updateSubmissionThumbnails } from './submissions.js';

// Initialize state variables
let isAnimating = false;
let animationQueue = [];
const ANIMATION_DURATION = 800; // Base duration for animations in ms
let currentBlockNumber = 803525; // This will be updated from WhatsOnChain
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

// Add new state variables for past submissions
let isLoadingPastSubmissions = false;
let currentPage = 1;
const submissionsPerPage = 12;

// Initialize navigation buttons
export function initializeBlockNavigation() {
    const moreUpcomingBlocksBtn = document.getElementById('moreUpcomingBlocks');
    const morePastBlocksBtn = document.getElementById('morePastBlocks');

    if (!moreUpcomingBlocksBtn || !morePastBlocksBtn) {
        console.error('Block navigation buttons not found');
        return;
    }

    // Handle upcoming blocks navigation
    moreUpcomingBlocksBtn.addEventListener('click', () => {
        upcomingStartNumber += getOptimalBlockCount();
        initializeBlocks();
    });

    // Handle past blocks navigation
    morePastBlocksBtn.addEventListener('click', () => {
        const pastSubmissionsModal = document.getElementById('pastSubmissionsModal');
        if (pastSubmissionsModal) {
            pastSubmissionsModal.classList.remove('hidden');
            pastSubmissionsModal.style.display = 'flex';
            loadPastSubmissions();
        }
    });
}

// Initialize past submissions modal
export function initializePastSubmissionsModal() {
    const morePastBlocksBtn = document.getElementById('morePastBlocks');
    const pastSubmissionsModal = document.getElementById('pastSubmissionsModal');
    const closePastSubmissionsModal = document.getElementById('closePastSubmissionsModal');
    const pastSubmissionsContainer = document.getElementById('pastSubmissionsContainer');
    const searchSubmissions = document.getElementById('searchSubmissions');
    const txIdSearch = document.getElementById('txIdSearch');
    const creatorSearch = document.getElementById('creatorSearch');
    const copyTxId = document.getElementById('copyTxId');

    if (!morePastBlocksBtn || !pastSubmissionsModal || !closePastSubmissionsModal || 
        !pastSubmissionsContainer || !searchSubmissions || !txIdSearch || !creatorSearch || !copyTxId) {
        console.error('Required past submissions modal elements not found');
        return;
    }

    // Show modal when clicking more past blocks button
    morePastBlocksBtn.addEventListener('click', () => {
        pastSubmissionsModal.classList.remove('hidden');
        pastSubmissionsModal.style.display = 'flex';
        currentPage = 1; // Reset page counter
        const pastSubmissionsGrid = document.getElementById('pastSubmissionsGrid');
        if (pastSubmissionsGrid) {
            pastSubmissionsGrid.innerHTML = '';
            loadPastSubmissions();
        }
    });

    // Close modal
    closePastSubmissionsModal.addEventListener('click', () => {
        pastSubmissionsModal.classList.add('hidden');
        pastSubmissionsModal.style.display = 'none';
    });

    // Copy transaction ID
    copyTxId.addEventListener('click', () => {
        const txId = document.getElementById('pastModalTxId').textContent;
        navigator.clipboard.writeText(txId).then(() => {
            // Show copy success feedback
            copyTxId.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
            setTimeout(() => {
                copyTxId.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>';
            }, 2000);
        });
    });

    // Time filter handlers
    const timeFilters = pastSubmissionsModal.querySelectorAll('[data-time]');
    timeFilters.forEach(button => {
        button.addEventListener('click', () => {
            timeFilters.forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            currentTimeRange = button.dataset.time;
            resetAndReloadSubmissions();
        });
    });

    // Sort filter handlers
    const sortFilters = pastSubmissionsModal.querySelectorAll('[data-sort]');
    sortFilters.forEach(button => {
        button.addEventListener('click', () => {
            sortFilters.forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            currentFilter = button.dataset.sort;
            resetAndReloadSubmissions();
        });
    });

    // Search submissions
    searchSubmissions.addEventListener('click', () => {
        const txId = txIdSearch.value.trim();
        const creator = creatorSearch.value.trim();
        if (txId || creator) {
            searchSubmissionsByFilters(txId, creator);
        }
    });

    // Search on enter key
    [txIdSearch, creatorSearch].forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchSubmissions.click();
            }
        });
    });

    // Infinite scroll
    pastSubmissionsContainer.addEventListener('scroll', () => {
        if (isLoadingPastSubmissions) return;

        const { scrollTop, scrollHeight, clientHeight } = pastSubmissionsContainer;
        if (scrollTop + clientHeight >= scrollHeight - 100) {
            loadPastSubmissions();
        }
    });
}

// Helper function to reset and reload submissions
function resetAndReloadSubmissions() {
    currentPage = 1;
    const pastSubmissionsGrid = document.getElementById('pastSubmissionsGrid');
    if (pastSubmissionsGrid) {
        pastSubmissionsGrid.innerHTML = '';
        loadPastSubmissions();
    }
}

// Search submissions by filters
async function searchSubmissionsByFilters(txId, creator) {
    const pastSubmissionsGrid = document.getElementById('pastSubmissionsGrid');
    const submissionsLoader = document.getElementById('submissionsLoader');
    
    if (!pastSubmissionsGrid || !submissionsLoader) return;

    pastSubmissionsGrid.innerHTML = '';
    submissionsLoader.classList.remove('hidden');

    try {
        // Simulate API call - replace with actual API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        const submissions = generateMockSubmissions().filter(s => {
            const matchesTxId = !txId || s.txId.toLowerCase().includes(txId.toLowerCase());
            const matchesCreator = !creator || s.creator.toLowerCase().includes(creator.toLowerCase());
            return matchesTxId && matchesCreator;
        });

        if (submissions.length === 0) {
            pastSubmissionsGrid.innerHTML = `
                <div class="col-span-4 text-center py-8 text-gray-400">
                    No submissions found for the given filters
                </div>
            `;
        } else {
            submissions.forEach(submission => {
                const submissionBlock = createPastSubmissionBlock(submission);
                pastSubmissionsGrid.appendChild(submissionBlock);
            });
        }
    } catch (error) {
        console.error('Error searching submissions:', error);
    } finally {
        submissionsLoader.classList.add('hidden');
    }
}

// Load past submissions with infinite scroll
async function loadPastSubmissions() {
    if (isLoadingPastSubmissions) return;
    isLoadingPastSubmissions = true;

    const submissionsLoader = document.getElementById('submissionsLoader');
    const pastSubmissionsGrid = document.getElementById('pastSubmissionsGrid');
    
    if (!submissionsLoader || !pastSubmissionsGrid) return;

    submissionsLoader.classList.remove('hidden');

    try {
        // Simulate API call - replace with actual API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        const submissions = generateMockSubmissions();

        // Filter submissions based on time range
        const filteredSubmissions = filterSubmissionsByTimeRange(submissions, currentTimeRange);

        // Sort submissions based on current filter
        const sortedSubmissions = sortSubmissions(filteredSubmissions, currentFilter);

        sortedSubmissions.forEach(submission => {
            const submissionBlock = createPastSubmissionBlock(submission);
            pastSubmissionsGrid.appendChild(submissionBlock);
        });

        currentPage++;
    } catch (error) {
        console.error('Error loading past submissions:', error);
    } finally {
        submissionsLoader.classList.add('hidden');
        isLoadingPastSubmissions = false;
    }
}

// Sort submissions based on filter
function sortSubmissions(submissions, filter) {
    return [...submissions].sort((a, b) => {
        switch (filter) {
            case 'earnings':
                return b.earnings - a.earnings;
            case 'viewers':
                return b.liveViewers - a.liveViewers;
            case 'watchTime':
                return b.totalWatchTimeSeconds - a.totalWatchTimeSeconds;
            default: // trending
                return b.points - a.points;
        }
    });
}

// Filter submissions based on time range
function filterSubmissionsByTimeRange(submissions, timeRange) {
    const now = Date.now();
    return submissions.filter(submission => {
        const submissionTime = submission.timestamp.getTime();
        switch (timeRange) {
            case 'hour':
                return now - submissionTime <= 3600000; // 1 hour in milliseconds
            case 'day':
                return now - submissionTime <= 86400000; // 24 hours in milliseconds
            case 'current':
            default:
                return true; // Show all for current round
        }
    });
}

// Create a past submission block
function createPastSubmissionBlock(submission) {
    const block = document.createElement('div');
    block.className = 'submission-block relative group cursor-pointer transform transition-all duration-300 hover:scale-105';
    
    block.innerHTML = `
        <div class="relative w-full h-full">
            <img src="${submission.thumbnail}" alt="Submission Thumbnail" class="w-full h-full object-cover">
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <!-- Transaction ID Banner -->
            <div class="absolute top-4 left-4 right-4 px-3 py-2 bg-black/70 backdrop-blur-sm rounded-lg border border-[#00ffa3]/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div class="text-xs font-mono text-[#00ffa3] truncate">${submission.txId}</div>
            </div>
            
            <!-- Stats Banner -->
            <div class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div class="flex justify-between items-center text-sm">
                    <div class="flex items-center gap-2">
                        <span class="text-[#00ffa3]">${submission.points}</span>
                        <span class="text-white opacity-75">Points</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-[#00ffa3]">#${submission.rank}</span>
                        <span class="text-white opacity-75">Rank</span>
                    </div>
                </div>
            </div>

            ${submission.rank <= 3 ? `
                <div class="rank-badge rank-badge-${submission.rank}">
                    ${submission.rank}
                </div>
            ` : ''}
        </div>
    `;

    // Click handler to show submission details
    block.addEventListener('click', () => {
        showSubmissionDetails(submission);
    });

    return block;
}

// Mock data generator
function generateMockSubmissions() {
    return Array.from({ length: submissionsPerPage }, (_, i) => ({
        id: currentPage * submissionsPerPage + i,
        txId: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 10)}`,
        thumbnail: `https://picsum.photos/400/400?random=${Math.random()}`,
        points: Math.floor(Math.random() * 10000),
        rank: Math.floor(Math.random() * 100) + 1,
        blockNumber: Math.floor(Math.random() * 1000000)
    }));
}

// Fetch current block number from WhatsOnChain
async function fetchCurrentBlockNumber() {
    try {
        const response = await fetch('https://api.whatsonchain.com/v1/bsv/main/chain/info');
        const data = await response.json();
        currentBlockNumber = data.blocks;
        upcomingStartNumber = currentBlockNumber + 5;
        pastStartNumber = currentBlockNumber - 1;
        return currentBlockNumber;
    } catch (error) {
        console.error('Error fetching block number:', error);
        return currentBlockNumber; // Return default if fetch fails
    }
}

// Create block number display element
function createBlockNumberDisplay(number) {
    return `
        <div class="block-number">
            <span class="block-number-text">#${number}</span>
        </div>
    `;
}

// Update initializeBlocks function to use new block number display
export async function initializeBlocks() {
    // Fetch current block number first
    currentBlockNumber = await fetchCurrentBlockNumber();
    
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
        block.className = 'meme-block rounded cursor-pointer relative group';
        block.innerHTML = `
            <div class="relative w-full h-full">
                <img src="${getImageForBlock(blockNumber)}" alt="Block" class="w-full h-full object-cover">
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
            ${createBlockNumberDisplay(blockNumber)}
        `;
        upcomingBlocks.appendChild(block);
    }

    // Initialize past blocks
    for (let i = 0; i < optimalCount; i++) {
        const blockNumber = pastStartNumber - i;
        const block = document.createElement('div');
        block.className = 'meme-block rounded cursor-pointer relative group';
        block.innerHTML = `
            <div class="relative w-full h-full">
                <img src="${getImageForBlock(blockNumber)}" alt="Block" class="w-full h-full object-cover">
                
                <!-- Video Indicator -->
                <div class="absolute top-2 left-2 bg-black/90 backdrop-blur-md rounded-md px-2 py-1 flex items-center gap-1.5 border-l-2 border-[#00ffa3]">
                    <svg class="w-3.5 h-3.5 text-[#00ffa3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    </svg>
                    <span class="text-[10px] font-medium text-[#00ffa3] uppercase tracking-wider">Live</span>
                </div>

                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
            ${createBlockNumberDisplay(blockNumber)}
        `;
        
        // Add click handler to show past submissions modal
        block.addEventListener('click', () => {
            const pastSubmissionsModal = document.getElementById('pastSubmissionsModal');
            const pastModalBlockNumber = document.getElementById('pastModalBlockNumber');
            const pastModalTxId = document.getElementById('pastModalTxId');
            
            if (pastSubmissionsModal && pastModalBlockNumber && pastModalTxId) {
                pastModalBlockNumber.textContent = `#${blockNumber}`;
                pastModalTxId.textContent = `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 10)}`;
                pastSubmissionsModal.classList.remove('hidden');
                pastSubmissionsModal.style.display = 'flex';
                currentPage = 1;
                const pastSubmissionsGrid = document.getElementById('pastSubmissionsGrid');
                if (pastSubmissionsGrid) {
                    pastSubmissionsGrid.innerHTML = '';
                    loadPastSubmissions();
                }
            }
        });
        
        pastBlocks.appendChild(block);
    }

    // Update current meme block number and image
    const currentMeme = document.getElementById('currentMeme');
    if (currentMeme) {
        const currentMemeImage = currentMeme.querySelector('img');
        if (currentMemeImage && !currentMemeImage.getAttribute('data-initialized')) {
            currentMemeImage.src = getImageForBlock(currentBlockNumber);
            currentMemeImage.setAttribute('data-initialized', 'true');
        }

        // Update current meme block number display
        const blockDisplay = currentMeme.querySelector('.block-number-display');
        if (blockDisplay) {
            blockDisplay.innerHTML = createBlockNumberDisplay(currentBlockNumber);
        } else {
            const blockNumberContainer = document.createElement('div');
            blockNumberContainer.className = 'block-number-display absolute bottom-0 left-0 right-0';
            blockNumberContainer.innerHTML = createBlockNumberDisplay(currentBlockNumber);
            currentMeme.querySelector('.relative').appendChild(blockNumberContainer);
        }
    }

    // Update submissions block number with clear text
    const submissionsBlockNumber = document.getElementById('currentBlockNumber');
    if (submissionsBlockNumber) {
        submissionsBlockNumber.textContent = currentBlockNumber;
        submissionsBlockNumber.className = 'font-mono text-[#00ffa3] font-bold'; // Clear text styling
    }

    // Initialize submissions grid
    initializeSubmissions();

    // Initialize navigation
    initializeBlockNavigation();
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

    // Get the new image source early
    const newImageSrc = lastUpcoming.querySelector('img').src;

    // Update thumbnails immediately when animation starts
    updateSubmissionThumbnails(newImageSrc);

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

            // Update current meme image and thumbnails during animation
            const currentMemeImage = currentMeme.querySelector('img');
            if (currentMemeImage) {
                currentMemeImage.src = newImageSrc;
                currentMemeImage.setAttribute('data-initialized', 'true');
                // Update thumbnails again during animation
                updateSubmissionThumbnails(newImageSrc);
            }

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

            // Update thumbnails one final time after animation
            updateSubmissionThumbnails(newImageSrc);

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