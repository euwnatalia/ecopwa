
// Mock logic from points.controller.js

const mockPoints = [
  { id: 'old1', lat: -31.4, lng: -64.18, tipo: 'Vidrio', activo: true },
  { id: 'new1', lat: -31.41, lng: -64.19, tipos: ['Vidrio'], activo: true }, // The new point
  { id: 'new2', lat: -31.42, lng: -64.20, tipos: ['Cartón'], activo: true },
];

// Normalization logic
const normalizedPoints = mockPoints.map(p => {
  const normalized = { ...p };
  if (Array.isArray(p.tipos) && p.tipos.length > 0 && !p.tipo) {
    normalized.tipo = p.tipos[0];
  }
  return normalized;
});

// Filtering logic
function filterPoints(points, tipoFilter) {
  let filtered = points;
  
  if (tipoFilter) {
    filtered = filtered.filter(punto => {
      // Logic from controller
      if (Array.isArray(punto.tipos)) {
        return punto.tipos.includes(tipoFilter);
      }
      if (punto.tipo) {
        return punto.tipo === tipoFilter;
      }
      return false;
    });
  }
  
  return filtered;
}

console.log('--- All Materials (No Filter) ---');
const all = filterPoints(normalizedPoints, undefined);
console.log('Count:', all.length);
all.forEach(p => console.log(`- ${p.id}: tipos=${JSON.stringify(p.tipos)} tipo=${p.tipo}`));

console.log('\n--- Filter "Vidrio" ---');
const vidrio = filterPoints(normalizedPoints, 'Vidrio');
console.log('Count:', vidrio.length);
vidrio.forEach(p => console.log(`- ${p.id}: tipos=${JSON.stringify(p.tipos)} tipo=${p.tipo}`));
