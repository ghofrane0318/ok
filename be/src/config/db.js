const mongoose = require("mongoose");
const dns = require("dns");

// 🔧 Force l'utilisation de Google DNS (8.8.8.8) pour résoudre MongoDB Atlas
// Solution au problème "getaddrinfo ENOTFOUND" causé par DNS local défaillant
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const connectDB = async () => {
  const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/pfe";

  const options = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    family: 4,                    // Force IPv4
    maxPoolSize: 10,
    retryWrites: true,
    retryReads: true,
  };

  // Boucle de retry en cas d'erreur DNS
  let retries = 5;
  while (retries > 0) {
    try {
      await mongoose.connect(MONGO_URI, options);
      console.log("✅ MongoDB connecté (DNS Google)");
      break;
    } catch (err) {
      retries--;
      console.error(`❌ Erreur MongoDB (${retries} tentatives restantes):`, err.message);
      if (retries === 0) {
        console.error("⚠️ Impossible de se connecter à MongoDB.");
        console.error("💡 Solutions:");
        console.error("   1. Vérifier votre connexion internet");
        console.error("   2. Changer DNS Windows: 8.8.8.8 / 8.8.4.4");
        console.error("   3. ipconfig /flushdns");
        console.error("   4. Vérifier MongoDB Atlas (cluster pausé?)");
        throw err;
      }
      // Attendre 5 secondes avant de réessayer
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  mongoose.connection.on('disconnected', () =>
    console.warn("⚠️ MongoDB déconnecté - reconnexion automatique...")
  );
  mongoose.connection.on('reconnected', () =>
    console.log("✅ MongoDB reconnecté")
  );
  mongoose.connection.on('error', err =>
    console.error("❌ MongoDB erreur:", err.message)
  );
};

module.exports = connectDB;
