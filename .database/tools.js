import { db } from "./credentials.js";
import * as fs from 'fs';
import { load } from "js-yaml";
import * as d3 from "d3";
import zulipInit from "zulip-js";

import translate from "translate";
import { generateId } from "zoo-ids";
import { configLapinou, configPaloma, configPip } from './credentials.js';

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

/**
 * Initialize the tables inside the database.
 */
async function createTables() {
    const TABLES = `
        CREATE TABLE IF NOT EXISTS data.sessions (
            id serial,
            name character varying(500),
            user_agent character varying(500),
            device character varying(100),
            orientation character varying(100),
            os character varying(100),
            width integer,
            height integer,
            consent boolean DEFAULT False,
            form boolean DEFAULT False,
            time timestamptz,
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
            tolerance_click integer,
            tolerance_target integer,
            tolerance_enemies_snake integer,
            tolerance_enemies_eagle integer,
            tolerance_enemies_hunter integer,
            tolerance_helpers integer,
            visibility_helpers integer,
            speed_travel_kmh integer,
            speed_roaming_pxs integer,
            invulnerability_ms integer,
            routing_maxzoom numeric(4,2),
            routing_minzoom numeric(4,2),
            time timestamptz,
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
            version integer,
            tier int,
            level int,
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
            version integer,
            score integer,
            enemies integer,
            helpers integer,
            distance double precision,
            journey geometry(LineString, 4326),
            CONSTRAINT games_pkey PRIMARY KEY (id),
            CONSTRAINT games_sessions_key FOREIGN KEY (session) REFERENCES data.sessions(id),
            CONSTRAINT games_levels_key FOREIGN KEY (level) REFERENCES data.levels(id),
            CONSTRAINT games_versions_key FOREIGN KEY (version) REFERENCES data.versions(id)
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
            start_extent geometry(Polygon, 4326),
            end_extent geometry(Polygon, 4326),
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

/**
 * Insert levels inside the database tables using the configuration YAML files.
 */
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

/**
 * Retrieve the current version or create a new one if it doesn't exist.
 * @param {int} game 
 * @returns {int} index of the version
 */
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
                tolerance_click, tolerance_target, tolerance_enemies_snake, tolerance_enemies_eagle, tolerance_enemies_hunter, tolerance_helpers,
                visibility_helpers, speed_travel_kmh, speed_roaming_pxs,
                invulnerability_ms, routing_minzoom, routing_maxzoom, time
            )
            VALUES (
                $1, $2,
                $3, $4,
                $5, $6,
                $7, $8, $9,
                $10, $11, $12, $13, $14, $15,
                $16, $17, $18,
                $19, $20, $21, $22
            )
            RETURNING id;
        `
        let values = [
            game.version, game.codename,
            game.score.increment.default, game.score.increment.movement,
            game.score.refresh.default, game.score.refresh.movement,
            game.score.modifier.enemies, game.score.modifier.position, game.score.modifier.helpers,
            game.tolerance.click, game.tolerance.target, game.tolerance.enemies.snake, game.tolerance.enemies.eagle, game.tolerance.enemies.hunter, game.tolerance.helpers,
            game.visibility.helpers, game.speed.travel, game.speed.roaming,
            game.invulnerability, game.routing.minzoom, game.routing.maxzoom, new Date().toISOString()
        ]
        let returning = await db.query(query, values);
        return returning.rows[0].id;
    }
}

/**
 * Generate fake results by creating new sessions and games to have a working leaderboard.
 * @param {int} amount 
 */
async function populateResults(amount) {
    let query = `
        SELECT *
		FROM data.levels;
    `;

    let result = await db.query(query);

    const indexes = [];
    for (let index = 0; index < amount; index++) {
        const animal = generateId(null, {
            numAdjectives: 1,
            caseStyle: 'titlecase',
            delimiter: ' '
        });
        translate.engine = "google";
        const translation = await translate(animal, "fr");

        let session = `
            INSERT INTO data.sessions(name)
            VALUES($1)
            RETURNING id;
        `
        let s = await db.query(session, [translation]);
        indexes.push(s.rows[0].id);
    }

    if (result.rows.length > 0) {
        for (let i = 0; i < result.rows.length; i++) {
            const randomNormal = d3.randomNormal(50, 30);
            const norm = Array.from({ length: amount }, () => Math.max(0, Math.round(randomNormal())));

            const lid = result.rows[i].id;
            let values = [];
            let inserts = [];

            for (let j = 0; j < amount; j++) {
                let val = norm[j];
                values.push(indexes[j], lid, parseInt(val));
                const base = values.length - 3;
                inserts.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
            }

            query = `
                INSERT INTO data.games(session, level, score)
                VALUES ${inserts};
            `
            await db.query(query, values);
        }
    }
}

/**
 * Add a name with adjective animal if it is missing.
 */
async function nameMissingSessions() {
    let query = `
        SELECT id, name
		FROM data.sessions;
    `;

    let result = await db.query(query);

    if (result.rows.length > 0) {
        for (let i = 0; i < result.rows.length; i++) {
            const id = result.rows[i].id;
            const name = result.rows[i].name;

            if (!name) {
                const animal = generateId(null, {
                    numAdjectives: 1,
                    caseStyle: 'titlecase',
                    delimiter: ' '
                });
                translate.engine = "google";
                const translation = await translate(animal, "fr");
                let rename = `
                    UPDATE data.sessions
                    SET name = $1
                    WHERE id = $2;
                `
                await db.query(rename, [translation, id]);
            }
        }
    }
}

/**
 * Retrieve database information to be sent to a zulip post.
 * @param {string} type 
 */
async function retrieveDatabaseInfos(type) {
    let content = '';

    if (type === 'lapinou') {
        let query = `
            SELECT count(*) as number, sum(distance) as distance, sum(helpers) as helpers
            FROM data.games
        `
        let results = await db.query(query);
        const total = results.rows[0].number;
        const distance = results.rows[0].distance;
        const helpers = results.rows[0].helpers;

        // Number of games played last week
        query = `
            SELECT COUNT(DISTINCT g.id) AS number, sum(g.helpers) as helpers, sum(distance) as distance
            FROM data.games g
            JOIN data.phases p ON p.game = g.id
            WHERE p.number = 2
                AND end_time >= date_trunc('week', now()) - interval '7 days'
                AND end_time <  date_trunc('week', now());
        `
        results = await db.query(query);
        let games = results.rows[0];

        const nb = parseInt(games.number);
        if (nb === 0) {
            content += `Je m'ennuie ! La semaine dernière, je n'ai fais aucune partie...`
        }
        else if (nb < 10) {
            content += `C'est tranquilou en ce moment !
La semaine dernière, je n'ai fais que **${nb}** parties et je n'ai couru que **${Math.round(parseInt(games.distance) / 1000)}** kilomètres.`
        } else {
            content += `Pfiouu, je suis fatigué ce matin !
La semaine dernière, j'ai fais **${nb}** parties et j'ai couru **${Math.round(parseInt(games.distance) / 1000)}** kilomètres quand même.`
        }

        const whelpers = parseInt(games.helpers);
        if (whelpers === 0) {
            content += ` Je n'ai pas mangé de légume, j'ai faim !`;
        } else if (whelpers < 20) {
            content += ` Je n'ai mangé que **${whelpers}** légumes, c'est pas super...`;
        } else {
            content += ` J'ai quand même mangé **${whelpers}** légumes, ça fait plaisir !`;
        }

        content += `\n\nDepuis le début, j'ai fais **${total}** parties, couru **${Math.round(parseInt(distance) / 1000)}** kilomètres et mangé **${helpers}** légumes.`;
    } else if (type === 'paloma') {
        content += "Coo coo ! Des petites statistiques pour démarrer la semaine 📊\n"

        // Number of sessions created last week
        let query = `
            SELECT count(*) as number
            FROM data.sessions
            WHERE time >= date_trunc('week', now()) - interval '7 days'
                AND time <  date_trunc('week', now());
        `;
        let results = await db.query(query);
        let weekSessions = results.rows[0].number;

        // Total number of sessions
        query = `
            SELECT count(*) as number
            FROM data.sessions
        `;
        results = await db.query(query);
        let totalSessions = results.rows[0].number;

        content += `
Depuis le début de l'expérience, **${totalSessions}** personnes différentes ont commencé Mapinou,
dont **${weekSessions}** la semaine dernière. 📈
`

        // Percentage of completed levels
        query = `
            WITH selected_levels AS (
                SELECT unnest(ARRAY[1,4,8,12,16]) AS level
            ),
            all_sessions AS (
                SELECT id AS session_id
                FROM data.sessions
            ),
            sessions_with_level AS (
                SELECT DISTINCT g.level, g.session
                FROM data.games g
                WHERE g.level IN (1,4,8,12,16)
            )
            SELECT
                sl.level,
                COUNT(sw.session) AS number,
                ROUND(100.0 * COUNT(sw.session) / (SELECT COUNT(*) FROM all_sessions)) AS percentage
            FROM selected_levels sl
            LEFT JOIN sessions_with_level sw ON sw.level = sl.level
            GROUP BY sl.level
            ORDER BY sl.level;
        `
        results = await db.query(query);
        results.rows.forEach(row => {
            content += `- **${row.percentage}%** ont dépassé le niveau ${row.level} => **${row.number}** personnes\n`
        });
        content += '\n';

        // Percentage of os
        query = `
            SELECT os, COUNT(*) AS number, ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER ()) AS percentage
            FROM data.sessions
            GROUP BY os
            ORDER BY number DESC;
        `
        results = await db.query(query);

        results.rows.forEach((row, i) => {
            let device = row.os || row.os === 'unknown' ? row.os : "un apareil inconnu";
            if (i === 0) {
                content += `**${row.percentage}%** jouent sur ${device}`
            } else {
                content += `**${row.percentage}%** sur ${device}`
            }

            if (i === results.rows.length - 1) {
                content += ' 📱';
            } else if (i === results.rows.length - 2) {
                content += ', et '
            } else {
                content += ', ';
            }
        });

    } else if (type === 'pip') {
        let query = `
            SELECT COUNT(DISTINCT g.id) AS number, sum(g.enemies) as enemies
            FROM data.games g
            JOIN data.phases p ON p.game = g.id
            WHERE p.number = 2
                AND end_time >= date_trunc('week', now()) - interval '7 days'
                AND end_time <  date_trunc('week', now());
        `
        let results = await db.query(query);
        let games = results.rows[0];

        query = `
            SELECT sum(enemies) as enemies
            FROM data.games
        `
        results = await db.query(query);
        let total = results.rows[0].enemies;

        const enemies = parseInt(games.enemies);
        if (enemies === 0) {
            content += `Ssss ! Pas de chance, on a eu aucun lapin la semaine dernière ! On reste à **${total}** lapins.`
        }
        else if (enemies < 15) {
            content += `Ssss ! On a pas attrapé grand chose la semaine dernière, seulement **${enemies}** lapins. Ça nous fait quand même un total de **${total}** lapins.`
        } else {
            content += `Ssss ! C'était une grosse semaine, on a chopé **${enemies}** lapins. Ça nous fait un total de **${total}** lapins, pas mal !`
        }
    }

    if (content) {
        let zulip;
        if (type === 'lapinou') { zulip = await zulipInit(configLapinou); }
        else if (type === 'paloma') { zulip = await zulipInit(configPaloma); }
        else if (type === 'pip') { zulip = await zulipInit(configPip); }
        const response = await zulip.messages.send({
            to: "Mapinou",
            type: "stream",
            topic: "news",
            content: content
        });
    }
}

export { clearDB, createTables, insertLevels, populateResults, checkVersion, nameMissingSessions, retrieveDatabaseInfos }