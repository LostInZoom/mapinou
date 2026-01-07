import { insertLevels, nameMissingSessions, populateResults, retrieveDatabaseInfos } from './tools.js';
import { clearDB, createTables } from "./tools.js";

/**
 * Initialize the database. Be careful, this erase all data inside the database.
 */
function initialize() {
    // Start by clearing the database from its table
    clearDB().then(() => {
        // Recreate the new tables
        createTables().then(() => {
            // Insert levels from the yaml file
            insertLevels().then(() => {
                process.exit();
            })
        });
    });
}

/**
 * Update the database by inserting new levels if some were added to the yaml file.
 */
function update() {
    insertLevels().then(() => {
        process.exit();
    });
}

/**
 * Populate the database with fake results to have a working leaderboard and player density chart.
 * @param {int} amount 
 */
function populate(amount = 100) {
    populateResults(amount).then(() => {
        process.exit();
    });
}

/**
 * Rename the session that misses an animal adjective name. To use after using the populate function.
 * Beware, it can take a lot of time as each name takes 1/5s to generate depending on your connection and the availability of the translation server. 
 */
function name() {
    nameMissingSessions().then(() => {
        process.exit();
    });
}

/**
 * Trigger a message to zulip using custom credentials. This is usually triggered by a cron job.
 * @param {string} type 
 */
function zulip(type) {
    retrieveDatabaseInfos(type).then(() => {
        process.exit();
    });
}

export { initialize, update, populate, name, zulip }