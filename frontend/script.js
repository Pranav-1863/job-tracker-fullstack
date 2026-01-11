let applications = [];
let editingIndex = null;

const form = document.getElementById("jobForm");
const list = document.getElementById("applicationsList");
const searchInput = document.getElementById("searchInput");
const submitBtn = document.getElementById("submitBtn");
const cancelBtn = document.getElementById("cancelBtn");

loadApplications();

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

async function loadApplications() {
  try {
    const response = await fetch('/api/applications', {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    applications = data;
    displayApplications();
    updateStats();
  } catch (err) {
    console.error('Error loading applications:', err);
  }
}

form.addEventListener('submit', async function(e) {
  e.preventDefault();

  const company = document.getElementById("company").value;
  const position = document.getElementById("position").value;
  const date = document.getElementById("date").value;
  const status = document.getElementById("status").value;

  const application = {
    company: company,
    position: position,
    date: date,
    status: status
  };

  if (editingIndex !== null) {
    const app = applications[editingIndex];
    try {
      const response = await fetch(`/api/applications/${app.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(application)
      });
      const updatedApp = await response.json();
      applications[editingIndex] = updatedApp;
      editingIndex = null;
      submitBtn.textContent = 'Add Application';
      cancelBtn.style.display = 'none';
    } catch (err) {
      console.error('Error updating application:', err);
    }
  } else {
    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(application)
      });
      const newApp = await response.json();
      applications.push(newApp);
    } catch (err) {
      console.error('Error adding application:', err);
    }
  }

  displayApplications();
  updateStats();
  form.reset();
});

cancelBtn.addEventListener('click', function() {
  editingIndex = null;
  submitBtn.textContent = "Add Application";
  cancelBtn.style.display = 'none';
  form.reset();
});

searchInput.addEventListener('input', function() {
  displayApplications();
});

function displayApplications() {
  list.innerHTML = '';

  const searchTerm = searchInput.value.toLowerCase();

  const filtered = applications.filter(function(app) {
    const companyMatch = app.company ? app.company.toLowerCase().includes(searchTerm) : false;
    const positionMatch = app.position ? app.position.toLowerCase().includes(searchTerm) : false;
    return companyMatch || positionMatch;
  });

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state">No applications found. Start tracking your job search! 🚀</div>`;
    return;
  }

  filtered.forEach(function(app) {
    const appDiv = document.createElement('div');
    appDiv.className = 'application-item';

    let statusClass = 'status-applied';
    if (app.status === 'Interview Scheduled') statusClass = 'status-interview';
    if (app.status === 'Rejected') statusClass = 'status-rejected';
    if (app.status === 'Offer') statusClass = 'status-offer';

    appDiv.innerHTML = `
      <div class="app-header">
        <div>
          <div class="app-title">${app.company}</div>
          <div class="app-position">${app.position}</div>
        </div>
      </div>
      <div class="app-details">
        📅 Applied: ${formatDate(app.date)} | 
        <span class="status-badge ${statusClass}">${app.status}</span>
      </div>
      <div class="app-actions">
        <button class="btn-edit" onclick="editApplication(${app.id})">✏️ Edit</button>
        <button class="btn-delete" onclick="deleteApplication(${app.id})">🗑️ Delete</button>
      </div>
    `;

    list.appendChild(appDiv);
  });
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const options = {year: 'numeric', month: 'short', day: 'numeric'};
  return date.toLocaleDateString('en-US', options);
}

function editApplication(id) {
  const app = applications.find(a => a.id === id);
  const index = applications.findIndex(a => a.id === id);

  document.getElementById('company').value = app.company;
  document.getElementById('position').value = app.position;
  document.getElementById('date').value = app.date;
  document.getElementById('status').value = app.status;

  editingIndex = index;
  submitBtn.textContent = 'Update Application';
  cancelBtn.style.display = 'inline-block';

  form.scrollIntoView({behavior: 'smooth'});
}

async function deleteApplication(id) {
  if (confirm('Are you sure you want to delete this application?')) {
    try {
      await fetch(`/api/applications/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      applications = applications.filter(app => app.id !== id);
      displayApplications();
      updateStats();
    } catch (err) {
      console.error('Error deleting applications:', err);
    }
  }
}

function updateStats() {
  const statsDiv = document.getElementById('stats');

  const total = applications.length;
  const applied = applications.filter(app => app.status === 'Applied').length;
  const interviews = applications.filter(app => app.status === 'Interview Scheduled').length;
  const offers = applications.filter(app => app.status === 'Offer').length;

  statsDiv.innerHTML = `
    <div class="stat-card">
      <div class="stat-number">${total}</div>
      <div class="stat-label">Total Applications</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${applied}</div>
      <div class="stat-label">Applied</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${interviews}</div>
      <div class="stat-label">Interviews</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${offers}</div>
      <div class="stat-label">Offers</div>
    </div>
  `;
}

async function logout() {
  localStorage.removeItem('token');
  window.location.href = 'login.html';
}