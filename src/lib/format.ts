// Shekel formatting: whole amounts show as "₪1,500", amounts with agorot as "₪12.50".
const wholeILS = new Intl.NumberFormat('en-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 });
const exactILS = new Intl.NumberFormat('en-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 2 });

export function formatILS(amount: number): string {
  return Number.isInteger(amount) ? wholeILS.format(amount) : exactILS.format(amount);
}
