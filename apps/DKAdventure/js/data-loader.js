import { loadJson } from './utils.js';

export async function loadGameData() {
  const [books, chapter1, chapter2, chapter3, audio, atlases] = await Promise.all([
    loadJson(new URL('../data/books.json', import.meta.url)),
    loadJson(new URL('../data/chapters/chapter1.json', import.meta.url)),
    loadJson(new URL('../data/chapters/chapter2.json', import.meta.url)),
    loadJson(new URL('../data/chapters/chapter3.json', import.meta.url)),
    loadJson(new URL('../assets/audio/manifest.json', import.meta.url)),
    loadJson(new URL('../assets/atlases/manifest.json', import.meta.url)),
  ]);

  return {
    books: books.books,
    chapters: {
      chapter1,
      chapter2,
      chapter3,
    },
    audio,
    atlases,
  };
}