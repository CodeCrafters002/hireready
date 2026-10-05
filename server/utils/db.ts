import dns from 'node:dns'
import mongoose from 'mongoose'

// Ensure public DNS resolver is used for local Windows development (handles SRV records reliably)
try {
  dns.setServers(['8.8.8.8', '1.1.1.1'])
} catch {
  // Ignore in environments where setting DNS servers is restricted
}

let isConnected = false

export async function connectDB() {
  if (isConnected || mongoose.connection.readyState === 1) {
    isConnected = true
    return mongoose.connection
  }

  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw createError({
      statusCode: 500,
      statusMessage: 'MONGODB_URI is not set in environment variables'
    })
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      bufferCommands: false
    })
    isConnected = true
    console.log('[MongoDB] Connected to database:', mongoose.connection.name)
    return conn
  } catch (err: any) {
    console.error('[MongoDB] Connection error:', err)
    throw createError({
      statusCode: 500,
      statusMessage: `MongoDB Connection Error: ${err.message}`
    })
  }
}
