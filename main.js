// App State & Constants
const PLAN_DURATION_DAYS = 30;
const START_DATE = new Date(2026, 3, 25); // Abril 25, 2026
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
    
    if (i === 15) { // 10 Mayo
      isSpecial = true;
      specialTitle = 'Trail 10K';
    } else if (i === 29) { // 24 Mayo
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
  const saved = localStorage.getItem('trainingTrackerV2');
  if (saved) {
    try {
      appState = JSON.parse(saved);
    } catch (e) {
      console.error('Error parsing state', e);
    }
  }
}

function saveState() {
  localStorage.setItem('trainingTrackerV2', JSON.stringify(appState));
}

// Helpers
function getFormattedDate(dayIndex, date) {
  const options = { day: 'numeric', month: 'long' };
  const formatted = date.toLocaleDateString('es-ES', options);
  return `Día ${dayIndex + 1}: ${formatted}`;
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
          ticks: { stepSize: 1 },
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
    labels: ['Correr', 'Pilates', 'Natación', 'Descanso'],
    datasets: [{
      label: 'Sesiones Completadas',
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
  daysCarousel.innerHTML = '';
  
  appState.days.forEach(day => {
    const isToday = (day.index === getTodayIndex());
    const cardEl = document.createElement('div');
    cardEl.className = `glass-panel day-card ${day.status === 'COMPLETED' ? 'status-completed' : ''}`;
    cardEl.id = `day-card-${day.index}`;
    
    let html = `<div class="interaction-date">${day.dateStr} ${isToday ? '(Hoy)' : ''}</div>`;

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
    const subtitle = day.index === 15 ? 'A darlo todo y disfrutar.' : 'A volar por el asfalto.';
    const titleObj = day.index === 15 ? '⛰️ ¡HOY ES EL TRAIL 10K!' : '🏁 ¡10K DIR!';
    return `
      <div class="special-message">${titleObj}</div>
      <div class="interaction-question">${subtitle}</div>
      <button class="btn btn-pink" style="margin-top:15px; width:100%" onclick="setPlanned(${day.index}, 'Especial', '${day.specialTitle}')">Marcar intención de ir</button>
    `;
  }

  return `
    <div class="interaction-question">¿Qué te pide el cuerpo hoy?</div>
    <div class="btn-grid" id="main-options-${day.index}">
      <button class="btn btn-pink" onclick="showSubOptions(${day.index})">🏃‍♀️ Correr</button>
      <button class="btn" onclick="setPlanned(${day.index}, 'Pilates', '¡A fortalecer ese core y ganar flexibilidad! 🧘‍♀️✨')">🧘‍♀️ Pilates</button>
      <button class="btn" onclick="setPlanned(${day.index}, 'Nadar', '¡Al agua, sirena! Desconecta la mente y relaja las piernas mientras trabajas el cardio. 🏊‍♀️🌊')">🏊‍♀️ Nadar</button>
      <button class="btn" onclick="setPlanned(${day.index}, 'Descansar', 'El descanso es parte del entrenamiento. ¡Recarga pilas que te lo has ganado! 🔋🛋️')">🛋️ Descansar</button>
    </div>
    <div id="sub-options-area-${day.index}"></div>
  `;
}

window.showSubOptions = function(dayIndex) {
  const container = document.getElementById(`sub-options-area-${dayIndex}`);
  if (!container) return;
  
  const suaveDesc = 'Rodaje disfrutón: 40-45 min en Z2 (5:30 min/km). ¡A sumar kilómetros con una sonrisa!';
  const medioDesc = 'Cambios de ritmo: 15 min Z2 (5:30) + 4 x (3 min Z3 @ 5:00 + 2 min Z2) + 10 min suaves.';
  const fuerteDesc = 'Series picantes: 15 min calentamiento + 6 x 400m en Z4 (4:30 min/km, rec. 90") + 10 min enfriamiento.';

  container.innerHTML = `
    <div class="btn-grid-3" style="margin-top: 15px;">
      <button class="btn btn-pink" onclick="setPlanned(${dayIndex}, 'Correr', 'Correr (Suave): ${suaveDesc}')">Suave</button>
      <button class="btn btn-pink" onclick="setPlanned(${dayIndex}, 'Correr', 'Correr (Medio): ${medioDesc}')">Medio</button>
      <button class="btn btn-pink" onclick="setPlanned(${dayIndex}, 'Correr', 'Correr (Fuerte): ${fuerteDesc}')">Fuerte</button>
    </div>
  `;
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
  return `
    <div class="interaction-question" style="color:var(--neon-pink); font-weight:700;">Planeado: ${day.category}</div>
    <div class="workout-message ${day.category==='Correr'||day.category==='Especial'?'workout-message-pink':''}">
      ${day.description}
    </div>
    <button class="btn btn-success" onclick="setCompleted(${day.index})">✅ Marcar como Completado</button>
    <button class="btn btn-reset-day" onclick="resetDay(${day.index})">🔄 Cambiar (Resetear)</button>
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
    <div class="badge-completed">¡COMPLETADO! 🎉</div>
    <div class="workout-message ${day.category==='Correr'||day.category==='Especial'?'workout-message-pink':''}">
      ${day.description}
    </div>
    <button class="btn btn-reset-day" onclick="resetDay(${day.index})">🔄 Deshacer / Cambiar</button>
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
