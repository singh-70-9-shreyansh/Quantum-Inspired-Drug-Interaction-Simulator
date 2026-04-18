// ==========================================
// Initialization & Core App Logic
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
  initApp();
  setupEventListeners();
  updateDashboard();
  startLoadingAnimation();
});

function startLoadingAnimation() {
  const progress = document.querySelector('.loading-progress');
  if (!progress) return;
  let width = 0;
  const interval = setInterval(() => {
    width += Math.random() * 5;
    if (width >= 95) {
      clearInterval(interval);
      setTimeout(() => {
        const screen = document.getElementById('loadingScreen');
        if (screen) screen.style.opacity = '0';
        setTimeout(() => { if (screen) screen.style.display = 'none'; }, 500);
      }, 500);
    } else {
      progress.style.width = width + '%';
    }
  }, 100);
}

function initApp() {
  setupRangeSliders();
  updateLibraryTable();
  createParticleBackground();
  setupNavigation();
  loadDatabase(); // Add this line to load the Kaggle data!
}

// Add this brand new function right underneath initApp():
async function loadDatabase() {
  try {
    const response = await fetch('assets/data/kaggle_drugs.json');
    drugDatabase = await response.json();
    console.log(`Successfully loaded ${drugDatabase.length} real compounds from database!`);
  } catch (error) {
    console.error("Could not load database. Make sure you are running Live Server!", error);
  }
}

function setupEventListeners() {
  const inputs = ['logp', 'mw', 'hbd', 'hba', 'tpsa', 'pocketScore', 'hydrophobicity', 'flexibility', 'chargeComp'];
  inputs.forEach(id => {
    const slider = document.getElementById(id);
    const valueSpan = document.getElementById(id + 'Value');
    if (slider && valueSpan) {
      slider.addEventListener('input', () => { valueSpan.textContent = slider.value; });
    }
  });

  const searchInput = document.getElementById('searchCompounds');
  const filterSelect = document.getElementById('filterStatus');
  if (searchInput) searchInput.addEventListener('input', filterLibrary);
  if (filterSelect) filterSelect.addEventListener('change', filterLibrary);
}

function setupNavigation() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.getAttribute('href').substring(1);
      switchPage(target);
    });
  });
}

function switchPage(pageId) {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
  
  const targetPage = document.getElementById(pageId);
  const targetLink = document.querySelector(`[href="#${pageId}"]`);
  
  if (targetPage) targetPage.classList.add('active');
  if (targetLink) targetLink.classList.add('active');

  if (pageId === 'analytics') {
    updateAnalyticsPage();
  }
}

function setupRangeSliders() {
  const sliders = document.querySelectorAll('input[type="range"]');
  sliders.forEach(slider => {
    const valueSpan = document.getElementById(slider.id + 'Value');
    if (valueSpan) valueSpan.textContent = slider.value;
    
    updateSliderColor(slider);
    slider.addEventListener('input', function() {
      if (valueSpan) valueSpan.textContent = this.value;
      updateSliderColor(this);
    });
  });
}

function runAdvancedSimulation() {
  updateStatus('running', '🧬 Running quantum simulation...');
  
  setTimeout(() => {
    const params = getSimulationParams();
    const results = calculateAdvancedMetrics(params);
    displayAdvancedResults(results);
    updateStatus('success', 'Simulation complete!');
    saveToHistory(results);
    updateDashboard();
  }, 2000);
}
function quickScreen() {
  if (drugDatabase.length > 0) {
    // 1. Pick a random real drug from the database
    const randomIndex = Math.floor(Math.random() * drugDatabase.length);
    const drug = drugDatabase[randomIndex];
    activeDrugName = drug.name; // <--- ADD THIS LINE
    activePubchemId = drug.pubchem; // <--- ADD THIS LINE!
    
    // 2. Load its exact chemical properties into the UI
    document.getElementById('logp').value = drug.logp;
    document.getElementById('mw').value = drug.mw;
    document.getElementById('hbd').value = drug.hbd;
    document.getElementById('hba').value = drug.hba;
    document.getElementById('tpsa').value = drug.tpsa;
    
    // Target properties stay randomized to simulate testing against different diseases
    document.getElementById('pocketScore').value = (Math.random() * (10 - 5) + 5).toFixed(1);
    document.getElementById('hydrophobicity').value = (Math.random() * 10).toFixed(1);
    document.getElementById('flexibility').value = (Math.random() * 5).toFixed(1);
    document.getElementById('chargeComp').value = (Math.random() * 10).toFixed(1);
    
    showNotification(`🧪 Extracted ${drug.name} from Kaggle Database`, 'info');
    
  } else {
    showNotification("Database not loaded yet. Using random generation.", "warning");
  }

  // 3. Visually update all the sliders on the screen
  document.querySelectorAll('input[type="range"]').forEach(slider => {
    const valueSpan = document.getElementById(slider.id + 'Value');
    if (valueSpan) valueSpan.textContent = slider.value;
    updateSliderColor(slider);
  });
  
  // 4. Run the simulation!
  runAdvancedSimulation();
}

function saveCompound() {
  if (currentCompound && !compounds.find(c => c.id === currentCompound.id)) {
    compounds.unshift(currentCompound);
    localStorage.setItem('quantumRxCompounds', JSON.stringify(compounds));
    updateLibraryTable();
    showNotification('Compound saved to library!', 'success');
  }
}

function saveToHistory(compound) {
  compounds.unshift(compound);
  if (compounds.length > 1000) compounds = compounds.slice(0, 1000);
  localStorage.setItem('quantumRxCompounds', JSON.stringify(compounds));
  // ADD THIS LINE: Tells the Library tab to redraw instantly!
  updateLibraryTable();
  generateRealTimeInsights(); // <--- ADD THIS LINE!
}

function filterLibrary() {
  const searchEl = document.getElementById('searchCompounds');
  const filterEl = document.getElementById('filterStatus');
  
  const search = searchEl ? searchEl.value.toLowerCase() : '';
  const filter = filterEl ? filterEl.value : 'all';
  
  const rows = document.querySelectorAll('.compound-row');
  rows.forEach(row => {
    const idEl = row.querySelector('.compound-id');
    const id = idEl ? idEl.textContent.toLowerCase() : '';
    const scoreClass = row.classList[1];
    
    let show = true;
    if (search && !id.includes(search)) show = false;
    if (filter === 'success' && scoreClass !== 'success') show = false;
    if (filter === 'warning' && scoreClass !== 'warning') show = false;
    if (filter === 'danger' && scoreClass !== 'danger') show = false;
    row.style.display = show ? 'flex' : 'none';
  });
}

function loadCompound(id) {
  const compound = compounds.find(c => c.id === id);
  if (!compound) return;
  Object.keys(compound.params).forEach(key => {
    const slider = document.getElementById(key);
    if (slider) {
      slider.value = compound.params[key];
      const valueSpan = document.getElementById(key + 'Value');
      if (valueSpan) valueSpan.textContent = compound.params[key];
      updateSliderColor(slider);
    }
  });
  displayAdvancedResults(compound);
  switchPage('simulator');
  showNotification(`Loaded ${compound.name}`, 'info');
}

function deleteCompound(id) {
  // 1. Filter out the deleted compound instantly
  compounds = compounds.filter(c => c.id !== id);
  
  // 2. Save the new, smaller list to memory
  localStorage.setItem('quantumRxCompounds', JSON.stringify(compounds));
  
  // 3. Update the UI to reflect the change
  updateLibraryTable();
  if (typeof updateDashboard === 'function') updateDashboard();
  if (typeof updateAnalyticsPage === 'function') updateAnalyticsPage();
  if (typeof generateRealTimeInsights === 'function') generateRealTimeInsights();
  
  // 4. Show a silent, non-blocking notification instead of a popup
  showNotification("Compound deleted from library.", "success");
}

function optimizeCompound() {
  if (!currentCompound) return;
  showNotification("🧠 AI analyzing and optimizing parameters...", "info");
  
  setTimeout(() => {
    // 1. Optimize the sliders mathematically (Targeting Lipinski ideal ranges)
    document.getElementById('logp').value = (Math.random() * (3 - 1) + 1).toFixed(1);
    document.getElementById('mw').value = Math.floor(Math.random() * (400 - 250) + 250);
    document.getElementById('hbd').value = Math.floor(Math.random() * 3);
    document.getElementById('hba').value = Math.floor(Math.random() * 5);
    document.getElementById('pocketScore').value = (Math.random() * (10 - 7) + 7).toFixed(1);
    
    // 2. Visually update the sliders on the screen
    document.querySelectorAll('input[type="range"]').forEach(slider => {
      const valueSpan = document.getElementById(slider.id + 'Value');
      if (valueSpan) valueSpan.textContent = slider.value;
      updateSliderColor(slider);
    });

    // --- NEW LOGIC: Keep the original name and 3D structure ---
    if (currentCompound && !currentCompound.name.startsWith("QX-")) {
        // Remove any old tags so it doesn't become "Optimized Optimized..."
        let baseName = currentCompound.name.replace(" (Optimized)", "");
        
        // Pass the name and PubChem ID back into the math engine's memory
        activeDrugName = `${baseName} (Optimized)`;
        activePubchemId = currentCompound.pubchem; 
    }
    // ----------------------------------------------------------

    // 3. Run the simulation with the new parameters and saved name
    runAdvancedSimulation();
    
  }, 1500);
}

function flagHighRisk() {
  if (!currentCompound) return;
  const index = compounds.findIndex(c => c.id === currentCompound.id);
  if (index !== -1) {
    compounds[index].metrics.admetRisk = 'High';
    compounds[index].metrics.overallScore = Math.min(compounds[index].metrics.overallScore, 35);
    localStorage.setItem('quantumRxCompounds', JSON.stringify(compounds));
    updateLibraryTable();
    updateDashboard();
  }
  const riskEl = document.getElementById('admetRisk');
  if (riskEl) {
    riskEl.textContent = 'High';
    riskEl.className = 'metric-value risk-high';
  }
  showNotification(`⚠️ ${currentCompound.name} flagged for High Toxicity Risk.`, "warning");
}

function exportLibrary() {
  if (compounds.length === 0) return showNotification("Library is empty. Run simulations first!", "warning");
  
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Compound ID,Overall Score,Binding Energy,Druglikeness,ADMET Risk,Date\n";
  
  compounds.forEach(c => {
    let row = `${c.name},${c.metrics.overallScore},${c.metrics.bindingEnergy},${c.metrics.druglikeness},${c.metrics.admetRisk},${new Date(c.timestamp).toLocaleDateString()}`;
    csvContent += row + "\n";
  });
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "QuantumRx_Compound_Library.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showNotification("Library exported as CSV!", "success");
}

function downloadSimulatedReport(title, content) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function generateFullReport() {
  if (compounds.length === 0) return showNotification("No data to report.", "warning");
  showNotification("Compiling comprehensive pipeline data...", "info");
  
  setTimeout(() => {
    const stats = calculateDashboardStats();
    let content = "=========================================\n   QIDS: COMPREHENSIVE PIPELINE REPORT   \n=========================================\n\n";
    content += `Generated: ${new Date().toLocaleString()}\nTotal Simulations Run: ${stats.total}\n`;
    content += `Average Pipeline Score: ${stats.avgScore.toFixed(1)}/100\nOverall Success Rate: ${stats.successRate}%\n\n--- FULL COMPOUND LOG ---\n`;
    
    compounds.forEach(c => {
      content += `[${c.name}] - Score: ${c.metrics.overallScore} | Binding: ${c.metrics.bindingEnergy} | Risk: ${c.metrics.admetRisk}\n`;
    });
    
    downloadSimulatedReport("QIDS_Full_Pipeline_Report", content);
    showNotification("Pipeline Report downloaded!", "success");
  }, 1200);
}

function generateTopReport() {
  if (compounds.length === 0) return showNotification("No data to report.", "warning");
  showNotification("Analyzing top candidates...", "info");
  
  setTimeout(() => {
    let content = "=========================================\n      QIDS: TOP 10 CANDIDATE SUMMARY     \n=========================================\n\n";
    const topCandidates = [...compounds].sort((a, b) => b.metrics.overallScore - a.metrics.overallScore).slice(0, 10);
      
    topCandidates.forEach((c, index) => {
      content += `#${index + 1}: ${c.name}\n   Overall Score: ${c.metrics.overallScore}/100\n   Binding Energy: ${c.metrics.bindingEnergy} kcal/mol\n   Safety Risk: ${c.metrics.admetRisk}\n\n`;
    });
    
    downloadSimulatedReport("QIDS_Top_Candidates", content);
    showNotification("Top Candidates Report downloaded!", "success");
  }, 1000);
}

function showCustomReport() {
  showNotification("Custom report builder requires selecting specific compounds from the Library first.", "warning");
}