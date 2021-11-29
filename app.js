const express = require('express')
const path = require('path')
const fs = require('fs')

const morgan = require('morgan')
const winston = require('winston')

const { createLogger, format } = winston

const LOG_PATH = 'logs/app_log'

const app = express()

// setup the logger
// create a write stream (in append mode)
const accessLogStream = fs.createWriteStream(path.join(__dirname, LOG_PATH), { flags: 'a' })
app.use(morgan('combined', { stream: accessLogStream }))

function createAppLogger() {
  const { combine, timestamp, printf, colorize } = format

  return createLogger({
    level: 'info',
    format: combine(
      colorize(),
      timestamp(),
      printf((info) => {
        return `[${info.timestamp}] [${info.level}] : ${JSON.stringify(info.message)}`
      })
    ),
    transports: [
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
      new winston.transports.File({ filename: 'logs/combined.log' }),
    ],
  })
}

const console = createAppLogger()

// serve static files from the public folder
app.use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res) => {
  res.json({ message: 'Hello World!' })
  console.info('just a request to root.')
})

app.get('/error_500', (req, res) => {
  res.status(500).send({ message: 'Server error' })
  console.error('internal server error')
})

app.get('/error_400', (req, res) => {
  res.status(400).send({ message: 'Bad request' })
  console.warning('bad request')
})

module.exports = app
