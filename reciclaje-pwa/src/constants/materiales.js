export const MATERIALES = [
  { value: "Plástico", label: "🥤 Plástico", color: "#2196F3", icon: "🥤" },
  { value: "Vidrio", label: "🫙 Vidrio", color: "#4CAF50", icon: "🫙" },
  { value: "Cartón", label: "📦 Cartón", color: "#FF9800", icon: "📦" },
  { value: "Papel", label: "📄 Papel", color: "#9C27B0", icon: "📄" },
  { value: "Metal", label: "🥫 Metal", color: "#607D8B", icon: "🥫" },
  { value: "Electrónicos", label: "📱 Electrónicos", color: "#E91E63", icon: "📱" },
  { value: "Orgánico", label: "🍃 Orgánico", color: "#8BC34A", icon: "🍃" },
  { value: "Textil", label: "👕 Textil", color: "#795548", icon: "👕" }
];

export const getMaterialByValue = (value) => {
  return MATERIALES.find(m => m.value === value) || MATERIALES[0];
};

