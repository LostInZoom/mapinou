import { db } from "./credentials.js";
import { checkVersion } from "./tools.js";

async function createSession(options) {
    let creation = `
        INSERT INTO data.sessions (user_agent, device, orientation, os, width, height, time)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id;
    `
    try {
        let values = [options.userAgent, options.device, options.orientation, options.os, options.width, options.height, new Date().toISOString()];
        let result = await db.query(creation, values);
        let index = result.rows[0].id;
        return index;
    } catch {
        return -1;
    }
}

async function verifySession(index) {
    let verification = `
        SELECT id, consent, form
		FROM data.sessions
		WHERE id = ${index};
    `
    try {
        let result = await db.query(verification);
        if (result.rows.length > 0) {
            return {
                isPresent: true,
                consent: result.rows[0].consent,
                form: result.rows[0].form,
            };
        } else {
            return { isPresent: false };
        }
    } catch {
        return {};
    }
}

async function giveConsent(index) {
    let verification = `
        UPDATE data.sessions
		SET consent = true
		WHERE id = ${index};
    `
    try {
        await db.query(verification);
        return true
    } catch {
        return false;
    }
}

async function insertForm(data) {
    let answers = [];
    for (let q = 0; q < data.form.length; q++) {
        let answer = data.form[q].join(', ').replace('<br>', ' ').replace("'", "''");
        answers.push(`(${data.session}, ${q + 1}, '${answer}')`);
    }
    let values = answers.join(', ');
    let insertion = `
        INSERT INTO data.survey (session, question, answer)
        VALUES ${values};

		UPDATE data.sessions
		SET form = true
		WHERE id = ${data.session};
    `
    try {
        await db.query(insertion);
        return true
    } catch {
        return false;
    }
}

async function insertPiaget(data) {
    let query = '';
    let values = [];

    try {
        let version = await checkVersion(data.game);
        const expIndex = await insertExperience(data, 'piaget', version);

        for (let a = 0; a < data.answers.length; a++) {
            let answer = data.answers[a];
            if (answer) {
                query = `
                    INSERT INTO data.piaget (experience, question, x1, y1, x2, y2, difference, percentage, elapsed, time)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                `
                values = [expIndex, a, answer.x1, answer.y1, answer.x2, answer.y2, answer.difference, answer.heightPercentage, answer.elapsed, answer.time];
                await db.query(query, values);
            }
        }

        return true
    } catch {
        return false;
    }
}

async function insertSBSOD(data) {
    let query = '';
    let values = [];

    try {
        let version = await checkVersion(data.game);
        const expIndex = await insertExperience(data, 'sbsod', version);

        for (let a = 0; a < data.answers.length; a++) {
            let answer = data.answers[a];
            if (answer) {
                query = `
                INSERT INTO data.sbsod (experience, question, answer, time)
                VALUES ($1, $2, $3, $4)
            `
                values = [expIndex, a, answer.answer, answer.time];
                await db.query(query, values);
            }
        }

        return true
    } catch {
        return false;
    }
}

async function insertPTSOT(data) {
    let query = '';
    let values = [];

    try {
        let version = await checkVersion(data.game);
        const expIndex = await insertExperience(data, 'ptsot', version);

        for (let a = 0; a < data.answers.length; a++) {
            let answer = data.answers[a];
            if (answer) {
                query = `
                INSERT INTO data.ptsot (experience, question, real, drawn, difference, elapsed, time)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `
                values = [expIndex, a, answer.trueAngle, answer.drawAngle, answer.difference, answer.elapsed, answer.time];
                await db.query(query, values);
            }
        }

        return true
    } catch {
        return false;
    }
}

async function insertPurdue(data) {
    let query = '';
    let values = [];

    try {
        let version = await checkVersion(data.game);
        const expIndex = await insertExperience(data, 'purdue', version);

        for (let a = 0; a < data.answers.length; a++) {
            let answer = data.answers[a];
            if (answer) {
                query = `
                    INSERT INTO data.purdue (experience, question, answer, correct, elapsed, time)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `
                values = [expIndex, a, answer.value, answer.correct, answer.elapsed, answer.time];
                await db.query(query, values);
            }
        }

        return true
    } catch {
        return false;
    }
}

async function insertResults(data) {
    let query = '';
    let values = [];
    let returning;

    let version = await checkVersion(data.game);

    let highscores = { highscores: [] };
    // try {
    query = `
            SELECT id
            FROM data.levels
            WHERE tier = $1 AND level = $2;
        `
    values = [data.tier, data.level]
    returning = await db.query(query, values);

    if (returning.rows.length > 0) {
        let level = returning.rows[0].id;
        await db.query(
            `DELETE FROM data.games WHERE session = $1 AND level = $2 AND version = $3`,
            [data.session, level, version]
        );

        query = `
                INSERT INTO data.games (session, level, version, score, enemies, helpers, journey)
                VALUES ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_GeomFromText($7), 4326))
                RETURNING id;
            `
        const wkt = 'LINESTRING(' + data.phase2.journey.map(p => `${p[0]} ${p[1]}`).join(', ') + ')';
        values = [data.session, level, version, data.score, data.enemies, data.helpers, wkt];
        returning = await db.query(query, values);
        const gameIndex = returning.rows[0].id;

        const phase1 = data.phase1;
        const phase2 = data.phase2;

        // Insert Phase 1
        query = `
                INSERT INTO data.phases (game, number, start_time, end_time, duration, score)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id;
            `
        values = [gameIndex, 1, phase1.start, phase1.end, phase1.duration, phase1.score];
        returning = await db.query(query, values);
        const phase1Index = returning.rows[0].id;

        // Insert Phase 2
        query = `
			INSERT INTO data.phases (game, number, start_time, end_time, duration, score)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING id;
		`
        values = [gameIndex, 2, phase2.start, phase2.end, phase2.duration, phase2.score];
        returning = await db.query(query, values);
        const phase2Index = returning.rows[0].id;

        values = [];
        let inserts = [];
        // Phase 1 interactions
        phase1.interactions.forEach(i => {
            const center1 = `POINT(${i.center1[0]} ${i.center1[1]})`;
            const center2 = `POINT(${i.center2[0]} ${i.center2[1]})`;
            values.push(phase1Index, i.type, i.subtype ?? null, i.start, i.end, i.duration, i.zoom1, i.zoom2, center1, center2, i.extent1, i.extent2);
            const base = values.length - 12;
            inserts.push(`(
                $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8},
                ST_SetSRID(ST_GeomFromText($${base + 9}), 4326), ST_SetSRID(ST_GeomFromText($${base + 10}), 4326),
                ST_SetSRID(ST_GeomFromText($${base + 11}), 4326), ST_SetSRID(ST_GeomFromText($${base + 12}), 4326)
            )`);
        });
        // Phase 2 interactions
        phase2.interactions.forEach(i => {
            const center1 = `POINT(${i.center1[0]} ${i.center1[1]})`;
            const center2 = `POINT(${i.center2[0]} ${i.center2[1]})`;
            values.push(phase2Index, i.type, i.subtype ?? null, i.start, i.end, i.duration, i.zoom1, i.zoom2, center1, center2, i.extent1, i.extent2);
            const base = values.length - 12;
            inserts.push(`(
                $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8},
                ST_SetSRID(ST_GeomFromText($${base + 9}), 4326), ST_SetSRID(ST_GeomFromText($${base + 10}), 4326),
                ST_SetSRID(ST_GeomFromText($${base + 11}), 4326), ST_SetSRID(ST_GeomFromText($${base + 12}), 4326)
            )`);
        });
        query = `
            INSERT INTO data.interactions (
                phase, type, subtype, start_time, end_time, duration,
                start_zoom, end_zoom, start_center, end_center, start_extent, end_extent
            )
            VALUES ${inserts.join(', ')};
        `;
        await db.query(query, values);

        // Investigation phase 1
        values = [];
        inserts = [];
        phase1.clics.forEach(c => {
            const point = `POINT(${c.coordinates[0]} ${c.coordinates[1]})`;
            values.push(phase1Index, parseInt(c.pixel[0]), parseInt(c.pixel[1]), c.time, c.correct, point);
            const base = values.length - 6;
            inserts.push(`(
                    $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5},
                    ST_SetSRID(ST_GeomFromText($${base + 6}), 4326))
                `);
        });
        query = `
                INSERT INTO data.investigation (phase, pixel_x, pixel_y, time, correct, geom)
                VALUES ${inserts};
            `
        await db.query(query, values);

        // Navigation phase 2
        values = [];
        inserts = [];

        phase2.clics.forEach(c => {
            let route = null;
            if (c.route !== undefined && c.route.length > 0) {
                route = 'LINESTRING(' + c.route.map(p => `${p[0]} ${p[1]}`).join(', ') + ')';
            }

            const destination = `POINT(${c.coordinates[0]} ${c.coordinates[1]})`;

            values.push(
                phase2Index,
                c.state,
                parseInt(c.pixel[0]),
                parseInt(c.pixel[1]),
                c.start,
                c.end,
                parseInt(c.duration),
                parseInt(c.computing),
                c.provider,
                destination,
                route
            );

            const base = values.length - 11;

            inserts.push(
                `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9},
                    ST_SetSRID(ST_GeomFromText($${base + 10}), 4326),
                    ${route ? `ST_SetSRID(ST_GeomFromText($${base + 11}), 4326)` : `$${base + 11}`})`
            );
        });

        query = `
                INSERT INTO data.navigation 
                (phase, state, pixel_x, pixel_y, start_time, end_time, duration, computing_duration, provider, destination, route)
                VALUES ${inserts.join(', ')}
            `;
        await db.query(query, values);

        let highscoresQuery = `
                SELECT session, enemies, helpers, score
                FROM data.games
                WHERE level = ${level};
            `
        let hs = await db.query(highscoresQuery);
        highscores.highscores = hs.rows;
    }
    return highscores;
    // } catch {
    //     return highscores;
    // }
}

async function insertExperience(data, name, version) {
    await db.query(
        `DELETE FROM data.experiences WHERE session = $1 AND name = $2`,
        [data.session, name]
    );

    const query = `
        INSERT INTO data.experiences (name, session, version, start_time, end_time, duration)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id;
    `
    const values = [name, data.session, version, data.start, data.end, data.duration];

    const returning = await db.query(query, values);
    return returning.rows[0].id;
}

export {
    createSession, verifySession,
    giveConsent, insertForm,
    insertResults, insertPiaget, insertSBSOD, insertPTSOT, insertPurdue
};