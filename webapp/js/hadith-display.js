/* Select the requested script without modifying the source record. */
const HadithDisplay = (() => {
  'use strict';
  function field(record, key, language) {
    const display = record?.display;
    if (language === 'uz' && record?.language === 'uz' &&
        display?.language === 'uz-Latn' && typeof display[key] === 'string') {
      return display[key];
    }
    return record?.[key] ?? '';
  }
  function bookName(book, language) {
    return language === 'uz' && typeof book?.display_name === 'string'
      ? book.display_name : book?.name ?? '';
  }
  return { field, bookName };
})();
window.HadithDisplay = HadithDisplay;
