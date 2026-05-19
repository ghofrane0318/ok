const Transporteur = require('../models/Transporteur');

exports.getAllTransporteurs = async (req, res) => {
  try {
    const transporteurs = await Transporteur.find();
    res.json(transporteurs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createTransporteur = async (req, res) => {
  try {
    const transporteur = new Transporteur(req.body);
    await transporteur.save();
    res.status(201).json(transporteur);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};