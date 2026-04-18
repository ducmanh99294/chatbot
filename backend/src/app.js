const express = require('express')
const cookieParser = require('cookie-parser')
const cors = require('cors')

const faqRoutes = require('./routes/faqRoutes')

const app = express()
app.set("trust proxy", 1);
const passport = require("./controllers/passport");

app.use(passport.initialize());
app.use(express.json())
app.use(cookieParser())
app.use(cors({
  origin: ['http://localhost:5173', 'https://datn-khaki-xi.vercel.app',  'https://chatbot-nine-snowy-72.vercel.app'],
  credentials: true
}))

app.use("/api/faq", faqRoutes);

app.get('/', (req, res) => {
  res.send('Backend is running')
})

module.exports = app
