/**
 * Staff Directory & Technician Management Module
 */

class StaffModule {
  constructor() {
    this.editingStaffId = null;
  }

  init() {
    this.bindEvents();
    this.render();
  }

  bindEvents() {
    const btnAdd = document.getElementById('btnOpenAddStaffModal');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => this.openModal());
    }

    const form = document.getElementById('staffForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveStaff();
      });
    }

    window.db.subscribe((event) => {
      if (['staff_updated', 'data_reloaded'].includes(event)) {
        this.render();
      }
    });
  }

  openModal(staffId = null) {
    this.editingStaffId = staffId;
    const modal = document.getElementById('staffModal');
    const form = document.getElementById('staffForm');
    const modalTitle = document.getElementById('staffModalTitle');

    if (form) form.reset();

    if (staffId) {
      const staff = window.db.getStaffById(staffId);
      if (staff) {
        modalTitle.textContent = `Edit Staff: ${staff.name}`;
        document.getElementById('staffNameInput').value = staff.name || '';
        document.getElementById('staffRoleInput').value = staff.role || 'Technician';
        document.getElementById('staffEmailInput').value = staff.email || '';
        document.getElementById('staffPhoneInput').value = staff.phone || '';
        document.getElementById('staffSkillsInput').value = (staff.skills || []).join(', ');
        document.getElementById('staffStatusInput').value = staff.status || 'Active';
      }
    } else {
      modalTitle.textContent = 'Add New Staff Member';
      document.getElementById('staffStatusInput').value = 'Active';
    }

    if (modal) modal.classList.add('active');
  }

  closeModal() {
    const modal = document.getElementById('staffModal');
    if (modal) modal.classList.remove('active');
    this.editingStaffId = null;
  }

  handleSaveStaff() {
    const name = document.getElementById('staffNameInput').value.trim();
    const role = document.getElementById('staffRoleInput').value;
    const email = document.getElementById('staffEmailInput').value.trim();
    const phone = document.getElementById('staffPhoneInput').value.trim();
    const skillsRaw = document.getElementById('staffSkillsInput').value.trim();
    const status = document.getElementById('staffStatusInput').value;

    if (!name) {
      window.app.showToast('Please enter staff name.', 'error');
      return;
    }

    const skills = skillsRaw ? skillsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

    const staffData = {
      id: this.editingStaffId || `stf-${Date.now()}`,
      name,
      role,
      email,
      phone,
      skills,
      status
    };

    window.db.saveStaff(staffData);
    window.app.showToast(`Staff member '${name}' saved successfully!`, 'success');
    this.closeModal();
    this.render();
  }

  toggleStatus(staffId) {
    const staff = window.db.getStaffById(staffId);
    if (!staff) return;

    staff.status = staff.status === 'Active' ? 'Inactive' : 'Active';
    window.db.saveStaff(staff);
    window.app.showToast(`Staff member '${staff.name}' marked as ${staff.status}.`, 'info');
    this.render();
  }

  render() {
    const container = document.getElementById('staffTableContainer');
    if (!container) return;

    const staffList = window.db.getStaff();

    container.innerHTML = `
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Staff Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Contact Email & Phone</th>
              <th>Skills & Certifications</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${staffList.map(s => {
              const initials = s.name.split(' ').map(n => n[0]).join('').substring(0, 2);
              const isActive = s.status === 'Active';
              return `
                <tr>
                  <td>
                    <div style="display:flex; align-items:center; gap:0.75rem;">
                      <div class="chip-avatar" style="width:32px; height:32px; font-size:0.8rem; background:rgba(99,102,241,0.2); color:var(--primary-light);">
                        ${initials}
                      </div>
                      <div>
                        <strong>${s.name}</strong>
                        <div style="font-size:0.72rem; color:var(--text-dim);">ID: ${s.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="badge ${s.role === 'Lead' ? 'badge-primary' : (s.role === 'Supervisor' || s.role === 'Admin' ? 'badge-late' : 'badge-secondary')}">
                      ${s.role}
                    </span>
                  </td>
                  <td>
                    <span class="badge ${isActive ? 'badge-present' : 'badge-absent'}">
                      ${s.status}
                    </span>
                  </td>
                  <td>
                    <div style="font-size:0.82rem;">${s.email}</div>
                    <div style="font-size:0.75rem; color:var(--text-dim);">${s.phone}</div>
                  </td>
                  <td>
                    <div style="display:flex; flex-wrap:wrap; gap:0.25rem;">
                      ${(s.skills || []).map(sk => `<span style="font-size:0.7rem; background:var(--bg-surface-elevated); border:1px solid var(--border-subtle); padding:0.1rem 0.4rem; border-radius:4px;">${sk}</span>`).join('')}
                    </div>
                  </td>
                  <td>
                    <div style="display:flex; gap:0.4rem;">
                      <button class="btn btn-secondary btn-sm" onclick="window.staffModule.openModal('${s.id}')">Edit</button>
                      <button class="btn btn-secondary btn-sm" onclick="window.staffModule.toggleStatus('${s.id}')">
                        ${isActive ? 'Deactivate' : 'Activate'}
                      </button>
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

window.staffModule = new StaffModule();
