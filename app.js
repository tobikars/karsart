const express = require('express')
const path = require('path')
const fs = require('fs')

const morgan = require('morgan')
const winston = require('winston')

const { createLogger, format } = winston

const LOG_PATH = 'logs/app_log'

const PUBLIC_DIR = path.join(__dirname, 'public')
const SEMVER = fs.readFileSync(path.join(PUBLIC_DIR, '.semver')).toString().trim()

const WebSocketServer = require('ws').Server
const wss = new WebSocketServer({ port: 9090 })

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

let appStatus = {
  version: SEMVER,
  load_time: Date(),
  requests_handled: 0,
}

appStatus.semver = app.on('listening', function () {
  appStatus.start_time = Date()
})

app.use((req, res, next) => {
  res.on('finish', () => {
    appStatus[`${req.method}_requests`]
      ? appStatus[`${req.method}_requests`]++
      : (appStatus[`${req.method}_requests`] = 1)

    appStatus[`${res.statusCode}_status`]
      ? appStatus[`${res.statusCode}_status`]++
      : (appStatus[`${res.statusCode}_status`] = 1)

    appStatus.requests_handled++
  })
  next()
})

// serve static files from the public folder
app.use(express.static(PUBLIC_DIR))

app.get('/', (req, res) => {
  res.json({ message: `Hello World ${SEMVER}` })
  console.info('just a request to root.')
})

app.get('/msg/:msg', (req, res) => {
  const msg = req.params.msg
  console.info(req.params)
  wss.clients.forEach(function each(client) {
    client.send('broadcast: ' + msg)
  })

  res.json({ sent: msg })
})

app.get('/status', (req, res) => {
  res.json(appStatus)
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
