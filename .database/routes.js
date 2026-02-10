import express from 'express';
import * as zip from "@zip.js/zip.js";

import { db } from "./credentials.js";
import { exportAuth } from './auth.js';
import { stringify } from 'csv-stringify/sync';

const router = express.Router();

function createCSV(data) {
    const csv = stringify(data.map(row => {
        const newRow = {};
        for (const key in row) {
            const val = row[key];
            newRow[key] = val instanceof Date ? val.toISOString() : val;
        }
        return newRow;
    }), {
        header: true,
        delimiter: '|',
    });
    return new TextEncoder().encode(csv);
}

router.get('/mapinou/download', exportAuth, async (req, res) => {
    try {
        const zipWriter = new zip.ZipWriter(new zip.Uint8ArrayWriter());

        const date = new Date().toISOString().slice(0, 10);
        const zipFilename = `mapinou-${date}.zip`;

        // Retrieve the survey data
        let query = `
            WITH survey AS (
                SELECT
                    s.id AS session, device, orientation, os, width, height, consent, form, time, name, user_agent,
                    q.id,
                    sv.answer
                FROM data.sessions s
                LEFT JOIN data.survey sv ON sv.session = s.id
                LEFT JOIN data.questions q ON q.id = sv.question
            )
            SELECT
                session, device, orientation, os, width, height, consent, form, time, name, user_agent,
                MAX(CASE WHEN id = 1 THEN answer END) AS "gender",
                MAX(CASE WHEN id = 2 THEN answer END) AS "age",
                MAX(CASE WHEN id = 3 THEN answer END) AS "map_usage"
            FROM survey
            GROUP BY session, device, orientation, os, width, height, consent, form, time, name, user_agent
            ORDER BY session;
        `

        let results = await db.query(query);
        const sessionsFilename = `mapinou-sessions-${date}.csv`;
        const sessionsData = createCSV(results.rows);
        await zipWriter.add(sessionsFilename, new zip.Uint8ArrayReader(sessionsData));

        query = `
            SELECT
                g.session::integer,
                g.level,

                g.distance::double precision AS distance,
                g.enemies::integer AS predators,
                g.helpers::integer AS vegetables,

                COALESCE(p.duration_phase1, 0)::integer AS duration_phase1,
                COALESCE(p.duration_phase2, 0)::integer AS duration_phase2,
                COALESCE(p.duration_phase1, 0) + COALESCE(p.duration_phase2, 0) AS duration_total,

                COALESCE(p.score_phase1, 0)::integer AS score_phase1,
                COALESCE(p.score_phase2, 0)::integer AS score_phase2,
                COALESCE(p.score_phase1, 0) + COALESCE(p.score_phase2, 0) AS score_total,

                COALESCE(i.total_investigations, 0)::integer AS clics_phase1,
                COALESCE(r.total_interactions, 0)::integer AS clics_phase2,
                COALESCE(i.total_investigations, 0) + COALESCE(r.total_interactions, 0) AS clics_total,

                COALESCE(r.zoom_in_phase1, 0)::integer AS zoomin_phase1,
                COALESCE(r.zoom_in_phase2, 0)::integer AS zoomin_phase2,
                COALESCE(r.zoom_in_phase1, 0) + COALESCE(r.zoom_in_phase2, 0) AS zoomin_total,

                COALESCE(r.zoom_out_phase1, 0)::integer AS zoomout_phase1,
                COALESCE(r.zoom_out_phase2, 0)::integer AS zoomout_phase2,
                COALESCE(r.zoom_out_phase1, 0) + COALESCE(r.zoom_out_phase2, 0) AS zoomout_total,

                COALESCE(r.pan_phase1, 0)::integer AS pan_phase1,
                COALESCE(r.pan_phase2, 0)::integer AS pan_phase2,
                COALESCE(r.pan_phase1, 0) + COALESCE(r.pan_phase2, 0) AS pan_total

            FROM data.games g
            JOIN data.sessions s ON g.session = s.id

            LEFT JOIN (
                SELECT
                    ph.game,

                    SUM(ph.duration) FILTER (WHERE ph.number = 1) AS duration_phase1,
                    SUM(ph.duration) FILTER (WHERE ph.number = 2) AS duration_phase2,

                    SUM(ph.score) FILTER (WHERE ph.number = 1) AS score_phase1,
                    SUM(ph.score) FILTER (WHERE ph.number = 2) AS score_phase2

                FROM data.phases ph
                GROUP BY ph.game
            ) p ON g.id = p.game

            LEFT JOIN (
                SELECT
                    ph.game,
                    COUNT(inv.id) AS total_investigations
                FROM data.investigation inv
                JOIN data.phases ph ON inv.phase = ph.id
                GROUP BY ph.game
            ) i ON g.id = i.game

            LEFT JOIN (
                SELECT
                    ph.game,

                    COUNT(inter.id) AS total_interactions,

                    COUNT(*) FILTER (
                        WHERE inter.type = 'zoom in' AND ph.number = 1
                    ) AS zoom_in_phase1,

                    COUNT(*) FILTER (
                        WHERE inter.type = 'zoom in' AND ph.number = 2
                    ) AS zoom_in_phase2,

                    COUNT(*) FILTER (
                        WHERE inter.type = 'zoom out' AND ph.number = 1
                    ) AS zoom_out_phase1,

                    COUNT(*) FILTER (
                        WHERE inter.type = 'zoom out' AND ph.number = 2
                    ) AS zoom_out_phase2,

                    COUNT(*) FILTER (
                        WHERE inter.type = 'pan' AND ph.number = 1
                    ) AS pan_phase1,

                    COUNT(*) FILTER (
                        WHERE inter.type = 'pan' AND ph.number = 2
                    ) AS pan_phase2

                FROM data.interactions inter
                JOIN data.phases ph ON inter.phase = ph.id
                GROUP BY ph.game
            ) r ON g.id = r.game

            ORDER BY session, level;
        `

        results = await db.query(query);
        const gamesFilename = `mapinou-games-${date}.csv`;
        const gamesData = createCSV(results.rows);
        await zipWriter.add(gamesFilename, new zip.Uint8ArrayReader(gamesData));

        query = `
            SELECT
                e.session, p.question, p.x1, p.y1, p.x2, p.y2,
                p.difference as difference_horizontal, p.percentage as percentage_height,
                p.elapsed as duration
            FROM data.piaget p
            JOIN data.experiences e ON p.experience = e.id
            ORDER BY e.session, p.question;
        `

        results = await db.query(query);
        const piagetFilename = `mapinou-piaget-${date}.csv`;
        const piagetData = createCSV(results.rows);
        await zipWriter.add(piagetFilename, new zip.Uint8ArrayReader(piagetData));

        query = `
            SELECT
                e.session, s.question, s.answer
            FROM data.sbsod s
            JOIN data.experiences e ON s.experience = e.id
            ORDER BY e.session, s.question;
        `

        results = await db.query(query);
        const sbsodFilename = `mapinou-sbsod-${date}.csv`;
        const sbsodData = createCSV(results.rows);
        await zipWriter.add(sbsodFilename, new zip.Uint8ArrayReader(sbsodData));

        query = `
            SELECT
                e.session, p.question,
                p.real as true_angle, p.drawn as drawn_angle, p.difference as angle_difference,
                p.elapsed as duration
            FROM data.ptsot p
            JOIN data.experiences e ON p.experience = e.id
            ORDER BY e.session, p.question;
        `

        results = await db.query(query);
        const ptsotFilename = `mapinou-ptsot-${date}.csv`;
        const ptsotData = createCSV(results.rows);
        await zipWriter.add(ptsotFilename, new zip.Uint8ArrayReader(ptsotData));

        query = `
            SELECT
                e.session, p.question, p.answer, p.correct, p.elapsed as duration
            FROM data.purdue p
            JOIN data.experiences e ON p.experience = e.id
            ORDER BY e.session, p.question;
        `

        results = await db.query(query);
        const purdueFilename = `mapinou-purdue-${date}.csv`;
        const purdueData = createCSV(results.rows);
        await zipWriter.add(purdueFilename, new zip.Uint8ArrayReader(purdueData));

        const zipData = await zipWriter.close();
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${zipFilename}"`
        );
        res.send(Buffer.from(zipData));
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur export CSV');
    }
});

export default router;