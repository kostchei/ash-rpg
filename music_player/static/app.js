/**
 * Chronicles of Iron & Cosmos - Frontend Application
 * Handles audio/video playback, seamless looping, YouTube search, and background MP4 recording.
 */

// State
const state = {
  presets: [],
  library: [],
  activeTrack: null, // { filename, title, isLocal, ytId }
  playlist: [],
  currentIndex: -1,
  loopMode: 'shuffle', // 'shuffle' (default) | 'track' | 'linear'
  shuffledIndices: [],
  shufflePointer: 0,
  vaultFilterQuery: '',
  vaultFilterMode: 'all', // 'all' | 'looped' | 'full'
  activeJobs: [],
  pollingInterval: null
};

// DOM Elements
const el = {
  // Player
  mediaPlayer: document.getElementById('media-player'),
  ytPreviewWrapper: document.getElementById('yt-preview-wrapper'),
  ytIframe: document.getElementById('yt-iframe'),
  visualizerOverlay: document.getElementById('visualizer-overlay'),
  playerTitle: document.getElementById('player-title'),
  playerBadge: document.getElementById('player-badge'),
  btnPlayPause: document.getElementById('btn-play-pause'),
  btnPrev: document.getElementById('btn-prev'),
  btnNext: document.getElementById('btn-next'),
  btnLoopMode: document.getElementById('btn-loop-mode'),
  loopModeIcon: document.getElementById('loop-mode-icon'),
  loopModeLabel: document.getElementById('loop-mode-label'),
  timeScrubber: document.getElementById('time-scrubber'),
  timeCurrent: document.getElementById('time-current'),
  timeDuration: document.getElementById('time-duration'),
  volSlider: document.getElementById('vol-slider'),
  btnCinema: document.getElementById('btn-cinema'),
  videoWrapper: document.getElementById('video-wrapper'),

  // Header & Vault actions
  btnHeroShuffle: document.getElementById('btn-hero-shuffle'),
  btnPlayRandom: document.getElementById('btn-play-random'),
  btnShuffleVault: document.getElementById('btn-shuffle-vault'),
  vaultFilterInput: document.getElementById('vault-filter-input'),
  btnClearFilter: document.getElementById('btn-clear-filter'),
  vaultFilterChips: document.querySelectorAll('.chip-filter'),

  // Presets & Search
  presetsGrid: document.getElementById('presets-grid'),
  searchForm: document.getElementById('search-form'),
  searchInput: document.getElementById('search-input'),
  btnClearSearch: document.getElementById('btn-clear-search'),
  btnSearch: document.getElementById('btn-search'),
  resultsList: document.getElementById('results-list'),
  resultsCount: document.getElementById('results-count'),
  resultsHeadline: document.getElementById('results-headline'),

  // Library & Looped Vault
  libraryList: document.getElementById('library-list'),
  libraryCount: document.getElementById('library-count'),
  btnRefreshLibrary: document.getElementById('btn-refresh-library'),
  btnCompileMaster: document.getElementById('btn-compile-master'),

  // Jobs
  jobsContainer: document.getElementById('jobs-container'),
  jobsList: document.getElementById('jobs-list'),
  btnBatchAll: document.getElementById('btn-batch-all'),

  // Modal
  recordModal: document.getElementById('record-modal'),
  modalClose: document.getElementById('modal-close'),
  btnModalCancel: document.getElementById('btn-modal-cancel'),
  btnModalConfirm: document.getElementById('btn-modal-confirm'),
  modalTrackTitle: document.getElementById('modal-track-title'),
  modalTrackUrl: document.getElementById('modal-track-url')
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  initPlayer();
  loadPresets();
  loadLibrary();
  startJobPolling();
  bindEvents();
});

function bindEvents() {
  // Search
  el.searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = el.searchInput.value.trim();
    if (query) performSearch(query);
  });

  el.searchInput.addEventListener('input', () => {
    el.btnClearSearch.classList.toggle('hidden', !el.searchInput.value);
  });

  el.btnClearSearch.addEventListener('click', () => {
    el.searchInput.value = '';
    el.btnClearSearch.classList.add('hidden');
    el.searchInput.focus();
  });

  // Quick chips
  document.querySelectorAll('.chip-tag').forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.getAttribute('data-query');
      el.searchInput.value = q;
      el.btnClearSearch.classList.remove('hidden');
      performSearch(q);
    });
  });

  // Library buttons
  el.btnRefreshLibrary.addEventListener('click', loadLibrary);
  if (el.btnCompileMaster) el.btnCompileMaster.addEventListener('click', handleCompileMasterSet);

  // Play Random / Shuffle
  if (el.btnPlayRandom) el.btnPlayRandom.addEventListener('click', playRandomTrack);
  if (el.btnShuffleVault) el.btnShuffleVault.addEventListener('click', playRandomTrack);

  // Vault Filtering
  if (el.vaultFilterInput) {
    el.vaultFilterInput.addEventListener('input', () => {
      state.vaultFilterQuery = el.vaultFilterInput.value;
      if (el.btnClearFilter) el.btnClearFilter.classList.toggle('hidden', !state.vaultFilterQuery);
      renderLibrary();
    });
  }

  if (el.btnClearFilter) {
    el.btnClearFilter.addEventListener('click', () => {
      el.vaultFilterInput.value = '';
      state.vaultFilterQuery = '';
      el.btnClearFilter.classList.add('hidden');
      renderLibrary();
    });
  }

  if (el.vaultFilterChips) {
    el.vaultFilterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        el.vaultFilterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.vaultFilterMode = chip.getAttribute('data-filter') || 'all';
        renderLibrary();
      });
    });
  }

  // Batch record
  if (el.btnBatchAll) el.btnBatchAll.addEventListener('click', handleBatchRecordAll);

  // Modal
  el.modalClose.addEventListener('click', closeModal);
  el.btnModalCancel.addEventListener('click', closeModal);
  el.btnModalConfirm.addEventListener('click', submitRecordModal);

  // Cinema mode toggle
  el.btnCinema.addEventListener('click', () => {
    document.querySelector('.dashboard-grid').classList.toggle('cinema-mode');
    if (el.mediaPlayer.requestFullscreen && !document.fullscreenElement) {
      el.mediaPlayer.requestFullscreen().catch(() => {});
    }
  });
  if (el.btnHeroShuffle) el.btnHeroShuffle.addEventListener('click', playRandomTrack);
  if (el.visualizerOverlay) el.visualizerOverlay.addEventListener('click', playRandomTrack);
}

function buildShuffledQueue() {
  if (state.library.length === 0) return;
  const indices = state.library.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  state.shuffledIndices = indices;
  state.shufflePointer = 0;
}

function playRandomTrack() {
  if (state.library.length === 0) return;
  state.loopMode = 'shuffle';
  el.loopModeIcon.textContent = '🔀';
  el.loopModeLabel.textContent = 'Shuffle All';
  el.btnLoopMode.classList.add('active');

  if (!state.shuffledIndices || state.shuffledIndices.length !== state.library.length) {
    buildShuffledQueue();
  }
  if (state.shufflePointer >= state.shuffledIndices.length) {
    buildShuffledQueue();
  }

  const idx = state.shuffledIndices[state.shufflePointer++];
  playLocalTrack(state.library[idx], idx);
}

// ---------------------------------------------------------------------------
// Audio / Video Player Controller
// ---------------------------------------------------------------------------
function initPlayer() {
  const player = el.mediaPlayer;
  player.volume = parseFloat(el.volSlider.value);
  player.loop = false; // default is shuffle through all vault albums!

  el.loopModeIcon.textContent = '🔀';
  el.loopModeLabel.textContent = 'Shuffle All';
  el.btnLoopMode.classList.add('active');

  player.addEventListener('play', () => {
    el.btnPlayPause.textContent = '⏸';
    el.visualizerOverlay.classList.add('hidden');
  });

  player.addEventListener('pause', () => {
    el.btnPlayPause.textContent = '▶';
  });

  player.addEventListener('timeupdate', () => {
    if (player.duration) {
      const percent = (player.currentTime / player.duration) * 100;
      el.timeScrubber.value = percent;
      el.timeCurrent.textContent = formatTime(player.currentTime);
      el.timeDuration.textContent = formatTime(player.duration);
    }
  });

  player.addEventListener('loadedmetadata', () => {
    el.timeDuration.textContent = formatTime(player.duration);
  });

  // End of media handling based on Loop Mode
  player.addEventListener('ended', () => {
    if (state.loopMode === 'shuffle') {
      playRandomTrack(); // plays next random album continuously!
    } else if (state.loopMode === 'track') {
      player.currentTime = 0;
      player.play();
    } else if (state.loopMode === 'linear') {
      playNext();
    } else {
      el.btnPlayPause.textContent = '▶';
    }
  });

  // Controls
  el.btnPlayPause.addEventListener('click', () => {
    if (!player.src) {
      playRandomTrack();
      return;
    }
    if (player.paused) {
      player.play().catch(e => console.warn('Play interrupted:', e));
    } else {
      player.pause();
    }
  });

  el.btnPrev.addEventListener('click', playPrev);
  el.btnNext.addEventListener('click', playNext);

  el.timeScrubber.addEventListener('input', () => {
    if (player.duration) {
      player.currentTime = (el.timeScrubber.value / 100) * player.duration;
    }
  });

  el.volSlider.addEventListener('input', () => {
    player.volume = parseFloat(el.volSlider.value);
  });

  // Cycle loop modes: 'shuffle' -> 'track' -> 'linear' -> 'shuffle'
  el.btnLoopMode.addEventListener('click', () => {
    if (state.loopMode === 'shuffle') {
      state.loopMode = 'track';
      player.loop = true;
      el.loopModeIcon.textContent = '🔂';
      el.loopModeLabel.textContent = 'Loop Track';
      el.btnLoopMode.classList.add('active');
    } else if (state.loopMode === 'track') {
      state.loopMode = 'linear';
      player.loop = false;
      el.loopModeIcon.textContent = '🔁';
      el.loopModeLabel.textContent = 'Linear Set';
      el.btnLoopMode.classList.add('active');
    } else {
      state.loopMode = 'shuffle';
      player.loop = false;
      el.loopModeIcon.textContent = '🔀';
      el.loopModeLabel.textContent = 'Shuffle All';
      el.btnLoopMode.classList.add('active');
    }
  });
}

function playLocalTrack(item, index = -1) {
  stopYtPreview();
  state.activeTrack = item;
  state.currentIndex = index;

  const player = el.mediaPlayer;
  player.src = `/media/${encodeURIComponent(item.filename)}`;
  player.currentTime = 0;

  el.playerTitle.textContent = item.title || item.filename;
  el.playerBadge.textContent = state.loopMode === 'shuffle' ? '🔀 SHUFFLE' : (item.is_looped ? `LOOPED ${item.loop_count || 1}X` : 'LOCAL MP4');
  el.playerBadge.style.color = state.loopMode === 'shuffle' ? '#2ecc71' : (item.is_looped ? '#ff9f43' : '#c59b27');

  if (el.btnHeroShuffle) {
    const currentNum = state.shufflePointer || 1;
    el.btnHeroShuffle.innerHTML = `<span class="icon">⏭</span> NEXT RANDOM ALBUM (${currentNum}/${state.library.length})`;
  }

  player.play().catch(e => console.log('Autoplay deferred:', e));

  // Highlight in library
  document.querySelectorAll('.library-item').forEach(elItem => {
    elItem.classList.toggle('active', elItem.getAttribute('data-filename') === item.filename);
  });
}

function playPrev() {
  if (state.library.length === 0) return;
  if (state.loopMode === 'shuffle') {
    if (state.shuffledIndices && state.shufflePointer > 1) {
      state.shufflePointer -= 2;
      const idx = state.shuffledIndices[state.shufflePointer++];
      playLocalTrack(state.library[idx], idx);
      return;
    }
  }
  let prevIdx = state.currentIndex - 1;
  if (prevIdx < 0) prevIdx = state.library.length - 1;
  playLocalTrack(state.library[prevIdx], prevIdx);
}

function playNext() {
  if (state.library.length === 0) return;
  if (state.loopMode === 'shuffle') {
    playRandomTrack();
    return;
  }
  let nextIdx = state.currentIndex + 1;
  if (nextIdx >= state.library.length) nextIdx = 0;
  playLocalTrack(state.library[nextIdx], nextIdx);
}

function startYtPreview(ytId, title) {
  el.mediaPlayer.pause();
  el.mediaPlayer.classList.add('hidden');
  el.ytPreviewWrapper.classList.remove('hidden');
  el.visualizerOverlay.classList.add('hidden');

  el.ytIframe.src = `https://www.youtube.com/embed/${ytId}?autoplay=1&enablejsapi=1&loop=1&playlist=${ytId}`;
  el.playerTitle.textContent = `[YouTube Preview] ${title}`;
  el.playerBadge.textContent = 'YT STREAM';
  el.playerBadge.style.color = '#e74c3c';
  state.activeTrack = { ytId, title, isLocal: false };
}

function stopYtPreview() {
  el.ytPreviewWrapper.classList.add('hidden');
  el.ytIframe.src = '';
  el.mediaPlayer.classList.remove('hidden');
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// ---------------------------------------------------------------------------
// Band Presets & YouTube Search
// ---------------------------------------------------------------------------
async function loadPresets() {
  try {
    const res = await fetch('/api/presets');
    const data = await res.json();
    state.presets = data.presets || [];
    renderPresets();
  } catch (err) {
    console.error('Failed to load presets:', err);
  }
}

function renderPresets() {
  el.presetsGrid.innerHTML = '';
  state.presets.forEach(band => {
    // Check if this band has matching tracks in local library
    const bandMatches = state.library.filter(track => {
      const lower = (track.title || '').toLowerCase();
      const bandLower = band.name.toLowerCase();
      const idLower = (band.id || '').replace(/_/g, ' ').toLowerCase();
      return lower.includes(bandLower) || (idLower && lower.includes(idLower));
    });
    const hasLocal = bandMatches.length > 0;

    const card = document.createElement('div');
    card.className = 'preset-card' + (hasLocal ? ' has-local' : '');
    card.innerHTML = `
      <div class="preset-top">
        <h4 class="preset-name">${escapeHtml(band.name)}</h4>
        <span class="preset-badge">${hasLocal ? 'Ready (' + bandMatches.length + ')' : escapeHtml(band.badge)}</span>
      </div>
      <p class="preset-desc">${escapeHtml(band.description)}</p>
      <div class="preset-btn-row">
        ${hasLocal 
          ? `<button class="btn btn-gold btn-sm btn-preset-play" style="flex:1" title="Play recorded album from local vault">▶ Play Album</button>
             <button class="btn btn-secondary btn-sm btn-preset-search" title="Find more on YouTube">🔍</button>`
          : `<button class="btn btn-secondary btn-sm btn-preset-search" style="flex:1">🔍 Find</button>
             <button class="btn btn-crimson btn-sm btn-preset-rec" title="Record top full album with 3x loop">📼 Record</button>`
        }
      </div>
    `;

    if (hasLocal) {
      card.querySelector('.btn-preset-play').addEventListener('click', (e) => {
        e.stopPropagation();
        const trackToPlay = bandMatches.find(t => t.is_looped) || bandMatches[0];
        const idx = state.library.indexOf(trackToPlay);
        playLocalTrack(trackToPlay, idx);
      });
      card.addEventListener('click', () => {
        const trackToPlay = bandMatches.find(t => t.is_looped) || bandMatches[0];
        const idx = state.library.indexOf(trackToPlay);
        playLocalTrack(trackToPlay, idx);
      });
    } else {
      card.addEventListener('click', () => {
        el.searchInput.value = band.query;
        el.btnClearSearch.classList.remove('hidden');
        performSearch(band.query);
      });
    }

    card.querySelector('.btn-preset-search').addEventListener('click', (e) => {
      e.stopPropagation();
      el.searchInput.value = band.query;
      el.btnClearSearch.classList.remove('hidden');
      performSearch(band.query);
    });

    if (!hasLocal && card.querySelector('.btn-preset-rec')) {
      card.querySelector('.btn-preset-rec').addEventListener('click', (e) => {
        e.stopPropagation();
        quickRecordPreset(band);
      });
    }

    el.presetsGrid.appendChild(card);
  });
}

async function performSearch(query) {
  el.resultsHeadline.textContent = `Searching YouTube for "${query}"...`;
  el.resultsCount.textContent = 'Searching...';
  el.resultsList.innerHTML = `
    <div class="empty-state">
      <div class="metal-seal" style="font-size:2rem">⚔️</div>
      <p>Consulting the archives of metal &amp; cosmos...</p>
    </div>
  `;

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=8`);
    const data = await res.json();
    const items = data.results || [];
    renderSearchResults(items, query);
  } catch (err) {
    el.resultsList.innerHTML = `
      <div class="empty-state">
        <p style="color:var(--crimson-main)">Search failed: ${escapeHtml(err.message)}</p>
      </div>
    `;
  }
}

function renderSearchResults(items, query) {
  el.resultsHeadline.textContent = `Results for "${query}"`;
  el.resultsCount.textContent = `${items.length} found`;

  if (items.length === 0) {
    el.resultsList.innerHTML = `
      <div class="empty-state">
        <p>No matches found on YouTube for "${escapeHtml(query)}".</p>
      </div>
    `;
    return;
  }

  el.resultsList.innerHTML = '';
  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'result-card';
    card.innerHTML = `
      <div class="result-thumb-wrapper">
        <img class="result-thumb" src="${escapeHtml(item.thumbnail)}" alt="${escapeHtml(item.title)}" loading="lazy">
        <span class="result-duration">${escapeHtml(item.duration_string)}</span>
      </div>
      <div class="result-details">
        <div>
          <h4 class="result-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</h4>
          <span class="result-channel">${escapeHtml(item.channel)}</span>
        </div>
        <div class="result-actions">
          <button class="btn btn-secondary btn-sm btn-play-yt">▶ Preview</button>
          <button class="btn btn-gold btn-sm btn-rec-modal">📼 Record MP4</button>
          <button class="btn btn-crimson btn-sm btn-quick-loop">⚡ 3x Loop</button>
        </div>
      </div>
    `;

    card.querySelector('.btn-play-yt').addEventListener('click', () => {
      startYtPreview(item.id, item.title);
    });

    card.querySelector('.btn-rec-modal').addEventListener('click', () => {
      openRecordModal(item.url, item.title);
    });

    card.querySelector('.btn-quick-loop').addEventListener('click', () => {
      enqueueDownload(item.url, item.title, 3, true);
    });

    el.resultsList.appendChild(card);
  });
}

// ---------------------------------------------------------------------------
// Library & Recorded Vault
// ---------------------------------------------------------------------------
async function loadLibrary() {
  try {
    const res = await fetch('/api/library');
    const data = await res.json();
    state.library = data.library || [];
    buildShuffledQueue();
    renderLibrary();
    renderPresets(); // Update preset cards with Play buttons!
    if (!state.activeTrack && state.library.length > 0) {
      el.playerTitle.textContent = `${state.library.length} albums ready • Press Play or Shuffle to start`;
    }
  } catch (err) {
    console.error('Failed to load library:', err);
  }
}

function renderLibrary() {
  const query = (state.vaultFilterQuery || '').toLowerCase().trim();
  const mode = state.vaultFilterMode || 'all';

  const filtered = state.library.filter(item => {
    // Mode filter: 'all', 'looped', 'full'
    if (mode === 'looped' && !item.is_looped) return false;
    if (mode === 'full' && item.is_looped) return false;

    // Search query filter
    if (query) {
      const matchTitle = (item.title || '').toLowerCase().includes(query);
      const matchFile = (item.filename || '').toLowerCase().includes(query);
      if (!matchTitle && !matchFile) return false;
    }
    return true;
  });

  const countStr = filtered.length === state.library.length 
    ? `${state.library.length} file${state.library.length === 1 ? '' : 's'}`
    : `${filtered.length} of ${state.library.length} files`;
  el.libraryCount.textContent = countStr;

  if (state.library.length === 0) {
    el.libraryList.innerHTML = `
      <div class="empty-state">
        <p>No recorded MP4s yet in <code>music_player/media/</code>.</p>
        <p class="sub">Search YouTube on the right or click any band preset to record!</p>
      </div>
    `;
    return;
  }

  if (filtered.length === 0) {
    el.libraryList.innerHTML = `
      <div class="empty-state">
        <p>No recorded albums match your filter "${escapeHtml(query)}".</p>
      </div>
    `;
    return;
  }

  el.libraryList.innerHTML = '';
  filtered.forEach((item) => {
    const originalIndex = state.library.indexOf(item);
    const row = document.createElement('div');
    row.className = 'library-item';
    row.setAttribute('data-filename', item.filename);
    if (state.activeTrack && state.activeTrack.filename === item.filename) {
      row.classList.add('active');
    }

    const icon = item.is_master_set ? '👑' : (item.is_looped ? '🔁' : '🎵');
    const loopTag = item.is_looped ? `<span class="tag-loop">[Looped ${item.loop_count || 3}x]</span>` : '';

    row.innerHTML = `
      <div class="item-left">
        <span class="item-icon">${icon}</span>
        <div class="item-meta">
          <span class="item-name" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</span>
          <div class="item-sub">
            <span>${item.size_mb || 0} MB</span>
            ${loopTag}
          </div>
        </div>
      </div>
      <div class="item-actions">
        <button class="btn btn-gold btn-sm btn-play-local">▶ Play</button>
        <a href="/media/${encodeURIComponent(item.filename)}" download class="btn btn-secondary btn-sm" title="Save file">💾</a>
        <button class="btn btn-danger btn-sm btn-del-local" title="Delete file">🗑</button>
      </div>
    `;

    row.querySelector('.btn-play-local').addEventListener('click', (e) => {
      e.stopPropagation();
      playLocalTrack(item, originalIndex);
    });

    row.addEventListener('click', (e) => {
      if (!e.target.closest('.item-actions')) {
        playLocalTrack(item, originalIndex);
      }
    });

    row.querySelector('.btn-del-local').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm(`Delete "${item.filename}" from media library?`)) {
        await deleteLocalFile(item.filename);
      }
    });

    el.libraryList.appendChild(row);
  });
}

async function deleteLocalFile(filename) {
  try {
    const res = await fetch(`/api/library/${encodeURIComponent(filename)}`, { method: 'DELETE' });
    if (res.ok) {
      loadLibrary();
    }
  } catch (err) {
    alert(`Failed to delete: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Recording & Background Jobs
// ---------------------------------------------------------------------------
function openRecordModal(url, title) {
  el.modalTrackUrl.value = url;
  el.modalTrackTitle.textContent = title;
  el.recordModal.classList.remove('hidden');
}

function closeModal() {
  el.recordModal.classList.add('hidden');
}

function submitRecordModal() {
  const url = el.modalTrackUrl.value;
  const title = el.modalTrackTitle.textContent;
  const loopCount = parseInt(document.querySelector('input[name="loop_count"]:checked')?.value || '3', 10);
  closeModal();
  enqueueDownload(url, title, loopCount, loopCount > 1);
}

async function enqueueDownload(url, title, loopCount, makeLooped) {
  try {
    const res = await fetch('/api/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, title, loop_count: loopCount, make_looped: makeLooped })
    });
    const data = await res.json();
    if (data.status === 'accepted') {
      showJobsDrawer();
      pollJobs();
    }
  } catch (err) {
    alert(`Failed to enqueue record: ${err.message}`);
  }
}

async function quickRecordPreset(band) {
  // Search for top video and record with 3x loop
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(band.query)}&limit=1`);
    const data = await res.json();
    const top = data.results?.[0];
    if (top) {
      enqueueDownload(top.url, `${band.name} - ${top.title}`, 3, true);
    } else {
      alert(`Could not find a YouTube video for ${band.name}`);
    }
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

async function handleBatchRecordAll() {
  if (confirm("Start batch recording and loop generation for all 17 bands in the background?\n\n(Note: You already have 66 albums downloaded and ready to play in your vault!)")) {
    try {
      const res = await fetch('/api/record_all_presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loop_count: 2 })
      });
      const data = await res.json();
      alert(data.message || "Batch job started!");
      showJobsDrawer();
      pollJobs();
    } catch (err) {
      alert(`Error starting batch: ${err.message}`);
    }
  }
}

async function handleCompileMasterSet() {
  if (state.library.length === 0) {
    alert("No recorded MP4s available to compile. Record some tracks first!");
    return;
  }
  const name = prompt("Enter a name for the Master Looped Set:", "Heavy_Metal_Looped_Master");
  if (!name) return;

  try {
    const res = await fetch('/api/create_looped_set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, loop_count: 2 })
    });
    const data = await res.json();
    if (data.status === 'accepted') {
      showJobsDrawer();
      pollJobs();
    }
  } catch (err) {
    alert(`Failed to compile master set: ${err.message}`);
  }
}

function showJobsDrawer() {
  el.jobsContainer.classList.remove('hidden');
}

function startJobPolling() {
  setInterval(pollJobs, 2000);
}

async function pollJobs() {
  try {
    const res = await fetch('/api/jobs');
    const data = await res.json();
    const jobs = data.jobs || [];
    state.activeJobs = jobs;

    const active = jobs.filter(j => j.status !== 'completed' && j.status !== 'failed');
    if (active.length > 0) {
      el.jobsContainer.classList.remove('hidden');
      renderJobs(active);
    } else {
      // If we had active jobs previously, refresh library
      if (!el.jobsContainer.classList.contains('hidden') && jobs.length > 0) {
        loadLibrary();
      }
      el.jobsContainer.classList.add('hidden');
    }
  } catch (err) {
    console.warn('Jobs poll failed:', err);
  }
}

function renderJobs(jobs) {
  el.jobsList.innerHTML = '';
  jobs.forEach(job => {
    const item = document.createElement('div');
    item.className = 'job-item';
    item.innerHTML = `
      <div class="job-top">
        <span>${escapeHtml(job.title)}</span>
        <span>${job.progress || 0}%</span>
      </div>
      <div class="job-msg">${escapeHtml(job.message || job.status)}</div>
      <div class="job-bar">
        <div class="job-progress" style="width: ${job.progress || 0}%"></div>
      </div>
    `;
    el.jobsList.appendChild(item);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
