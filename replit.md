# Project Context

This is a Movement Extension, where the default export will be run inside an app created on the Movement Platform (https://movement.so)

This Extension extends the functionality of the Movement platform with custom logic or functionality otherwise not provided by Movement

When mounted, this extension is provided with a global `mvt` variable that contains the SDK functionality (outlined below)

In a Vue.js app the `mvt` SDK is provided via a globally provided variable that you can access by calling `inject('mvt')`

This is provided at runtime and you can assume it will exist when writing the app

An Extension by default has a single entry point (by default `/src/main.ts`), but additional entrypoints can be created by placing another `.ts` / `.js` file in the `/src/` folder and adding the filename to the `entrypoints` array in the `/public/manifest.json` file. The Creator will then be able to choose which entrypoint they wish to use through the Movement Platform UI.

# MVT SDK Integration Guide

The `mvt` SDK is a unified interface for extensions to interact with the platform, providing comprehensive functionality including authentication, CRUD operations on user extension data, advanced aggregation, event handling, and more. It abstracts the underlying RESTful API endpoints and provides a clean, type-safe interface for all platform interactions.

## Core Concepts
- **Extension Data Model**: Data is stored per extension, keyed by `extension_slug`, with flexible JSON `value` fields
- **Keys**: Every data record requires a `key` (string). Keys are used to categorize and identify data types or metrics within an extension. Keys should be unique per data type (e.g., 'daily_pushups', 'user_note', 'project'). Consistent key naming is important for querying, aggregation, and data management.
- **Endpoints**: All operations are routed through `/extension_data/:extension_slug`
- **Query Parameters**: Advanced filtering, aggregation, grouping, and ordering are supported

## Authentication
You can use the SDK to login and logout users using the provided methods on the Movement SDK
- `mvt.login()`: Prompts the user to login via the Movement authentication flow
- `mvt.logout()`: Logs the current Movement user out

## SDK Structure

### Initialization
The SDK is injected into the extension as `mvt` and provides access to:
- `mvt.store`: Data operations (set, get, query, update, delete)
- `mvt.events`: Event manager (login/logout events)
- `mvt.user`: Current user info

### Data Operations
#### Store Data
- `await mvt.store.set(key, value, created_at?)`
  - Stores a single record for the extension.
  - `key`: string, `value`: any JSON-serializable object, `created_at`: optional Date.
- `await mvt.store.setMany(data)`
  - Stores multiple records. `data` is an array of `{ key, value, created_at? }`.

#### Query Data
- `await mvt.store.get(key)`
  - Retrieves the latest record for the given key.
- `await mvt.store.query(key, queryOptions)`
  - Advanced querying with filters, aggregation, grouping, ordering, and limits.
  - `queryOptions` matches the API's query parameter structure (see below).
  - **Always returns an object with a `results` array (may be empty, but always present).**
- `await mvt.store.queryMember(key, queryOptions)`
  - Like `query`, but only for the current user (sets `member_only=true`).
  - **Always returns an object with a `results` array (may be empty, but always present).**

#### Update Data
- `await mvt.store.update(id, value)`
  - Updates a record by tracked ID.

#### Delete Data
- `await mvt.store.delete(key, deleteQuery?)`
  - Deletes records by key, tracked ID, or filter.

## Query Options Reference
- `filter`: `{ on?: string, after?: Date, before?: Date, eq?: number, gt?: number, lt?: number, contains?: string }`
- `aggregate`: string or `{ type: 'sum'|'avg'|'max'|'min'|'count', on?: string }`
- `aggregate_filter`: `{ eq?: number, gt?: number, lt?: number }`
- `group_by`: string (e.g., 'day', 'subscriber_id', 'key', 'value', or JSON path)
- `order`: string or `{ on?: string, dir: 'asc'|'desc' }`
- `limit`: number (default 50, max 100)
- `member_only`: boolean

## Query Options Explained

The following options can be used with `mvt.store.query` and `mvt.store.queryMember` to filter, aggregate, group, and sort your extension data. Each option is optional unless otherwise noted.

> **Note:** Both `mvt.store.query` and `mvt.store.queryMember` always return an object with a `results` array. The array may be empty if no records match, but it is always present in the response.

### filter
```js
filter: {
  on?: string,      // JSON path or field to filter on (e.g., "value->>'protein'")
  after?: Date,     // Only include records after this date
  before?: Date,    // Only include records before this date
  eq?: number,      // Only include records equal to this value
  gt?: number,      // Only include records greater than this value
  lt?: number,      // Only include records less than this value
  contains?: string // Only include records containing this string (for text fields)
}
```
**Description:** Filters records based on value, date, or custom JSON path. Combine multiple filters for advanced queries.

### aggregate
```js
aggregate: 'sum' | 'avg' | 'max' | 'min' | 'count' // Simple aggregation
// or
aggregate: { type: 'sum'|'avg'|'max'|'min'|'count', on?: string }
```
**Description:** Aggregates results using the specified function. Use the object form to aggregate on a specific JSON path (e.g., `on: "value->>'protein'"`).

### aggregate_filter
```js
aggregate_filter: {
  eq?: number, // Only include aggregated results equal to this value
  gt?: number, // Only include aggregated results greater than this value
  lt?: number  // Only include aggregated results less than this value
}
```
**Description:** Filters the results of an aggregation (e.g., only show groups with a sum above 100).

### group_by
```js
group_by: 'day' | 'subscriber_id' | 'key' | 'value' | "value->>'field'"
```
**Description:** Groups results by a field, date, or JSON path. Useful for time series, per-user, or category breakdowns.

### order
```js
order: 'asc' | 'desc' // Simple ordering by value
// or
order: { on?: string, dir: 'asc'|'desc' } // Order by a specific field or JSON path
```
**Description:** Sorts results in ascending or descending order, optionally by a specific field or JSON path.

### limit
```js
limit: number // Maximum number of results to return (default: 50, max: 100)
```
**Description:** Restricts the number of results returned by the query.

### member_only
```js
member_only: true | false
```
**Description:** If true, only returns data for the current user. Use with `queryMember` for convenience.

## Event Handling
- `mvt.events.on('loggedIn', callback)` — Fires when user logs in
- `mvt.events.on('loggedOut', callback)` — Fires when user logs out

## User Info
- `mvt.user` — Returns `{ name, email, id }` or `null` if not logged in

## Example Usage

### Store Data (CRUD)
```js
// Store a single record
await mvt.store.set('daily_pushups', { count: 30 })

// Store multiple records
await mvt.store.setMany([
  { key: 'daily_pushups', value: { count: 30 } },
  { key: 'weekly_total', value: { total: 150 } }
])

// Store simple integer values
await mvt.store.set('daily_pushups', 30)
await mvt.store.set('weekly_total', 150)

// Store simple string values
await mvt.store.set('user_note', 'Feeling great today!')
await mvt.store.set('workout_type', 'strength')

// Store multiple simple values
await mvt.store.setMany([
  { key: 'daily_pushups', value: 30 },
  { key: 'daily_squats', value: 50 },
  { key: 'workout_mood', value: 'energized' }
])
```

### Query Data (CRUD, Aggregation, Member Data)
```js
// Get the latest record for a key
const latest = await mvt.store.get('daily_pushups')

// Query with aggregation and filter
const result = await mvt.store.query('daily_pushups', {
  filter: { gt: 20, after: '2024-01-01' },
  aggregate: 'sum',
  group_by: 'day',
  order: { on: 'value', dir: 'desc' },
  limit: 10
})

// Query simple integer values
const pushupStats = await mvt.store.query('daily_pushups', {
  filter: { gt: 25 },
  aggregate: 'avg',
  group_by: 'day'
})

// Query simple string values
const moodData = await mvt.store.query('workout_mood', {
  filter: { contains: 'energized' },
  aggregate: 'count',
  group_by: 'day'
})

// Advanced aggregation: average by category for high-value projects
const avgByCategory = await mvt.store.query('project', {
  aggregate: { type: 'avg', on: "value->>'duration'" },
  group_by: "value->>'category'",
  filter: { on: "value->>'budget'", gt: 5000 },
  order: { on: 'value', dir: 'desc' }
})

// Member-only query (current user's data only)
const myData = await mvt.store.queryMember('nutrition', {
  filter: { after: '2024-01-01' },
  aggregate: 'count',
  group_by: 'day'
})
```

### Update Data (CRUD)
```js
// Update a record by tracked ID
await mvt.store.update('tracked_123', { count: 35 })

// Update with simple values
await mvt.store.update('tracked_123', 35)  // integer
await mvt.store.update('tracked_456', 'exhausted')  // string
```

### Delete Data (CRUD)
```js
// Delete a specific record by tracked ID
await mvt.store.delete('daily_pushups', { id: 'tracked_123' })

// Delete all records before a certain date
await mvt.store.delete('daily_pushups', { filter: { before: '2024-01-01' } })

// Delete records with simple value filters
await mvt.store.delete('daily_pushups', { filter: { lt: 10 } })  // delete low counts
await mvt.store.delete('workout_mood', { filter: { contains: 'tired' } })  // delete tired entries
```

### Event Handling
```js
// Listen for login event
mvt.events.on('loggedIn', (user) => { /* ... */ })

// Listen for logout event
mvt.events.on('loggedOut', () => { /* ... */ })
```

## Error Handling
All methods throw on error (e.g., missing fields, invalid query, network issues). Handle errors with try/catch.

# Updating extensions

## Another entry (entrypoint)

When you are asked to add a new entry or entrypoint to an existing extension, you must:

- Always create a new entrypoint file (e.g., `new-feature.ts`) in the extension's `src/` directory.
- Create a corresponding Vue component file (e.g., `NewFeature.vue`) and any required supporting files (such as assets, composables, or helpers) in appropriate subdirectories under `src/`.
- Ensure the new entrypoint is registered in the extension's `manifest.json` if required by the platform.
- Do not merge new functionality into an existing entrypoint unless explicitly requested.
- Do not change other configs unless it is just a naming correction or explicitly mentioned

This ensures each entrypoint is modular, maintainable, and can be independently mounted or referenced by the platform.
