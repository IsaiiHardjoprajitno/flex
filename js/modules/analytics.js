/**
 * Analytics & Performance Rollup Engine
 * Visualizes installation trends, troubleshoot metrics, team leaderboards, and technician attribution
 */

class AnalyticsModule {
  constructor() {
    this.timeframe = '7d'; // 'today', '7d', '30d', 'all'
    this.teamFilter = 'All';
    this.staffFilter = 'All';
    this.charts = {};
  }

  init() {
    this.bindEvents();
    this.render();
  }

  bindEvents() {
    const tfSelect = document.getElementById('analyticsTimeframe');
    if (tfSelect) {
      tfSelect.addEventListener('change', (e) => {
        this.timeframe = e.target.value;
        this.render();
      });
    }

    const teamFilter = document.getElementById('analyticsTeamFilter');
    if (teamFilter) {
      teamFilter.addEventListener('change', (e) => {
        this.teamFilter = e.target.value;
        this.render();
      });
    }

    window.db.subscribe((event) => {
      if (['installs_updated', 'troubleshoots_updated', 'teams_updated', 'staff_updated', 'data_reloaded'].includes(event)) {
        this.render();
      }
    });
  }

  getFilteredData() {
    const installs = window.db.getInstallLogs();
    const troubles = window.db.getTroubleshootLogs();
    const teams = window.db.getTeams();
    const staff = window.db.getStaff();

    const today = new Date();
    let cutoff = new Date(today);

    if (this.timeframe === 'today') {
      cutoff.setHours(0, 0, 0, 0);
    } else if (this.timeframe === '7d') {
      cutoff.setDate(cutoff.getDate() - 7);
    } else if (this.timeframe === '30d') {
      cutoff.setDate(cutoff.getDate() - 30);
    } else {
      cutoff = new Date(2000, 0, 1);
    }

    const filteredInstalls = installs.filter(i => new Date(i.date) >= cutoff);
    const filteredTroubles = troubles.filter(t => new Date(t.date) >= cutoff);
    const filteredTeams = teams.filter(t => new Date(t.date) >= cutoff);

    return {
      installs: filteredInstalls,
      troubles: filteredTroubles,
      teams: filteredTeams,
      staff
    };
  }

  render() {
    const data = this.getFilteredData();
    this.populateTeamSelect(data.teams);
    this.renderKPISummary(data);
    this.renderTrendChart(data);
    this.renderTeamLeaderboard(data);
    this.renderTroubleshootCategories(data);
    this.renderTechnicianContributionTable(data);
  }

  populateTeamSelect(teams) {
    const teamSelect = document.getElementById('analyticsTeamFilter');
    if (!teamSelect) return;
    const current = teamSelect.value;
    const uniqueTeams = Array.from(new Set(teams.map(t => t.teamName)));

    teamSelect.innerHTML = '<option value="All">All Teams</option>' +
      uniqueTeams.map(t => `<option value="${t}" ${t === current ? 'selected' : ''}>${t}</option>`).join('');
  }

  renderKPISummary(data) {
    const totalInstalls = data.installs.reduce((sum, i) => sum + Number(i.quantityCompleted || 0), 0);
    const totalTroubles = data.troubles.reduce((sum, t) => sum + Number(t.casesResolved || 0), 0);
    const totalShifts = data.teams.length;
    const avgInstallsPerTeam = totalShifts > 0 ? (totalInstalls / totalShifts).toFixed(1) : 0;

    const kpiEl1 = document.getElementById('analyticsKpiInstalls');
    const kpiEl2 = document.getElementById('analyticsKpiTroubles');
    const kpiEl3 = document.getElementById('analyticsKpiShifts');
    const kpiEl4 = document.getElementById('analyticsKpiAvg');

    if (kpiEl1) kpiEl1.textContent = totalInstalls;
    if (kpiEl2) kpiEl2.textContent = totalTroubles;
    if (kpiEl3) kpiEl3.textContent = totalShifts;
    if (kpiEl4) kpiEl4.textContent = `${avgInstallsPerTeam} / team`;
  }

  renderTrendChart(data) {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;

    // Group by date
    const dateMap = {};
    data.installs.forEach(i => {
      if (!dateMap[i.date]) dateMap[i.date] = { installs: 0, troubles: 0 };
      dateMap[i.date].installs += Number(i.quantityCompleted || 0);
    });
    data.troubles.forEach(t => {
      if (!dateMap[t.date]) dateMap[t.date] = { installs: 0, troubles: 0 };
      dateMap[t.date].troubles += Number(t.casesResolved || 0);
    });

    const sortedDates = Object.keys(dateMap).sort();
    const installData = sortedDates.map(d => dateMap[d].installs);
    const troubleData = sortedDates.map(d => dateMap[d].troubles);

    if (this.charts.trend) this.charts.trend.destroy();

    if (typeof Chart !== 'undefined') {
      this.charts.trend = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: sortedDates.map(d => d.slice(5)), // MM-DD
          datasets: [
            {
              label: 'Installations Completed',
              data: installData,
              backgroundColor: 'rgba(37, 99, 235, 0.75)',
              borderColor: '#2563EB',
              borderRadius: 6,
              borderWidth: 1
            },
            {
              label: 'Troubleshoots Resolved',
              data: troubleData,
              backgroundColor: 'rgba(245, 158, 11, 0.75)',
              borderColor: '#F59E0B',
              borderRadius: 6,
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#9CA3AF' } }
          },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9CA3AF' } },
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9CA3AF' }, beginAtZero: true }
          }
        }
      });
    }
  }

  renderTeamLeaderboard(data) {
    const ctx = document.getElementById('teamLeaderboardChart');
    if (!ctx) return;

    const teamTotals = {};
    data.teams.forEach(t => {
      if (!teamTotals[t.teamName]) teamTotals[t.teamName] = 0;
      const inst = data.installs.find(i => i.teamId === t.id);
      if (inst) teamTotals[t.teamName] += Number(inst.quantityCompleted || 0);
    });

    const labels = Object.keys(teamTotals);
    const values = Object.values(teamTotals);

    if (this.charts.team) this.charts.team.destroy();

    if (typeof Chart !== 'undefined') {
      this.charts.team = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Total Installations Completed',
            data: values,
            backgroundColor: 'rgba(16, 185, 129, 0.75)',
            borderColor: '#10B981',
            borderRadius: 6,
            borderWidth: 1
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9CA3AF' }, beginAtZero: true },
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9CA3AF' } }
          }
        }
      });
    }
  }

  renderTroubleshootCategories(data) {
    const ctx = document.getElementById('troubleshootCategoriesChart');
    if (!ctx) return;

    const catCounts = {};
    data.troubles.forEach(t => {
      const cat = t.category || 'General';
      catCounts[cat] = (catCounts[cat] || 0) + Number(t.casesResolved || 0);
    });

    const labels = Object.keys(catCounts);
    const values = Object.values(catCounts);

    if (this.charts.categories) this.charts.categories.destroy();

    if (typeof Chart !== 'undefined') {
      this.charts.categories = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: labels.length > 0 ? labels : ['No Data'],
          datasets: [{
            data: values.length > 0 ? values : [1],
            backgroundColor: [
              '#2563EB',
              '#06B6D4',
              '#F59E0B',
              '#0284C7',
              '#10B981'
            ],
            borderColor: '#111827',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: '#9CA3AF', font: { size: 11 } } }
          }
        }
      });
    }
  }

  renderTechnicianContributionTable(data) {
    const container = document.getElementById('techContributionTableContainer');
    if (!container) return;

    const techMap = {};
    data.staff.forEach(s => {
      techMap[s.id] = {
        name: s.name,
        role: s.role,
        shifts: 0,
        installs: 0,
        troubles: 0
      };
    });

    data.teams.forEach(t => {
      const instCount = data.installs.find(i => i.teamId === t.id)?.quantityCompleted || 0;
      const trbCount = data.troubles.find(tr => tr.teamId === t.id)?.casesResolved || 0;
      const crewSize = (t.members || []).length || 1;

      (t.members || []).forEach(mId => {
        if (techMap[mId]) {
          techMap[mId].shifts++;
          techMap[mId].installs += Math.round((instCount / crewSize) * 10) / 10;
          techMap[mId].troubles += Math.round((trbCount / crewSize) * 10) / 10;
        }
      });
    });

    const techList = Object.values(techMap).sort((a, b) => b.installs - a.installs);

    container.innerHTML = `
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Technician / Lead</th>
              <th>Role</th>
              <th>Total Shifts</th>
              <th>Attributed Installs</th>
              <th>Attributed Troubleshoots</th>
              <th>Avg Installs / Shift</th>
            </tr>
          </thead>
          <tbody>
            ${techList.map(t => {
              const avg = t.shifts > 0 ? (t.installs / t.shifts).toFixed(1) : '0.0';
              return `
                <tr>
                  <td><strong>${t.name}</strong></td>
                  <td><span class="badge ${t.role === 'Lead' ? 'badge-primary' : 'badge-secondary'}">${t.role}</span></td>
                  <td>${t.shifts}</td>
                  <td><strong style="color:var(--accent-emerald);">${t.installs}</strong></td>
                  <td><strong style="color:var(--accent-amber);">${t.troubles}</strong></td>
                  <td>${avg}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
}

window.analytics = new AnalyticsModule();
