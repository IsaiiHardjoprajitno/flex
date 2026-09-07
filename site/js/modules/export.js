/**
 * Export & Reporting Center Module
 * Generates CSV / Excel-compatible sheets for Payroll, Daily Logs, and Attendance Matrix
 */

class ExportModule {
  init() {
    this.bindEvents();
  }

  bindEvents() {
    const btnExportLogs = document.getElementById('btnExportDailyLogs');
    if (btnExportLogs) {
      btnExportLogs.addEventListener('click', () => this.exportDailyLogsCSV());
    }

    const btnExportPayroll = document.getElementById('btnExportPayrollCSV');
    if (btnExportPayroll) {
      btnExportPayroll.addEventListener('click', () => this.exportPayrollCSV());
    }

    const btnExportAttendance = document.getElementById('btnExportAttendanceCSV');
    if (btnExportAttendance) {
      btnExportAttendance.addEventListener('click', () => this.exportAttendanceCSV());
    }

    const btnExportBackup = document.getElementById('btnExportJSONBackup');
    if (btnExportBackup) {
      btnExportBackup.addEventListener('click', () => this.exportJSONBackup());
    }

    const btnResetData = document.getElementById('btnResetDemoData');
    if (btnResetData) {
      btnResetData.addEventListener('click', () => {
        if (confirm('Reset all tracking data to default realistic demo records?')) {
          window.db.resetToDefault();
          window.app.showToast('Database reset to demo seed data!', 'success');
        }
      });
    }

    const fileInput = document.getElementById('importBackupFileInput');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.handleImportJSON(e));
    }
  }

  downloadCSV(filename, csvContent) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportDailyLogsCSV() {
    const teams = window.db.getTeams();
    const installs = window.db.getInstallLogs();
    const troubles = window.db.getTroubleshootLogs();
    const staff = window.db.getStaff();

    const headers = ['Date', 'Team Name', 'Team Lead', 'Crew Members', 'Zone / Vehicle', 'Installs Completed', 'Install Type', 'Troubleshoots Resolved', 'Troubleshoot Category', 'Team Notes'];
    const rows = teams.map(t => {
      const lead = staff.find(s => s.id === t.leadId)?.name || 'Unknown';
      const members = (t.members || []).map(mId => staff.find(s => s.id === mId)?.name || mId).join('; ');
      const inst = installs.find(i => i.teamId === t.id);
      const trb = troubles.find(tr => tr.teamId === t.id);

      return [
        `"${t.date}"`,
        `"${t.teamName.replace(/"/g, '""')}"`,
        `"${lead.replace(/"/g, '""')}"`,
        `"${members.replace(/"/g, '""')}"`,
        `"${(t.vehicleZone || '').replace(/"/g, '""')}"`,
        inst ? inst.quantityCompleted : 0,
        `"${(inst?.installType || '').replace(/"/g, '""')}"`,
        trb ? trb.casesResolved : 0,
        `"${(trb?.category || '').replace(/"/g, '""')}"`,
        `"${(t.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    this.downloadCSV(`Daily_Performance_Logs_${new Date().toISOString().split('T')[0]}.csv`, csvContent);
    window.app.showToast('Daily Performance Logs CSV downloaded!', 'success');
  }

  exportPayrollCSV() {
    const teams = window.db.getTeams();
    const installs = window.db.getInstallLogs();
    const troubles = window.db.getTroubleshootLogs();
    const staff = window.db.getStaff();

    const staffMap = {};
    staff.forEach(s => {
      staffMap[s.id] = {
        name: s.name,
        role: s.role,
        status: s.status,
        shifts: 0,
        installsAttributed: 0,
        troublesAttributed: 0
      };
    });

    teams.forEach(t => {
      const instCount = installs.find(i => i.teamId === t.id)?.quantityCompleted || 0;
      const trbCount = troubles.find(tr => tr.teamId === t.id)?.casesResolved || 0;
      const crewSize = (t.members || []).length || 1;

      (t.members || []).forEach(mId => {
        if (staffMap[mId]) {
          staffMap[mId].shifts++;
          staffMap[mId].installsAttributed += (instCount / crewSize);
          staffMap[mId].troublesAttributed += (trbCount / crewSize);
        }
      });
    });

    const headers = ['Staff Name', 'Role', 'Status', 'Total Shifts Worked', 'Attributed Installs Completed', 'Attributed Troubleshoots Resolved', 'Average Installs Per Shift'];
    const rows = Object.values(staffMap).map(s => {
      const avg = s.shifts > 0 ? (s.installsAttributed / s.shifts).toFixed(2) : '0.00';
      return [
        `"${s.name.replace(/"/g, '""')}"`,
        `"${s.role}"`,
        `"${s.status}"`,
        s.shifts,
        s.installsAttributed.toFixed(1),
        s.troublesAttributed.toFixed(1),
        avg
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    this.downloadCSV(`Payroll_Performance_Summary_${new Date().toISOString().split('T')[0]}.csv`, csvContent);
    window.app.showToast('Payroll & Staff Summary CSV downloaded!', 'success');
  }

  exportAttendanceCSV() {
    const attendance = window.db.getAttendance();
    const staff = window.db.getStaff();

    const headers = ['Date', 'Staff Name', 'Role', 'Attendance Status', 'Check-in Time', 'Notes'];
    const rows = attendance.map(a => {
      const stf = staff.find(s => s.id === a.staffId);
      return [
        `"${a.date}"`,
        `"${(stf?.name || a.staffId).replace(/"/g, '""')}"`,
        `"${stf?.role || ''}"`,
        `"${a.status}"`,
        `"${a.checkInTime || ''}"`,
        `"${(a.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    this.downloadCSV(`Staff_Attendance_Records_${new Date().toISOString().split('T')[0]}.csv`, csvContent);
    window.app.showToast('Attendance Matrix CSV downloaded!', 'success');
  }

  exportJSONBackup() {
    const data = window.db.exportAllData();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `FieldOps_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    window.app.showToast('JSON Backup downloaded!', 'success');
  }

  handleImportJSON(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        window.db.importAllData(data);
        window.app.showToast('Data imported successfully!', 'success');
      } catch (err) {
        window.app.showToast('Failed to parse JSON file.', 'error');
      }
    };
    reader.readAsText(file);
  }
}

window.exportModule = new ExportModule();
