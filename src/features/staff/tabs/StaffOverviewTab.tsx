import { Link, useOutletContext } from 'react-router-dom'
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  DescriptionList,
  EmptyState,
  type DescriptionItem,
} from '@/components/ui'
import { CheckIcon, WrenchIcon } from '@/components/icons'
import { isPopulated } from '@/lib/api'
import { to } from '@/lib/routing'
import type { StaffOutletContext } from '../StaffDetailPage'
import { useStaffMember, useStaffSchedule } from '../api'
import {
  EMPLOYMENT_STATUS,
  EMPLOYMENT_TYPE_LABEL,
  WEEKDAYS,
  availableDayCount,
  dayHours,
  dayLabel,
  staffEmail,
} from '../staffMember'
import type { StaffSkill } from '../types'

const SKILL_TONE = {
  expert: 'success',
  intermediate: 'info',
  beginner: 'neutral',
} as const

/**
 * Employment facts, skills, and a read-only week at a glance.
 *
 * The schedule strip is here as well as on its own tab because "is this
 * person in on Thursday" is the question most often asked of a staff
 * profile, and making it a tab switch away would be the wrong default. The
 * tab is where it is edited; this is where it is read.
 */
export default function StaffOverviewTab() {
  const { staffId } = useOutletContext<StaffOutletContext>()
  const { data: staff } = useStaffMember(staffId)
  const schedule = useStaffSchedule(staffId)

  if (!staff) return null

  const status = EMPLOYMENT_STATUS[staff.employmentStatus]
  const available = availableDayCount(schedule.data)

  const employment: DescriptionItem[] = [
    { label: 'Status', value: <Badge tone={status.tone}>{status.label}</Badge> },
    { label: 'Type', value: EMPLOYMENT_TYPE_LABEL[staff.employmentType] ?? staff.employmentType },
    { label: 'Employee ID', value: staff.employeeId || '—' },
    { label: 'Email', value: staffEmail(staff) ?? '—' },
    {
      label: 'Role',
      value: isPopulated(staff.roleId) ? (staff.roleId.name ?? '—') : '—',
    },
    {
      label: 'Service center',
      value: isPopulated(staff.serviceCenterId) ? (staff.serviceCenterId.name ?? '—') : '—',
    },
    {
      label: 'Joined',
      value: new Date(staff.joinedAt).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    },
    ...(staff.leftAt
      ? [{ label: 'Left', value: new Date(staff.leftAt).toLocaleDateString() }]
      : []),
  ]

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title="Employment" />
        <CardBody>
          <DescriptionList items={employment} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="This week"
          description={
            schedule.isLoading
              ? undefined
              : available > 0
                ? `Available ${available} ${available === 1 ? 'day' : 'days'} a week.`
                : 'No working hours recorded yet.'
          }
          actions={
            <Link
              to={to.staffSchedule(staffId)}
              className="interactive text-xs font-semibold text-accent"
            >
              Edit
            </Link>
          }
        />
        <CardBody>
          {schedule.isLoading ? (
            <div className="skeleton h-28 w-full rounded-input" />
          ) : (
            /* Seven columns on every width. A rota is read by comparing days
               to each other, so wrapping it into two rows on a phone would
               break the one thing the layout is for. The cells stay narrow
               and the labels drop to two letters instead. */
            <ul className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((day) => {
                const entry = schedule.data?.[day]
                const hours = dayHours(schedule.data, day)
                const on = Boolean(entry?.available)

                return (
                  <li
                    key={day}
                    className={`flex flex-col items-center gap-1 rounded-input px-1 py-2 text-center ${
                      on ? 'bg-success-bg' : 'bg-surface-sunken'
                    }`}
                    title={hours ? `${dayLabel(day)}: ${hours}` : `${dayLabel(day)}: not working`}
                  >
                    <span className="text-[10px] font-bold uppercase text-text-faint">
                      {dayLabel(day).slice(0, 2)}
                    </span>
                    {on ? (
                      <CheckIcon className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <span className="text-text-faint" aria-hidden>
                        ·
                      </span>
                    )}
                    {/* Hours only where there is room for them. */}
                    {hours ? (
                      <span className="tabnum hidden font-mono text-[9px] leading-tight text-text-muted sm:block">
                        {hours}
                      </span>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader
          title="Skills"
          description="What this person is qualified to work on."
        />
        {staff.skills?.length ? (
          <CardBody className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {staff.skills.map((skill, index) => (
                <SkillChip key={skill.name ?? index} skill={skill} />
              ))}
            </div>

            {staff.specializations?.length ? (
              <div className="flex flex-col gap-1.5 border-t border-border pt-3">
                <span className="text-[10px] font-bold uppercase tracking-wide text-text-faint">
                  Specializations
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {staff.specializations.map((item) => (
                    <Badge key={item} tone="neutral">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </CardBody>
        ) : (
          <EmptyState
            icon={WrenchIcon}
            title="No skills recorded"
            description="Skills and certifications added to this profile will appear here."
          />
        )}
      </Card>
    </div>
  )
}

/**
 * A skill with its level, certification and experience in one chip.
 *
 * Certification is a tick rather than a separate badge: it qualifies the
 * skill it belongs to, and splitting it out doubles the chip count while
 * making it ambiguous which skill is certified.
 */
function SkillChip({ skill }: { skill: StaffSkill }) {
  const tone = SKILL_TONE[skill.level ?? 'beginner'] ?? 'neutral'

  return (
    <span className="inline-flex items-center gap-2 rounded-pill border border-border bg-surface-sunken py-1 pl-2.5 pr-1.5 text-sm">
      <span className="font-medium text-text">{skill.name ?? 'Unnamed skill'}</span>

      {skill.certified ? (
        <CheckIcon
          className="h-3.5 w-3.5 text-success"
          aria-label="Certified"
        />
      ) : null}

      {skill.yearsOfExperience ? (
        <span className="tabnum font-mono text-xs text-text-faint">{skill.yearsOfExperience}y</span>
      ) : null}

      {skill.level ? <Badge tone={tone}>{skill.level}</Badge> : null}
    </span>
  )
}
