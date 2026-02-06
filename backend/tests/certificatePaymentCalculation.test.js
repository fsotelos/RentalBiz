/**
 * Unit test for certificate payment calculation logic
 */

describe('Certificate Payment Calculation', () => {
  
  describe('calculatePaymentsForCertificate', () => {
    
    it('should include pending payment with due_date before cutoff date', () => {
      const payments = [
        { id: 1, type: 'rent', amount: 1000, status: 'pending', due_date: '2026-01-15' },
      ];
      const cutoffDate = new Date('2026-02-28');
      
      const result = filterPaymentsByCutoff(payments, cutoffDate);
      
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(1);
    });

    it('should include overdue payment with due_date before cutoff date', () => {
      const payments = [
        { id: 1, type: 'rent', amount: 1000, status: 'overdue', due_date: '2025-12-15' },
      ];
      const cutoffDate = new Date('2026-02-28');
      
      const result = filterPaymentsByCutoff(payments, cutoffDate);
      
      expect(result.length).toBe(1);
      expect(result[0].status).toBe('overdue');
    });

    it('should exclude approved payment regardless of due_date', () => {
      const payments = [
        { id: 1, type: 'rent', amount: 1000, status: 'approved', due_date: '2026-01-15' },
      ];
      const cutoffDate = new Date('2026-02-28');
      
      const result = filterPaymentsByCutoff(payments, cutoffDate);
      
      expect(result.length).toBe(0);
    });

    it('should exclude paid payment regardless of due_date', () => {
      const payments = [
        { id: 1, type: 'rent', amount: 1000, status: 'paid', due_date: '2026-01-15' },
      ];
      const cutoffDate = new Date('2026-02-28');
      
      const result = filterPaymentsByCutoff(payments, cutoffDate);
      
      expect(result.length).toBe(0);
    });

    it('should exclude payment with due_date after cutoff date', () => {
      const payments = [
        { id: 1, type: 'rent', amount: 1000, status: 'pending', due_date: '2026-03-15' },
      ];
      const cutoffDate = new Date('2026-02-28');
      
      const result = filterPaymentsByCutoff(payments, cutoffDate);
      
      expect(result.length).toBe(0);
    });

    it('should include multiple payments of different types', () => {
      const payments = [
        { id: 1, type: 'rent', amount: 1000, status: 'pending', due_date: '2026-01-15' },
        { id: 2, type: 'electricity', amount: 200, status: 'overdue', due_date: '2026-02-15' },
        { id: 3, type: 'water', amount: 100, status: 'pending', due_date: '2025-12-01' },
      ];
      const cutoffDate = new Date('2026-02-28');
      
      const result = filterPaymentsByCutoff(payments, cutoffDate);
      
      expect(result.length).toBe(3);
    });

    it('should calculate correct totals for pending and overdue payments', () => {
      const payments = [
        { id: 1, type: 'rent', amount: 1000, status: 'pending', due_date: '2026-01-15' },
        { id: 2, type: 'rent', amount: 1000, status: 'overdue', due_date: '2025-12-15' },
        { id: 3, type: 'electricity', amount: 200, status: 'pending', due_date: '2026-02-15' },
      ];
      const cutoffDate = new Date('2026-02-28');
      
      const filtered = filterPaymentsByCutoff(payments, cutoffDate);
      const totals = calculateTotals(filtered);
      
      expect(totals.rent.pending).toBe(2000);
      expect(totals.electricity.pending).toBe(200);
      expect(totals.totalPending).toBe(2200);
    });

    it('should exclude approved and paid payments from calculation', () => {
      const payments = [
        { id: 1, type: 'rent', amount: 1000, status: 'approved', due_date: '2026-01-15' },
        { id: 2, type: 'rent', amount: 1000, status: 'paid', due_date: '2026-01-15' },
        { id: 3, type: 'rent', amount: 1000, status: 'pending', due_date: '2026-01-15' },
      ];
      const cutoffDate = new Date('2026-02-28');
      
      const filtered = filterPaymentsByCutoff(payments, cutoffDate);
      const totals = calculateTotals(filtered);
      
      expect(totals.rent.pending).toBe(1000);
      expect(totals.totalPending).toBe(1000);
    });

  });

  describe('isPazYSalvo', () => {
    
    it('should return true when no pending/overdue payments exist', () => {
      const payments = [];
      
      const result = checkIsPazYSalvo(payments);
      
      expect(result).toBe(true);
    });

    it('should return false when pending payments exist', () => {
      const payments = [
        { id: 1, type: 'rent', amount: 1000, status: 'pending', due_date: '2026-01-15' },
      ];
      
      const result = checkIsPazYSalvo(payments);
      
      expect(result).toBe(false);
    });

    it('should return false when overdue payments exist', () => {
      const payments = [
        { id: 1, type: 'rent', amount: 1000, status: 'overdue', due_date: '2025-12-15' },
      ];
      
      const result = checkIsPazYSalvo(payments);
      
      expect(result).toBe(false);
    });

  });

});

// Helper functions (same logic as in extractController.js)

function filterPaymentsByCutoff(payments, cutoffDate) {
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
  
  return payments.filter(payment => {
    // Exclude approved and paid
    if (['approved', 'paid'].includes(payment.status)) {
      return false;
    }
    
    // Include if due_date is less than or equal to cutoff
    return payment.due_date <= cutoffDateStr;
  });
}

function calculateTotals(payments) {
  const summary = {
    rent: { pending: 0, paid: 0 },
    electricity: { pending: 0, paid: 0 },
    water: { pending: 0, paid: 0 },
    gas: { pending: 0, paid: 0 },
    other: { pending: 0, paid: 0 },
    totalPending: 0,
    totalPaid: 0
  };
  
  payments.forEach(payment => {
    const type = payment.type === 'maintenance' || payment.type === 'deposit' ? 'other' : payment.type;
    const amount = parseFloat(payment.amount);
    
    if (['approved', 'paid'].includes(payment.status)) {
      summary[type].paid += amount;
      summary.totalPaid += amount;
    } else {
      summary[type].pending += amount;
      summary.totalPending += amount;
    }
  });
  
  return summary;
}

function checkIsPazYSalvo(payments) {
  // A client is paz y salvo if they have no pending/overdue payments
  return payments.length === 0;
}
