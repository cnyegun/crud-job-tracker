const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const express = require('express')
const app = express()
app.use(express.json())

const SECRET_KEY = process.env.SECRET_KEY

const { Pool } = require('pg')

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
})

const authenicate = (req, res, next) => {
    const authHeaders = req.headers['authorization']
    if (!authHeaders) return res.status(401).send()
    const token = authHeaders.split(' ')[1]

    if (!token) {
        res.status(401).send()
    }
    try {
        const decoded = jwt.verify(token, SECRET_KEY)
        req.userId = decoded.userId
        next()
    }
    catch {
        return res.status(401).send()
    }
}

app.get('/', (req, res) => {
    res.send("Job Tracker API is running")
})

app.get('/applications', authenicate, async (req, res) => {
    await pool.query('SELECT * FROM applications WHERE user_id=$1', [req.userId]).then((result) => {
        res.json(result.rows)
    })
})

app.post('/applications', authenicate, async (req,res) => {
    await pool.query('INSERT INTO applications (company, role, status, user_id) VALUES ($1, $2, $3, $4) RETURNING *', 
        [
            req.body["company"],
            req.body["role"],
            req.body["status"],
            req.userId
        ]
    )
    res.status(201).send()
})

app.put('/applications/:id', authenicate, async (req, res) => {
    await pool.query('UPDATE applications SET company=$1, role=$2, status=$3 WHERE id=$4 AND user_id=$5 RETURNING *', 
        [
            req.body["company"],
            req.body["role"],
            req.body["status"],
            Number(req.params["id"]),
            req.userId
        ]
    )
    res.status(201).send()
})

app.delete('/applications/:id', authenicate, async (req, res) => {
    await pool.query("DELETE FROM applications WHERE id=$1 AND user_id=$2",
        [req.params["id"], req.userId]
    )
    res.status(204).send()
})

// AUTH

app.post('/auth/register', async (req, res) => {
    const { email, password } = req.body
    const hash = await bcrypt.hash(password, 10)
    await pool.query('INSERT INTO users (email, password) VALUES ($1, $2)', [email, hash])
    res.status(201).send()
})

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body
    const result = await pool.query('SELECT * FROM users WHERE email=$1', [email])
    const user = result.rows[0]
    if (!user) return res.status(401).send()

    const match = await bcrypt.compare(password, user.password)
    if (match) {
        const token = jwt.sign({ userId: user.id }, SECRET_KEY)
        res.json({token})
    }
    else {
        res.status(401).send()
    }
})


app.listen(3000, () => {
    console.log("Start listening on port 3000")
})