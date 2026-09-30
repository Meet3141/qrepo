import React, { useState } from 'react';

const Checkbox = ({ checked, onChange }) => (
  <div 
    onClick={onChange}
    className={`w-4 h-4 border-2 rounded flex items-center justify-center cursor-pointer transition-all ${
      checked ? 'bg-primary border-primary' : 'border-outline-variant bg-transparent'
    }`}
  >
    {checked && <span className="material-symbols-outlined text-white text-[12px] font-bold">check</span>}
  </div>
);

export default function RoleManagement() {
  const [permissions, setPermissions] = useState({
    docUpload: { admin: true, hod: true, faculty: true, reviewer: false },
    docDelete: { admin: true, hod: false, faculty: false, reviewer: false },
    reviewInit: { admin: true, hod: true, faculty: false, reviewer: false },
    reviewApprove: { admin: true, hod: true, faculty: false, reviewer: true },
    analyticsView: { admin: true, hod: true, faculty: true, reviewer: false },
    aiDraft: { admin: true, hod: true, faculty: true, reviewer: false },
    aiBloom: { admin: true, hod: true, faculty: true, reviewer: true },
  });

  const togglePermission = (key, role) => {
    setPermissions(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [role]: !prev[key][role]
      }
    }));
  };


  return (
    <div className="flex-1 overflow-y-auto p-margin-mobile md:p-gutter flex flex-col h-full max-w-container-max mx-auto w-full">
      {/* Canvas Header */}
      <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-bold text-on-background mb-2">Organization Structure</h2>
          <p className="text-base text-on-surface-variant max-w-2xl">Manage academic departments, assign Head of Departments, and configure granular role permissions across the QRepo platform.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => alert('Export Data (demo — no export API)')} className="bg-surface-container-lowest border border-outline-variant text-secondary text-sm font-medium px-4 py-2 rounded hover:bg-surface-container-low transition-colors shadow-sm">
            Export Data
          </button>
          <button onClick={() => alert('New Entity (demo — no entity creation API)')} className="bg-primary text-on-primary text-sm font-medium px-4 py-2 rounded hover:bg-primary-container transition-colors shadow-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Entity
          </button>
        </div>
      </div>

      {/* Bento / Split Layout Container */}
      <div className="flex-1 flex flex-col xl:flex-row gap-6 min-h-[600px]">
        {/* Left Panel: Department Management */}
        <div className="flex-1 bg-surface-container-lowest rounded-xl border border-outline-variant flex flex-col shadow-sm overflow-hidden h-full">
          <div className="p-4 border-b border-outline-variant bg-surface-bright flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary bg-primary-fixed-dim/30 p-1.5 rounded-lg">domain</span>
              <h3 className="text-xl font-semibold text-on-surface">Department Management</h3>
            </div>
            <div className="relative w-full sm:w-auto">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
              <input 
                className="w-full sm:w-64 pl-9 pr-4 h-9 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                placeholder="Search departments..." 
                type="text"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-bright sticky top-0 z-10 border-b border-outline-variant">
                <tr>
                  <th className="p-3 text-xs font-semibold text-secondary uppercase tracking-wider w-1/3">Department Name</th>
                  <th className="p-3 text-xs font-semibold text-secondary uppercase tracking-wider">Head of Dept (HOD)</th>
                  <th className="p-3 text-xs font-semibold text-secondary uppercase tracking-wider text-right">Faculty Count</th>
                  <th className="p-3 text-xs font-semibold text-secondary uppercase tracking-wider text-right">Programs</th>
                  <th className="p-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="text-sm text-on-surface">
                <tr className="hover:bg-surface-container-low transition-colors group cursor-pointer border-b border-outline-variant/50">
                  <td className="p-3 font-medium">Computer Science & Engineering</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary-fixed-dim flex items-center justify-center text-xs font-bold text-primary">DR</div>
                      <span>Dr. Alan Turing</span>
                    </div>
                  </td>
                  <td className="p-3 text-right">42</td>
                  <td className="p-3 text-right">
                    <span className="bg-secondary-container text-on-secondary-container px-2 py-1 rounded-md text-xs font-semibold">4</span>
                  </td>
                  <td className="p-3 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-outline hover:text-primary cursor-pointer">more_vert</span>
                  </td>
                </tr>
                <tr className="bg-surface-container-lowest hover:bg-surface-container-low transition-colors group cursor-pointer border-b border-outline-variant/50">
                  <td className="p-3 font-medium">Information Technology</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-tertiary-fixed-dim flex items-center justify-center text-xs font-bold text-tertiary">SP</div>
                      <span>Prof. Sarah Parker</span>
                    </div>
                  </td>
                  <td className="p-3 text-right">28</td>
                  <td className="p-3 text-right">
                    <span className="bg-secondary-container text-on-secondary-container px-2 py-1 rounded-md text-xs font-semibold">2</span>
                  </td>
                  <td className="p-3 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-outline hover:text-primary cursor-pointer">more_vert</span>
                  </td>
                </tr>
                <tr className="hover:bg-surface-container-low transition-colors group cursor-pointer border-b border-outline-variant/50">
                  <td className="p-3 font-medium">Electrical Engineering</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-surface-dim flex items-center justify-center text-xs font-bold text-on-surface-variant">NT</div>
                      <span>Dr. Nikola Tesla</span>
                    </div>
                  </td>
                  <td className="p-3 text-right">35</td>
                  <td className="p-3 text-right">
                    <span className="bg-secondary-container text-on-secondary-container px-2 py-1 rounded-md text-xs font-semibold">3</span>
                  </td>
                  <td className="p-3 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-outline hover:text-primary cursor-pointer">more_vert</span>
                  </td>
                </tr>
                <tr className="bg-surface-container-lowest hover:bg-surface-container-low transition-colors group cursor-pointer border-b border-outline-variant/50">
                  <td className="p-3 font-medium">Mechanical Engineering</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-outline italic text-sm">Unassigned</span>
                    </div>
                  </td>
                  <td className="p-3 text-right">30</td>
                  <td className="p-3 text-right">
                    <span className="bg-secondary-container text-on-secondary-container px-2 py-1 rounded-md text-xs font-semibold">2</span>
                  </td>
                  <td className="p-3 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-outline hover:text-primary cursor-pointer">more_vert</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Panel: Role Management Matrix */}
        <div className="flex-1 bg-surface-container-lowest rounded-xl border border-outline-variant flex flex-col shadow-sm overflow-hidden h-full">
          <div className="p-4 border-b border-outline-variant bg-surface-bright flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary bg-primary-fixed-dim/30 p-1.5 rounded-lg">verified_user</span>
              <h3 className="text-xl font-semibold text-on-surface">Role Matrix</h3>
            </div>
            <div className="flex gap-2">
              <select className="bg-surface-container-lowest border border-outline-variant rounded-lg text-sm h-9 px-3 focus:border-primary outline-none">
                <option>Assessment Module</option>
                <option>Repository Module</option>
                <option>System Config</option>
              </select>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto bg-surface-container-lowest">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-surface-bright sticky top-0 z-10 border-b border-outline-variant">
                <tr>
                  <th className="p-3 text-xs font-semibold text-secondary uppercase tracking-wider w-[40%] bg-surface-bright sticky left-0 z-20 border-r border-outline-variant">Permission Node</th>
                  <th className="p-3 text-xs font-semibold text-secondary uppercase tracking-wider text-center">Admin</th>
                  <th className="p-3 text-xs font-semibold text-secondary uppercase tracking-wider text-center">HOD</th>
                  <th className="p-3 text-xs font-semibold text-secondary uppercase tracking-wider text-center">Faculty</th>
                  <th className="p-3 text-xs font-semibold text-secondary uppercase tracking-wider text-center">Reviewer</th>
                </tr>
              </thead>
              <tbody className="text-sm text-on-surface">
                {/* Group 1 */}
                <tr className="bg-surface-container-low/50">
                  <td className="p-2 px-3 text-xs text-secondary font-bold uppercase tracking-wider sticky left-0 border-r border-outline-variant" colSpan="5">Document Handling</td>
                </tr>
                <tr className="border-b border-outline-variant/50">
                  <td className="p-3 font-medium sticky left-0 bg-surface-container-lowest border-r border-outline-variant">Upload Question Papers</td>
                  <td className="p-3"><div className="flex justify-center"><Checkbox checked={permissions.docUpload.admin} onChange={() => togglePermission('docUpload', 'admin')} /></div></td>
                  <td className="p-3"><div className="flex justify-center"><Checkbox checked={permissions.docUpload.hod} onChange={() => togglePermission('docUpload', 'hod')} /></div></td>
                  <td className="p-3"><div className="flex justify-center"><Checkbox checked={permissions.docUpload.faculty} onChange={() => togglePermission('docUpload', 'faculty')} /></div></td>
                  <td className="p-3"><div className="flex justify-center"><Checkbox checked={permissions.docUpload.reviewer} onChange={() => togglePermission('docUpload', 'reviewer')} /></div></td>
                </tr>
                <tr className="border-b border-outline-variant/50">
                  <td className="p-3 font-medium sticky left-0 bg-surface-container-lowest border-r border-outline-variant">Delete Repository Items</td>
                  <td className="p-3"><div className="flex justify-center"><Checkbox checked={permissions.docDelete.admin} onChange={() => togglePermission('docDelete', 'admin')} /></div></td>
                  <td className="p-3"><div className="flex justify-center"><Checkbox checked={permissions.docDelete.hod} onChange={() => togglePermission('docDelete', 'hod')} /></div></td>
                  <td className="p-3"><div className="flex justify-center"><Checkbox checked={permissions.docDelete.faculty} onChange={() => togglePermission('docDelete', 'faculty')} /></div></td>
                  <td className="p-3"><div className="flex justify-center"><Checkbox checked={permissions.docDelete.reviewer} onChange={() => togglePermission('docDelete', 'reviewer')} /></div></td>
                </tr>
                
                {/* Group 2 */}
                <tr className="bg-surface-container-low/50">
                  <td className="p-2 px-3 text-xs text-secondary font-bold uppercase tracking-wider sticky left-0 border-r border-outline-variant" colSpan="5">Assessment Workflow</td>
                </tr>
                <tr className="border-b border-outline-variant/50">
                  <td className="p-3 font-medium sticky left-0 bg-surface-container-lowest border-r border-outline-variant">Initiate Paper Review</td>
                  <td className="p-3"><div className="flex justify-center"><Checkbox checked={permissions.reviewInit.admin} onChange={() => togglePermission('reviewInit', 'admin')} /></div></td>
                  <td className="p-3"><div className="flex justify-center"><Checkbox checked={permissions.reviewInit.hod} onChange={() => togglePermission('reviewInit', 'hod')} /></div></td>
                  <td className="p-3"><div className="flex justify-center"><Checkbox checked={permissions.reviewInit.faculty} onChange={() => togglePermission('reviewInit', 'faculty')} /></div></td>
                  <td className="p-3"><div className="flex justify-center"><Checkbox checked={permissions.reviewInit.reviewer} onChange={() => togglePermission('reviewInit', 'reviewer')} /></div></td>
                </tr>
                <tr className="border-b border-outline-variant/50">
                  <td className="p-3 font-medium sticky left-0 bg-surface-container-lowest border-r border-outline-variant">Approve Final Papers</td>
                  <td className="p-3"><div className="flex justify-center"><Checkbox checked={permissions.reviewApprove.admin} onChange={() => togglePermission('reviewApprove', 'admin')} /></div></td>
                  <td className="p-3"><div className="flex justify-center"><Checkbox checked={permissions.reviewApprove.hod} onChange={() => togglePermission('reviewApprove', 'hod')} /></div></td>
                  <td className="p-3"><div className="flex justify-center"><Checkbox checked={permissions.reviewApprove.faculty} onChange={() => togglePermission('reviewApprove', 'faculty')} /></div></td>
                  <td className="p-3"><div className="flex justify-center"><Checkbox checked={permissions.reviewApprove.reviewer} onChange={() => togglePermission('reviewApprove', 'reviewer')} /></div></td>
                </tr>
                <tr className="border-b border-outline-variant/50">
                  <td className="p-3 font-medium sticky left-0 bg-surface-container-lowest border-r border-outline-variant">View Assessment Analytics</td>
                  <td className="p-3"><div className="flex justify-center"><Checkbox checked={permissions.analyticsView.admin} onChange={() => togglePermission('analyticsView', 'admin')} /></div></td>
                  <td className="p-3"><div className="flex justify-center"><Checkbox checked={permissions.analyticsView.hod} onChange={() => togglePermission('analyticsView', 'hod')} /></div></td>
                  <td className="p-3"><div className="flex justify-center"><Checkbox checked={permissions.analyticsView.faculty} onChange={() => togglePermission('analyticsView', 'faculty')} /></div></td>
                  <td className="p-3"><div className="flex justify-center"><Checkbox checked={permissions.analyticsView.reviewer} onChange={() => togglePermission('analyticsView', 'reviewer')} /></div></td>
                </tr>

                {/* Group 3 AI */}
                <tr className="bg-surface-container-low/50">
                  <td className="p-2 px-3 text-xs text-secondary font-bold uppercase tracking-wider sticky left-0 border-r border-outline-variant flex items-center gap-1" colSpan="5">
                    <span className="material-symbols-outlined text-[14px] text-tertiary">psychology</span>
                    AI Capabilities
                  </td>
                </tr>
                <tr className="border-b border-outline-variant/50">
                  <td className="p-3 font-medium sticky left-0 bg-surface-container-lowest border-r border-outline-variant">Generate Draft Questions</td>
                  <td className="p-3"><div className="flex justify-center"><Checkbox checked={permissions.aiDraft.admin} onChange={() => togglePermission('aiDraft', 'admin')} /></div></td>
                  <td className="p-3"><div className="flex justify-center"><Checkbox checked={permissions.aiDraft.hod} onChange={() => togglePermission('aiDraft', 'hod')} /></div></td>
                  <td className="p-3"><div className="flex justify-center"><Checkbox checked={permissions.aiDraft.faculty} onChange={() => togglePermission('aiDraft', 'faculty')} /></div></td>
                  <td className="p-3"><div className="flex justify-center"><Checkbox checked={permissions.aiDraft.reviewer} onChange={() => togglePermission('aiDraft', 'reviewer')} /></div></td>
                </tr>
                <tr className="border-b border-outline-variant/50">
                  <td className="p-3 font-medium sticky left-0 bg-surface-container-lowest border-r border-outline-variant">Run Bloom's Taxonomy Analysis</td>
                  <td className="p-3"><div className="flex justify-center"><Checkbox checked={permissions.aiBloom.admin} onChange={() => togglePermission('aiBloom', 'admin')} /></div></td>
                  <td className="p-3"><div className="flex justify-center"><Checkbox checked={permissions.aiBloom.hod} onChange={() => togglePermission('aiBloom', 'hod')} /></div></td>
                  <td className="p-3"><div className="flex justify-center"><Checkbox checked={permissions.aiBloom.faculty} onChange={() => togglePermission('aiBloom', 'faculty')} /></div></td>
                  <td className="p-3"><div className="flex justify-center"><Checkbox checked={permissions.aiBloom.reviewer} onChange={() => togglePermission('aiBloom', 'reviewer')} /></div></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-surface-bright border-t border-outline-variant flex justify-end shrink-0 gap-2">
            <button onClick={() => alert('Changes discarded')} className="bg-surface-container-lowest border border-outline-variant text-secondary text-sm font-medium px-4 py-1.5 rounded hover:bg-surface-container-low transition-colors">Discard Changes</button>
            <button onClick={() => alert('Permission matrix saved (demo — no permissions API)')} className="bg-primary text-on-primary text-sm font-medium px-4 py-1.5 rounded hover:bg-primary/90 transition-colors shadow-sm">Save Matrix</button>
          </div>
        </div>
      </div>
    </div>
  );
}
