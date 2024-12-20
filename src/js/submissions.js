let currentSubmissionIndex = 0;
let submissions = [];
let currentFilter = 'trending';
let currentTimeRange = 'current';

export function initializeSubmissions() {
    const submissionsGrid = document.getElementById('submissionsGrid');
    if (!submissionsGrid) return;

    // Generate mock submissions
    submissions = generateMockSubmissions();
    updateSubmissions();

    // Add modal navigation handlers
    document.getElementById('prevSubmission')?.addEventListener('click', showPreviousSubmission);
    document.getElementById('nextSubmission')?.addEventListener('click', showNextSubmission);
    document.getElementById('closeSubmissionModal')?.addEventListener('click', closeSubmissionModal);
}

function generateMockSubmissions() {
    // Get current meme image
    const currentMeme = document.getElementById('currentMeme');
    const currentMemeImage = currentMeme ? currentMeme.querySelector('img').src : 'https://placehold.co/400x400';

    return Array.from({ length: 9 }, (_, i) => ({
        id: i + 1,
        blockNumber: 803525,
        videoUrl: currentMemeImage,
        thumbnail: currentMemeImage,
        timestamp: new Date(Date.now() - Math.random() * 86400000 * 7),
        creator: `Creator${i + 1}.sol`,
        creatorRank: Math.floor(Math.random() * 100) + 1,
        totalWatchTimeSeconds: Math.floor(Math.random() * 36000),
        totalViews: Math.floor(Math.random() * 10000),
        rank: i + 1,
        liveViewers: Math.floor(Math.random() * 1000),
        avgWatchTimeSeconds: Math.floor(Math.random() * 300),
        peakViewers: Math.floor(Math.random() * 2000),
        retentionRate: Math.random() * 0.3 + 0.7,
        earnings: Math.floor(Math.random() * 10000),
        points: Math.floor(Math.random() * 5000)
    }));
}

function updateSubmissions() {
    const submissionsGrid = document.getElementById('submissionsGrid');
    if (!submissionsGrid) return;

    // Sort submissions based on current filter
    const sortedSubmissions = [...submissions].sort((a, b) => {
        switch (currentFilter) {
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

    submissionsGrid.innerHTML = '';
    
    // Add fixed premium badges for top 3 positions
    sortedSubmissions.forEach((submission, index) => {
        submission.rank = index + 1; // Assign fixed rank based on position
        const block = createSubmissionBlock(submission);
        submissionsGrid.appendChild(block);
    });
}

function createSubmissionBlock(submission) {
    const block = document.createElement('div');
    block.className = 'submission-card relative group cursor-pointer transform transition-all duration-300 hover:scale-105';
    
    // Get current meme image
    const currentMeme = document.getElementById('currentMeme');
    const currentMemeImage = currentMeme ? currentMeme.querySelector('img').src : 'https://placehold.co/400x400';

    // Define badge styles based on rank
    const badgeStyles = {
        1: 'bg-gradient-to-r from-yellow-300 to-yellow-500 border-yellow-300 text-black', // Gold
        2: 'bg-gradient-to-r from-gray-300 to-gray-400 border-gray-300 text-black',      // Silver
        3: 'bg-gradient-to-r from-amber-600 to-amber-700 border-amber-600 text-white'    // Bronze
    };

    block.innerHTML = `
        <div class="relative w-full h-full">
            <img src="${currentMemeImage}" alt="Submission Thumbnail" class="thumbnail w-full h-full object-cover">
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <!-- Premium Badge for top 3 -->
            ${submission.rank <= 3 ? `
                <div class="absolute top-3 right-3 ${badgeStyles[submission.rank]} px-3 py-1 rounded-full border shadow-lg flex items-center gap-2">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                    <span class="font-bold">#${submission.rank}</span>
                </div>
            ` : ''}
            
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
        </div>
    `;

    // Add hover effects
    block.addEventListener('mouseenter', () => {
        block.style.transform = 'scale(1.05)';
        block.style.boxShadow = '0 0 30px rgba(0, 255, 163, 0.3)';
    });

    block.addEventListener('mouseleave', () => {
        block.style.transform = 'scale(1)';
        block.style.boxShadow = 'none';
    });

    // Add click handler
    block.addEventListener('click', () => {
        openSubmissionDetails(submission);
    });

    return block;
}

function openSubmissionDetails(submission) {
    const modal = document.getElementById('submissionDetailsModal');
    const currentMeme = document.getElementById('currentMeme');
    const currentMemeImage = currentMeme ? currentMeme.querySelector('img').src : 'https://placehold.co/400x400';

    if (modal) {
        // Store current submission index for navigation
        currentSubmissionIndex = submissions.findIndex(s => s.id === submission.id);

        modal.innerHTML = `
            <div class="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex items-center justify-center p-4">
                <div class="relative bg-[#0F1825] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar border border-[#00ffa3]/20">
                    <!-- Solana Background Effects -->
                    <div class="absolute inset-0 overflow-hidden rounded-2xl">
                        <div class="absolute inset-0 bg-gradient-to-br from-[#232D3F]/50 via-[#0F1825]/50 to-[#192E4B]/50"></div>
                        <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00ffa3]/50 to-transparent"></div>
                        <div class="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00ffa3]/50 to-transparent"></div>
                        <div class="absolute -left-32 -top-32 w-64 h-64 bg-[#00ffa3]/10 rounded-full blur-3xl"></div>
                        <div class="absolute -right-32 -bottom-32 w-64 h-64 bg-[#00ffa3]/10 rounded-full blur-3xl"></div>
                    </div>

                    <!-- Navigation Arrows -->
                    <div class="absolute inset-y-0 left-0 right-0 flex items-center justify-between pointer-events-none z-20 px-4">
                        <button id="prevDetailSubmission" class="pointer-events-auto p-2 rounded-full bg-[#0F1825]/90 border border-[#00ffa3]/30 hover:border-[#00ffa3] transition-all hover:scale-110 ${currentSubmissionIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}">
                            <svg class="w-6 h-6 text-[#00ffa3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button id="nextDetailSubmission" class="pointer-events-auto p-2 rounded-full bg-[#0F1825]/90 border border-[#00ffa3]/30 hover:border-[#00ffa3] transition-all hover:scale-110 ${currentSubmissionIndex === submissions.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}">
                            <svg class="w-6 h-6 text-[#00ffa3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    <!-- Close button -->
                    <button id="closeSubmissionModal" class="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-30">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <!-- Content -->
                    <div class="p-6 relative z-10">
                        <!-- Transaction ID Banner -->
                        <div class="mb-6 p-4 rounded-xl bg-[#0F1825]/80 border border-[#00ffa3]/20 backdrop-blur-sm">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <span class="text-[#00ffa3]">Transaction ID:</span>
                                    <a href="https://whatsonchain.com/tx/${submission.txId}" 
                                       target="_blank" 
                                       class="font-mono text-white hover:text-[#00ffa3] transition-colors">
                                        ${submission.txId}
                                    </a>
                                </div>
                                <button class="text-[#00ffa3] hover:text-white transition-all" onclick="navigator.clipboard.writeText('${submission.txId}')">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <!-- Video container -->
                        <div class="relative rounded-xl overflow-hidden mb-6 group">
                            <img src="${currentMemeImage}" alt="Submission Thumbnail" class="w-full aspect-video object-cover">
                            <div class="absolute inset-0 flex items-center justify-center">
                                <div class="transform group-hover:scale-110 transition-transform duration-300">
                                    <div class="relative">
                                        <div class="absolute inset-0 bg-[#00ffa3] opacity-20 rounded-full animate-pulse"></div>
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-white relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Beat This Button -->
                            <div class="absolute bottom-4 left-0 right-0 flex justify-center">
                                <button class="gradient-button px-8 py-3 rounded-lg font-bold text-lg bg-gradient-to-r from-[#ff00ff] to-[#00ffff] hover:scale-105 transform transition-all duration-300 shadow-lg shadow-[#00ffa3]/20 text-white">
                                    BEAT THIS
                                </button>
                            </div>

                            <!-- Live viewer count -->
                            <div class="absolute top-4 left-4 bg-[#080418]/95 backdrop-blur-md rounded-full px-4 py-1 flex items-center gap-2 border border-[#00ffa3]/30">
                                <span class="animate-pulse text-red-500">●</span>
                                <span class="text-white" id="liveViewers">${submission.liveViewers}</span>
                                <span class="text-white/70">watching</span>
                            </div>

                            <!-- Potential reward -->
                            <div class="absolute top-4 right-4 bg-[#080418]/95 backdrop-blur-md rounded-full px-4 py-1 border border-[#00ffa3]/30">
                                <span class="text-[#00ffa3]">+${submission.earnings} SOL</span>
                                <span class="text-white/70">potential reward</span>
                            </div>
                        </div>

                        <!-- Stats Grid -->
                        <div class="grid grid-cols-2 gap-4 mb-6">
                            <div class="stats-card bg-[#080418]/95 backdrop-blur-md rounded-xl p-4 border border-[#00ffa3]/20">
                                <div class="text-white/70 mb-2">Total Views</div>
                                <div class="text-2xl font-bold">
                                    <span class="text-[#00ffa3]">${formatNumber(submission.totalViews)}</span>
                                </div>
                            </div>
                            <div class="stats-card bg-[#080418]/95 backdrop-blur-md rounded-xl p-4 border border-[#00ffa3]/20">
                                <div class="text-white/70 mb-2">Engagement Rate</div>
                                <div class="text-2xl font-bold">
                                    <span class="text-[#00ffa3]">${Math.round(submission.retentionRate * 100)}%</span>
                                </div>
                            </div>
                        </div>

                        <!-- Creator Info -->
                        <div class="creator-info bg-[#080418]/95 backdrop-blur-md rounded-xl p-4 border border-[#00ffa3]/20 mb-6">
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 rounded-full bg-gradient-to-r from-[#00ffa3] to-[#00ffff] flex items-center justify-center">
                                    <span class="text-black font-bold">${submission.creator.slice(0, 2)}</span>
                                </div>
                                <div>
                                    <div class="font-bold text-white">${submission.creator}</div>
                                    <div class="text-[#00ffa3] text-sm">Rank #${submission.creatorRank}</div>
                                </div>
                                <button class="ml-auto bg-[#00ffa3] text-black px-4 py-2 rounded-lg font-bold hover:bg-[#00ffff] transition-colors">
                                    Follow
                                </button>
                            </div>
                        </div>

                        <!-- Engagement Stats -->
                        <div class="space-y-4">
                            <div class="engagement-stat flex justify-between items-center p-4 rounded-xl bg-[#080418]/95 backdrop-blur-md border border-[#00ffa3]/20">
                                <span class="text-white">Watch Time</span>
                                <span class="text-[#00ffa3]">${formatWatchTime(submission.totalWatchTimeSeconds)}</span>
                            </div>
                            <div class="engagement-stat flex justify-between items-center p-4 rounded-xl bg-[#080418]/95 backdrop-blur-md border border-[#00ffa3]/20">
                                <span class="text-white">Peak Viewers</span>
                                <span class="text-[#00ffa3]">${formatNumber(submission.peakViewers)}</span>
                            </div>
                            <div class="engagement-stat flex justify-between items-center p-4 rounded-xl bg-[#080418]/95 backdrop-blur-md border border-[#00ffa3]/20">
                                <span class="text-white">Time Left</span>
                                <span class="text-[#00ffa3]">${formatTimeAgo(submission.timestamp)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        modal.classList.add('modal-open');

        // Add navigation handlers
        const prevButton = modal.querySelector('#prevDetailSubmission');
        const nextButton = modal.querySelector('#nextDetailSubmission');
        const closeButton = modal.querySelector('#closeSubmissionModal');

        if (prevButton) {
            prevButton.addEventListener('click', () => {
                if (currentSubmissionIndex > 0) {
                    openSubmissionDetails(submissions[currentSubmissionIndex - 1]);
                }
            });
        }

        if (nextButton) {
            nextButton.addEventListener('click', () => {
                if (currentSubmissionIndex < submissions.length - 1) {
                    openSubmissionDetails(submissions[currentSubmissionIndex + 1]);
                }
            });
        }

        if (closeButton) {
            closeButton.addEventListener('click', () => {
                modal.classList.remove('modal-open');
                setTimeout(() => {
                    modal.classList.remove('modal-close');
                }, 300);
            });
        }

        // Add click handler for Beat This button
        const beatThisButton = modal.querySelector('.gradient-button');
        if (beatThisButton) {
            beatThisButton.addEventListener('click', () => {
                const videoModal = document.getElementById('videoModal');
                if (videoModal) {
                    // Close the submission details modal
                    modal.classList.remove('modal-open');
                    setTimeout(() => {
                        modal.classList.remove('modal-close');
                    }, 300);

                    // Open the video modal
                    videoModal.classList.remove('hidden');
                    videoModal.classList.add('modal-open');
                    document.getElementById('promptStep').style.display = 'block';
                    document.getElementById('generatingStep').style.display = 'none';
                    document.getElementById('previewStep').style.display = 'none';
                }
            });
        }

        // Start live viewer updates
        startLiveViewerUpdates(submission.liveViewers);
    }
}

function showPreviousSubmission() {
    if (currentSubmissionIndex > 0) {
        currentSubmissionIndex--;
        openSubmissionModal(submissions[currentSubmissionIndex]);
    }
}

function showNextSubmission() {
    if (currentSubmissionIndex < submissions.length - 1) {
        currentSubmissionIndex++;
        openSubmissionModal(submissions[currentSubmissionIndex]);
    }
}

function formatWatchTime(seconds) {
    if (seconds >= 3600) {
        return `${(seconds / 3600).toFixed(1)}h`;
    }
    if (seconds >= 60) {
        return `${Math.floor(seconds / 60)}m`;
    }
    return `${seconds}s`;
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function formatTimeAgo(timestamp) {
    const seconds = Math.floor((new Date() - timestamp) / 1000);
    
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
        }
    }
    
    return 'Just now';
}

function closeSubmissionModal() {
    const modal = document.getElementById('submissionDetailsModal');
    if (!modal) return;

    modal.classList.add('modal-close');
    setTimeout(() => {
        modal.classList.remove('modal-open', 'modal-close');
        modal.classList.add('hidden');
        // Stop live viewer updates
        if (window.liveViewerInterval) {
            clearInterval(window.liveViewerInterval);
        }
    }, 300);
}

function startLiveViewerUpdates(baseCount) {
    if (window.liveViewerInterval) {
        clearInterval(window.liveViewerInterval);
    }
    
    const liveViewersElement = document.getElementById('liveViewers');
    if (!liveViewersElement) return;

    let currentCount = baseCount;
    
    window.liveViewerInterval = setInterval(() => {
        // Random fluctuation between -2% and +2%
        const fluctuation = Math.floor(currentCount * (Math.random() * 0.04 - 0.02));
        currentCount = Math.max(0, currentCount + fluctuation);
        liveViewersElement.textContent = formatNumber(currentCount);
        
        // Add pulse animation on change
        liveViewersElement.classList.add('number-pulse');
        setTimeout(() => liveViewersElement.classList.remove('number-pulse'), 500);
    }, 3000);
}

export function updateSubmissionThumbnails(newImageSrc) {
    const submissionBlocks = document.querySelectorAll('.submission-block .thumbnail');
    submissionBlocks.forEach(thumbnail => {
        // Add animation class
        thumbnail.classList.add('thumbnail-updating');
        
        // Update the image
        thumbnail.src = newImageSrc;
        
        // Remove animation class after animation completes
        thumbnail.addEventListener('animationend', () => {
            thumbnail.classList.remove('thumbnail-updating');
        }, { once: true }); // Use once: true to automatically remove the event listener after it fires
    });
} 