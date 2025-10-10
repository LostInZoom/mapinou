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

        CREATE TABLE IF NOT EXISTS data.versions (
            id serial,
            version character varying(20),
            codename character varying(20),
            score_increment_default integer,
            score_increment_movement integer,
            score_refresh_default integer,
            score_refresh_movement integer,
            score_modifier_position integer,
            score_modifier_enemies integer,
            score_modifier_helpers integer,
            tolerance_target integer,
            tolerance_enemies_snake integer,
            tolerance_enemies_eagle integer,
            tolerance_enemies_hunter integer,
            tolerance_helpers integer,
            visibility_helpers integer,
            speed_travel_kmh integer,
            speed_roaming_pxs integer,
            invulnerability_ms integer,
            routing_zoom numeric(4,2),
            CONSTRAINT versions_pkey PRIMARY KEY (id)
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
            version integer,
            player geometry(Point, 4326),
            target geometry(Point, 4326),
            CONSTRAINT levels_pkey PRIMARY KEY (id),
            CONSTRAINT levels_versions_key FOREIGN KEY (version) REFERENCES data.versions(id)
        );

        CREATE TABLE IF NOT EXISTS data.hints (
            id serial,
            level integer,
            zoom numeric(4,2),
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

        CREATE TABLE IF NOT EXISTS data.experiences (
            id serial,
            name character varying(10),
            session integer,
            version integer,
            start_time timestamptz,
            end_time timestamptz,
            duration integer,
            CONSTRAINT experiences_pkey PRIMARY KEY (id),
            CONSTRAINT experiences_session_key FOREIGN KEY (session) REFERENCES data.sessions(id),
            CONSTRAINT experiences_version_key FOREIGN KEY (version) REFERENCES data.versions(id)
        );

        CREATE TABLE IF NOT EXISTS data.piaget (
            id serial,
            experience integer,
            question integer,
            x1 double precision,
            y1 double precision,
            x2 double precision,
            y2 double precision,
            difference double precision,
            percentage double precision,
            elapsed integer,
            time timestamptz,
            CONSTRAINT piaget_pkey PRIMARY KEY (id),
            CONSTRAINT piaget_experiences_key FOREIGN KEY (experience) REFERENCES data.experiences(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS data.sbsod (
            id serial,
            experience integer,
            question integer,
            answer integer,
            time timestamptz,
            CONSTRAINT sbsod_pkey PRIMARY KEY (id),
            CONSTRAINT sbsod_experiences_key FOREIGN KEY (experience) REFERENCES data.experiences(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS data.ptsot (
            id serial,
            experience integer,
            question integer,
            real double precision,
            drawn double precision,
            difference double precision,
            elapsed integer,
            time timestamptz,
            CONSTRAINT ptsot_pkey PRIMARY KEY (id),
            CONSTRAINT ptsot_experiences_key FOREIGN KEY (experience) REFERENCES data.experiences(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS data.purdue (
            id serial,
            experience integer,
            question integer,
            answer integer,
            correct boolean,
            elapsed integer,
            time timestamptz,
            CONSTRAINT purdue_pkey PRIMARY KEY (id),
            CONSTRAINT purdue_experiences_key FOREIGN KEY (experience) REFERENCES data.experiences(id) ON DELETE CASCADE
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
            destination geometry(Point, 4326),
            route geometry(LineString, 4326),
            CONSTRAINT navigation_pkey PRIMARY KEY (id),
            CONSTRAINT navigation_phases_key FOREIGN KEY (phase) REFERENCES data.phases(id) ON DELETE CASCADE
        );    
    `
    await db.query(TABLES);
}

async function insertLevels() {
    const parametersFile = fs.readFileSync('./server/parameters.yml', { encoding: 'utf-8' });
    const parameters = load(parametersFile);
    const levelsFile = fs.readFileSync('./server/levels.yml', { encoding: 'utf-8' });
    const levels = load(levelsFile);

    let query = '';
    let values = [];
    let result = [];

    for (let i = 0; i < parameters.form.length; i++) {
        let q = parameters.form[i].question;
        // Remove breaks
        q = q.replace('<br>', ' ');
        // Replace single quotes with two single quotes to avoid errors during insertion
        q = q.replace("'", "''");
        query = `
            INSERT INTO data.questions (value)
            VALUES ('${q}');
        `
        await db.query(query);
    }

    // Insert version
    const versionId = await checkVersion(parameters.game);

    for (let t = 0; t < levels.length; t++) {
        let entry = levels[t];

        if (entry.type === 'tier') {
            for (let l = 0; l < entry.content.length; l++) {
                let level = entry.content[l];

                if (level.player) {
                    query = `
                        INSERT INTO data.levels (tier, level, version, player, target)
                        VALUES (
                            $1, $2, $3,
                            ST_SetSRID(ST_POINT($4, $5), 4326),
                            ST_SetSRID(ST_POINT($6, $7), 4326)
                        )
                        RETURNING id;
                    `
                    values = [t, l, versionId, level.player[0], level.player[1], level.target[0], level.target[1]]
                    result = await db.query(query, values);

                    let index = result.rows[0].id;
                    for (let zoom in level.hints) {
                        query = `
                            INSERT INTO data.hints (level, zoom, hint)
                            VALUES ($1, $2, $3);
                        `;
                        values = [index, zoom, level.hints[zoom]];
                        await db.query(query, values);
                    }

                    for (let j = 0; j < level.enemies.length; j++) {
                        query = `
                            INSERT INTO data.enemies (type, level, geom)
                            VALUES ($1, $2, ST_SetSRID(ST_Point($3, $4), 4326));
                        `;
                        const e = level.enemies[j];
                        const p = e.coordinates;
                        values = [e.type, index, p[0], p[1]];
                        await db.query(query, values);
                    }

                    for (let j = 0; j < level.helpers.length; j++) {
                        let b = level.helpers[j];
                        query = `
                            INSERT INTO data.helpers (level, geom)
                            VALUES ($1, ST_SetSRID(ST_POINT($2, $3), 4326));
                        `
                        values = [index, b[0], b[1]];
                        await db.query(query, values);
                    }
                }
            }
        }
    }
}

async function checkVersion(game) {
    let query = `
        SELECT *
		FROM data.versions
        WHERE version = $1;
    `;
    let values = [String(game.version)];
    let result = await db.query(query, values);

    if (result.rows.length > 0) {
        return result.rows[0].id;
    } else {
        query = `
            INSERT INTO data.versions (
                version, codename,
                score_increment_default, score_increment_movement,
                score_refresh_default, score_refresh_movement,
                score_modifier_position, score_modifier_enemies, score_modifier_helpers,
                tolerance_target, tolerance_enemies_snake, tolerance_enemies_eagle, tolerance_enemies_hunter, tolerance_helpers,
                visibility_helpers, speed_travel_kmh, speed_roaming_pxs,
                invulnerability_ms, routing_zoom
            )
            VALUES (
                $1, $2,
                $3, $4,
                $5, $6,
                $7, $8, $9,
                $10, $11, $12, $13, $14,
                $15, $16, $17,
                $18, $19
            )
            RETURNING id;
        `
        let values = [
            game.version, game.codename,
            game.score.increment.default, game.score.increment.movement,
            game.score.refresh.default, game.score.refresh.movement,
            game.score.modifier.enemies, game.score.modifier.position, game.score.modifier.helpers,
            game.tolerance.target, game.tolerance.enemies.snake, game.tolerance.enemies.eagle, game.tolerance.enemies.hunter, game.tolerance.helpers,
            game.visibility.helpers, game.speed.travel, game.speed.roaming,
            game.invulnerability, game.routing
        ]
        let returning = await db.query(query, values);
        return returning.rows[0].id;
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

export { clearDB, createTables, insertLevels, populateResults, checkVersion }