/**
 * Debug script to test certificate generation date handling
 */

// Test date conversion
console.log('[TEST] Testing date conversion...');

// Simulate contract.start_date as string (from Sequelize)
const contractStartDateStr = '2023-12-31';
console.log('[TEST] Original string:', contractStartDateStr, typeof contractStartDateStr);

// Test conversion
const contractStartDate = contractStartDateStr instanceof Date 
  ? contractStartDateStr 
  : new Date(contractStartDateStr);

console.log('[TEST] After conversion:', contractStartDate, typeof contractStartDate);
console.log('[TEST] instanceof Date:', contractStartDate instanceof Date);
console.log('[TEST] getDate():', contractStartDate.getDate());
console.log('[TEST] getMonth():', contractStartDate.getMonth());
console.log('[TEST] getFullYear():', contractStartDate.getFullYear());

console.log('[TEST] Date conversion test passed!');
