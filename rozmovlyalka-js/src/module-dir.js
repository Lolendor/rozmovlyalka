// defaultDataUrl для Node/ESM: каталог data/ рядом с этим модулем.
export const defaultDataUrl = (() => {
  try {
    return new URL('../data/', import.meta.url).href;
  } catch {
    return null;
  }
})();
