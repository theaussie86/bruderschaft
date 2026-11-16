/// <reference path="../pb_data/types.d.ts" />

// Artikel- und Motivbilder sollen ganz zu sehen sein. Das Vorschaubild
// 200x200 schneidet PocketBase mittig quadratisch zu, bei Motiven im
// Querformat fehlten links und rechts Teile. 200x200f passt das Bild in
// 200x200 ein, ohne etwas abzuschneiden.
const COLLECTIONS = ['artikel', 'motive']

migrate(
  (app) => {
    for (const name of COLLECTIONS) {
      const collection = app.findCollectionByNameOrId(name)
      collection.fields.getByName('bild').thumbs = ['200x200f', '800x0']
      app.save(collection)
    }
  },
  (app) => {
    for (const name of COLLECTIONS) {
      const collection = app.findCollectionByNameOrId(name)
      collection.fields.getByName('bild').thumbs = ['200x200', '800x0']
      app.save(collection)
    }
  },
)
