/**
 * Main Application Controller
 * Handles routing, role state, header synchronizations, and dashboard KPIs
 */

class App {
  constructor() {
    this.currentTab = 'dashboard';
    this.currentRole = 'Admin'; // 'Admin', 'Lead'
    this.currentDate = new Date().toISOString().split('T')[0];
  }

  init() {
    this.initDateSelector();
    this.initNavigation();
    this.initRoleSwitcher();
    this.initModules();
    this.renderDashboardKPIs();
    this.renderRecentActivity();
    this.bindGlobalEvents();
  }

  initDateSelector() {
    const headerDate = document.getElementById('globalDateInput');
    if (headerDate) {
      headerDate.value = this.currentDate;
      headerDate.addEventListener('change', (e) => {
        this.currentDate = e.target.value;
        if (window.teamLogger) window.teamLogger.setDate(this.currentDate);
        if (window.attendance) {
          window.attendance.activeDate = this.currentDate;
          window.attendance.render();
        }
        this.renderDashboardKPIs();
        this.renderRecentActivity();
      });
    }
  }

  initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = item.getAttribute('data-tab');
        if (tab) this.switchTab(tab);
      });
    });
  }

  switchTab(tabName) {
    this.currentTab = tabName;

    // Update Nav
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.getAttribute('data-tab') === tabName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update Pages
    document.querySelectorAll('.page-view').forEach(view => {
      if (view.id === `view-${tabName}`) {
        view.classList.add('active');
      } else {
        view.classList.remove('active');
      }
    });

    // Refresh specific module on tab activation
    if (tabName === 'dashboard') {
      this.renderDashboardKPIs();
      this.renderRecentActivity();
    } else if (tabName === 'attendance' && window.attendance) {
      window.attendance.render();
    } else if (tabName === 'analytics' && window.analytics) {
      window.analytics.render();
    } else if (tabName === 'staff' && window.staffModule) {
      window.staffModule.render();
    } else if (tabName === 'team-entry' && window.teamLogger) {
      window.teamLogger.renderForm();
      window.teamLogger.renderTodayTeamsList();
    }
  }

  initRoleSwitcher() {
    const roleSelect = document.getElementById('appRoleSelect');
    if (roleSelect) {
      roleSelect.value = this.currentRole;
      roleSelect.addEventListener('change', (e) => {
        this.currentRole = e.target.value;
        this.applyRolePermissions();
      });
    }
    this.applyRolePermissions();
  }

  applyRolePermissions() {
    const isLead = this.currentRole === 'Lead';
    const adminOnlyElements = document.querySelectorAll('.admin-only');

    adminOnlyElements.forEach(el => {
      el.style.display = isLead ? 'none' : '';
    });

    if (isLead && (this.currentTab === 'staff' || this.currentTab === 'export')) {
      this.switchTab('team-entry');
    }

    this.showToast(`Switched view to ${this.currentRole === 'Admin' ? 'Operations Manager (Admin)' : 'Field Team Lead'}`, 'info');
  }

  initModules() {
    if (window.teamLogger) window.teamLogger.init();
    if (window.attendance) window.attendance.init();
    if (window.analytics) window.analytics.init();
    if (window.staffModule) window.staffModule.init();
    if (window.exportModule) window.exportModule.init();
  }

  bindGlobalEvents() {
    window.db.subscribe((event) => {
      this.renderDashboardKPIs();
      this.renderRecentActivity();
    });
  }

  renderDashboardKPIs() {
    const teams = window.db.getTeams(this.currentDate);
    const installs = window.db.getInstallLogs().filter(i => i.date === this.currentDate);
    const troubles = window.db.getTroubleshootLogs().filter(t => t.date === this.currentDate);
    const staff = window.db.getStaff().filter(s => s.status === 'Active');
    const attendance = window.db.getAttendance(this.currentDate);

    const todayInstalls = installs.reduce((sum, i) => sum + Number(i.quantityCompleted || 0), 0);
    const todayTroubles = troubles.reduce((sum, t) => sum + Number(t.casesResolved || 0), 0);
    const activeCrews = teams.length;

    const presentCount = attendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
    const attRate = staff.length > 0 ? Math.round((presentCount / staff.length) * 100) : 100;

    // Update DOM
    const kpiInstalls = document.getElementById('dashKpiInstalls');
    const kpiTroubles = document.getElementById('dashKpiTroubles');
    const kpiTeams = document.getElementById('dashKpiTeams');
    const kpiAttendance = document.getElementById('dashKpiAttendance');

    if (kpiInstalls) kpiInstalls.textContent = todayInstalls;
    if (kpiTroubles) kpiTroubles.textContent = todayTroubles;
    if (kpiTeams) kpiTeams.textContent = activeCrews;
    if (kpiAttendance) kpiAttendance.textContent = `${attRate}%`;

    // Render today's quick crew summary
    const crewsContainer = document.getElementById('dashTodayCrewsContainer');
    if (crewsContainer) {
      if (teams.length === 0) {
        crewsContainer.innerHTML = `
          <div style="padding:1.5rem; text-align:center; color:var(--text-dim);">
            No teams logged for today (${this.currentDate}). <br>
            <button class="btn btn-primary btn-sm" style="margin-top:0.75rem;" onclick="window.app.switchTab('team-entry')">
              + Configure Today's Teams
            </button>
          </div>
        `;
      } else {
        crewsContainer.innerHTML = `
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:1rem;">
            ${teams.map(t => {
              const lead = staff.find(s => s.id === t.leadId)?.name || 'Unassigned';
              const inst = installs.find(i => i.teamId === t.id)?.quantityCompleted || 0;
              const trb = troubles.find(tr => tr.teamId === t.id)?.casesResolved || 0;
              const memberNames = (t.members || []).map(mId => staff.find(s => s.id === mId)?.name).filter(Boolean);

              return `
                <div class="panel" style="margin-bottom:0; background:var(--bg-surface-elevated); padding:1rem;">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem;">
                    <strong>${t.teamName}</strong>
                    <span class="badge badge-primary">Lead: ${lead}</span>
                  </div>
                  <div style="font-size:0.75rem; color:var(--text-dim); margin-bottom:0.75rem;">
                    Zone: ${t.vehicleZone || 'No zone assigned'} • ${t.members.length} Technicians
                  </div>
                  <div style="display:flex; flex-wrap:wrap; gap:0.25rem; margin-bottom:0.75rem;">
                    ${memberNames.map(m => `<span style="font-size:0.7rem; background:var(--bg-surface); padding:0.1rem 0.4rem; border-radius:4px; border:1px solid var(--border-subtle);">${m}</span>`).join('')}
                  </div>
                  <div style="display:flex; justify-content:space-between; border-top:1px solid var(--border-subtle); padding-top:0.5rem; font-size:0.8rem;">
                    <span>Installs: <strong style="color:var(--accent-emerald);">${inst}</strong></span>
                    <span>Troubleshoots: <strong style="color:var(--accent-amber);">${trb}</strong></span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }
    }
  }

  renderRecentActivity() {
    const activityContainer = document.getElementById('dashRecentActivityContainer');
    if (!activityContainer) return;

    const teams = window.db.getTeams().slice(-5).reverse();
    const staff = window.db.getStaff();

    if (teams.length === 0) {
      activityContainer.innerHTML = '<p style="color:var(--text-dim); font-size:0.85rem;">No recent activities logged.</p>';
      return;
    }

    activityContainer.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:0.85rem;">
        ${teams.map(t => {
          const lead = staff.find(s => s.id === t.leadId)?.name || 'Lead';
          return `
            <div style="display:flex; align-items:center; gap:0.75rem; font-size:0.85rem; padding-bottom:0.5rem; border-bottom:1px solid var(--border-subtle);">
              <div style="width:8px; height:8px; border-radius:50%; background:var(--primary-light);"></div>
              <div>
                <strong>${t.teamName}</strong> logged for <strong>${t.date}</strong> by ${lead} (${t.members?.length || 0} crew members)
              </div>
              <span style="margin-left:auto; font-size:0.72rem; color:var(--text-dim);">${t.vehicleZone || ''}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
  window.app.init();
});
