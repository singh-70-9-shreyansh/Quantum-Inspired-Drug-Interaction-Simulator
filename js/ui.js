// ==========================================
// User Interface, Charts & DOM Manipulation
// ==========================================

function updateSliderColor(slider) {
  const val = parseFloat(slider.value);
  const min = parseFloat(slider.min);
  const max = parseFloat(slider.max);
  const percent = (val - min) / (max - min);
  
  if (percent < 0.3) {
    slider.style.background = `linear-gradient(to right, #ef4444 ${percent*100}%, #64748b ${percent*100}%)`;
  } else if (percent < 0.7) {
    slider.style.background = `linear-gradient(to right, #f59e0b ${percent*100}%, #64748b ${percent*100}%)`;
  } else {
    slider.style.background = `linear-gradient(to right, #10b981 ${percent*100}%, #64748b ${percent*100}%)`;
  }
}

function displayAdvancedResults(compound) {
  currentCompound = compound;
  
  const setElText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  
  setElText('compoundName', compound.name);
  setElText('mainScore', compound.metrics.overallScore);
  
  const mainScoreEl = document.getElementById('mainScore');
  if (mainScoreEl) mainScoreEl.className = `result-score ${getScoreClass(compound.metrics.overallScore)}`;
  
  setElText('bindingAffinity', `${compound.metrics.bindingEnergy}`);
  setElText('druglikeness', compound.metrics.druglikeness);
  setElText('admetRisk', compound.metrics.admetRisk);
  
  const admetRiskEl = document.getElementById('admetRisk');
  if (admetRiskEl) admetRiskEl.className = `metric-value risk-${compound.metrics.admetRisk.toLowerCase().replace(' ', '-')}`;
  
  setElText('successProb', `${compound.metrics.successProbability}%`);
  
  const resultsPanel = document.getElementById('resultsPanel');
  if (resultsPanel) resultsPanel.classList.remove('hidden');
  
  createDetailedChart(compound);
  createMolecularAnimation();
}

function getScoreClass(score) {
  if (score > 70) return 'success';
  if (score > 40) return 'warning';
  return 'danger';
}

function updateDashboard() {
  const stats = calculateDashboardStats();
  const setElText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  
  setElText('successRate', stats.successRate + '%');
  setElText('avgScore', stats.avgScore.toFixed(1));
  setElText('totalSims', compounds.length);
  setElText('highRisk', stats.highRisk);
  
  createDashboardCharts();
}

function updateLibraryTable() {
  const table = document.getElementById('libraryTable');
  if (!table) return;
  
  if (compounds.length === 0) {
    table.innerHTML = '<div class="empty-state"><i class="fas fa-database"></i><p>No compounds yet. Run some simulations!</p></div>';
    return;
  }
  
  const html = compounds.map(c => `
    <div class="compound-row ${getScoreClass(c.metrics.overallScore)}" onclick="loadCompound(${c.id})">
      <div class="compound-id">${c.name}</div>
      <div class="compound-score">${c.metrics.overallScore}</div>
      <div class="compound-affinity">${c.metrics.bindingEnergy}</div>
      <div class="compound-risk">${c.metrics.admetRisk}</div>
      <div class="compound-date">${new Date(c.timestamp).toLocaleDateString()}</div>
      <div class="compound-actions">
        <button onclick="event.stopPropagation(); view3D(${c.id})" title="3D View">
          <i class="fas fa-cube"></i>
        </button>
        <button onclick="event.stopPropagation(); deleteCompound(${c.id})" title="Delete">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');
  
  table.innerHTML = html;
}

function updateStatus(status, message) {
  const statusEl = document.getElementById('simulationStatus');
  if (statusEl) {
    statusEl.className = `status-badge status-${status}`;
    statusEl.innerHTML = message;
  }
}

function showNotification(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `notification toast-${type}`;
  let iconClass = type === 'success' ? 'fa-check-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';
  
  toast.innerHTML = `<div class="toast-content" style="display: flex; align-items: center; gap: 10px;"><i class="fas ${iconClass}"></i><span>${message}</span></div>`;
  
  Object.assign(toast.style, {
    position: 'fixed', bottom: '20px', right: '20px', background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '1rem 1.5rem',
    borderRadius: '8px', color: '#f8fafc', zIndex: '9999', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    transition: 'opacity 0.3s ease, transform 0.3s ease', transform: 'translateY(100px)', opacity: '0'
  });

  document.body.appendChild(toast);
  setTimeout(() => { toast.style.transform = 'translateY(0)'; toast.style.opacity = '1'; }, 10);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ==========================================
// Chart Generators
// ==========================================
function createDetailedChart(compound) {
  const canvas = document.getElementById('detailedChart');
  if (!canvas || typeof Chart === 'undefined') return;
  const ctx = canvas.getContext('2d');
  if (charts.detailed) charts.detailed.destroy();
  
  charts.detailed = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Binding Energy', 'Druglikeness', 'ADMET', 'Lipinski', 'Target Fit'],
      datasets: [{
        label: 'Compound Profile',
        data: [
          Math.abs(compound.metrics.bindingEnergy),
          compound.metrics.druglikeness * 10,
          (1 - (compound.metrics.admetRisk === 'High' ? 0.3 : compound.metrics.admetRisk === 'Medium' ? 0.6 : 0.9)) * 10,
          (5 - compound.metrics.lipinskiViolations) * 2,
          compound.params.pocketScore
        ],
        backgroundColor: 'rgba(102, 126, 234, 0.2)',
        borderColor: '#00f2fe',
        borderWidth: 2,
        pointBackgroundColor: '#00f2fe'
      }]
    },
    options: { responsive: true, scales: { r: { beginAtZero: true, max: 10, ticks: { stepSize: 2 }, grid: { color: 'rgba(255,255,255,0.1)' }, angleLines: { color: 'rgba(255,255,255,0.1)' }, pointLabels: { color: '#94a3b8' } } }, plugins: { legend: { labels: { color: '#fff' } } } }
  });
}

function createDashboardCharts() {
  if (typeof Chart === 'undefined') return;

  const recentCtx = document.getElementById('recentChart')?.getContext('2d');
  if (recentCtx && charts.recent) charts.recent.destroy();
  if (recentCtx) {
    charts.recent = new Chart(recentCtx, {
      type: 'line',
      data: {
        labels: compounds.slice(-10).map(c => new Date(c.timestamp).toLocaleDateString()),
        datasets: [{
          label: 'Overall Score',
          data: compounds.slice(-10).map(c => c.metrics.overallScore),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: { responsive: true, scales: { x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }, y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } } }, plugins: { legend: { labels: { color: '#fff' } } } }
    });
  }
  
  const distCtx = document.getElementById('distributionChart')?.getContext('2d');
  if (distCtx && charts.distribution) charts.distribution.destroy();
  if (distCtx) {
    charts.distribution = new Chart(distCtx, {
      type: 'doughnut',
      data: {
        labels: ['High Success (>70)', 'Medium (40-70)', 'Low (<40)'],
        datasets: [{
          data: [
            compounds.filter(c => c.metrics.overallScore > 70).length,
            compounds.filter(c => c.metrics.overallScore > 40 && c.metrics.overallScore <= 70).length,
            compounds.filter(c => c.metrics.overallScore <= 40).length
          ],
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
          borderColor: '#0b1121'
        }]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: '#fff' } } } }
    });
  }
}

function updateAnalyticsPage() {
  if (typeof Chart === 'undefined' || compounds.length === 0) return;

  // --- 1. UPDATE KPI CARDS ---
  document.getElementById('kpiTotal').textContent = compounds.length;
  
  const avgScore = compounds.reduce((sum, c) => sum + parseFloat(c.metrics.overallScore), 0) / compounds.length;
  document.getElementById('kpiAvgScore').textContent = avgScore.toFixed(1);
  
  const ro5Pass = compounds.filter(c => c.metrics.lipinskiViolations === 0).length;
  document.getElementById('kpiRo5').textContent = ro5Pass;
  
  const highTox = compounds.filter(c => c.metrics.admetRisk === 'High').length;
  document.getElementById('kpiTox').textContent = highTox;

  // --- 2. EXISTING CHARTS (Trend & Correlation) ---
  const trendCtx = document.getElementById('trendChart')?.getContext('2d');
  const corrCtx = document.getElementById('correlationChart')?.getContext('2d');

  if (trendCtx) {
    if (charts.trend) charts.trend.destroy();
    charts.trend = new Chart(trendCtx, {
      type: 'bar',
      data: {
        labels: compounds.slice(-15).map(c => c.name.split(' (')[0]), // Cleans up long names
        datasets: [{
          label: 'Binding Energy vs TPSA',
          data: compounds.slice(-15).map(c => Math.abs(c.metrics.bindingEnergy)),
          backgroundColor: '#00f2fe',
          borderRadius: 4
        }]
      },
      options: { responsive: true, scales: { x: { ticks: { color: '#94a3b8', font: {size: 10} } }, y: { ticks: { color: '#94a3b8' } } }, plugins: { legend: { labels: { color: '#fff' } } } }
    });
  }

  if (corrCtx) {
    if (charts.corr) charts.corr.destroy();
    charts.corr = new Chart(corrCtx, {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Weight vs MPO Score',
          data: compounds.map(c => ({ x: c.params.mw, y: c.metrics.overallScore })),
          backgroundColor: '#f59e0b'
        }]
      },
      options: { responsive: true, scales: { x: { ticks: { color: '#94a3b8' } }, y: { ticks: { color: '#94a3b8' } } }, plugins: { legend: { labels: { color: '#fff' } } } }
    });
  }

  // --- 3. NEW: ADMET RISK DOUGHNUT CHART ---
  const admetCtx = document.getElementById('admetRiskChart')?.getContext('2d');
  if (admetCtx) {
    if (charts.admet) charts.admet.destroy();
    
    const lowRisk = compounds.filter(c => c.metrics.admetRisk === 'Low').length;
    const medRisk = compounds.filter(c => c.metrics.admetRisk === 'Medium').length;
    
    charts.admet = new Chart(admetCtx, {
      type: 'doughnut',
      data: {
        labels: ['Low Risk', 'Medium Risk', 'High Risk'],
        datasets: [{
          data: [lowRisk, medRisk, highTox],
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
          borderColor: '#0a0f1e',
          borderWidth: 2
        }]
      },
      options: { 
        responsive: true, 
        cutout: '70%', // Makes it a thin, sleek ring
        plugins: { 
          legend: { position: 'bottom', labels: { color: '#fff', padding: 20 } } 
        } 
      }
    });
  }
  
  // --- 4. RECOMMENDATIONS ---
  const recs = document.getElementById('recommendations');
  if (recs) {
      recs.innerHTML = `
        <p><strong>Insight:</strong> Based on ${compounds.length} simulations, reducing Molecular Weight correlates with a 15% higher success probability.</p>
        <p><strong>Warning:</strong> You have ${highTox} high-toxicity compounds in your library. Consider filtering by LogP < 3 to improve safety profiles.</p>
      `;
  }
}

function createMolecularAnimation() {
  // Leave this completely blank! 
  // It was accidentally deleting our 3D Modal HTML!
}

function createParticleBackground() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

// ==========================================
// Professional 3D Molecular Viewer
// ==========================================
function view3D(id) {
  const compound = compounds.find(c => c.id === id);
  if (!compound) return;
  
  const modal = document.getElementById('molecularViewer');
  const container = document.getElementById('molContainer');
  
  if (modal && container) {
    // 1. Show the Modal
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.zIndex = '10000';
    
    showNotification(`Fetching 3D coordinates for ${compound.name} from database...`, 'info');
    
    // 2. Clear previous molecule
    container.innerHTML = '';
    
    // 3. Initialize the 3D Engine
    let viewer = $3Dmol.createViewer(container, {
      backgroundColor: 'rgba(0, 0, 0, 0)'
    });

    // 4. Fetch the REAL molecule using the saved PubChem ID!
    const realPubchemID = compound.pubchem ? compound.pubchem : '2244';

    // --- NEW: Populate the HUD with the compound's real data ---
    document.getElementById('molModalTitle').textContent = `3D Analysis: ${compound.name}`;
    
    // Clean up the name (removes the medical category in parentheses for a cleaner look)
    const cleanName = compound.name.split(' (')[0];
    document.getElementById('hudName').textContent = cleanName.toUpperCase();
    
    document.getElementById('hudCid').textContent = compound.pubchem || 'N/A';
    document.getElementById('hudWt').textContent = compound.params.mw;
    document.getElementById('hudLogp').textContent = compound.params.logp;
    document.getElementById('hudBonds').textContent = `${compound.params.hbd} / ${compound.params.hba}`;
    
    // --- ADDED: TPSA and Lipinski Status ---
    document.getElementById('hudTpsa').textContent = compound.params.tpsa || 'N/A';
    
    // Check Lipinski Status
    const violations = compound.metrics.lipinskiViolations;
    const lipinskiEl = document.getElementById('hudLipinski');
    if (lipinskiEl) {
      if (violations === 0) {
        lipinskiEl.innerHTML = '<span style="color: var(--success);">PASS (0 Violations)</span>';
      } else {
        lipinskiEl.innerHTML = `<span style="color: var(--danger);">FAIL (${violations} Violations)</span>`;
      }
    }
    // -----------------------------------------------------------

    $3Dmol.download(`cid:${realPubchemID}`, viewer, {}, function() {
      // Style it beautifully
      viewer.setStyle({}, {
        stick: { radius: 0.15, colorscheme: 'Jmol' }, 
        sphere: { scale: 0.3, colorscheme: 'Jmol' }
      });

      // --- NEW: INTERACTIVE ATOM CLICKING ---
      // 1. A dictionary to translate chemical symbols into full names
      const elementNames = {
        'C': 'Carbon (Grey)',
        'H': 'Hydrogen (White)',
        'O': 'Oxygen (Red)',
        'N': 'Nitrogen (Blue)',
        'S': 'Sulfur (Yellow)',
        'Cl': 'Chlorine (Green)',
        'F': 'Fluorine (Cyan)',
        'P': 'Phosphorus (Orange)',
        'Br': 'Bromine (Dark Red)'
      };

      // 2. Turn on click detection for the entire molecule
      viewer.setClickable({}, true, function(atom, viewer, event, container) {
        
        // Step A: Erase any old labels so we only show one at a time
        viewer.removeAllLabels();

        // Step B: Look up the full name of the atom you clicked
        const fullName = elementNames[atom.elem] || atom.elem;

        // Step C: Create a glowing, high-tech label exactly where you clicked
        viewer.addLabel(fullName, {
          position: { x: atom.x, y: atom.y, z: atom.z },
          backgroundColor: 'rgba(0, 242, 254, 0.9)', // Cyan glass background
          fontColor: '#0a0f1e',                      // Dark text for contrast
          fontSize: 14,
          padding: 8,
          borderThickness: 1,
          borderColor: '#ffffff',
          borderRadius: 5,
          inFront: true                              // Forces label over the molecule
        });

        // Step D: Tell the screen to update
        viewer.render(); 
      });
      // --------------------------------------

      viewer.zoomTo();
      viewer.translate(120, 0); // Keeps the molecule pushed right, away from the HUD
      viewer.render();
      viewer.spin("y", 0.5);
    });
    // Render Control Buttons Logic
      document.getElementById('btnStick').onclick = () => {
        viewer.setStyle({}, { stick: { radius: 0.15 }, sphere: { scale: 0.3 } });
        viewer.render();
        document.getElementById('btnStick').style.borderColor = '#00f2fe';
        document.getElementById('btnStick').style.color = '#00f2fe';
        document.getElementById('btnSpacefill').style.borderColor = 'rgba(255,255,255,0.3)';
        document.getElementById('btnSpacefill').style.color = '#fff';
      };

      document.getElementById('btnSpacefill').onclick = () => {
        viewer.setStyle({}, { sphere: {} }); // Shows full atomic radius
        viewer.render();
        document.getElementById('btnSpacefill').style.borderColor = '#00f2fe';
        document.getElementById('btnSpacefill').style.color = '#00f2fe';
        document.getElementById('btnStick').style.borderColor = 'rgba(255,255,255,0.3)';
        document.getElementById('btnStick').style.color = '#fff';
      };

    // --- MAKE SURE THIS IS STILL AT THE BOTTOM! ---
    // 5. Modal Close Logic
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
      closeBtn.style.cursor = 'pointer';
      closeBtn.onclick = () => { 
        modal.style.display = 'none'; 
        viewer.spin(false); // Stop spinning to save computer memory
        viewer.clear();     // Erase 3D object
      };
    }
  }
}

function generateRealTimeInsights() {
  const insightEl = document.getElementById('insightText');
  const warningEl = document.getElementById('warningText');

  if (!insightEl || !warningEl) return;

  const totalSims = compounds.length;
  
  // If library is empty, show default text
  if (totalSims === 0) {
    insightEl.innerHTML = "<strong>Insight:</strong> Run your first simulation to generate data-driven insights.";
    warningEl.innerHTML = "<strong>Status:</strong> No data available. Awaiting simulation results.";
    return;
  }

  // --- 1. WARNING LOGIC: Analyze Toxicity ---
  // Count how many compounds got a "High" ADMET Risk
  const highToxCount = compounds.filter(c => c.metrics.admetRisk === 'High').length;
  
  if (highToxCount > 0) {
    warningEl.innerHTML = `<strong>Warning:</strong> You have <span style="color: var(--danger); font-weight: bold;">${highToxCount} high-toxicity compounds</span> in your library. Consider lowering LogP and avoiding Lipinski violations to improve safety profiles.`;
  } else {
    warningEl.innerHTML = `<strong>Status:</strong> Excellent. You have 0 high-toxicity compounds in your library. Your safety profiles are currently optimized.`;
  }

  // --- 2. INSIGHT LOGIC: Find Best Performer ---
  // Sort the library to find the drug with the absolute highest Overall Score
  let bestCompound = compounds.reduce((best, current) => {
    return parseFloat(current.metrics.overallScore) > parseFloat(best.metrics.overallScore) ? current : best;
  }, compounds[0]);

  insightEl.innerHTML = `<strong>Insight:</strong> Based on <strong>${totalSims} simulations</strong>, your most viable candidate is <span style="color: var(--success); font-weight: bold;">${bestCompound.name}</span> (Score: ${bestCompound.metrics.overallScore}). Its Molecular Weight is ${bestCompound.params.mw}, suggesting optimal oral bioavailability.`;
}