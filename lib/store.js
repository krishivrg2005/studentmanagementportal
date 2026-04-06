const fs = require("fs");
const { createSeedData, DB_PATH } = require("../data/seed");

function ensureDb() {
  if (!fs.existsSync(DB_PATH)) {
    writeDb(createSeedData());
  }
}

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function nextId(collection, prefix) {
  const nextValue =
    collection.reduce((max, item) => {
      const numeric = Number(String(item.id || "").replace(/\D/g, "")) || 0;
      return Math.max(max, numeric);
    }, 0) + 1;

  return `${prefix}${String(nextValue).padStart(3, "0")}`;
}

module.exports = {
  DB_PATH,
  ensureDb,
  readDb,
  writeDb,
  nextId
};
