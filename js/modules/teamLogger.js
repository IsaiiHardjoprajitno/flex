/**
 * Team Builder & Daily Performance Logger Module
 * Enforces 3 to 5 staff members per team and logs installations & troubleshoots
 */

class TeamLoggerModule {
  constructor() {
    this.selectedMembers = new Set();
    this.editingTeamId = null;
    this.selectedDate = new Date().toISOString().split('T')[0];
  }

  init() {
    this.bindEvents();
    this.renderForm();
    this.renderTodayTeamsList();
  }

  setDate(date) {
    this.selectedDate = date;
    const dateInput = document.getElementById('logDate');
    if (dateInput) dateInput.value = date;
    this.renderForm();
    this.renderTodayTeamsList();
  }

  bindEvents() {
    // Team submission form
    const form = document.getElementById('teamLogForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
    }

    // Reset button
    const btnReset = document.getElementById('btnResetForm');
    if (btnReset) {
      btnReset.addEventListener('click', () => this.resetForm());
    }

    // Listen for database changes
    window.db.subscribe((event) => {
      if (['staff_updated', 'teams_updated', 'installs_updated', 'troubleshoots_updated', 'data_reloaded'].includes(event)) {
        this.renderForm();
        this.renderTodayTeamsList();
      }
    });
  }

  renderForm() {
    const staffList = window.db.getStaff().filter(s => s.status === 'Active');
    const leadSelect = document.getElementById('teamLeadSelect');
    const chipsContainer = document.getElementById('staffChipsContainer');
    const dateInput = document.getElementById('logDate');

    if (dateInput) dateInput.value = this.selectedDate;

    // Populate Leads
    if (leadSelect) {
      const currentLead = leadSelect.value;
      leadSelect.innerHTML = '<option value="">-- Select Team Lead --</option>' +
        staffList.map(s => `<option value="${s.id}" ${s.id === currentLead ? 'selected' : ''}>${s.name} (${s.role})</option>`).join('');
    }

    // Populate Staff Chips
    if (chipsContainer) {
      chipsContainer.innerHTML = staffList.map(s => {
        const isSelected = this.selectedMembers.has(s.id);
        const initials = s.name.split(' ').map(n => n[0]).join('').substring(0, 2);
        return `
          <div class="staff-chip ${isSelected ? 'selected' : ''}" data-id="${s.id}" onclick="window.teamLogger.toggleMember('${s.id}')">
            <div class="chip-avatar">${initials}</div>
            <span>${s.name}</span>
            <span style="font-size:0.7rem; color:var(--text-dim);">[${s.role}]</span>
          </div>
        `;
      }).join('');
    }

    this.updateMemberCountBadge();
  }

  toggleMember(staffId) {
    if (this.selectedMembers.has(staffId)) {
      this.selectedMembers.delete(staffId);
    } else {
      if (this.selectedMembers.size >= 5) {
        window.app.showToast('Maximum 5 team members allowed per team!', 'error');
        return;
      }
      this.selectedMembers.add(staffId);
      
      // If team lead is empty, auto-set if lead
      const leadSelect = document.getElementById('teamLeadSelect');
      if (leadSelect && !leadSelect.value) {
        const staff = window.db.getStaffById(staffId);
        if (staff && staff.role === 'Lead') {
          leadSelect.value = staffId;
        }
      }
    }
    this.renderForm();
  }

  updateMemberCountBadge() {
    const badge = document.getElementById('memberCountBadge');
    const count = this.selectedMembers.size;
    if (!badge) return;

    badge.textContent = `${count} / 3-5 Members Selected`;
    if (count >= 3 && count <= 5) {
      badge.className = 'counter-badge valid';
    } else {
      badge.className = 'counter-badge invalid';
    }
  }

  handleSubmit() {
    const teamName = document.getElementById('teamNameInput').value.trim();
    const leadId = document.getElementById('teamLeadSelect').value;
    const logDate = document.getElementById('logDate').value || this.selectedDate;
    const vehicleZone = document.getElementById('vehicleZoneInput').value.trim();
    const teamNotes = document.getElementById('teamNotesInput').value.trim();

    // Performance inputs
    const installsQty = parseInt(document.getElementById('installsQtyInput').value || '0', 10);
    const installType = document.getElementById('installTypeInput').value;
    const installNotes = document.getElementById('installNotesInput').value.trim();

    const troublesQty = parseInt(document.getElementById('troublesQtyInput').value || '0', 10);
    const troubleCategory = document.getElementById('troubleCategoryInput').value;
    const troubleNotes = document.getElementById('troubleNotesInput').value.trim();

    // Validation
    if (!teamName) {
      window.app.showToast('Please enter a Team Name / Number.', 'error');
      return;
    }
    if (!leadId) {
      window.app.showToast('Please select a Team Lead.', 'error');
      return;
    }
    if (this.selectedMembers.size < 3 || this.selectedMembers.size > 5) {
      window.app.showToast('Daily team MUST have between 3 and 5 members!', 'error');
      return;
    }
    if (!this.selectedMembers.has(leadId)) {
      this.selectedMembers.add(leadId);
      if (this.selectedMembers.size > 5) {
        window.app.showToast('Team Lead must be part of the 3-5 member crew!', 'error');
        return;
      }
    }

    // 1. Save Team
    const teamData = {
      id: this.editingTeamId || `team-${Date.now()}`,
      teamName,
      date: logDate,
      leadId,
      members: Array.from(this.selectedMembers),
      vehicleZone,
      notes: teamNotes
    };
    const savedTeam = window.db.saveDailyTeam(teamData);

    // 2. Save Installation Log
    window.db.saveInstallLog({
      id: `inst-${savedTeam.id}`,
      teamId: savedTeam.id,
      date: logDate,
      quantityCompleted: installsQty,
      installType,
      locationZone: vehicleZone,
      hoursSpent: 8.0,
      notes: installNotes
    });

    // 3. Save Troubleshoot Log
    window.db.saveTroubleshootLog({
      id: `trb-${savedTeam.id}`,
      teamId: savedTeam.id,
      date: logDate,
      casesResolved: troublesQty,
      category: troubleCategory,
      resolutionNotes: troubleNotes
    });

    window.app.showToast(`Team '${teamName}' and daily performance logs saved successfully!`, 'success');
    this.resetForm();
    this.renderTodayTeamsList();
  }

  resetForm() {
    this.editingTeamId = null;
    this.selectedMembers.clear();
    const form = document.getElementById('teamLogForm');
    if (form) form.reset();
    document.getElementById('logDate').value = this.selectedDate;
    document.getElementById('formSubmitBtnText').textContent = 'Save Daily Log & Crew';
    this.renderForm();
  }

  editTeam(teamId) {
    const team = window.db.getTeams().find(t => t.id === teamId);
    if (!team) return;

    this.editingTeamId = team.id;
    this.selectedMembers = new Set(team.members || []);
    
    document.getElementById('teamNameInput').value = team.teamName || '';
    document.getElementById('teamLeadSelect').value = team.leadId || '';
    document.getElementById('logDate').value = team.date || this.selectedDate;
    document.getElementById('vehicleZoneInput').value = team.vehicleZone || '';
    document.getElementById('teamNotesInput').value = team.notes || '';

    // Populate install logs
    const install = window.db.getInstallLogs().find(i => i.teamId === team.id);
    if (install) {
      document.getElementById('installsQtyInput').value = install.quantityCompleted || 0;
      document.getElementById('installTypeInput').value = install.installType || 'Residential Fiber Drop';
      document.getElementById('installNotesInput').value = install.notes || '';
    }

    // Populate troubleshoot logs
    const trouble = window.db.getTroubleshootLogs().find(t => t.teamId === team.id);
    if (trouble) {
      document.getElementById('troublesQtyInput').value = trouble.casesResolved || 0;
      document.getElementById('troubleCategoryInput').value = trouble.category || 'Optical Signal Degradation';
      document.getElementById('troubleNotesInput').value = trouble.resolutionNotes || '';
    }

    document.getElementById('formSubmitBtnText').textContent = 'Update Daily Team Log';
    this.renderForm();

    // Scroll to top of form
    window.scrollTo({ top: 120, behavior: 'smooth' });
    window.app.showToast(`Loaded team '${team.teamName}' for editing.`, 'info');
  }

  deleteTeam(teamId) {
    if (confirm('Are you sure you want to delete this team assignment and its daily logs?')) {
      window.db.deleteTeam(teamId);
      window.app.showToast('Team assignment and performance logs deleted.', 'info');
      this.renderTodayTeamsList();
    }
  }

  renderTodayTeamsList() {
    const container = document.getElementById('todayTeamsListContainer');
    if (!container) return;

    const teams = window.db.getTeams(this.selectedDate);
    const installs = window.db.getInstallLogs();
    const troubles = window.db.getTroubleshootLogs();
    const allStaff = window.db.getStaff();

    if (teams.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 2.5rem; color:var(--text-dim);">
          <svg style="width:40px; height:40px; margin-bottom:0.5rem; opacity:0.5;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
          </svg>
          <p>No active teams dispatched for <strong>${this.selectedDate}</strong> yet.</p>
          <p style="font-size:0.8rem; margin-top:0.25rem;">Use the form to assign 3-5 technicians and submit daily metrics.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Team Name</th>
              <th>Lead</th>
              <th>Assigned Crew (3-5)</th>
              <th>Zone / Vehicle</th>
              <th>Installs</th>
              <th>Troubleshoots</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${teams.map(t => {
              const lead = allStaff.find(s => s.id === t.leadId)?.name || 'Unassigned';
              const memberNames = (t.members || [])
                .map(mId => allStaff.find(s => s.id === mId)?.name)
                .filter(Boolean);

              const inst = installs.find(i => i.teamId === t.id);
              const trb = troubles.find(tr => tr.teamId === t.id);

              return `
                <tr>
                  <td><strong>${t.teamName}</strong></td>
                  <td><span class="badge badge-primary">${lead}</span></td>
                  <td>
                    <div style="display:flex; flex-wrap:wrap; gap:0.25rem;">
                      ${memberNames.map(m => `<span style="font-size:0.75rem; background:var(--bg-surface-elevated); padding:0.15rem 0.45rem; border-radius:4px; border:1px solid var(--border-subtle);">${m}</span>`).join('')}
                    </div>
                  </td>
                  <td>${t.vehicleZone || '-'}</td>
                  <td><strong style="color:var(--accent-emerald);">${inst ? inst.quantityCompleted : 0}</strong></td>
                  <td><strong style="color:var(--accent-amber);">${trb ? trb.casesResolved : 0}</strong></td>
                  <td>
                    <div style="display:flex; gap:0.4rem;">
                      <button class="btn btn-secondary btn-sm" onclick="window.teamLogger.editTeam('${t.id}')">Edit</button>
                      <button class="btn btn-secondary btn-sm" style="color:var(--accent-rose);" onclick="window.teamLogger.deleteTeam('${t.id}')">Delete</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
}

window.teamLogger = new TeamLoggerModule();
