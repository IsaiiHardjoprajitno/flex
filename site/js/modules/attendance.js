/**
 * Attendance Matrix Module
 * Provides interactive calendar grid & quick-check-in for field technicians
 */

class AttendanceModule {
  constructor() {
    this.currentMonth = new Date().getMonth();
    this.currentYear = new Date().getFullYear();
    this.roleFilter = 'All';
    this.searchQuery = '';
    this.activeDate = new Date().toISOString().split('T')[0];
  }

  init() {
    this.bindEvents();
    this.render();
  }

  bindEvents() {
    // Role filter
    const roleSelect = document.getElementById('attendanceRoleFilter');
    if (roleSelect) {
      roleSelect.addEventListener('change', (e) => {
        this.roleFilter = e.target.value;
        this.render();
      });
    }

    // Search filter
    const searchInput = document.getElementById('attendanceSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase();
        this.render();
      });
    }

    // Month Navigation
    const btnPrev = document.getElementById('btnPrevMonth');
    const btnNext = document.getElementById('btnNextMonth');
    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        this.currentMonth--;
        if (this.currentMonth < 0) {
          this.currentMonth = 11;
          this.currentYear--;
        }
        this.render();
      });
    }
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        this.currentMonth++;
        if (this.currentMonth > 11) {
          this.currentMonth = 0;
          this.currentYear++;
        }
        this.render();
      });
    }

    // Quick Mark All Present Button
    const btnMarkAll = document.getElementById('btnMarkAllPresent');
    if (btnMarkAll) {
      btnMarkAll.addEventListener('click', () => this.markAllPresentToday());
    }

    window.db.subscribe((event) => {
      if (['attendance_updated', 'staff_updated', 'teams_updated', 'data_reloaded'].includes(event)) {
        this.render();
      }
    });
  }

  getDaysInMonth(month, year) {
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  }

  cycleStatus(staffId, dateStr) {
    const records = window.db.getAttendance(dateStr);
    const existing = records.find(r => r.staffId === staffId);
    
    // Cycle: Present -> Late -> On Leave -> Absent -> Present
    let nextStatus = 'Present';
    if (existing) {
      if (existing.status === 'Present') nextStatus = 'Late';
      else if (existing.status === 'Late') nextStatus = 'On Leave';
      else if (existing.status === 'On Leave') nextStatus = 'Absent';
      else if (existing.status === 'Absent') nextStatus = 'Present';
    }

    window.db.setAttendanceRecord(staffId, dateStr, nextStatus, nextStatus === 'Present' ? '07:45' : (nextStatus === 'Late' ? '08:30' : null));
    window.app.showToast(`Updated attendance for ${dateStr} to ${nextStatus}`, 'info');
  }

  markAllPresentToday() {
    const today = this.activeDate;
    const staff = window.db.getStaff().filter(s => s.status === 'Active');
    staff.forEach(s => {
      window.db.setAttendanceRecord(s.id, today, 'Present', '07:45', 'Bulk Daily Check-in');
    });
    window.app.showToast(`All ${staff.length} active technicians marked Present for ${today}!`, 'success');
  }

  render() {
    const container = document.getElementById('attendanceMatrixContainer');
    const monthTitle = document.getElementById('attendanceMonthTitle');
    const statsContainer = document.getElementById('attendanceStatsContainer');
    if (!container) return;

    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    if (monthTitle) {
      monthTitle.textContent = `${monthNames[this.currentMonth]} ${this.currentYear}`;
    }

    // Filter staff
    let staffList = window.db.getStaff().filter(s => s.status === 'Active');
    if (this.roleFilter !== 'All') {
      staffList = staffList.filter(s => s.role === this.roleFilter);
    }
    if (this.searchQuery) {
      staffList = staffList.filter(s => s.name.toLowerCase().includes(this.searchQuery));
    }

    const days = this.getDaysInMonth(this.currentMonth, this.currentYear);
    const allAttendance = window.db.getAttendance();

    // Render Stats
    if (statsContainer) {
      const todayRecords = allAttendance.filter(a => a.date === this.activeDate);
      const presentCount = todayRecords.filter(a => a.status === 'Present' || a.status === 'Late').length;
      const leaveCount = todayRecords.filter(a => a.status === 'On Leave').length;
      const absentCount = todayRecords.filter(a => a.status === 'Absent').length;
      const totalActive = staffList.length || 1;
      const rate = Math.round((presentCount / totalActive) * 100);

      statsContainer.innerHTML = `
        <div style="display:flex; gap:1.5rem; flex-wrap:wrap; margin-bottom:1rem;">
          <div class="kpi-card" style="padding:0.85rem 1.25rem; flex:1; min-width:160px;">
            <div class="kpi-title">Today's Presence Rate</div>
            <div class="kpi-value" style="font-size:1.5rem; color:var(--accent-emerald);">${rate}%</div>
            <div class="kpi-footer">${presentCount} of ${totalActive} On-duty</div>
          </div>
          <div class="kpi-card" style="padding:0.85rem 1.25rem; flex:1; min-width:160px;">
            <div class="kpi-title">On Leave / PTO</div>
            <div class="kpi-value" style="font-size:1.5rem; color:var(--accent-amber);">${leaveCount}</div>
            <div class="kpi-footer">Approved Time Off</div>
          </div>
          <div class="kpi-card" style="padding:0.85rem 1.25rem; flex:1; min-width:160px;">
            <div class="kpi-title">Unplanned Absent</div>
            <div class="kpi-value" style="font-size:1.5rem; color:var(--accent-rose);">${absentCount}</div>
            <div class="kpi-footer">Requires replacement</div>
          </div>
        </div>
      `;
    }

    // Render Matrix Table
    let tableHtml = `
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th style="position:sticky; left:0; z-index:10; background:var(--bg-surface-elevated); min-width:180px;">Staff Member</th>
              <th style="position:sticky; left:180px; z-index:10; background:var(--bg-surface-elevated); min-width:90px;">Role</th>
              ${days.map(d => {
                const dayNum = d.getDate();
                const dayName = d.toLocaleDateString('en-US', { weekday: 'narrow' });
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                return `<th style="text-align:center; min-width:38px; padding:0.4rem 0.2rem; ${isWeekend ? 'opacity:0.6;' : ''}">${dayNum}<br><span style="font-size:0.65rem; color:var(--text-dim);">${dayName}</span></th>`;
              }).join('')}
              <th style="text-align:center; min-width:80px;">Monthly Rate</th>
            </tr>
          </thead>
          <tbody>
            ${staffList.map(stf => {
              let presentDays = 0;
              let loggedDays = 0;

              const cellElements = days.map(d => {
                const dateStr = d.toISOString().split('T')[0];
                const rec = allAttendance.find(a => a.staffId === stf.id && a.date === dateStr);
                const status = rec ? rec.status : 'Empty';

                let cellClass = 'empty';
                let symbol = '-';

                if (status === 'Present') {
                  cellClass = 'present';
                  symbol = 'P';
                  presentDays++;
                  loggedDays++;
                } else if (status === 'Late') {
                  cellClass = 'present';
                  symbol = 'L';
                  presentDays++;
                  loggedDays++;
                } else if (status === 'On Leave') {
                  cellClass = 'leave';
                  symbol = 'O';
                  loggedDays++;
                } else if (status === 'Absent') {
                  cellClass = 'absent';
                  symbol = 'A';
                  loggedDays++;
                }

                return `
                  <td style="padding:2px; text-align:center;">
                    <div class="matrix-cell ${cellClass}" title="${stf.name} - ${dateStr}: ${status}" onclick="window.attendance.cycleStatus('${stf.id}', '${dateStr}')">
                      ${symbol}
                    </div>
                  </td>
                `;
              }).join('');

              const ratePercent = loggedDays > 0 ? Math.round((presentDays / loggedDays) * 100) : 100;

              return `
                <tr>
                  <td style="position:sticky; left:0; z-index:9; background:var(--bg-surface); font-weight:600;">
                    ${stf.name}
                  </td>
                  <td style="position:sticky; left:180px; z-index:9; background:var(--bg-surface);">
                    <span class="badge ${stf.role === 'Lead' ? 'badge-primary' : 'badge-secondary'}" style="font-size:0.7rem;">${stf.role}</span>
                  </td>
                  ${cellElements}
                  <td style="text-align:center; font-weight:700; color:${ratePercent >= 90 ? 'var(--accent-emerald)' : (ratePercent >= 75 ? 'var(--accent-amber)' : 'var(--accent-rose)')};">
                    ${ratePercent}%
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div style="display:flex; align-items:center; gap:1.25rem; margin-top:0.85rem; font-size:0.78rem; color:var(--text-muted);">
        <span><strong>Legend:</strong></span>
        <span style="display:flex; align-items:center; gap:0.35rem;"><div class="matrix-cell present" style="width:20px; height:20px; font-size:0.65rem; display:inline-flex; align-items:center; justify-content:center;">P</div> Present / On Duty</span>
        <span style="display:flex; align-items:center; gap:0.35rem;"><div class="matrix-cell present" style="width:20px; height:20px; font-size:0.65rem; display:inline-flex; align-items:center; justify-content:center; color:#FBBF24;">L</div> Late Arrival</span>
        <span style="display:flex; align-items:center; gap:0.35rem;"><div class="matrix-cell leave" style="width:20px; height:20px; font-size:0.65rem; display:inline-flex; align-items:center; justify-content:center;">O</div> On Leave (PTO)</span>
        <span style="display:flex; align-items:center; gap:0.35rem;"><div class="matrix-cell absent" style="width:20px; height:20px; font-size:0.65rem; display:inline-flex; align-items:center; justify-content:center;">A</div> Absent</span>
        <span style="margin-left:auto; color:var(--text-dim);">* Click any cell to cycle status</span>
      </div>
    `;

    container.innerHTML = tableHtml;
  }
}

window.attendance = new AttendanceModule();
