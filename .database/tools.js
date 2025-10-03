import { db } from "./credentials.js";
import * as fs from 'fs';
import { load } from "js-yaml";

/**
 * Clear the tables from the given database.
 * @param {Pool} db - The database to clear the tables from.
 */
async function clearDB() {
    let query = `DROP SCHEMA IF EXISTS data CASCADE;`
    await db.query(query);
    query = `CREATE SCHEMA IF NOT EXISTS data`;
    await db.query(query);
}

async function createTables() {
    const TABLES = `
        CREATE TABLE IF NOT EXISTS data.sessions (
            id serial,
            user_agent character varying(500),
            device character varying(100),
            orientation character varying(100),
            os character varying(100),
            width integer,
            height integer,
            consent boolean DEFAULT False,
            form boolean DEFAULT False,
            CONSTRAINT sessions_pkey PRIMARY KEY (id)
        );

        CREATE TABLE IF NOT EXISTS data.questions (
            id serial,
            value character varying(1000),
            CONSTRAINT questions_pkey PRIMARY KEY (id)
        );

        CREATE TABLE IF NOT EXISTS data.survey (
            id serial,
            session integer,
            question integer,
            answer text,
            CONSTRAINT survey_pkey PRIMARY KEY (id),
            CONSTRAINT survey_sessions_key FOREIGN KEY (session) REFERENCES data.sessions(id),
            CONSTRAINT survey_questions_key FOREIGN KEY (question) REFERENCES data.questions(id)
        );

        CREATE TABLE IF NOT EXISTS data.levels (
            id serial,
            tier int,
            level int,
            player geometry(Point, 4326),
            target geometry(Point, 4326),
            CONSTRAINT levels_pkey PRIMARY KEY (id)
        );

        CREATE TABLE IF NOT EXISTS data.hints (
            id serial,
            level integer,
            zoom integer,
            hint character varying(1000),
            CONSTRAINT hints_pkey PRIMARY KEY (id),
            CONSTRAINT hints_levels_key FOREIGN KEY (level) REFERENCES data.levels(id)
        );

        CREATE TABLE IF NOT EXISTS data.enemies (
            id serial,
            type character varying(20),
            level integer,
            geom geometry(Point, 4326),
            CONSTRAINT enemies_pkey PRIMARY KEY (id),
            CONSTRAINT enemies_levels_key FOREIGN KEY (level) REFERENCES data.levels(id)
        );

        CREATE TABLE IF NOT EXISTS data.helpers (
            id serial,
            level integer,
            geom geometry(Point, 4326),
            CONSTRAINT helpers_pkey PRIMARY KEY (id),
            CONSTRAINT helpers_levels_key FOREIGN KEY (level) REFERENCES data.levels(id)
        );

        CREATE TABLE IF NOT EXISTS data.games (
            id serial,
            session integer,
            level integer,
            score integer,
            enemies integer,
            helpers integer,
            journey geometry(LineString, 4326),
            CONSTRAINT games_pkey PRIMARY KEY (id),
            CONSTRAINT games_sessions_key FOREIGN KEY (session) REFERENCES data.sessions(id),
            CONSTRAINT games_levels_key FOREIGN KEY (level) REFERENCES data.levels(id)
        );

        CREATE TABLE IF NOT EXISTS data.phases (
            id serial,
            game integer,
            number integer,
            start_time timestamptz,
            end_time timestamptz,
            duration integer,
            score integer,
            CONSTRAINT phases_pkey PRIMARY KEY (id),
            CONSTRAINT phases_games_key FOREIGN KEY (game) REFERENCES data.games(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS data.interactions (
            id serial,
            phase integer,
            type character varying (50),
            subtype character varying (50),
            start_time timestamptz,
            end_time timestamptz,
            duration integer,
            start_zoom numeric(4,2),
            end_zoom numeric(4,2),
            start_center geometry(Point, 4326),
            end_center geometry(Point, 4326),
            CONSTRAINT interactions_pkey PRIMARY KEY (id),
            CONSTRAINT interactions_phases_key FOREIGN KEY (phase) REFERENCES data.phases(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS data.investigation (
            id serial,
            phase integer,
            pixel_x integer,
            pixel_y integer,
            time timestamptz,
            correct boolean,
            geom geometry(Point, 4326),
            CONSTRAINT investigation_pkey PRIMARY KEY (id),
            CONSTRAINT investigation_phases_key FOREIGN KEY (phase) REFERENCES data.phases(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS data.navigation (
            id serial,
            phase integer,
            state character varying(20),
            pixel_x integer,
            pixel_y integer,
            start_time timestamptz,
            end_time timestamptz,
            duration integer,
            computing_duration integer,
            provider character varying(50),
            route geometry(LineString, 4326),
            CONSTRAINT navigation_pkey PRIMARY KEY (id),
            CONSTRAINT navigation_phases_key FOREIGN KEY (phase) REFERENCES data.phases(id) ON DELETE CASCADE
        );    
    `
    await db.query(TABLES);
}

async function insertLevels() {
    const file = fs.readFileSync('./server/configuration.yml', { encoding: 'utf-8' });
    const params = load(file);

    for (let i = 0; i < params.form.length; i++) {
        let q = params.form[i].question;
        // Remove breaks
        q = q.replace('<br>', ' ');
        // Replace single quotes with two single quotes to avoid errors during insertion
        q = q.replace("'", "''");
        let insertion = `
            INSERT INTO data.questions (value)
            VALUES ('${q}');
        `
        await db.query(insertion);
    }

    for (let t = 0; t < params.levels.length; t++) {
        let entry = params.levels[t];

        if (entry.type === 'tier') {
            let levels = entry.content;
            for (let l = 0; l < levels.length; l++) {
                let level = levels[l];

                if (level.player) {
                    const insertion = `
                        INSERT INTO data.levels (tier, level, player, target)
                        VALUES (
                            $1, $2,
                            ST_SetSRID(ST_POINT($3, $4), 4326),
                            ST_SetSRID(ST_POINT($5, $6), 4326)
                        )
                        RETURNING id;
                    `
                    const values = [t, l, level.player[0], level.player[1], level.target[0], level.target[1]]
                    let result = await db.query(insertion, values);

                    let index = result.rows[0].id;
                    for (let zoom in level.hints) {
                        const hint = `
                            INSERT INTO data.hints (level, zoom, hint)
                            VALUES ($1, $2, $3)
                        `;
                        const values = [index, zoom, level.hints[zoom]];
                        await db.query(hint, values);
                    }

                    for (let j = 0; j < level.enemies.length; j++) {
                        const enemies = `
                            INSERT INTO data.enemies (type, level, geom)
                            VALUES ($1, $2, ST_SetSRID(ST_Point($3, $4), 4326))
                        `;
                        const e = level.enemies[j];
                        const p = e.coordinates;
                        const values = [e.type, index, p[0], p[1]];
                        await db.query(enemies, values);
                    }

                    for (let j = 0; j < level.helpers.length; j++) {
                        let b = level.helpers[j];
                        let helpers = `
                            INSERT INTO data.helpers (level, geom)
                            VALUES (${index}, ST_SetSRID(ST_POINT(${b[0]}, ${b[1]}), 4326))
                        `
                        await db.query(helpers);
                    }
                }
            }
        }
    }
}

async function populateResults() {
    let query = `
        SELECT *
		FROM data.levels;
    `;
    let result = await db.query(query);
    if (result.rows.length > 0) {
        for (let i = 0; i < result.rows.length; i++) {
            const lid = result.rows[i].id;
            for (let j = 0; j < 40; j++) {
                let session = `
                    INSERT INTO data.sessions(id)
                    VALUES(default)
                    RETURNING id;
                `
                let s = await db.query(session);
                let sid = s.rows[0].id;
                let score = Math.random() * (500 - 20) + 20;

                let insertion = `
                    INSERT INTO data.games(session, level, score)
                    VALUES(${sid}, ${lid}, ${score});
                `
                await db.query(insertion);
            }
        }
    }
}

export { clearDB, createTables, insertLevels, populateResults }