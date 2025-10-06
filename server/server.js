import { db } from "../.database/credentials.js";

import * as fs from 'fs';
import { load } from "js-yaml";
import express from 'express';
import bodyParser from 'body-parser';

const file = fs.readFileSync('./server/configuration.yml', { encoding: 'utf-8' });
const params = load(file);

fs.readdir('./server/svg', (error, files) => {
	params.svgs = {};

	files.forEach((file) => {
		let f = fs.readFileSync('./server/svg/' + file, { encoding: 'utf-8' })
		params.svgs[file.replace(/\.[^/.]+$/, "")] = f;
	})
});

const app = express();
const port = 8001;

const jsonParser = bodyParser.json();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// app.use('/mapinou', express.static(path.join(__dirname, 'dist/mapinou')));
app.use('/', express.static('dist'));

app.get('/mapinou/configuration', (req, res) => {
	res.json(params);
	return res;
});

app.post('/mapinou/registration', jsonParser, (req, res) => {
	createSession(req.body).then((index) => {
		res.send(JSON.stringify({ sessionId: index }));
	});
});

app.post('/mapinou/verification', jsonParser, (req, res) => {
	verifySession(req.body.sessionId).then((data) => {
		res.send(JSON.stringify(data));
	});
});

app.post('/mapinou/consent', jsonParser, (req, res) => {
	giveConsent(req.body.session).then((done) => {
		res.send(JSON.stringify({ done: done }));
	});
});

app.post('/mapinou/form', jsonParser, (req, res) => {
	insertForm(req.body).then((done) => {
		res.send(JSON.stringify({ done: done }));
	});
});

app.post('/mapinou/results', jsonParser, (req, res) => {
	insertResults(req.body).then((highscores) => {
		res.send(JSON.stringify(highscores));
	});
});

let server = app.listen(port, () => {
	console.log(`Listening on port ${port}`);
});

server.keepAliveTimeout = 30000;

async function createSession(options) {
	let creation = `
        INSERT INTO data.sessions (user_agent, device, orientation, os, width, height)
        VALUES (
			'${options.userAgent}',
			'${options.device}', '${options.orientation}', '${options.os}', 
			${options.width}, ${options.height}
		)
        RETURNING id;
    `
	try {
		let result = await db.query(creation);
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

async function insertResults(data) {
	let levelQuery = `
        SELECT id
		FROM data.levels
		WHERE tier = ${data.tier} AND level = ${data.level};
    `

	let highscores = { highscores: [] };
	// try {
	let result = await db.query(levelQuery);
	if (result.rows.length > 0) {
		let level = result.rows[0].id;
		await db.query(
			`DELETE FROM data.games WHERE session = $1 AND level = $2`,
			[data.session, level]
		);

		let query;
		let values;
		let returning;

		query = `
			INSERT INTO data.games (session, level, score, enemies, helpers, journey)
			VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_GeomFromText($6), 4326))
			RETURNING id;
		`
		const wkt = 'LINESTRING(' + data.phase2.journey.map(p => `${p[0]} ${p[1]}`).join(', ') + ')';
		values = [data.session, level, data.score, data.enemies, data.helpers, wkt];
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
			values.push(phase1Index, i.type, i.subtype ?? null, i.start, i.end, i.duration, i.zoom1, i.zoom2, center1, center2);
			const base = values.length - 10;
			inserts.push(`
				($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8},
				ST_SetSRID(ST_GeomFromText($${base + 9}), 4326), ST_SetSRID(ST_GeomFromText($${base + 10}), 4326))
			`);
		});
		// Phase 2 interactions
		phase2.interactions.forEach(i => {
			const center1 = `POINT(${i.center1[0]} ${i.center1[1]})`;
			const center2 = `POINT(${i.center2[0]} ${i.center2[1]})`;
			values.push(phase2Index, i.type, i.subtype ?? null, i.start, i.end, i.duration, i.zoom1, i.zoom2, center1, center2);
			const base = values.length - 10;
			inserts.push(`
				($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8},
				ST_SetSRID(ST_GeomFromText($${base + 9}), 4326), ST_SetSRID(ST_GeomFromText($${base + 10}), 4326))
			`);
		});
		query = `
			INSERT INTO data.interactions (phase, type, subtype, start_time, end_time, duration, start_zoom, end_zoom, start_center, end_center)
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
			inserts.push(`
				($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5},
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

			inserts.push(`(
				$${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9},
				ST_SetSRID(ST_GeomFromText($${base + 10}), 4326),
				${route ? `ST_SetSRID(ST_GeomFromText($${base + 11}), 4326)` : `$${base + 11}`}
			)`);
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
	// 	return highscores;
	// }
}