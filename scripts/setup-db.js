const { neon } = require('@neondatabase/serverless')
const bcrypt = require('bcryptjs')
require('dotenv').config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL)

async function setupDatabase() {
  console.log('Setting up database...')

  await sql`
    CREATE TABLE IF NOT EXISTS departments (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'user',
      department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
      phone VARCHAR(50),
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS ticket_categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      parent_id INTEGER REFERENCES ticket_categories(id) ON DELETE SET NULL,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS tickets (
      id SERIAL PRIMARY KEY,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'new',
      priority VARCHAR(50) NOT NULL DEFAULT 'medium',
      type VARCHAR(50) NOT NULL DEFAULT 'incident',
      category_id INTEGER REFERENCES ticket_categories(id) ON DELETE SET NULL,
      department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
      requester_id INTEGER NOT NULL REFERENCES users(id),
      assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      due_date TIMESTAMP,
      resolved_at TIMESTAMP,
      closed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS ticket_comments (
      id SERIAL PRIMARY KEY,
      ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      is_internal BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS ticket_attachments (
      id SERIAL PRIMARY KEY,
      ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      comment_id INTEGER REFERENCES ticket_comments(id) ON DELETE SET NULL,
      original_name VARCHAR(500) NOT NULL,
      file_data TEXT NOT NULL,
      file_size INTEGER,
      mime_type VARCHAR(255),
      uploaded_by INTEGER NOT NULL REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `

  // Seed default department
  const deptResult = await sql`
    INSERT INTO departments (name, description)
    VALUES ('TI', 'Departamento de Tecnologia da Informação')
    ON CONFLICT DO NOTHING
    RETURNING id
  `

  // Seed admin user
  const passwordHash = await bcrypt.hash('admin123', 12)
  await sql`
    INSERT INTO users (name, email, password_hash, role, department_id)
    VALUES ('Administrador', 'admin@helpdesk.com', ${passwordHash}, 'admin', ${deptResult[0]?.id || 1})
    ON CONFLICT (email) DO NOTHING
  `

  // Seed default categories
  const catResult = await sql`
    INSERT INTO ticket_categories (name, description)
    VALUES
      ('Hardware', 'Problemas relacionados a hardware'),
      ('Software', 'Problemas relacionados a software'),
      ('Rede', 'Problemas de conectividade e rede'),
      ('Acesso', 'Solicitações de acesso e permissões')
    ON CONFLICT DO NOTHING
    RETURNING id, name
  `

  // Seed subcategories
  if (catResult.length > 0) {
    const hardwareId = catResult.find(c => c.name === 'Hardware')?.id
    const softwareId = catResult.find(c => c.name === 'Software')?.id
    if (hardwareId) {
      await sql`
        INSERT INTO ticket_categories (name, description, parent_id)
        VALUES
          ('Computador', 'Problemas com computador', ${hardwareId}),
          ('Impressora', 'Problemas com impressora', ${hardwareId}),
          ('Monitor', 'Problemas com monitor', ${hardwareId})
        ON CONFLICT DO NOTHING
      `
    }
    if (softwareId) {
      await sql`
        INSERT INTO ticket_categories (name, description, parent_id)
        VALUES
          ('Windows', 'Problemas com sistema operacional', ${softwareId}),
          ('Office', 'Problemas com pacote Office', ${softwareId}),
          ('Antivírus', 'Problemas com antivírus', ${softwareId})
        ON CONFLICT DO NOTHING
      `
    }
  }

  console.log('Database setup complete!')
  console.log('Admin user: admin@helpdesk.com / admin123')
  process.exit(0)
}

setupDatabase().catch(err => {
  console.error('Setup failed:', err)
  process.exit(1)
})
