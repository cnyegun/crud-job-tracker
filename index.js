const express = require('express')
const app = express()
app.use(express.json())

const { Pool } = require('pg')

const pool = new Pool({
    user: 'jobuser',
    host: '127.0.0.1',
    database: 'jobtracker',
    password: 'password123',
    port: 5432
})

app.get('/', (req, res) => {
    console.log(req)
    res.send("Job Tracker API is running")
})

app.get('/applications', async (req, res) => {
    await pool.query('SELECT * FROM applications').then((result) => {
        res.json(result.rows)
    })
})

app.post('/applications', async (req,res) => {
    await pool.query('INSERT INTO applications (company, role, status) VALUES ($1, $2, $3) RETURNING *', 
        [
            req.body["company"],
            req.body["role"],
            req.body["status"]
        ]
    )
    res.status(201).send()
})

app.put('/applications/:id', async (req, res) => {
    await pool.query('UPDATE applications SET company=$1, role=$2, status=$3 WHERE id=$4 RETURNING *', 
        [
            req.body["company"],
            req.body["role"],
            req.body["status"],
            Number(req.params["id"])
        ]
    )
    res.status(201).send()
})

app.delete('/applications/:id', async (req, res) => {
    await pool.query("DELETE FROM applications WHERE id=$1",
        [req.params["id"]]
    )
    res.status(204).send()
})

app.listen(3000, () => {
    console.log("Start listening on port 3000")
})