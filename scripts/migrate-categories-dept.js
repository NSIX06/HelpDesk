const { neon } = require('@neondatabase/serverless')
require('dotenv').config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL)

async function migrate() {
  console.log('Adicionando department_id em ticket_categories...')

  await sql`
    ALTER TABLE ticket_categories
    ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_ticket_categories_dept
    ON ticket_categories(department_id)
  `

  console.log('Migração concluída!')
  process.exit(0)
}

migrate().catch(err => {
  console.error('Falha na migração:', err)
  process.exit(1)
})
