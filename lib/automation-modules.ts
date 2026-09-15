export interface AutomationModule {
  id: string
  title: string
  description: string
  href: string
  iconName: string
  status: 'active' | 'coming_soon' | 'beta'
  badgeText: string
  category: 'Communication' | 'Process' | 'Alerts'
  tags?: string[]
}

export const AUTOMATION_MODULES: AutomationModule[] = [
  {
    id: 'email-triggers',
    title: 'Email Triggers',
    description: 'Configure and automate report dispatches, recurring performance briefings, and custom email alerts.',
    href: '/settings/automation/email-triggers',
    iconName: 'Mail',
    status: 'active',
    badgeText: 'Active',
    category: 'Communication',
    tags: ['Reports', 'Briefings', 'SMTP', 'Scheduled'],
  },
  {
    id: 'workflow-automation',
    title: 'Workflow Automation',
    description: 'Build event-driven actions, status transitions, and multi-step pipeline workflows across CRM objects.',
    href: '/settings/automation/workflows',
    iconName: 'GitBranch',
    status: 'coming_soon',
    badgeText: 'Coming Soon',
    category: 'Process',
    tags: ['Rules', 'Pipelines', 'Triggers'],
  },
  {
    id: 'whatsapp-automation',
    title: 'WhatsApp Automation',
    description: 'Automated WhatsApp messaging, arrival notifications, and interactive booking updates.',
    href: '/settings/automation/whatsapp',
    iconName: 'MessageSquare',
    status: 'coming_soon',
    badgeText: 'Coming Soon',
    category: 'Communication',
    tags: ['WhatsApp', 'Templates', 'Messaging'],
  },
  {
    id: 'sms-automation',
    title: 'SMS Automation',
    description: 'Transactional SMS gateways, payment receipt updates, and guest OTP dispatches.',
    href: '/settings/automation/sms',
    iconName: 'PhoneCall',
    status: 'coming_soon',
    badgeText: 'Coming Soon',
    category: 'Communication',
    tags: ['SMS', 'Gateway', 'OTP'],
  },
  {
    id: 'notification-automation',
    title: 'Notification Automation',
    description: 'In-app alert preferences, browser push broadcasts, and urgent manager escalation rules.',
    href: '/settings/automation/notifications',
    iconName: 'Bell',
    status: 'coming_soon',
    badgeText: 'Coming Soon',
    category: 'Alerts',
    tags: ['Push', 'Escalations', 'Alerts'],
  },
  {
    id: 'reminder-automation',
    title: 'Reminder Automation',
    description: 'Automated schedules for pending doctor consultation reminders, booking follow-ups, and payment tasks.',
    href: '/settings/automation/reminders',
    iconName: 'Clock',
    status: 'coming_soon',
    badgeText: 'Coming Soon',
    category: 'Alerts',
    tags: ['Schedules', 'Follow-ups', 'Tasks'],
  },
]
