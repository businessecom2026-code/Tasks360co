const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const readline = require('readline');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function createAdmin() {
  let adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    await new Promise((resolve) => {
        rl.question('Por favor, digite a senha para o admin@ecom360.co: ', (password) => {
            if(!password) {
                console.error('Senha não pode ser vazia.');
                process.exit(1);
            }
            adminPassword = password;
            rl.close();
            resolve();
        });
    });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    const query = `
      INSERT INTO users (full_name, email, password_hash, role, company_tenant)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        company_tenant = EXCLUDED.company_tenant;
    `;

    await pool.query(query, ['Super Admin', 'admin@ecom360.co', hashedPassword, 'SUPER_ADMIN', 'ecom360_master_tenant']);
    
    console.log('Admin criado com sucesso!');

  } catch (error) {
    console.error('Erro ao criar admin:', error);
  } finally {
    await pool.end();
  }
}

createAdmin();
