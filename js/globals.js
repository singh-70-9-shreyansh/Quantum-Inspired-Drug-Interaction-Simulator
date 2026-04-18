// ==========================================
// QIDS: Global State & Constants
// ==========================================

// Memory arrays and current state
let compounds = JSON.parse(localStorage.getItem('quantumRxCompounds')) || [];
let currentCompound = null;
let charts = {};
let drugDatabase = [];

// Scientific Constants (Real pharmaceutical parameters)
const LIPINSKI_RULES = { 
  mwMax: 500, 
  logpMax: 5, 
  hbdMax: 5, 
  hbaMax: 10 
};

const BINDING_ENERGY_RANGES = { 
  strong: -12, 
  moderate: -8, 
  weak: -5 
};
let activeDrugName = null;
let activePubchemId = null;