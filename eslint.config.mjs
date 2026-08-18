import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'node_modules/**',
    'next-env.d.ts',
    '*.tsbuildinfo',
    'index.html',
    'output.json',
    'app/fms/bookings/team/page.tsx',
    'app/accounts-tracker/page.tsx',
    'app/leads/assign/page.tsx',
    'app/crr-fms/page.tsx',
    'app/partners/page.tsx',
    'app/meetings/page.tsx',
    'app/fms/bookings/villa-raag/page.tsx',
    'components/Booking Form/BookingForm.tsx',
    'app/voicecall/data/received/page.tsx',
    'app/meet/page.tsx',
    'app/fms/complaints/page.tsx',
    'app/new-order-fms/page.tsx',
    'app/calls/reports/page.tsx',
    'app/sales/reports/page.tsx',
    'app/MR-FMS/page.tsx',
    'app/voicecall/summary/page.tsx',
    'app/fms/enquiry-reverification/page.tsx',
    'app/google-adword-reports/page.tsx',
    'components/Booking Form/BookingFormBase.tsx',
  ]),
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'react/no-unescaped-entities': 'off',
      'prefer-const': 'off',
      'no-var': 'off',
    },
  },
  {
    files: ['scripts/**/*.js', 'scripts/**/*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
])

export default eslintConfig
