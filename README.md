# Queryable Arrays

A lightweight TS-first querying language designed to make it easy to work with arrays that need significant filtering, joining, sorting, or mapping. This library has no external dependencies, and performance of the queryable array is within an order of magnitude of standard arrays, ensuring that if you could perform a query via standard array functions, you can probably use a queryable array to do the same, albeit a little more human readable.

## Why use this instead of standard array functions, `lodash`, etc.?

This library has a narrow scope that really optimizes for readability (without sacrificing too much in performance). It is designed for teams that are doing a significant amount of filtering and/or joining in JS / TS code (client-side or server-side) and want the queries they are writing to be somewhat self documenting. For example, consider:

```ts

const authors = [
  { id: 'a1', name: 'Kip', contributorSince: '2008-01-01' }, 
  // ...
]
const songs = [
  { 
    id: 's1', 
    name: 'My Song', 
    tags: [{ id: 't1', label: 'rad'}], 
    authorIds: ['a1'],
    lengthInSeconds: 800
  },
  // ...
]

// standard array version
const radLongSongsWithAuthors = songs
  .filter((s) => s.length > 500)
  .filter((s) => s.tags.some((t) => t.name === 'rad'))
  .map((s) => ({ ...s, authors: s.authorIds.map((aId) => 
    authors.find((a) => a.id === s.authorId)
  )}))

// queryable array version
const queryableSongs = queryable(songs)
  .where('length').greaterThan(500)
  .and.where('tags').some('tag').its('label').is('rad')
  .joinWith(authors).whereMy('authorIds').referencesTheir('id').storedTo('authors')
```

## How does it work?

Under the hood, a queryable array extends a standard array, so you can still perform standard array functions on it. Any standard array method that would normally return an array (either as a new instance or by modifying the current array) returns a pre-wrapped queryable array so you can continue chaining off of it. A queryable array respects the same behavior as the underlying array methods, swapping in place when the array method would do so.

```ts
const songs = [
  { 
    id: 's1', 
    name: 'My Song', 
    tags: [{ id: 't1', label: 'rad'}], 
    authorId: 'a1',
    lengthInSeconds: 800
  },
  // ...
]

const tags = songs
  .flatMap((s) => s.tags)
  .uniqueBy('id')
  .where('label').is('rad')
```

## Types

Everything in the queryable array library is written in Typescript and infers the shape of objects automatically to present appropriate methods and properties depending on where in the chain a given queryable array is. Performing `where` queries are non-modifying, meaning the underlying array wrapped by the queryable array remains as it was even as the queryable array version gets successively more narrowed.
