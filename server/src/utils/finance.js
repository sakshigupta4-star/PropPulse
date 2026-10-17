const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

export const calcEmi = (principal, annualRate, years) => {
  const n = years * 12;
  const r = annualRate / 12 / 100;
  if (principal <= 0) return 0;
  if (r === 0) return principal / n;
  const f = Math.pow(1 + r, n);
  return (principal * r * f) / (f - 1);
};

// Loan balance left after `paid` monthly payments
export const outstandingBalance = (principal, annualRate, years, paid) => {
  const n = years * 12;
  const r = annualRate / 12 / 100;
  if (paid >= n) return 0;
  if (r === 0) return principal * (1 - paid / n);
  const f = Math.pow(1 + r, n);
  return (principal * (f - Math.pow(1 + r, paid))) / (f - 1);
};

export const cagr = (start, end, years) =>
  start > 0 && years > 0 ? (Math.pow(end / start, 1 / years) - 1) * 100 : 0;

export const forecastValues = (price, ratePct, years) =>
  Array.from({ length: years + 1 }, (_, y) => ({
    year: y,
    value: round(price * Math.pow(1 + ratePct / 100, y), 0),
  }));

export { round };