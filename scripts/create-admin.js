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
  let email, password;

  await new Promise((resolve) => {
    rl.question('Digite o e-mail do novo SUPER_ADMIN: ', (answer) => {
      email = answer;
      if (!email || !email.includes('@')) {
        console.error('E-mail inválido.');
        process.exit(1);
      }
      resolve();
    });
  });

  await new Promise((resolve) => {
    rl.question(`Digite a senha para ${email}: `, (answer) => {
      password = answer;
      if (!password) {
        console.error('A senha não pode estar em branco.');
        process.exit(1);
      }
      rl.close();
      resolve();
    });
  });

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const query = `
      INSERT INTO users (full_name, email, password_hash, role, company_tenant)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        company_tenant = EXCLUDED.company_tenant;
    `;

    await pool.query(query, ['Super Admin', email, hashedPassword, 'SUPER_ADMIN', 'Ecom360']);
    
    console.log(`\nUsuário SUPER_ADMIN '${email}' criado/atualizado com sucesso!`);

  } catch (error) {
    console.error('Erro ao criar admin:', error);
  } finally {
    await pool.end();
  }
}

createAdmin();
