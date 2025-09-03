// Mobile sidebar toggle
const sidebar = document.querySelector('.sidebar');
const overlay = document.getElementById('mobileOverlay');

function toggleMenu() {
  sidebar.classList.toggle('active');
  overlay.classList.toggle('active');
}

// Close sidebar on overlay click
overlay.addEventListener('click', () => {
  sidebar.classList.remove('active');
  overlay.classList.remove('active');
});

// Profile modal toggle
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const cancelSettings = document.getElementById('cancelSettings');

settingsBtn.addEventListener('click', () => {
  settingsModal.style.display = 'flex';
});

cancelSettings.addEventListener('click', () => {
  settingsModal.style.display = 'none';
});

// Profile picture upload
const profilePic = document.getElementById('profilePic');
const fileInput = document.getElementById('fileInput');
const changePicBtn = document.getElementById('changePicBtn');

changePicBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if(file) {
    const reader = new FileReader();
    reader.onload = () => profilePic.src = reader.result;
    reader.readAsDataURL(file);
  }
});

// Display current date
const dateEl = document.getElementById('date');
const options = { weekday:'long', year:'numeric', month:'long', day:'numeric' };
dateEl.textContent = new Date().toLocaleDateString('en-US', options);
