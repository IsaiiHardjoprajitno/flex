/**
 * Field Operations Tracking System - Data Store & Local Storage Engine
 */

const STORAGE_KEYS = {
  STAFF: 'fieldops_staff_v1',
  ATTENDANCE: 'fieldops_attendance_v1',
  TEAMS: 'fieldops_teams_v1',
  INSTALLS: 'fieldops_installs_v1',
  TROUBLESHOOTS: 'fieldops_troubleshoots_v1',
  SETTINGS: 'fieldops_settings_v1'
};

// Initial Seed Data Generator
const INITIAL_STAFF = [
  { id: 'stf-001', name: 'Marcus Vance', role: 'Lead', email: 'marcus.v@fieldops.io', status: 'Active', phone: '+1 555-0101', skills: ['Fiber Splicing', 'OTDR', 'Team Leadership'] },
  { id: 'stf-002', name: 'Elena Rostova', role: 'Lead', email: 'elena.r@fieldops.io', status: 'Active', phone: '+1 555-0102', skills: ['Troubleshooting', 'ONT Provisioning', 'Safety'] },
  { id: 'stf-003', name: 'Carlos Mendez', role: 'Lead', email: 'carlos.m@fieldops.io', status: 'Active', phone: '+1 555-0103', skills: ['Commercial Drops', 'Aerial Fiber', 'Leadership'] },
  { id: 'stf-004', name: 'Devon Wright', role: 'Technician', email: 'devon.w@fieldops.io', status: 'Active', phone: '+1 555-0104', skills: ['Residential Installs', 'Cat6/RG6'] },
  { id: 'stf-005', name: 'Aisha Patel', role: 'Technician', email: 'aisha.p@fieldops.io', status: 'Active', phone: '+1 555-0105', skills: ['Fiber Splicing', 'Drop Cabling'] },
  { id: 'stf-006', name: 'Liam O\'Connor', role: 'Technician', email: 'liam.o@fieldops.io', status: 'Active', phone: '+1 555-0106', skills: ['ONT Config', 'Mesh Wi-Fi'] },
  { id: 'stf-007', name: 'Sofia Chen', role: 'Technician', email: 'sofia.c@fieldops.io', status: 'Active', phone: '+1 555-0107', skills: ['Troubleshooting', 'Signal Loss Analysis'] },
  { id: 'stf-008', name: 'Jamal Washington', role: 'Technician', email: 'jamal.w@fieldops.io', status: 'Active', phone: '+1 555-0108', skills: ['Aerial Installs', 'Underground Conduit'] },
  { id: 'stf-009', name: 'Maya Lin', role: 'Technician', email: 'maya.l@fieldops.io', status: 'Active', phone: '+1 555-0109', skills: ['Residential Installs', 'Customer Support'] },
  { id: 'stf-010', name: 'Lucas Silva', role: 'Technician', email: 'lucas.s@fieldops.io', status: 'Active', phone: '+1 555-0110', skills: ['Drop Cabling', 'ONT Mounting'] },
  { id: 'stf-011', name: 'Hannah Abbott', role: 'Technician', email: 'hannah.a@fieldops.io', status: 'Active', phone: '+1 555-0111', skills: ['Fiber Testing', 'Power Meter'] },
  { id: 'stf-012', name: 'Noah Miller', role: 'Technician', email: 'noah.m@fieldops.io', status: 'Inactive', phone: '+1 555-0112', skills: ['Residential Cabling'] }
];

class FieldOpsDB {
  constructor() {
    this.listeners = [];
    this.init();
  }

  init() {
    if (!localStorage.getItem(STORAGE_KEYS.STAFF)) {
      this.populateSeedDatabase();
    }
  }

  populateSeedDatabase() {
    const today = new Date();
    const staff = [...INITIAL_STAFF];
    const teams = [];
    const attendance = [];
    const installs = [];
    const troubleshoots = [];

    // Generate past 7 days of realistic logs
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      // Mark Attendance
      staff.forEach((stf) => {
        if (stf.status === 'Inactive') return;
        const rand = Math.random();
        let status = 'Present';
        if (rand < 0.08) status = 'Absent';
        else if (rand < 0.15) status = 'On Leave';
        else if (rand < 0.22) status = 'Late';

        attendance.push({
          id: `att-${dateStr}-${stf.id}`,
          staffId: stf.id,
          date: dateStr,
          status: status,
          checkInTime: status === 'Present' ? '07:45' : (status === 'Late' ? '08:35' : null),
          notes: status === 'On Leave' ? 'Scheduled PTO' : (status === 'Late' ? 'Traffic delay' : '')
        });
      });

      // Teams for the day
      const teamAlphaId = `team-${dateStr}-alpha`;
      const teamBetaId = `team-${dateStr}-beta`;

      // Alpha Crew (4 members)
      teams.push({
        id: teamAlphaId,
        teamName: 'Team Alpha (Zone North)',
        date: dateStr,
        leadId: 'stf-001',
        members: ['stf-001', 'stf-004', 'stf-005', 'stf-006'],
        vehicleZone: 'North Sector / Van #104',
        notes: 'High density neighborhood deployment'
      });

      // Beta Crew (4 members)
      teams.push({
        id: teamBetaId,
        teamName: 'Team Beta (Zone South)',
        date: dateStr,
        leadId: 'stf-002',
        members: ['stf-002', 'stf-007', 'stf-008', 'stf-009'],
        vehicleZone: 'South Commercial / Truck #202',
        notes: 'Commercial drops & priority troubleshoots'
      });

      // Installation logs
      const alphaInstalls = Math.floor(Math.random() * 6) + 8; // 8-13
      const betaInstalls = Math.floor(Math.random() * 5) + 6;  // 6-10

      installs.push({
        id: `inst-${teamAlphaId}`,
        teamId: teamAlphaId,
        date: dateStr,
        quantityCompleted: alphaInstalls,
        installType: 'Residential Fiber Drop',
        locationZone: 'Zone North',
        hoursSpent: 8.0,
        notes: 'Completed all scheduled residential drops.'
      });

      installs.push({
        id: `inst-${teamBetaId}`,
        teamId: teamBetaId,
        date: dateStr,
        quantityCompleted: betaInstalls,
        installType: 'Commercial Gigabit Fiber',
        locationZone: 'Zone South',
        hoursSpent: 8.5,
        notes: 'Multi-tenant commercial building installation.'
      });

      // Troubleshoot logs
      const alphaTroubles = Math.floor(Math.random() * 4) + 2;
      const betaTroubles = Math.floor(Math.random() * 5) + 3;

      troubleshoots.push({
        id: `trb-${teamAlphaId}`,
        teamId: teamAlphaId,
        date: dateStr,
        casesResolved: alphaTroubles,
        category: 'Optical Signal Degradation',
        resolutionNotes: 'Cleaned bulkheads, re-spliced bent drop cable at demarc.'
      });

      troubleshoots.push({
        id: `trb-${teamBetaId}`,
        teamId: teamBetaId,
        date: dateStr,
        casesResolved: betaTroubles,
        category: 'Modem / ONT Configuration',
        resolutionNotes: 'Updated ONT firmware and reprovisioned VLAN tagging.'
      });
    }

    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(staff));
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
    localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
    localStorage.setItem(STORAGE_KEYS.INSTALLS, JSON.stringify(installs));
    localStorage.setItem(STORAGE_KEYS.TROUBLESHOOTS, JSON.stringify(troubleshoots));
  }

  // Subscribe to changes
  subscribe(fn) {
    this.listeners.push(fn);
  }

  notify(event, payload) {
    this.listeners.forEach(fn => fn(event, payload));
  }

  // Staff Methods
  getStaff() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.STAFF) || '[]');
  }

  getStaffById(id) {
    return this.getStaff().find(s => s.id === id);
  }

  saveStaff(staffMember) {
    const list = this.getStaff();
    const index = list.findIndex(s => s.id === staffMember.id);
    if (index >= 0) {
      list[index] = { ...list[index], ...staffMember };
    } else {
      if (!staffMember.id) staffMember.id = 'stf-' + Date.now();
      list.push(staffMember);
    }
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(list));
    this.notify('staff_updated', list);
    return staffMember;
  }

  // Attendance Methods
  getAttendance(dateFilter = null) {
    let list = JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTENDANCE) || '[]');
    if (dateFilter) {
      list = list.filter(a => a.date === dateFilter);
    }
    return list;
  }

  setAttendanceRecord(staffId, date, status, checkInTime = null, notes = '') {
    const list = this.getAttendance();
    const index = list.findIndex(a => a.staffId === staffId && a.date === date);
    const record = {
      id: `att-${date}-${staffId}`,
      staffId,
      date,
      status,
      checkInTime: checkInTime || (status === 'Present' ? '08:00' : null),
      notes
    };

    if (index >= 0) {
      list[index] = record;
    } else {
      list.push(record);
    }
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(list));
    this.notify('attendance_updated', record);
    return record;
  }

  // Daily Teams Methods
  getTeams(dateFilter = null) {
    let list = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEAMS) || '[]');
    if (dateFilter) {
      list = list.filter(t => t.date === dateFilter);
    }
    return list;
  }

  saveDailyTeam(teamData) {
    const list = this.getTeams();
    if (!teamData.id) {
      teamData.id = 'team-' + Date.now();
    }
    const index = list.findIndex(t => t.id === teamData.id);
    if (index >= 0) {
      list[index] = teamData;
    } else {
      list.push(teamData);
    }
    localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(list));

    // Automatically mark all team members as Present for this date
    if (teamData.members && teamData.date) {
      teamData.members.forEach(memberId => {
        this.setAttendanceRecord(memberId, teamData.date, 'Present', '07:45', `Assigned to ${teamData.teamName}`);
      });
    }

    this.notify('teams_updated', teamData);
    return teamData;
  }

  deleteTeam(teamId) {
    let list = this.getTeams().filter(t => t.id !== teamId);
    localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(list));
    
    // Also remove logs tied to this team
    let installs = this.getInstallLogs().filter(i => i.teamId !== teamId);
    let troubles = this.getTroubleshootLogs().filter(t => t.teamId !== teamId);
    localStorage.setItem(STORAGE_KEYS.INSTALLS, JSON.stringify(installs));
    localStorage.setItem(STORAGE_KEYS.TROUBLESHOOTS, JSON.stringify(troubles));

    this.notify('teams_updated', { deleted: teamId });
  }

  // Performance Logs: Installs
  getInstallLogs() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.INSTALLS) || '[]');
  }

  saveInstallLog(log) {
    const list = this.getInstallLogs();
    if (!log.id) log.id = 'inst-' + Date.now();
    const index = list.findIndex(i => i.id === log.id || (i.teamId === log.teamId && i.date === log.date));
    if (index >= 0) {
      list[index] = { ...list[index], ...log };
    } else {
      list.push(log);
    }
    localStorage.setItem(STORAGE_KEYS.INSTALLS, JSON.stringify(list));
    this.notify('installs_updated', log);
    return log;
  }

  // Performance Logs: Troubleshoots
  getTroubleshootLogs() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.TROUBLESHOOTS) || '[]');
  }

  saveTroubleshootLog(log) {
    const list = this.getTroubleshootLogs();
    if (!log.id) log.id = 'trb-' + Date.now();
    const index = list.findIndex(t => t.id === log.id || (t.teamId === log.teamId && t.date === log.date));
    if (index >= 0) {
      list[index] = { ...list[index], ...log };
    } else {
      list.push(log);
    }
    localStorage.setItem(STORAGE_KEYS.TROUBLESHOOTS, JSON.stringify(list));
    this.notify('troubleshoots_updated', log);
    return log;
  }

  // Complete Performance Summary rollup
  getRollupMetrics(filter = {}) {
    const teams = this.getTeams();
    const installs = this.getInstallLogs();
    const troubles = this.getTroubleshootLogs();
    const staff = this.getStaff();
    const attendance = this.getAttendance();

    // Calculate overall aggregates
    const totalInstalls = installs.reduce((sum, i) => sum + Number(i.quantityCompleted || 0), 0);
    const totalTroubles = troubles.reduce((sum, t) => sum + Number(t.casesResolved || 0), 0);
    const activeStaff = staff.filter(s => s.status === 'Active').length;

    // Team rollups
    const teamStats = {};
    teams.forEach(t => {
      if (!teamStats[t.teamName]) {
        teamStats[t.teamName] = {
          name: t.teamName,
          leadId: t.leadId,
          totalInstalls: 0,
          totalTroubles: 0,
          shiftCount: 0,
          members: new Set()
        };
      }
      teamStats[t.teamName].shiftCount++;
      (t.members || []).forEach(m => teamStats[t.teamName].members.add(m));

      const teamInst = installs.find(i => i.teamId === t.id);
      if (teamInst) teamStats[t.teamName].totalInstalls += Number(teamInst.quantityCompleted || 0);

      const teamTrb = troubles.find(tr => tr.teamId === t.id);
      if (teamTrb) teamStats[t.teamName].totalTroubles += Number(teamTrb.casesResolved || 0);
    });

    // Individual technician participation metrics
    const staffStats = {};
    staff.forEach(stf => {
      staffStats[stf.id] = {
        id: stf.id,
        name: stf.name,
        role: stf.role,
        shifts: 0,
        attributedInstalls: 0,
        attributedTroubles: 0
      };
    });

    teams.forEach(t => {
      const tInstalls = installs.find(i => i.teamId === t.id)?.quantityCompleted || 0;
      const tTroubles = troubles.find(tr => tr.teamId === t.id)?.casesResolved || 0;
      const memberCount = (t.members || []).length || 1;

      (t.members || []).forEach(mId => {
        if (staffStats[mId]) {
          staffStats[mId].shifts++;
          staffStats[mId].attributedInstalls += Math.round(tInstalls / memberCount * 10) / 10;
          staffStats[mId].attributedTroubles += Math.round(tTroubles / memberCount * 10) / 10;
        }
      });
    });

    return {
      totalInstalls,
      totalTroubles,
      activeStaff,
      teamStats: Object.values(teamStats),
      staffStats: Object.values(staffStats)
    };
  }

  // Backup & Restore
  exportAllData() {
    return {
      staff: this.getStaff(),
      attendance: this.getAttendance(),
      teams: this.getTeams(),
      installs: this.getInstallLogs(),
      troubleshoots: this.getTroubleshootLogs(),
      exportedAt: new Date().toISOString()
    };
  }

  importAllData(jsonData) {
    if (jsonData.staff) localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(jsonData.staff));
    if (jsonData.attendance) localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(jsonData.attendance));
    if (jsonData.teams) localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(jsonData.teams));
    if (jsonData.installs) localStorage.setItem(STORAGE_KEYS.INSTALLS, JSON.stringify(jsonData.installs));
    if (jsonData.troubleshoots) localStorage.setItem(STORAGE_KEYS.TROUBLESHOOTS, JSON.stringify(jsonData.troubleshoots));
    this.notify('data_reloaded');
  }

  resetToDefault() {
    localStorage.clear();
    this.populateSeedDatabase();
    this.notify('data_reloaded');
  }
}

// Global singleton instance
window.db = new FieldOpsDB();
