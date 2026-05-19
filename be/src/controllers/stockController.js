const Stock = require('../models/Stock');
const Product = require('../models/Product');

// @desc    Obtenir tout le stock
const getStock = async (req, res) => {
  try {
    console.log('Récupération du stock...');
    
    // Récupérer tous les stocks
    const stocks = await Stock.find().sort({ createdAt: -1 });
    
    // Récupérer les produits associés séparément (sans populate)
    const enrichedStock = [];
    
    for (const stock of stocks) {
      const product = await Product.findById(stock.product).lean();
      
      enrichedStock.push({
        ...stock.toObject(),
        product: product || null
      });
    }
    
    console.log(`Stock trouvé: ${enrichedStock.length} éléments`);
    res.status(200).json(enrichedStock);
  } catch (error) {
    console.error('Erreur getStock:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtenir un stock par ID
const getStockById = async (req, res) => {
  try {
    const stock = await Stock.findById(req.params.id).lean();
    if (!stock) {
      return res.status(404).json({ message: 'Stock non trouvé' });
    }
    
    const product = await Product.findById(stock.product).lean();
    
    res.status(200).json({
      ...stock,
      product: product || null
    });
  } catch (error) {
    console.error('Erreur getStockById:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtenir le stock par produit
const getStockByProduct = async (req, res) => {
  try {
    const stock = await Stock.findOne({ product: req.params.productId }).lean();
    if (!stock) {
      return res.status(404).json({ message: 'Stock non trouvé pour ce produit' });
    }
    
    const product = await Product.findById(stock.product).lean();
    
    res.status(200).json({
      ...stock,
      product: product || null
    });
  } catch (error) {
    console.error('Erreur getStockByProduct:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Créer une entrée de stock (Admin seulement)
const createStock = async (req, res) => {
  try {
    const { product, quantity, seuilMin, alerteActive } = req.body;
    
    console.log('Création stock:', { product, quantity, seuilMin, alerteActive });
    
    // Validation
    if (!product) {
      return res.status(400).json({ message: 'L\'ID du produit est requis' });
    }
    
    // Vérifier si le produit existe
    const productExists = await Product.findById(product).lean();
    if (!productExists) {
      console.log('Produit non trouvé:', product);
      return res.status(404).json({ message: 'Produit non trouvé' });
    }
    
    // Vérifier si le stock existe déjà pour ce produit
    const existingStock = await Stock.findOne({ product });
    if (existingStock) {
      return res.status(400).json({ 
        message: 'Un stock existe déjà pour ce produit. Utilisez la mise à jour.' 
      });
    }
    
    const stock = new Stock({
      product,
      quantity: quantity !== undefined ? quantity : 0,
      seuilMin: seuilMin || productExists.seuilMin || 100,
      alerteActive: alerteActive !== undefined ? alerteActive : false
    });
    
    const savedStock = await stock.save();
    console.log('Stock créé:', savedStock._id);
    
    res.status(201).json({
      ...savedStock.toObject(),
      product: productExists
    });
  } catch (error) {
    console.error('Erreur createStock:', error);
    res.status(400).json({ message: error.message });
  }
};

// @desc    Mettre à jour la quantité du stock
const updateStockQuantity = async (req, res) => {
  try {
    const { quantity, operation } = req.body;
    
    if (quantity === undefined) {
      return res.status(400).json({ message: 'La quantité est requise' });
    }
    
    const stock = await Stock.findById(req.params.id);
    if (!stock) {
      return res.status(404).json({ message: 'Stock non trouvé' });
    }
    
    let newQuantity = stock.quantity;
    
    if (operation === 'add') {
      newQuantity = stock.quantity + quantity;
    } else if (operation === 'subtract') {
      newQuantity = stock.quantity - quantity;
    } else {
      newQuantity = quantity;
    }
    
    if (newQuantity < 0) {
      return res.status(400).json({ message: 'La quantité ne peut pas être négative' });
    }
    
    stock.quantity = newQuantity;
    stock.dateDerniereMiseAJour = Date.now();
    
    const updatedStock = await stock.save();
    
    const product = await Product.findById(updatedStock.product).lean();
    
    res.status(200).json({
      ...updatedStock.toObject(),
      product: product || null
    });
  } catch (error) {
    console.error('Erreur updateStockQuantity:', error);
    res.status(400).json({ message: error.message });
  }
};

// @desc    Mettre à jour le stock complet
const updateStock = async (req, res) => {
  try {
    const { quantity, seuilMin, alerteActive } = req.body;
    
    const stock = await Stock.findById(req.params.id);
    if (!stock) {
      return res.status(404).json({ message: 'Stock non trouvé' });
    }
    
    if (quantity !== undefined) stock.quantity = quantity;
    if (seuilMin !== undefined) stock.seuilMin = seuilMin;
    if (alerteActive !== undefined) stock.alerteActive = alerteActive;
    stock.dateDerniereMiseAJour = Date.now();
    
    const updatedStock = await stock.save();
    
    const product = await Product.findById(updatedStock.product).lean();
    
    res.status(200).json({
      ...updatedStock.toObject(),
      product: product || null
    });
  } catch (error) {
    console.error('Erreur updateStock:', error);
    res.status(400).json({ message: error.message });
  }
};

// @desc    Supprimer une entrée de stock
const deleteStock = async (req, res) => {
  try {
    const stock = await Stock.findById(req.params.id);
    if (!stock) {
      return res.status(404).json({ message: 'Stock non trouvé' });
    }
    
    await stock.deleteOne();
    res.status(200).json({ message: 'Stock supprimé avec succès' });
  } catch (error) {
    console.error('Erreur deleteStock:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtenir les alertes de stock bas
const getStockBas = async (req, res) => {
  try {
    const stocksBas = await Stock.find({
      $expr: { $lt: ['$quantity', '$seuilMin'] }
    });
    
    const enrichedStock = [];
    
    for (const stock of stocksBas) {
      const product = await Product.findById(stock.product).lean();
      
      enrichedStock.push({
        ...stock.toObject(),
        product: product || null
      });
    }
    
    res.status(200).json(enrichedStock);
  } catch (error) {
    console.error('Erreur getStockBas:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getStock,
  getStockById,
  getStockByProduct,
  createStock,
  updateStock,
  updateStockQuantity,
  deleteStock,
  getStockBas
};