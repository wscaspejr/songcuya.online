let files = [];
let currentIndex = 0;

const audioPlayer = document.getElementById('audioPlayer');
const videoPlayer = document.getElementById('videoPlayer');

document.getElementById('fileInput').addEventListener('change', function(event) {
    files = Array.from(event.target.files);
    currentIndex = 0;
    updatePlaylist();

    if (files.length > 0) {
        playFile(files[currentIndex]);
    }
});

document.getElementById('audioPlayer').addEventListener('ended', function() {
    playNext();
});
document.getElementById('videoPlayer').addEventListener('ended', function() {
    playNext();
});

function playFile(file) {
    const audioPlayer = document.getElementById('audioPlayer');
    const videoPlayer = document.getElementById('videoPlayer');
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith('video');
    if (isVideo) {
        audioPlayer.style.display = 'none';
        videoPlayer.style.display = 'block';
        videoPlayer.src = url;
        videoPlayer.play();
        audioPlayer.pause();
    } else {
        videoPlayer.style.display = 'none'; 
        audioPlayer.style.display = 'block';
        audioPlayer.src = url;
        audioPlayer.play();
        videoPlayer.pause();
    }
    updateMediaInfo(file);
    updatePlaylist();
}
function playNext() {
    if (files.length > 0) {
        currentIndex = (currentIndex + 1) % files.length;
        playFile(files[currentIndex]);
    }
}
function playPrevious() {
    if (files.length > 0) {
        currentIndex = (currentIndex - 1 + files.length) % files.length;
        playFile(files[currentIndex]);
    }
}
function playRandom() {
    if (files.length > 0) {
        currentIndex = Math.floor(Math.random() * files.length);
        playFile(files[currentIndex]);
    }
}
function updateMediaInfo(file) {
    const songInfo = document.getElementById('currentMediaInfo');
    songInfo.textContent = `${file.name}`;
}
function updatePlaylist() {
    const playlist = document.getElementById('playlist');
    playlist.innerHTML = '';
    files.forEach((file, index) => {
        const listItem = document.createElement('li');
        listItem.textContent = file.name;
        if (index === currentIndex) {
            listItem.classList.add('highlight');
            }
        listItem.onclick = () => {
            currentIndex = index;
            playFile(file);
        };
        playlist.appendChild(listItem);
    });
}
