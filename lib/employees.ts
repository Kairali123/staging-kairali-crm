// src/lib/employees.ts
// Employee data types and transformer
// Converts raw GAS response → clean Employee objects

export interface Employee {
  email:      string
  name:       string       // "Abhilash Sir"
  mobile:     string
  empId:      string       // "K1"
  designation:string
  department: string
  company:    string
  empType:    string       // "MANAGEMENT" | "EMPLOYEE"
  status:     'Working' | 'Left' | string
  reportingTo:string       // direct manager name
  superReportingTo: string
}

// Raw shape from GAS doGet
type RawEmployee = Record<string, string>
type RawResponse = Record<string, RawEmployee>

export function transformEmployees(raw: RawResponse): Employee[] {
  return Object.entries(raw)
    .map(([email, data]) => ({
      email:           email.trim().toLowerCase(),
      name:            (data['ALL USERS']           || '').trim(),
      mobile:          (data['  MOBILE NO']         || data['MOBILE NO'] || '').trim(),
      empId:           (data['EMPLOYEE ID']         || '').trim(),
      designation:     (data['DESIGNATION']         || '').trim(),
      department:      (data['DEPARTMENT']          || '').trim(),
      company:         (data['COMPANY']             || '').trim(),
      empType:         (data['EMP/NOT EMP']         || '').trim(),
      status:          (data['JOINED STATUS']       || '').trim(),
      reportingTo:     (data['Reporting Manager']   || '').trim(),
      superReportingTo:(data['Super Reporting Manager'] || '').trim(),
    }))
    .filter(e => e.name && e.status === 'Working') // only active employees
    .sort((a, b) => a.name.localeCompare(b.name))
}

// Groups employees by department for optgroup rendering
export function groupByDepartment(employees: Employee[]): Record<string, Employee[]> {
  return employees.reduce((acc, emp) => {
    const dept = emp.department || 'Other'
    if (!acc[dept]) acc[dept] = []
    acc[dept].push(emp)
    return acc
  }, {} as Record<string, Employee[]>)
}

// Returns just names array — for diarizer participant list
export function toNameList(employees: Employee[]): string[] {
  return employees.map(e => e.name)
}