const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const reservationRoutes = require('./routes/reservations');

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => {
  res.json({ app: "Adam's House Reservation Manager", status: 'ok' });
});

app.use('/api/reservations', reservationRoutes);

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ message: 'API route not found.' });
  }
  return next();
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

app.listen(port, () => {
  console.log(`Adam's House Reservation Manager is running on port ${port}.`);
});
