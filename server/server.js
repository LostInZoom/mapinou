import * as fs from 'fs';
import { load } from "js-yaml";
import express from 'express';
import bodyParser from 'body-parser';
import {
	createSession, getEnding, giveConsent,
	insertForm, insertPiaget, insertPTSOT, insertPurdue, insertResults, insertSBSOD,
	renameSession, verifySession
} from "../.database/requests.js";

const parametersFile = fs.readFileSync('./server/parameters.yml', { encoding: 'utf-8' });
const parameters = load(parametersFile);
const levelsFile = fs.readFileSync('./server/levels.yml', { encoding: 'utf-8' });
const levels = load(levelsFile);
const creditsFile = fs.readFileSync('./server/credits.yml', { encoding: 'utf-8' });
const credits = load(creditsFile);

parameters.levels = levels;
parameters.credits = credits;

fs.readdir('./server/svg', (error, files) => {
	parameters.svgs = {};

	files.forEach((file) => {
		let f = fs.readFileSync('./server/svg/' + file, { encoding: 'utf-8' })
		parameters.svgs[file.replace(/\.[^/.]+$/, "")] = f;
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
	res.json(parameters);
	return res;
});

app.get('/mapinou/ping', (req, res) => {
	res.json({ ok: true });
	return res;
});

app.get('/mapinou/statistics', (req, res) => {
	getEnding().then(results => {
		res.send(JSON.stringify(results));
	});
});

app.post('/mapinou/registration', jsonParser, (req, res) => {
	createSession(req.body).then((infos) => {
		res.send(JSON.stringify(infos));
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

app.post('/mapinou/rename', jsonParser, (req, res) => {
	renameSession(req.body).then((done) => {
		res.send(JSON.stringify({ done: done }));
	});
});

app.post('/mapinou/results', jsonParser, (req, res) => {
	insertResults(req.body).then((highscores) => {
		res.send(JSON.stringify(highscores));
	});
});

app.post('/mapinou/piaget', jsonParser, (req, res) => {
	insertPiaget(req.body).then((done) => {
		res.send(JSON.stringify({ done: done }));
	});
});

app.post('/mapinou/sbsod', jsonParser, (req, res) => {
	insertSBSOD(req.body).then((done) => {
		res.send(JSON.stringify({ done: done }));
	});
});

app.post('/mapinou/ptsot', jsonParser, (req, res) => {
	insertPTSOT(req.body).then(r => {
		res.send(JSON.stringify(r));
	});
});

app.post('/mapinou/purdue', jsonParser, (req, res) => {
	insertPurdue(req.body).then(r => {
		res.send(JSON.stringify(r));
	});
});

let server = app.listen(port, () => {
	console.log(`Listening on port ${port}`);
});

server.keepAliveTimeout = 30000;