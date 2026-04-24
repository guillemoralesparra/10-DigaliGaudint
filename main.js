// App State & Constants
const PLAN_DURATION_DAYS = 31;
const START_DATE = new Date(2026, 3, 24); // Abril 24, 2026
START_DATE.setHours(0, 0, 0, 0);

let appState = {
  days: []
};

// Elements
const daysCarousel = document.getElementById('days-carousel');
let chartInstance = null;

// Initialize
function initApp() {
  loadState();
  if (appState.days.length === 0) {
    initializeDays();
  }
  
  initChart();
  renderApp();
  scrollToToday();
}

function initializeDays() {
  for (let i = 0; i < PLAN_DURATION_DAYS; i++) {
    const curDate = new Date(START_DATE);
    curDate.setDate(curDate.getDate() + i);
    
    let isSpecial = false;
    let specialTitle = '';
    
    if (i === 16) { // 10 Mayo
      isSpecial = true;
      specialTitle = 'Trail 10K';
    } else if (i === 30) { // 24 Mayo
      isSpecial = true;
      specialTitle = '10K DIR';
    }

    appState.days.push({
      index: i,
      dateObj: curDate.toISOString(),
      dateStr: getFormattedDate(i, curDate),
      status: 'PENDING', // PENDING -> PLANNED -> COMPLETED
      category: null,
      description: null,
      isSpecial: isSpecial,
      specialTitle: specialTitle
    });
  }
  saveState();
}

function loadState() {
  const saved = localStorage.getItem('trainingTrackerV3');
  if (saved) {
    try {
      appState = JSON.parse(saved);
    } catch (e) {
      console.error('Error parsing state', e);
    }
  }
}

function saveState() {
  localStorage.setItem('trainingTrackerV3', JSON.stringify(appState));
}

// Helpers
function getFormattedDate(dayIndex, date) {
  const options = { day: 'numeric', month: 'long' };
  const formatted = date.toLocaleDateString('ca-ES', options);
  return `Dia ${dayIndex + 1}: ${formatted}`;
}

function getTodayIndex() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = today - START_DATE;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 0;
  if (diffDays >= PLAN_DURATION_DAYS) return PLAN_DURATION_DAYS - 1;
  return diffDays;
}

function scrollToToday() {
  const idx = getTodayIndex();
  const card = document.getElementById(`day-card-${idx}`);
  if (card) {
    setTimeout(() => {
      card.scrollIntoView({ behavior: 'smooth', inline: 'center' });
    }, 100);
  }
}

// Chart Logic
function initChart() {
  const ctx = document.getElementById('progressChart').getContext('2d');
  
  const ChartObj = window.Chart;
  if (!ChartObj) return;

  ChartObj.defaults.color = '#e0e0e0';
  ChartObj.defaults.font.family = 'Outfit';

  chartInstance = new ChartObj(ctx, {
    type: 'bar',
    data: getChartData(),
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, display: false }, // Hides the 0, 1 labels
          grid: { color: 'rgba(255,255,255,0.1)' }
        },
        x: { grid: { display: false } }
      }
    }
  });
}

function getChartData() {
  const counts = { 'Correr': 0, 'Pilates': 0, 'Natación': 0, 'Descanso': 0 };
  
  appState.days.forEach(day => {
    if (day.status === 'COMPLETED') {
      if (day.category === 'Correr' || day.category === 'Especial') counts['Correr']++;
      if (day.category === 'Pilates') counts['Pilates']++;
      if (day.category === 'Nadar') counts['Natación']++;
      if (day.category === 'Descansar') counts['Descanso']++;
    }
  });

  return {
    labels: ['Córrer', 'Pilates', 'Natació', 'Descans'],
    datasets: [{
      label: 'Sessions Completades',
      data: [counts['Correr'], counts['Pilates'], counts['Natación'], counts['Descanso']],
      backgroundColor: ['#ff00ff', '#00d2ff', '#00d2ff', 'rgba(255, 255, 255, 0.5)'],
      borderColor: ['#ff1493', '#00ffff', '#00ffff', '#ffffff'],
      borderWidth: 1,
      borderRadius: 5
    }]
  };
}

function updateChart() {
  if (chartInstance) {
    chartInstance.data = getChartData();
    chartInstance.update();
  }
}

// Render Logic
function renderApp() {
  // Update Progress Bar
  const completedCount = appState.days.filter(d => d.status === 'COMPLETED').length;
  const ratio = Math.min(completedCount / PLAN_DURATION_DAYS, 1);
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  if (progressBar) progressBar.style.width = `${ratio * 100}%`;
  if (progressText) progressText.textContent = `Dia ${getTodayIndex() + 1} de ${PLAN_DURATION_DAYS} (${completedCount} completats)`;

  daysCarousel.innerHTML = '';
  
  appState.days.forEach(day => {
    const isToday = (day.index === getTodayIndex());
    const cardEl = document.createElement('div');
    cardEl.className = `glass-panel day-card ${day.status === 'COMPLETED' ? 'status-completed' : ''}`;
    cardEl.id = `day-card-${day.index}`;
    
    let html = `<div class="interaction-date">${day.dateStr} ${isToday ? '(Avui)' : ''}</div>`;

    if (day.status === 'PENDING') {
      html += renderPendingState(day);
    } else if (day.status === 'PLANNED') {
      html += renderPlannedState(day);
    } else if (day.status === 'COMPLETED') {
      html += renderCompletedState(day);
    }

    cardEl.innerHTML = html;
    daysCarousel.appendChild(cardEl);
  });
  
  updateChart();
}

function renderPendingState(day) {
  if (day.isSpecial) {
    const subtitle = day.index === 16 ? 'A donar-ho tot i gaudir.' : 'A volar per l\'asfalt.';
    const titleObj = day.index === 16 ? '⛰️ AVUI ÉS EL TRAIL 10K!' : '🏁 10K DIR!';
    return `
      <div class="special-message">${titleObj}</div>
      <div class="interaction-question">${subtitle}</div>
      <button class="btn btn-pink" style="margin-top:15px; width:100%" onclick="setPlanned(${day.index}, 'Especial', '${day.specialTitle}')">Marcar intenció d'anar-hi</button>
    `;
  }

  return `
    <div class="interaction-question">Què et demana el cos avui?</div>
    <div class="btn-grid" id="main-options-${day.index}">
      <button class="btn btn-pink" onclick="showSubOptions(${day.index})">🏃‍♀️ Córrer</button>
      <button class="btn" onclick="setPlanned(${day.index}, 'Pilates', 'A enfortir aquest core i guanyar flexibilitat! 🧘‍♀️✨')">🧘‍♀️ Pilates</button>
      <button class="btn" onclick="setPlanned(${day.index}, 'Nadar', 'A l\\'aigua, sirena! Desconnecta la ment i relaxa les cames mentre treballes el cardio. 🏊‍♀️🌊')">🏊‍♀️ Nedar</button>
      <button class="btn" onclick="setPlanned(${day.index}, 'Descansar', 'El descans és part de l\\'entrenament. Recarrega piles que t\\'ho has guanyat! 🔋🛋️')">🛋️ Descansar</button>
    </div>
    <div id="sub-options-area-${day.index}"></div>
  `;
}

window.showSubOptions = function(dayIndex) {
  const container = document.getElementById(`sub-options-area-${dayIndex}`);
  if (!container) return;
  
  container.innerHTML = `
    <div class="btn-grid" style="margin-top: 15px;">
      <button class="btn btn-pink" onclick="showTiradaForm(${dayIndex})">📍 Tirada Llarga</button>
      <button class="btn btn-pink" onclick="showSeriesForm(${dayIndex})">⚡ Sèries</button>
    </div>
    <div id="correr-form-area-${dayIndex}"></div>
  `;
};

window.showTiradaForm = function(dayIndex) {
  const area = document.getElementById(`correr-form-area-${dayIndex}`);
  let duradaOptions = '';
  for(let i = 20; i <= 120; i+=5) {
    duradaOptions += `<option value="${i}">${i} minuts</option>`;
  }
  
  let ritmeOptions = '';
  for(let m = 3; m <= 8; m++) {
    for(let s = 0; s < 60; s+=15) {
      if(m===8 && s>0) break; 
      const sStr = s === 0 ? '00' : s;
      ritmeOptions += `<option value="${m}:${sStr}">${m}:${sStr} min/km</option>`;
    }
  }

  area.innerHTML = `
    <div class="form-group">
      <label>Durada de la sessió:</label>
      <select id="tirada-durada-${dayIndex}" class="custom-select">
        ${duradaOptions}
      </select>
    </div>
    <div class="form-group">
      <label>Ritme mitjà:</label>
      <select id="tirada-ritme-${dayIndex}" class="custom-select">
        <option value="" disabled selected>Tria el ritme...</option>
        ${ritmeOptions}
      </select>
    </div>
    <button class="btn btn-success" style="margin-top:15px;" onclick="saveCustomRun(${dayIndex}, 'Tirada Llarga')">Guardar i Planejar</button>
  `;
};

window.showSeriesForm = function(dayIndex) {
  const area = document.getElementById(`correr-form-area-${dayIndex}`);
  let quantitatOptions = '';
  for(let i = 2; i <= 20; i++) {
    quantitatOptions += `<option value="${i}">${i} sèries</option>`;
  }
  
  let ritmeOptions = '';
  for(let m = 3; m <= 6; m++) {
    for(let s = 0; s < 60; s+=5) {
      const sStr = s < 10 ? '0'+s : s;
      ritmeOptions += `<option value="${m}:${sStr}">${m}:${sStr} min/km</option>`;
    }
  }

  area.innerHTML = `
    <div class="form-group">
      <label>Quantitat de Sèries:</label>
      <select id="series-quantitat-${dayIndex}" class="custom-select">
        ${quantitatOptions}
      </select>
    </div>
    <div class="form-group">
      <label>Ritme de la sèrie:</label>
      <select id="series-ritme-${dayIndex}" class="custom-select">
        <option value="" disabled selected>Tria el ritme...</option>
        ${ritmeOptions}
      </select>
    </div>
    <button class="btn btn-success" style="margin-top:15px;" onclick="saveCustomRun(${dayIndex}, 'Sèries')">Guardar i Planejar</button>
  `;
};

window.saveCustomRun = function(dayIndex, tipus) {
  let desc = '';
  if(tipus === 'Tirada Llarga') {
    const durada = document.getElementById(`tirada-durada-${dayIndex}`).value;
    const ritme = document.getElementById(`tirada-ritme-${dayIndex}`).value;
    if(!ritme) return alert('Si us plau esull el ritme.');
    desc = `Tirada Llarga: ${durada} minuts a ${ritme} min/km.`;
  } else {
    const quant = document.getElementById(`series-quantitat-${dayIndex}`).value;
    const ritme = document.getElementById(`series-ritme-${dayIndex}`).value;
    if(!ritme) return alert('Si us plau esull el ritme.');
    desc = `${quant} Sèries a ${ritme} min/km (Escalfament i refredament a part).`;
  }
  
  setPlanned(dayIndex, 'Correr', desc);
};

window.setPlanned = function(dayIndex, category, description) {
  const day = appState.days[dayIndex];
  day.category = category;
  day.description = description;
  day.status = 'PLANNED';
  saveState();
  renderApp();
};

function renderPlannedState(day) {
  const displayCat = day.category === 'Correr' ? 'Córrer' : (day.category === 'Nadar' ? 'Nedar' : (day.category === 'Descansar' ? 'Descans' : day.category));
  return `
    <div class="interaction-question" style="color:var(--neon-pink); font-weight:700;">Planejat: ${displayCat}</div>
    <div class="workout-message ${day.category==='Correr'||day.category==='Especial'?'workout-message-pink':''}">
      ${day.description}
    </div>
    <button class="btn btn-success" onclick="setCompleted(${day.index})">✅ Marcar com a Completat</button>
    <button class="btn btn-reset-day" onclick="resetDay(${day.index})">🔄 Canviar (Resetejar)</button>
  `;
}

window.setCompleted = function(dayIndex) {
  const day = appState.days[dayIndex];
  day.status = 'COMPLETED';
  saveState();
  renderApp();
};

function renderCompletedState(day) {
  return `
    <div class="badge-completed">¡COMPLETAT! 🎉</div>
    <div class="workout-message ${day.category==='Correr'||day.category==='Especial'?'workout-message-pink':''}">
      ${day.description}
    </div>
    <button class="btn btn-reset-day" onclick="resetDay(${day.index})">🔄 Desfer / Canviar</button>
  `;
}

window.resetDay = function(dayIndex) {
  const day = appState.days[dayIndex];
  day.status = 'PENDING';
  day.category = null;
  day.description = null;
  saveState();
  renderApp();
}

// Run
document.addEventListener('DOMContentLoaded', initApp);
