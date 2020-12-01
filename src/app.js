require('dotenv').config()

const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const helmet = require('helmet')
const winston = require('winston')
const { v4: uuid } = require('uuid');

const { NODE_ENV } = require('./config');

const app = express();

const morganOption = (NODE_ENV === 'production')
	? 'tiny'
	: 'common';

const logger = winston.createLogger({
	level: 'info',
	format: winston.format.json(),
	transports: [
		new winston.transports.File({ filename: 'info.log'  })
	]
});

if(NODE_ENV !== 'production') {
	logger.add(new winston.transports.Console({
		format: winston.format.simple()
	}))
}

let bookmarks = [
	{
		id: '1',
		name: 'Google',
		url: 'https://www.google.com',
		rating: 5,
		description: 'The ultimate search engine'
	}
]

app.use(morgan(morganOption))
app.use(express.json());
app.use(helmet())
app.use(cors())

app.use(function validateBearerToken(req, res, next) {
	const apiToken = process.env.API_TOKEN;
	const authToken = req.get('Authorization');
	if(!authToken || authToken.split(' ')[1] !== apiToken) {
		logger.error(`Unauthorized request to path: ${req.path} with token ${authToken.split(' ')[1]} expected ${process.env.API_TOKEN}`);
		return res.status(401).json({ error: 'Unauthorized request.' });
	}
	next();
});

app.get('/bookmarks', (req, res) => {
	res.status(200).json(bookmarks);
})

app.get('/bookmarks/:bookmarkId', (req, res) => {
	let { bookmarkId } = req.params;
	let bookmark = bookmarks.find((itm) => {
		return itm.id === bookmarkId
	});
	if(!bookmark) {
		return res.status(404).send("404 Not Found");
	}
	return res.status(201).json(bookmark);
})

app.post('/bookmarks', (req, res) => {
	const { name, url, rating, description } = req.body;
	if(!name) {
		return res.status(401).json({
			error: 'name is required'
		})
	}
	if(!url) {
		return res.status(401).json({
			error: 'url is required'
		})
	}
	if(!rating) {
		return res.status(401).json({
			error: 'rating is required'
		})
	}
	if(!description) {
		return res.status(401).json({
			error: 'description is required'
		})
	}
	const bookmark = {
		id: uuid(),
		name: name,
		url: url,
		rating: parseInt(rating),
		description: description
	};
	bookmarks.push(bookmark);
	return res.status(200).json(bookmark);
});

app.delete('/bookmarks/:bookmarkId', (req, res) => {
	const { bookmarkId } = req.params;
	const index = bookmarks.findIndex(i => i.id === bookmarkId);
	
	if(index === -1) {
		return res.status(404).send("Bookmark not found");
	}

	bookmarks.splice(index, 1);

	res.send('Deleted');
})

app.use(function errorHandler(error, req, res, next) {
	let response;
	if(NODE_ENV === 'production') {
		response = { error: { message: 'server error' } };
	} else {
		console.error(error);
		response = { message: error.message, error };
	}
	res.status(500).json(response); 
})

module.exports = app;
