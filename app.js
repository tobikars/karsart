const express = require('express')
const path = require('path')
const fs = require('fs')

const morgan = require('morgan')
const winston = require('winston')

const { createLogger, format } = winston

const COMBINED = path.join(__dirname, 'logs/access_log')
const INFO = path.join(__dirname, 'logs/info_log')
const ERROR = path.join(__dirname, 'logs/error_log')

const PUBLIC_DIR = path.join(__dirname, 'public')
const SEMVER = fs.readFileSync(path.join(PUBLIC_DIR, '.semver')).toString().trim()

const WebSocketServer = require('ws').Server
const wss = new WebSocketServer({ port: 9090 })

const app = express()

// setup the logger
// create a write stream (in append mode)
const accessLogStream = fs.createWriteStream(COMBINED, { flags: 'a' })
app.use(morgan('combined', { stream: accessLogStream }))

function createAppLogger() {
  const { combine, timestamp, printf } = format
  console.log('creating logger')
  return createLogger({
    level: 'info',
    format: combine(
      timestamp(),
      printf((info) => {
        return `[${info.timestamp}] [${info.level}] ${JSON.stringify(info.message)}`
      })
    ),
    transports: [
      new winston.transports.File({ filename: ERROR, level: 'error' }),
      new winston.transports.File({ filename: INFO }),
    ],
  })
}
const logger = createAppLogger()

let appStatus = {
  version: SEMVER,
  load_time: Date(),
  requests_handled: 0,
}

console.log('starting')
// serve static files from the public folder
app.use(express.static(PUBLIC_DIR))

app.listeningHandler = () => {
  appStatus.start_time = Date()
  logger.info(`server started on ${appStatus.start_time}`)
  console.log('server listening...')
}

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

app.get('/', (req, res) => {
  res.json({ message: `Hello World ${SEMVER}` })
  logger.info('just a request to root.')
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
  logger.error('internal server error')
})

app.get('/error_400', (req, res) => {
  res.status(400).send({ message: 'Bad request' })
  logger.info('bad request')
})

module.exports = app
