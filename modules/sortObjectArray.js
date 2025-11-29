function sortObjectArray(array, key1, order1 = 1, key2, order2 = 1) {
  order1 = order1 === 1 ? 1 : -1;
  if (key2) {
    order2 = order2 === 1 ? 1 : -1;
    array.sort((a, b) => {
      if (a[key1] !== b[key1]) {
        return (a[key1] - b[key1]) * order1;
      } else {
        return (a[key2] - b[key2]) * order2;
      }
    });
  } else {
    array.sort((a, b) => (a[key1] - b[key1]) * order1);
  }
  return array;
}

module.exports = { sortObjectArray };