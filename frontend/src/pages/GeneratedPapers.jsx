import React, { useState, useEffect } from 'react';

export default function GeneratedPapers() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated fetch
    setTimeout(() => {
      setPapers([
        { id: 'P-2023-001', title: 'Midterm Examination - CS101', subject: 'Introduction to Computer Science', date: 'Oct 15, 2023', status: 'Finalized' },
        { id: 'P-2023-002', title: 'Quiz 1: Data Structures', subject: 'Data Structures & Algorithms', date: 'Oct 10, 2023', status: 'Draft' },
        { id: 'P-2023-003', title: 'Final Exam - DB Systems', subject: 'Database Management Systems', date: 'Sep 28, 2023', status: 'Finalized' }
      ]);
      setLoading(false);
    }, 500);
  }, []);

  return (
    <div className="flex-1 p-md md:p-lg lg:p-xl max-w-container-max mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md mb-lg">
        <div>
          <h2 className="font-display text-4xl font-bold text-on-surface">Generated Papers</h2>
          <p className="text-sm text-secondary mt-1">Manage and export finalized assessment papers.</p>
        </div>
        <div className="flex gap-sm">
          <button className="bg-surface-container-lowest border border-outline-variant text-secondary text-sm font-medium px-4 py-2 rounded-lg hover:bg-surface-container transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">filter_list</span>
            Filter
          </button>
        </div>
      </div>

      {/* Data Table Card */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="p-3 text-xs text-secondary uppercase tracking-wider font-semibold">Paper Title</th>
                <th className="p-3 text-xs text-secondary uppercase tracking-wider font-semibold">Subject</th>
                <th className="p-3 text-xs text-secondary uppercase tracking-wider font-semibold">Date Generated</th>
                <th className="p-3 text-xs text-secondary uppercase tracking-wider font-semibold">Status</th>
                <th className="p-3 text-xs text-secondary uppercase tracking-wider font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm text-on-surface divide-y divide-outline-variant">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-4 text-center text-secondary">Loading papers...</td>
                </tr>
              ) : papers.length > 0 ? (
                papers.map((paper, idx) => (
                  <tr key={idx} className="hover:bg-surface-container-low transition-colors group">
                    <td className="p-3 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-sm">description</span>
                        </div>
                        <div>
                          <p className="font-medium text-on-surface group-hover:text-primary transition-colors cursor-pointer">{paper.title}</p>
                          <p className="text-xs text-secondary mt-0.5">ID: {paper.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 align-middle text-secondary">{paper.subject}</td>
                    <td className="p-3 align-middle text-secondary">{paper.date}</td>
                    <td className="p-3 align-middle">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${paper.status === 'Finalized' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-variant text-on-surface-variant'}`}>
                        {paper.status}
                      </span>
                    </td>
                    <td className="p-3 align-middle text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => alert('Download PDF (demo — Paper API not yet implemented in backend)')} className="p-1 text-secondary hover:text-primary hover:bg-surface-container rounded transition-colors" title="Download PDF">
                          <span className="material-symbols-outlined text-[18px]">download</span>
                        </button>
                        <button onClick={() => alert('Edit Blueprint (demo — Paper API not yet implemented in backend)')} className="p-1 text-secondary hover:text-on-surface hover:bg-surface-container rounded transition-colors" title="Edit Blueprint">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button onClick={() => alert('Delete paper (demo — Paper API not yet implemented in backend)')} className="p-1 text-secondary hover:text-error hover:bg-error-container/30 rounded transition-colors" title="Delete">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-4 text-center text-secondary">No papers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="bg-surface-container-lowest border-t border-outline-variant p-3 flex items-center justify-between">
          <p className="text-xs text-secondary">Showing 1 to {papers.length} of 12 papers</p>
          <div className="flex gap-1">
            <button className="px-3 py-1 rounded border border-outline-variant text-secondary hover:bg-surface-container disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium" disabled>Previous</button>
            <button className="px-3 py-1 rounded bg-primary text-on-primary text-xs font-medium">1</button>
            <button className="px-3 py-1 rounded border border-outline-variant text-secondary hover:bg-surface-container text-xs font-medium">2</button>
            <button className="px-3 py-1 rounded border border-outline-variant text-secondary hover:bg-surface-container text-xs font-medium">3</button>
            <button className="px-3 py-1 rounded border border-outline-variant text-secondary hover:bg-surface-container text-xs font-medium">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
