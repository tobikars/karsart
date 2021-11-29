const express = require('express')
const path = require('path')
const morgan = require('morgan')

const winston = require('winston')
require('winston-syslog').Syslog

const LOG_PATH = 'logs/app.log'

const logger = winston.createLogger({
  levels: winston.config.syslog.levels,
  transports: [
    new winston.transports.Syslog(),
    new winston.transports.File({
      filename: LOG_PATH,
    }),
  ],
})

const app = express()

app.use(morgan('dev'))

app.use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res) => {
  res.json({ message: 'Hello World!' })
  logger.info('just a request to root.')
})

app.get('/error_500', (req, res) => {
  res.status(500).send({ message: 'Server error' })
  logger.error('internal server error')
})

app.get('/error_400', (req, res) => {
  res.status(400).send({ message: 'Bad request' })
  logger.warning('bad request')
})

module.exports = app
