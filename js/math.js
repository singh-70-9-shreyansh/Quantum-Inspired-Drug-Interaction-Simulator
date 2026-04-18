// ==========================================
// Core Simulation Logic & Math Calculations
// ==========================================

function getSimulationParams() {
  return {
    logp: parseFloat(document.getElementById('logp').value),
    mw: parseFloat(document.getElementById('mw').value),
    hbd: parseInt(document.getElementById('hbd').value),
    hba: parseInt(document.getElementById('hba').value),
    tpsa: parseFloat(document.getElementById('tpsa').value),
    pocketScore: parseFloat(document.getElementById('pocketScore').value),
    hydrophobicity: parseFloat(document.getElementById('hydrophobicity').value),
    flexibility: parseFloat(document.getElementById('flexibility').value),
    chargeComp: parseFloat(document.getElementById('chargeComp').value)
  };
}

function calculateAdvancedMetrics(params) {
  const lipinskiViolations = calculateLipinskiViolations(params);
  const bindingEnergy = calculateBindingEnergy(params);
  const druglikeness = calculateDruglikeness(params);
  const admetScore = calculateADMET(params);
  const successProbability = calculateSuccessProbability(params, bindingEnergy, lipinskiViolations);
  
  // --- NEW LOGIC: Check if we have a real name saved from the database ---
  const finalName = activeDrugName ? activeDrugName : `QX-${String(Date.now()).slice(-4)}`;
  const finalPubchem = activePubchemId ? activePubchemId : '2244'; // Defaults to Aspirin if fake
  
  activeDrugName = null;
  activePubchemId = null; // Reset for next time

  return {
    id: Date.now(),
    name: finalName, 
    pubchem: finalPubchem, // <--- SAVES THE REAL PUBCHEM ID HERE!
    timestamp: new Date().toISOString(),
    params,
    metrics: {
      bindingEnergy: bindingEnergy.toFixed(1),
      druglikeness: druglikeness.toFixed(2),
      admetRisk: getADMETRisk(admetScore),
      successProbability: successProbability.toFixed(0),
      lipinskiViolations,
      overallScore: ((bindingEnergy * -0.4) + (druglikeness * 40) + (successProbability * 0.3)).toFixed(1)
    }
  };
}

function calculateLipinskiViolations(params) {
  let violations = 0;
  if (params.mw > LIPINSKI_RULES.mwMax) violations++;
  if (params.logp > LIPINSKI_RULES.logpMax) violations++;
  if (params.hbd > LIPINSKI_RULES.hbdMax) violations++;
  if (params.hba > LIPINSKI_RULES.hbaMax) violations++;
  return violations;
}

function calculateBindingEnergy(params) {
  const vanDerWaals = -2.5 * params.pocketScore;
  const hBond = -1.8 * (params.hbd + params.hba) * 0.3;
  const hydrophobic = -1.2 * Math.min(Math.abs(params.logp - params.hydrophobicity), 3);
  const electrostatic = -3.0 * params.chargeComp * 0.4;
  const entropyPenalty = params.flexibility * 0.2;
  return vanDerWaals + hBond + hydrophobic + electrostatic - entropyPenalty + (Math.random() - 0.5) * 1;
}

function calculateDruglikeness(params) {
  let score = 1.0;
  score *= (1 - Math.min(params.mw / 1000, 1) * 0.3);
  score *= (1 - Math.abs(params.logp) / 10 * 0.3);
  score *= (1 - params.hbd / 10 * 0.2);
  score *= (1 - params.hba / 15 * 0.2);
  score *= (1 - params.tpsa / 200 * 0.2);
  return Math.max(0, score);
}

function calculateADMET(params) {
  const absorption = 1 - (params.tpsa / 200 * 0.4);
  const distribution = 1 - (Math.abs(params.logp) > 5 ? 0.3 : 0);
  const metabolism = 1 - (params.mw > 500 ? 0.2 : 0);
  const excretion = 1 - (params.tpsa < 50 ? 0.1 : 0);
  const toxicity = 1 - (params.hbd > 5 || params.hba > 10 ? 0.3 : 0);
  return (absorption + distribution + metabolism + excretion + toxicity) / 5;
}

function getADMETRisk(score) {
  if (score > 0.8) return 'Low';
  if (score > 0.6) return 'Medium';
  return 'High';
}

function calculateSuccessProbability(params, bindingEnergy, lipinskiViolations) {
  // Start with an optimistic baseline
  let probability = 95;

  // Penalty 1: Weak Binding Affinity
  // If binding energy is positive or close to 0, it won't stick to the target well
  if (bindingEnergy > -15) {
    probability -= Math.abs(bindingEnergy + 15) * 1.5; 
  }

  // Penalty 2: Lipinski Violations
  // 1 violation is a warning (-15%), 2+ violations usually means the drug fails clinical trials (-40% each)
  if (lipinskiViolations === 1) {
    probability -= 15;
  } else if (lipinskiViolations > 1) {
    probability -= (lipinskiViolations * 35);
  }

  // Penalty 3: Bad molecular weight (Too big = hard to absorb)
  if (params.mw > 500) {
    probability -= 10;
  }

  // Realistic Science Clamp: 
  // Make sure the probability never goes above 98% or drops below 1%
  probability = Math.max(1, Math.min(98, probability));

  return probability;
}

function calculateDashboardStats() {
  if (compounds.length === 0) return { successRate: 0, avgScore: 0, highRisk: 0, total: 0 };
  const success = compounds.filter(c => c.metrics.overallScore > 70).length;
  const highRisk = compounds.filter(c => c.metrics.admetRisk === 'High').length;
  return {
    successRate: Math.round((success / compounds.length) * 100),
    avgScore: compounds.reduce((sum, c) => sum + parseFloat(c.metrics.overallScore), 0) / compounds.length,
    highRisk,
    total: compounds.length
  };
}