import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
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

app.use(errorHandler)

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`)
})
