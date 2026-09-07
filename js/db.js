/**
 * Field Operations Tracking System - Data Store & Local Storage Engine
 */

const STORAGE_KEYS = {
  STAFF: 'fieldops_staff_v2',
  ATTENDANCE: 'fieldops_attendance_v2',
  TEAMS: 'fieldops_teams_v2',
  INSTALLS: 'fieldops_installs_v2',
  TROUBLESHOOTS: 'fieldops_troubleshoots_v2',
  SETTINGS: 'fieldops_settings_v2'
};

class FieldOpsDB {
  constructor() {
    this.listeners = [];
    this.remoteSyncing = false;
    this.init();
  }

  init() {
    if (!localStorage.getItem(STORAGE_KEYS.STAFF)) {
      this.populateSeedDatabase();
    }
  }

  populateSeedDatabase() {
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.INSTALLS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.TROUBLESHOOTS, JSON.stringify([]));
  }

  // Subscribe to changes
  subscribe(fn) {
    this.listeners.push(fn);
  }

  notify(event, payload) {
    this.listeners.forEach(fn => fn(event, payload));
  }

  getSupabase() {
    return window.supabaseAuth?.client || null;
  }

  async syncRemote() {
    const supabase = this.getSupabase();
    if (!supabase || this.remoteSyncing) return;
    this.remoteSyncing = true;

    try {
      const [staffResult, attendanceResult, teamsResult, membersResult, installsResult, troublesResult] = await Promise.all([
        supabase.from('staff').select('*').order('name'),
        supabase.from('daily_attendance').select('*'),
        supabase.from('daily_teams').select('*').order('date', { ascending: false }),
        supabase.from('team_members').select('*'),
        supabase.from('installation_logs').select('*'),
        supabase.from('troubleshoot_logs').select('*')
      ]);
      const failed = [staffResult, attendanceResult, teamsResult, membersResult, installsResult, troublesResult].find(result => result.error);
      if (failed) throw failed.error;

      const membersByTeam = {};
      membersResult.data.forEach(member => {
        if (!membersByTeam[member.team_id]) membersByTeam[member.team_id] = [];
        membersByTeam[member.team_id].push(member.staff_id);
      });

      const teams = teamsResult.data.map(team => ({
        id: team.id,
        teamName: team.team_name,
        date: team.date,
        leadId: team.lead_id,
        members: membersByTeam[team.id] || [],
        vehicleZone: team.vehicle_zone || '',
        notes: team.notes || ''
      }));
      const attendance = attendanceResult.data.map(record => ({
        id: record.id,
        staffId: record.staff_id,
        date: record.date,
        status: record.status,
        checkInTime: record.check_in_time || null,
        notes: record.notes || ''
      }));
      const installs = installsResult.data.map(log => ({
        id: log.id,
        teamId: log.team_id,
        date: log.date,
        quantityCompleted: log.quantity_completed,
        installType: log.install_type || 'Standard Fiber',
        locationZone: log.location_zone || '',
        hoursSpent: log.hours_spent || 0,
        notes: log.notes || ''
      }));
      const troubles = troublesResult.data.map(log => ({
        id: log.id,
        teamId: log.team_id,
        date: log.date,
        casesResolved: log.cases_resolved,
        category: log.category,
        resolutionNotes: log.resolution_notes || ''
      }));

      localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(staffResult.data));
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
      localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
      localStorage.setItem(STORAGE_KEYS.INSTALLS, JSON.stringify(installs));
      localStorage.setItem(STORAGE_KEYS.TROUBLESHOOTS, JSON.stringify(troubles));
      this.notify('data_reloaded');
    } catch (error) {
      console.error('[Supabase] Sync failed:', error.message);
      window.app?.showToast('Could not load shared records. Check your Supabase policies.', 'error');
    } finally {
      this.remoteSyncing = false;
    }
  }

  queueRemote(operation) {
    const supabase = this.getSupabase();
    if (supabase) operation(supabase).catch(error => {
      console.error('[Supabase] Save failed:', error.message);
      window.app?.showToast('Record saved locally but not to the shared database.', 'error');
    });
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
      if (!staffMember.id) staffMember.id = crypto.randomUUID();
      list.push(staffMember);
    }
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(list));
    this.queueRemote(supabase => supabase.from('staff').upsert({
      id: staffMember.id,
      name: staffMember.name,
      email: staffMember.email || null,
      role: staffMember.role,
      status: staffMember.status,
      skills: staffMember.skills || [],
      phone: staffMember.phone || null,
      updated_at: new Date().toISOString()
    }));
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
    const existing = index >= 0 ? list[index] : null;
    const record = {
      id: existing?.id || crypto.randomUUID(),
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
    this.queueRemote(supabase => supabase.from('daily_attendance').upsert({
      id: record.id,
      staff_id: staffId,
      date,
      status,
      check_in_time: record.checkInTime,
      notes
    }, { onConflict: 'staff_id,date' }));
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
      teamData.id = crypto.randomUUID();
    }
    const index = list.findIndex(t => t.id === teamData.id);
    if (index >= 0) {
      list[index] = teamData;
    } else {
      list.push(teamData);
    }
    localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(list));
    this.queueRemote(async supabase => {
      const { error } = await supabase.from('daily_teams').upsert({
        id: teamData.id,
        team_name: teamData.teamName,
        date: teamData.date,
        lead_id: teamData.leadId,
        vehicle_zone: teamData.vehicleZone || null,
        notes: teamData.notes || null
      });
      if (error) throw error;
      await supabase.from('team_members').delete().eq('team_id', teamData.id);
      const members = (teamData.members || []).map(staffId => ({ team_id: teamData.id, staff_id: staffId }));
      if (members.length) {
        const result = await supabase.from('team_members').insert(members);
        if (result.error) throw result.error;
      }
    });

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
    this.queueRemote(supabase => supabase.from('daily_teams').delete().eq('id', teamId));

    this.notify('teams_updated', { deleted: teamId });
  }

  // Performance Logs: Installs
  getInstallLogs() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.INSTALLS) || '[]');
  }

  saveInstallLog(log) {
    const list = this.getInstallLogs();
    if (!log.id) log.id = crypto.randomUUID();
    const index = list.findIndex(i => i.id === log.id || (i.teamId === log.teamId && i.date === log.date));
    if (index >= 0) {
      list[index] = { ...list[index], ...log };
    } else {
      list.push(log);
    }
    localStorage.setItem(STORAGE_KEYS.INSTALLS, JSON.stringify(list));
    this.queueRemote(supabase => supabase.from('installation_logs').upsert({
      id: log.id,
      team_id: log.teamId,
      date: log.date,
      quantity_completed: log.quantityCompleted,
      install_type: log.installType,
      location_zone: log.locationZone || null,
      hours_spent: log.hoursSpent || 0,
      notes: log.notes || null
    }));
    this.notify('installs_updated', log);
    return log;
  }

  // Performance Logs: Troubleshoots
  getTroubleshootLogs() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.TROUBLESHOOTS) || '[]');
  }

  saveTroubleshootLog(log) {
    const list = this.getTroubleshootLogs();
    if (!log.id) log.id = crypto.randomUUID();
    const index = list.findIndex(t => t.id === log.id || (t.teamId === log.teamId && t.date === log.date));
    if (index >= 0) {
      list[index] = { ...list[index], ...log };
    } else {
      list.push(log);
    }
    localStorage.setItem(STORAGE_KEYS.TROUBLESHOOTS, JSON.stringify(list));
    this.queueRemote(supabase => supabase.from('troubleshoot_logs').upsert({
      id: log.id,
      team_id: log.teamId,
      date: log.date,
      cases_resolved: log.casesResolved,
      category: log.category,
      resolution_notes: log.resolutionNotes || null
    }));
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
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    this.populateSeedDatabase();
    this.notify('data_reloaded');
  }
}

// Global singleton instance
window.db = new FieldOpsDB();
