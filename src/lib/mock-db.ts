'use client'

// Local mock database helpers utilizing localStorage
// Enforces dynamic data creation and checks for Next.js SSR compatibility

const IS_BROWSER = typeof window !== 'undefined'

export interface UserProfile {
  email: string
  fullName: string
  role: 'SUPER_ADMIN' | 'CONTRACTOR_OWNER' | 'SITE_ENGINEER'
  password: string
  companyId?: string
}

export interface CompanyInfo {
  id: string
  name: string
  ownerEmail: string
  planName: string
  status: 'Active' | 'Suspended' | 'Trial' | 'Expired'
  expiryDate: string
}

const DEFAULT_PLANS = [
  { name: 'Starter', price: 49, projects: '3', users: '2', storage: '5 GB', features: { Accounting: false, Materials: true, Expenses: true, Reports: false, Tasks: true, Finance: false } },
  { name: 'Professional', price: 149, projects: '20', users: '5', storage: '25 GB', features: { Accounting: true, Materials: true, Expenses: true, Reports: true, Tasks: true, Finance: true } },
  { name: 'Business', price: 299, projects: 'Unlimited', users: 'Unlimited', storage: '100 GB', features: { Accounting: true, Materials: true, Expenses: true, Reports: true, Tasks: true, Finance: true } }
]

// Initialize the Database with defaults
export function initDb() {
  if (!IS_BROWSER) return

  // 1. Initial Plans
  if (!localStorage.getItem('sp_plans')) {
    localStorage.setItem('sp_plans', JSON.stringify(DEFAULT_PLANS))
  }

  // 2. Predefined Super Admin
  if (!localStorage.getItem('sp_users')) {
    const defaultUsers: UserProfile[] = [
      {
        email: 'admin@sitepilot.co',
        fullName: 'Super Admin',
        role: 'SUPER_ADMIN',
        password: 'admin123'
      }
    ]
    localStorage.setItem('sp_users', JSON.stringify(defaultUsers))
  }

  // 3. Initial Companies
  if (!localStorage.getItem('sp_companies')) {
    const defaultCompanies: CompanyInfo[] = [
      { id: 'c1', name: 'Apex Builders Corp', ownerEmail: 'owner@company.com', planName: 'Business', status: 'Active', expiryDate: '2026-12-31' },
      { id: 'c2', name: 'Skyline Structural Inc', ownerEmail: 'rachel@skyline.com', planName: 'Professional', status: 'Trial', expiryDate: '2026-06-25' }
    ]
    localStorage.setItem('sp_companies', JSON.stringify(defaultCompanies))

    // Seed default users linked to these companies
    const existingUsers = JSON.parse(localStorage.getItem('sp_users') || '[]') as UserProfile[]
    const seededUsers: UserProfile[] = [
      { email: 'owner@company.com', fullName: 'John Smith', role: 'CONTRACTOR_OWNER', password: 'password123', companyId: 'c1' },
      { email: 'rachel@skyline.com', fullName: 'Rachel Green', role: 'CONTRACTOR_OWNER', password: 'password123', companyId: 'c2' },
      // Seed default engineers under owner@company.com's company (c1)
      { email: 'engineer@company.com', fullName: 'Dave Bowman', role: 'SITE_ENGINEER', password: 'password123', companyId: 'c1' },
      { email: 'frank@company.com', fullName: 'Frank Poole', role: 'SITE_ENGINEER', password: 'password123', companyId: 'c1' }
    ]
    localStorage.setItem('sp_users', JSON.stringify([...existingUsers, ...seededUsers]))
  }
}

// User Actions
export function getUsers(): UserProfile[] {
  if (!IS_BROWSER) return []
  initDb()
  return JSON.parse(localStorage.getItem('sp_users') || '[]')
}

export function saveUser(user: UserProfile) {
  if (!IS_BROWSER) return
  const users = getUsers()
  const idx = users.findIndex(u => u.email.toLowerCase() === user.email.toLowerCase())
  if (idx !== -1) {
    users[idx] = user
  } else {
    users.push(user)
  }
  localStorage.setItem('sp_users', JSON.stringify(users))
}

export function deleteUser(email: string) {
  if (!IS_BROWSER) return
  const users = getUsers()
  localStorage.setItem('sp_users', JSON.stringify(users.filter(u => u.email.toLowerCase() !== email.toLowerCase())))
}

// Company Actions
export function getCompanies(): CompanyInfo[] {
  if (!IS_BROWSER) return []
  initDb()
  return JSON.parse(localStorage.getItem('sp_companies') || '[]')
}

export function saveCompany(company: CompanyInfo) {
  if (!IS_BROWSER) return
  const companies = getCompanies()
  const idx = companies.findIndex(c => c.id === company.id)
  if (idx !== -1) {
    companies[idx] = company
  } else {
    companies.push(company)
  }
  localStorage.setItem('sp_companies', JSON.stringify(companies))
}

export function deleteCompany(id: string) {
  if (!IS_BROWSER) return
  const companies = getCompanies()
  localStorage.setItem('sp_companies', JSON.stringify(companies.filter(c => c.id !== id)))
}

// Plan Actions
export function getPlans() {
  if (!IS_BROWSER) return []
  initDb()
  return JSON.parse(localStorage.getItem('sp_plans') || '[]')
}

export function savePlans(plans: any) {
  if (!IS_BROWSER) return
  localStorage.setItem('sp_plans', JSON.stringify(plans))
}
