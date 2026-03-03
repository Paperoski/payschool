function normalizeCode(code) {
  return String(code || '').trim();
}

function isNumericAccountCode(code) {
  return /^\d{4,10}$/.test(normalizeCode(code));
}

function resolveAccountCode(inputCode, pucCatalog) {
  const normalized = normalizeCode(inputCode);
  if (!normalized) return null;

  const exact = pucCatalog.find((account) => normalizeCode(account.codigo) === normalized);
  if (exact) return normalizeCode(exact.codigo);

  // Permite subcuentas digitadas por el usuario (ej: 110505 -> 1105)
  for (let len = normalized.length - 1; len >= 4; len -= 1) {
    const prefix = normalized.slice(0, len);
    const found = pucCatalog.find((account) => normalizeCode(account.codigo) === prefix);
    if (found) return normalizeCode(found.codigo);
  }

  return null;
}

function validateMovement(movement, pucCatalog) {
  const rawCode = normalizeCode(movement.cuenta_puc || movement.cuenta_codigo);
  const resolvedCode = resolveAccountCode(rawCode, pucCatalog);
  const debit = Number(movement.debito) || 0;
  const credit = Number(movement.credito) || 0;
  const hasValidSide = (debit > 0 && credit === 0) || (credit > 0 && debit === 0);

  const issues = [];
  if (!isNumericAccountCode(rawCode)) issues.push('Cuenta no numérica o formato inválido');
  if (!resolvedCode) issues.push('Cuenta no existe en catálogo PUC');
  if (!hasValidSide) issues.push('Movimiento inválido: debe tener débito o crédito, no ambos');

  return {
    isValid: issues.length === 0,
    code: resolvedCode || rawCode,
    raw_code: rawCode,
    debit,
    credit,
    issues
  };
}

function validateEntry(entry, pucCatalog) {
  const movements = Array.isArray(entry.movimientos) ? entry.movimientos : [];
  const checked = movements.map((movement, index) => ({ index, ...validateMovement(movement, pucCatalog) }));

  const debit = checked.reduce((acc, m) => acc + m.debit, 0);
  const credit = checked.reduce((acc, m) => acc + m.credit, 0);
  const isBalanced = Number(debit.toFixed(2)) === Number(credit.toFixed(2));
  const invalidMovements = checked.filter((m) => !m.isValid);

  return {
    entry_id: entry.id,
    comprobante: entry.comprobante || null,
    fecha: entry.fecha || null,
    total_debito: Number(debit.toFixed(2)),
    total_credito: Number(credit.toFixed(2)),
    is_balanced: isBalanced,
    invalid_movement_count: invalidMovements.length,
    invalid_movements: invalidMovements,
    normalized_movements: checked.map((m) => ({
      cuenta_puc: m.code,
      debito: Number(m.debit.toFixed(2)),
      credito: Number(m.credit.toFixed(2))
    }))
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
  validateEntry,
  resolveAccountCode
};
