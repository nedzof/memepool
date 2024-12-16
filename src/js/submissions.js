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
        const block = document.createElement('div');
        block.className = 'submission-block neon-border';
        
        // Add rank badge for top 3
        const rankBadgeHtml = index < 3 ? `
            <div class="rank-badge rank-badge-${index + 1}">
                ${index + 1}
            </div>
        ` : '';

        // Add live pulse animation
        const livePulseHtml = `
            <div class="live-pulse">
                <span class="text-white text-sm">${formatNumber(submission.liveViewers)}</span>
            </div>
        `;

        block.innerHTML = `
            <div class="thumbnail">
                <video src="${submission.videoUrl}" class="w-full h-full object-cover" preload="none" poster="${submission.thumbnail}"></video>
                ${rankBadgeHtml}
                ${livePulseHtml}
                <div class="play-indicator">
                    <svg class="w-8 h-8" fill="none" stroke="rgba(0, 255, 163, 0.8)" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div class="submission-info">
                    <div class="flex justify-between items-center">
                        <div class="flex items-center gap-2">
                            <div class="watch-time neon-text">${formatWatchTime(submission.totalWatchTimeSeconds)}</div>
                        </div>
                        <div class="text-[#00ffa3]">${formatNumber(submission.points)} pts</div>
                    </div>
                </div>
            </div>
        `;

        block.addEventListener('click', () => {
            currentSubmissionIndex = index;
            openSubmissionModal(submission);
        });

        submissionsGrid.appendChild(block);
    });
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

function openSubmissionModal(submissionData) {
    const modal = document.getElementById('submissionDetailsModal');
    if (!modal) return;
    
    // Update modal content
    document.getElementById('submissionBlockNumber').textContent = `#${submissionData.blockNumber}`;
    document.getElementById('submissionVideo').src = submissionData.videoUrl;
    document.getElementById('submissionVideo').poster = submissionData.thumbnail;
    
    document.getElementById('submissionTimestamp').textContent = formatTimeAgo(submissionData.timestamp);
    document.getElementById('creatorAddress').textContent = submissionData.creator;
    document.getElementById('creatorRank').textContent = `Top Creator #${submissionData.creatorRank}`;
    
    document.getElementById('totalWatchTime').textContent = (submissionData.totalWatchTimeSeconds / 3600).toFixed(1);
    document.getElementById('submissionRank').textContent = `#${submissionData.rank}`;
    document.getElementById('liveViewers').textContent = formatNumber(submissionData.liveViewers);
    document.getElementById('retentionRate').textContent = `${Math.round(submissionData.retentionRate * 100)}`;
    document.getElementById('pointsEarned').textContent = formatNumber(submissionData.points);
    document.getElementById('peakViewers').textContent = formatNumber(submissionData.peakViewers);

    // Update navigation buttons
    const prevButton = document.getElementById('prevSubmission');
    const nextButton = document.getElementById('nextSubmission');
    if (prevButton) prevButton.style.visibility = currentSubmissionIndex > 0 ? 'visible' : 'hidden';
    if (nextButton) nextButton.style.visibility = currentSubmissionIndex < submissions.length - 1 ? 'visible' : 'hidden';

    // Show modal with animation
    modal.classList.remove('hidden');
    modal.classList.add('modal-open');

    // Start live viewer count updates
    startLiveViewerUpdates(submissionData.liveViewers);
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