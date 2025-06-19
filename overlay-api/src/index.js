require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const dataRoutes = require('./routes/dataRoutes');

app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3001',
  methods: ['GET', 'POST']
}));

app.use('/getData', dataRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur backend lancé sur le port ${PORT}`);
});
