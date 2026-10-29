// Shared loading/rendering logic for the artist selection pages
async function fetchArtists() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(mockArtists);
        }, 1500);
    });
}

function getArtistsByCategory(category) {
    return mockArtists.filter(artist => {
        // กรองตามหมวดหมู่
        const categoryMatch = artist.category === category;
        // กรองเฉพาะศิลปินที่มีเพลง
        const hasSongs = artistSongs[artist.id] && artistSongs[artist.id].length > 0;
        return categoryMatch && hasSongs;
    });
}

async function loadArtists() {
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const artistsGrid = document.getElementById('artistsGrid');

    loadingState.style.display = 'flex';
    errorState.style.display = 'none';
    artistsGrid.style.display = 'none';

    try {
        const allArtists = await fetchArtists();

        // ตรวจสอบหมวดหมู่จากชื่อไฟล์
        const category = window.location.pathname.includes('thai-pop') ? 'thai-pop' : 
                         window.location.pathname.includes('rock') ? 'rock' :
                         window.location.pathname.includes('pop') ? 'pop' : 'international';
        
        const artists = getArtistsByCategory(category);

        loadingState.style.display = 'none';
        artistsGrid.style.display = 'grid';

        renderArtists(artists);

    } catch (error) {
        console.error('Error loading artists:', error);

        loadingState.style.display = 'none';
        errorState.style.display = 'block';
    }
}

function renderArtists(artists) {
    const artistsGrid = document.getElementById('artistsGrid');

    artistsGrid.innerHTML = artists.map(artist => `
        <a href="#" class="artist-card" data-artist-id="${artist.id}">
            <div class="artist-image-container">
                <img
                    src="${artist.image}"
                    alt="${artist.name}"
                    class="artist-image"
                    loading="lazy"
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                >
                <div class="artist-fallback" style="display: none;">
                    ${artist.name.charAt(0)}
                </div>
            </div>
            <h3 class="artist-name">${artist.name}</h3>
        </a>
    `).join('');

    artistsGrid.querySelectorAll('.artist-card').forEach(card => {
        card.addEventListener('click', (e) => {
            e.preventDefault();
            const artistId = card.getAttribute('data-artist-id');
            window.location.href = `game.html?artist=${artistId}`;
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadArtists();
});
