import { insertLevels, nameMissingSessions, populateResults } from './tools.js';
import { clearDB, createTables } from "./tools.js";

function initialize() {
    // Start by clearing the database from its table
    clearDB().then(() => {
        createTables().then(() => {
            insertLevels().then(() => {
                process.exit();
            })
        });
    });
}

function update() {
    insertLevels().then(() => {
        process.exit();
    })
}

function populate() {
    populateResults().then(() => {
        process.exit();
    })
}

function name() {
    nameMissingSessions().then(() => {
        process.exit();
    })
}

export { initialize, update, populate, name }