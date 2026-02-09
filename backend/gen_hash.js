const bcrypt = require('bcrypt');
const hash = bcrypt.hashSync('password@123', 10);
const fs = require('fs');
fs.writeFileSync('hash.txt', hash);
console.log('Hash written to hash.txt');
