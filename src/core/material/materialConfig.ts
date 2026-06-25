export const structureMaterialMap: Record<string, { color: string }> = {
  patio: {
    color: "#a0a0a0"
  },
  stairs: {
    color: "#8d8d8d"
  },
  garage: {
    color: "#e0e0e0"
  },
  sideKitchen: {
    color: "#f5f5f5"
  },
  fence: {
    color: "#8d6e63"
  }
};

export const getStructureMaterialColor = (type: string): string => {
  return structureMaterialMap[type]?.color || "#cccccc";
};
