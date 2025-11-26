const { MongoClient } = require('mongodb');
require('dotenv').config();

console.log('Admin Credentials:', {
    user: process.env.ADMIN_USERNAME,
    pass: process.env.ADMIN_PASSWORD ? '***' : 'NOT SET'
});

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";

let db;
let isConnected = false;

async function connect() {
    try {
        if (!isConnected) {
            console.log('Connecting to MongoDB...');
            
            const client = new MongoClient(uri, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 10000,
            });
            
            await client.connect();
            
            // Use database from URI or default
            const dbName = getDatabaseNameFromURI(uri) || 'codeEditorDB';
            db = client.db(dbName);
            
            // Test connection with simple ping (no disk space required)
            await db.command({ ping: 1 });
            
            console.log("✅ Successfully connected to MongoDB");
            
            // SKIP INDEX CREATION to avoid disk space issues
            console.log("⚠️ Skipping index creation due to disk space limits");
            
            isConnected = true;
        }
        return db;
    } catch (error) {
        console.error("MongoDB connection error:", error.message);
        console.log('App will run without database connection');
        return null;
    }
}

function getDatabaseNameFromURI(uri) {
    try {
        const url = new URL(uri);
        const path = url.pathname;
        return path && path !== '/' ? path.substring(1) : null;
    } catch (e) {
        return null;
    }
}

function getDb() {
    if (!isConnected) {
        console.log('Database not connected yet');
        return null;
    }
    return db;
}

module.exports = { connect, getDb };