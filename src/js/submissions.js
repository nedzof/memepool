let currentSubmissionIndex = 0;
let submissions = [];
let currentFilter = 'trending';
let currentTimeRange = 'current';

export function initializeSubmissions() {
    const submissionsGrid = document.getElementById('submissionsGrid');
    if (!submissionsGrid) return;

    // Add filter bar
    const filterBar = document.createElement('div');
    filterBar.className = 'filter-bar';
    filterBar.innerHTML = `
        <div class="flex gap-4">
            <button class="filter-button active" data-sort="trending">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Trending
            </button>
            <button class="filter-button" data-sort="earnings">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Earnings
            </button>
            <button class="filter-button" data-sort="viewers">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Viewers
            </button>
        </div>
        <div class="flex gap-4">
            <button class="filter-button active" data-time="current">Current Round</button>
            <button class="filter-button" data-time="hour">Last Hour</button>
            <button class="filter-button" data-time="day">Last 24h</button>
        </div>
    `;

    submissionsGrid.parentNode.insertBefore(filterBar, submissionsGrid);

    // Add filter button click handlers
    filterBar.querySelectorAll('[data-sort]').forEach(button => {
        button.addEventListener('click', () => {
            filterBar.querySelectorAll('[data-sort]').forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            currentFilter = button.dataset.sort;
            updateSubmissions();
        });
    });

    filterBar.querySelectorAll('[data-time]').forEach(button => {
        button.addEventListener('click', () => {
            filterBar.querySelectorAll('[data-time]').forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            currentTimeRange = button.dataset.time;
            updateSubmissions();
        });
    });

    // Generate mock submissions
    submissions = generateMockSubmissions();
    updateSubmissions();

    // Add modal navigation handlers
    document.getElementById('prevSubmission')?.addEventListener('click', showPreviousSubmission);
    document.getElementById('nextSubmission')?.addEventListener('click', showNextSubmission);
    document.getElementById('closeSubmissionModal')?.addEventListener('click', closeSubmissionModal);
}

function generateMockSubmissions() {
    return Array.from({ length: 9 }, (_, i) => ({
        id: i + 1,
        blockNumber: 803525,
        videoUrl: 'https://picsum.photos/400/400',
        thumbnail: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23000' fill-opacity='0.2'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='24' fill='rgba(0, 255, 163, 0.5)' text-anchor='middle' dominant-baseline='middle'%3EVideo %23${i + 1}%3C/text%3E%3C/svg%3E`,
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
    
    sortedSubmissions.forEach((submission, index) => {
        const block = createSubmissionBlock(submission);
        submissionsGrid.appendChild(block);
    });
}

function createSubmissionBlock(submission) {
    const block = document.createElement('div');
    block.className = 'submission-block relative group cursor-pointer transform transition-all duration-300 hover:scale-105';
    
    // Get current meme image
    const currentMeme = document.getElementById('currentMeme');
    const currentMemeImage = currentMeme ? currentMeme.querySelector('img').src : 'https://placehold.co/400x400';

    block.innerHTML = `
        <div class="relative w-full h-full">
            <img src="${currentMemeImage}" alt="Submission Thumbnail" class="thumbnail w-full h-full object-cover">
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <!-- Engagement Stats Banner -->
            <div class="watch-banner">
                <div class="watch-count">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span class="watch-time">${Math.floor(Math.random() * 1000)}k</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[#00ffa3]">+${Math.floor(Math.random() * 100)} SOL</span>
                    <span class="text-xs opacity-75">Potential Reward</span>
                </div>
            </div>

            <!-- Play Indicator -->
            <div class="play-indicator">
                <div class="absolute inset-0 bg-[#00ffa3] opacity-20 rounded-full animate-pulse"></div>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>

            <!-- Live Viewer Count -->
            <div class="live-pulse">
                <span class="text-red-500">● LIVE</span>
                <span class="text-white" id="liveViewers">${Math.floor(Math.random() * 1000)}</span>
            </div>

            <!-- Rank Badge (if in top 3) -->
            ${submission.rank <= 3 ? `
                <div class="rank-badge rank-badge-${submission.rank}">
                    ${submission.rank}
                </div>
            ` : ''}

            <!-- Engagement Boost -->
            <div class="absolute bottom-0 left-0 right-0 p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black via-black/90 to-transparent">
                <div class="flex justify-between items-center text-sm">
                    <div class="flex items-center gap-2">
                        <span class="text-[#00ffa3]">${Math.floor(Math.random() * 100)}%</span>
                        <span class="opacity-75">Engagement Rate</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-[#00ffa3]">${Math.floor(Math.random() * 24)}h</span>
                        <span class="opacity-75">Time Left</span>
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
        modal.innerHTML = `
            <div class="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4">
                <div class="bg-[#0c0620]/90 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar relative border border-[#00ffa3]/20">
                    <!-- Close button -->
                    <button id="closeSubmissionModal" class="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <!-- Content -->
                    <div class="p-6">
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
                            
                            <!-- Live viewer count -->
                            <div class="absolute top-4 left-4 bg-black/50 rounded-full px-4 py-1 flex items-center gap-2">
                                <span class="animate-pulse text-red-500">●</span>
                                <span class="text-white" id="liveViewers">${Math.floor(Math.random() * 1000)}</span>
                                <span class="text-white/70">watching</span>
                            </div>

                            <!-- Potential reward -->
                            <div class="absolute top-4 right-4 bg-[#00ffa3]/20 border border-[#00ffa3]/40 rounded-full px-4 py-1">
                                <span class="text-[#00ffa3]">+${Math.floor(Math.random() * 100)} SOL</span>
                                <span class="text-white/70">potential reward</span>
                            </div>
                        </div>

                        <!-- Stats Grid -->
                        <div class="grid grid-cols-2 gap-4 mb-6">
                            <div class="stats-card bg-black/20 rounded-xl p-4 border border-[#00ffa3]/20 hover:border-[#00ffa3]/40 transition-colors">
                                <div class="text-white/70 mb-2">Total Views</div>
                                <div class="text-2xl font-bold">
                                    <span class="text-[#00ffa3]">${Math.floor(Math.random() * 1000)}k</span>
                                </div>
                            </div>
                            <div class="stats-card bg-black/20 rounded-xl p-4 border border-[#00ffa3]/20 hover:border-[#00ffa3]/40 transition-colors">
                                <div class="text-white/70 mb-2">Engagement Rate</div>
                                <div class="text-2xl font-bold">
                                    <span class="text-[#00ffa3]">${Math.floor(Math.random() * 100)}%</span>
                                </div>
                            </div>
                        </div>

                        <!-- Creator Info -->
                        <div class="creator-info bg-black/20 rounded-xl p-4 border border-[#00ffa3]/20 hover:border-[#00ffa3]/40 transition-colors mb-6">
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 rounded-full bg-gradient-to-r from-[#00ffa3] to-[#00ffff]"></div>
                                <div>
                                    <div class="font-bold">Creator Name</div>
                                    <div class="text-white/70 text-sm">Joined ${Math.floor(Math.random() * 12)} months ago</div>
                                </div>
                                <button class="ml-auto bg-[#00ffa3] text-black px-4 py-2 rounded-lg font-bold hover:bg-[#00ffff] transition-colors">
                                    Follow
                                </button>
                            </div>
                        </div>

                        <!-- Engagement Stats -->
                        <div class="space-y-4">
                            <div class="engagement-stat flex justify-between items-center p-4 rounded-xl bg-black/20 border border-[#00ffa3]/20 hover:border-[#00ffa3]/40 transition-colors">
                                <span>Watch Time</span>
                                <span class="text-[#00ffa3]">${Math.floor(Math.random() * 60)} minutes</span>
                            </div>
                            <div class="engagement-stat flex justify-between items-center p-4 rounded-xl bg-black/20 border border-[#00ffa3]/20 hover:border-[#00ffa3]/40 transition-colors">
                                <span>Completion Rate</span>
                                <span class="text-[#00ffa3]">${Math.floor(Math.random() * 100)}%</span>
                            </div>
                            <div class="engagement-stat flex justify-between items-center p-4 rounded-xl bg-black/20 border border-[#00ffa3]/20 hover:border-[#00ffa3]/40 transition-colors">
                                <span>Time Left</span>
                                <span class="text-[#00ffa3]">${Math.floor(Math.random() * 24)}h ${Math.floor(Math.random() * 60)}m</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        modal.classList.add('modal-open');

        // Add close button handler
        const closeButton = modal.querySelector('#closeSubmissionModal');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                modal.classList.remove('modal-open');
                setTimeout(() => {
                    modal.classList.remove('modal-close');
                }, 300);
            });
        }
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
        thumbnail.src = newImageSrc;
    });
} 