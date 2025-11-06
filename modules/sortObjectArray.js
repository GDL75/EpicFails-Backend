// Trie un tableau d'objets selon une ou deux clefs numériques (dates, scores, etc.)
// order1 et order2 : 1 pour un tri croissant, -1 pour un tri décroissant
function sortObjectArray(array, key1, order1 = 1, key2, order2 = 1) {
  // Sécurise l'ordre principal (1 ou -1)
  order1 = order1 === 1 ? 1 : -1;
  if (key2) {
    // Si une deuxième clé est fournie, on trie d'abord sur key1,
    // puis sur key2 si key1 est égal entre deux objets
    order2 = order2 === 1 ? 1 : -1;
    array.sort((a, b) => {
      if (a[key1] !== b[key1]) {
        return (a[key1] - b[key1]) * order1;
      } else {
        return (a[key2] - b[key2]) * order2;
      }
    });
  } else {
    // Sinon, tri simple sur la première clé
    array.sort((a, b) => (a[key1] - b[key1]) * order1);
  }
  return array;
}

module.exports = { sortObjectArray };