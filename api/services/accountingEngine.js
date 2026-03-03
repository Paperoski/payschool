function normalizeCode(code) {
  return String(code || '').trim();
}

function isNumericAccountCode(code) {
  return /^\d{4,10}$/.test(normalizeCode(code));
}

function accountExists(code, pucCatalog) {
  const normalized = normalizeCode(code);
  return pucCatalog.some((account) => normalizeCode(account.codigo) === normalized);
}

function validateMovement(movement, pucCatalog) {
  const code = normalizeCode(movement.cuenta_puc || movement.cuenta_codigo);
  const debit = Number(movement.debito) || 0;
  const credit = Number(movement.credito) || 0;
  const hasValidSide = (debit > 0 && credit === 0) || (credit > 0 && debit === 0);

  const issues = [];
  if (!isNumericAccountCode(code)) issues.push('Cuenta no numérica o formato inválido');
  if (!accountExists(code, pucCatalog)) issues.push('Cuenta no existe en catálogo PUC');
  if (!hasValidSide) issues.push('Movimiento inválido: debe tener débito o crédito, no ambos');

  return {
    isValid: issues.length === 0,
    code,
    debit,
    credit,
    issues
  };
}

function validateEntry(entry, pucCatalog) {
  const movements = Array.isArray(entry.movimientos) ? entry.movimientos : [];
  const checked = movements.map((movement, index) => ({
    index,
    ...validateMovement(movement, pucCatalog)
  }));

  const debit = checked.reduce((acc, m) => acc + m.debit, 0);
  const credit = checked.reduce((acc, m) => acc + m.credit, 0);
  const isBalanced = Number(debit.toFixed(2)) === Number(credit.toFixed(2));
  const invalidMovements = checked.filter((m) => !m.isValid);

  return {
    entry_id: entry.id,
    comprobante: entry.comprobante || null,
    fecha: entry.fecha || null,
    total_debito: debit,
    total_credito: credit,
    is_balanced: isBalanced,
    invalid_movement_count: invalidMovements.length,
    invalid_movements: invalidMovements
  };
}

function autonomousAccountingAudit(entries, pucCatalog) {
  const diagnostics = entries.map((entry) => validateEntry(entry, pucCatalog));
  const outOfBalance = diagnostics.filter((d) => !d.is_balanced);
  const withInvalidAccounts = diagnostics.filter((d) => d.invalid_movement_count > 0);

  return {
    generated_at: new Date().toISOString(),
    summary: {
      entries_analyzed: diagnostics.length,
      out_of_balance_entries: outOfBalance.length,
      entries_with_invalid_accounts: withInvalidAccounts.length,
      overall_status: outOfBalance.length === 0 && withInvalidAccounts.length === 0 ? 'OK' : 'ALERTA'
    },
    diagnostics
  };
}

module.exports = {
  autonomousAccountingAudit,
  validateEntry
};
