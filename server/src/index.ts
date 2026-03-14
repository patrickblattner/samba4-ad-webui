import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import https from 'https'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from './config.js'
import { errorHandler } from './middleware/errorHandler.js'
import { validateDn } from './middleware/validateDn.js'
import { rateLimitByUser } from './middleware/rateLimit.js'
import authRoutes from './routes/auth.js'
import treeRoutes from './routes/tree.js'
import objectsRoutes from './routes/objects.js'
import usersRoutes from './routes/users.js'
import groupsRoutes from './routes/groups.js'
import computersRoutes from './routes/computers.js'
import attributesRoutes from './routes/attributes.js'
import ousRoutes from './routes/ous.js'
import searchRoutes from './routes/search.js'

const app = express()

app.use(helmet())
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}))
app.use(express.json({ limit: '1mb' }))
app.use('/api', validateDn)
app.use('/api', rateLimitByUser)

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ldapsConfigured: config.ldap.ldapsUrl.startsWith('ldaps://'),
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/tree', treeRoutes)
app.use('/api/objects', objectsRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/groups', groupsRoutes)
app.use('/api/computers', computersRoutes)
app.use('/api/attributes', attributesRoutes)
app.use('/api/ous', ousRoutes)
app.use('/api/search', searchRoutes)

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const clientDist = path.join(__dirname, '../../client/dist')
  app.use(express.static(clientDist))
  // SPA fallback: serve index.html for all non-API routes
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

app.use(errorHandler)

const startServer = () => {
  const sslCert = process.env.SSL_CERT_PATH || '/app/certs/server.crt'
  const sslKey = process.env.SSL_KEY_PATH || '/app/certs/server.key'

  if (process.env.SSL_MODE && process.env.SSL_MODE !== 'none' && fs.existsSync(sslCert) && fs.existsSync(sslKey)) {
    const httpsOptions = {
      cert: fs.readFileSync(sslCert),
      key: fs.readFileSync(sslKey),
    }
    const httpsPort = parseInt(process.env.SSL_PORT || '443', 10)
    https.createServer(httpsOptions, app).listen(httpsPort, () => {
      console.log(`Server running on https://localhost:${httpsPort}`)
    })
    // Also listen on HTTP for redirect
    app.listen(config.port, () => {
      console.log(`HTTP redirect server on http://localhost:${config.port}`)
    })
  } else {
    app.listen(config.port, () => {
      console.log(`Server running on http://localhost:${config.port}`)
    })
  }
}

startServer()
