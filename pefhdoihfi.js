Llave privada = Tu llave física de casa (NUNCA la compartes)
Llave pública = El número de tu casa (todos pueden verlo)

En código:
🔒 Llave privada: ed25519-private-key (guardas en tu servidor)
🌐 Llave pública: ed25519-public-key (publicas en JSON)

//Ejemplo:
javascript// En tu servidor (PRIVADO)
const privateKey = "ed25519-priv-abc123..."

// En tu endpoint público (PÚBLICO)
GET https://tu-servidor.com/keys
{
  "keys": {
    "key-001": {
      "kty": "OKP",
      "crv": "Ed25519", 
      "x": "public-key-data-xyz789..."
    }
  }
}