import React, { useState } from 'react';

export default function HodApprovals() {
  const [activeItem, setActiveItem] = useState('midterm');

  return (
    <div className="flex-1 overflow-y-auto p-margin-mobile md:p-gutter flex flex-col gap-6 h-full max-w-container-max mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">Pending Approvals</h2>
          <p className="text-sm text-on-surface-variant mt-1">Review and approve assessment blueprints before generation.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-outline-variant text-on-surface-variant text-sm font-medium hover:bg-surface-container transition-colors bg-surface-container-lowest">
            <span className="material-symbols-outlined text-[16px]">filter_list</span>
            Filter
          </button>
        </div>
      </div>

      {/* Master-Detail Split Layout */}
      <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-[600px]">
        {/* Left Pane: List of Papers (Master) */}
        <div className="w-full md:w-[320px] lg:w-[400px] flex flex-col bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden shrink-0">
          <div className="p-4 border-b border-outline-variant bg-surface flex justify-between items-center">
            <span className="text-sm text-secondary uppercase tracking-wider font-semibold">Queue (3)</span>
            <button className="text-primary hover:underline text-xs font-medium">Sort by Date</button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {/* Active List Item */}
            <div 
              onClick={() => setActiveItem('midterm')}
              className={`p-4 border-b border-outline-variant cursor-pointer transition-colors ${activeItem === 'midterm' ? 'bg-surface-container border-l-4 border-l-primary' : 'bg-surface-container-lowest hover:bg-surface-container'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className="text-base font-semibold text-on-surface">Midterm CS101</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] tracking-wide uppercase font-bold ${activeItem === 'midterm' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-variant text-on-surface-variant'}`}>Under Review</span>
              </div>
              <p className="text-sm text-on-surface-variant line-clamp-1 mb-2">Data Structures and Algorithms</p>
              <div className="flex items-center gap-1 text-on-surface-variant">
                <div className="w-5 h-5 rounded-full bg-secondary text-white flex items-center justify-center text-[10px] font-bold">AS</div>
                <span className="text-xs font-medium">Prof. A. Smith</span>
                <span className="mx-1 text-outline-variant">•</span>
                <span className="text-xs font-medium">2h ago</span>
              </div>
            </div>

            {/* Inactive List Item */}
            <div 
              onClick={() => setActiveItem('quiz2')}
              className={`p-4 border-b border-outline-variant cursor-pointer transition-colors ${activeItem === 'quiz2' ? 'bg-surface-container border-l-4 border-l-primary' : 'bg-surface-container-lowest hover:bg-surface-container'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className="text-base font-medium text-on-surface">Quiz 2 Algorithms</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] tracking-wide uppercase font-bold ${activeItem === 'quiz2' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-variant text-on-surface-variant'}`}>Pending</span>
              </div>
              <p className="text-sm text-on-surface-variant line-clamp-1 mb-2">Advanced Graph Theory</p>
              <div className="flex items-center gap-1 text-on-surface-variant">
                <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">RJ</div>
                <span className="text-xs font-medium">Prof. R. Jones</span>
                <span className="mx-1 text-outline-variant">•</span>
                <span className="text-xs font-medium">5h ago</span>
              </div>
            </div>
            
            {/* Inactive List Item 2 */}
            <div 
              onClick={() => setActiveItem('final')}
              className={`p-4 border-b border-outline-variant cursor-pointer transition-colors ${activeItem === 'final' ? 'bg-surface-container border-l-4 border-l-primary' : 'bg-surface-container-lowest hover:bg-surface-container'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className="text-base font-medium text-on-surface">Final Physics 101</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] tracking-wide uppercase font-bold ${activeItem === 'final' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-variant text-on-surface-variant'}`}>Pending</span>
              </div>
              <p className="text-sm text-on-surface-variant line-clamp-1 mb-2">Mechanics and Thermodynamics</p>
              <div className="flex items-center gap-1 text-on-surface-variant">
                <div className="w-5 h-5 rounded-full bg-tertiary text-white flex items-center justify-center text-[10px] font-bold">HD</div>
                <span className="text-xs font-medium">Dr. H. Davis</span>
                <span className="mx-1 text-outline-variant">•</span>
                <span className="text-xs font-medium">1d ago</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Pane: Detailed Preview (Detail) */}
        <div className="flex-1 flex flex-col bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          {/* Detail Header */}
          <div className="p-6 border-b border-outline-variant flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container text-xs font-medium">CS101</span>
                <h2 className="text-xl font-semibold text-on-surface">Midterm Examination Blueprint</h2>
              </div>
              <p className="text-sm text-on-surface-variant flex items-center gap-1">
                Submitted by Prof. A. Smith <span className="mx-1 text-outline-variant">•</span> Version 1.2
              </p>
            </div>
            <button className="flex items-center gap-1 px-4 py-2 rounded-lg border border-outline-variant text-on-surface text-sm font-medium hover:bg-surface-container transition-colors bg-surface-container-lowest shadow-sm">
              <span className="material-symbols-outlined text-[18px]">visibility</span>
              Preview Paper
            </button>
          </div>
          
          {/* Detail Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
            {/* Bento Grid: Blueprint Overview */}
            <div>
              <h4 className="text-xs text-secondary uppercase tracking-wider mb-2 font-semibold">Blueprint Parameters</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Stat Card */}
                <div className="col-span-1 bg-surface-container-low border border-outline-variant rounded-lg p-4 flex flex-col items-center justify-center text-center hover:shadow-sm transition-shadow">
                  <span className="material-symbols-outlined text-secondary mb-1">format_list_numbered</span>
                  <span className="text-[28px] font-bold text-on-surface leading-tight">100</span>
                  <span className="text-xs text-on-surface-variant">Total Marks</span>
                </div>
                {/* Stat Card */}
                <div className="col-span-1 bg-surface-container-low border border-outline-variant rounded-lg p-4 flex flex-col items-center justify-center text-center hover:shadow-sm transition-shadow">
                  <span className="material-symbols-outlined text-secondary mb-1">schedule</span>
                  <span className="text-[28px] font-bold text-on-surface leading-tight">120</span>
                  <span className="text-xs text-on-surface-variant">Minutes</span>
                </div>
                {/* Stat Card (Wide) */}
                <div className="col-span-2 bg-surface-container-low border border-outline-variant rounded-lg p-4 flex flex-col justify-center hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-1 mb-2">
                    <span className="material-symbols-outlined text-secondary text-[18px]">psychology</span>
                    <span className="text-sm font-semibold text-on-surface">Difficulty Curve</span>
                  </div>
                  <div className="flex h-3 w-full rounded-full overflow-hidden bg-surface-variant">
                    <div className="bg-[#4ADE80] h-full" style={{ width: '30%' }} title="Easy 30%"></div>
                    <div className="bg-[#FBBF24] h-full" style={{ width: '50%' }} title="Medium 50%"></div>
                    <div className="bg-[#EF4444] h-full" style={{ width: '20%' }} title="Hard 20%"></div>
                  </div>
                  <div className="flex justify-between mt-2 text-[11px] font-medium text-on-surface-variant">
                    <span>Easy (30%)</span>
                    <span>Medium (50%)</span>
                    <span>Hard (20%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bloom's Taxonomy Breakdown */}
            <div>
              <h4 className="text-xs text-secondary uppercase tracking-wider mb-2 font-semibold">Bloom's Taxonomy Distribution</h4>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-24 text-sm text-on-surface font-medium">Knowledge</div>
                  <div className="flex-1 h-2 rounded-full bg-surface-variant overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: '25%' }}></div>
                  </div>
                  <div className="w-10 text-right text-sm text-on-surface-variant">25%</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-24 text-sm text-on-surface font-medium">Comprehension</div>
                  <div className="flex-1 h-2 rounded-full bg-surface-variant overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: '35%' }}></div>
                  </div>
                  <div className="w-10 text-right text-sm text-on-surface-variant">35%</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-24 text-sm text-on-surface font-medium">Application</div>
                  <div className="flex-1 h-2 rounded-full bg-surface-variant overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: '25%' }}></div>
                  </div>
                  <div className="w-10 text-right text-sm text-on-surface-variant">25%</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-24 text-sm text-on-surface font-medium">Analysis</div>
                  <div className="flex-1 h-2 rounded-full bg-surface-variant overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: '15%' }}></div>
                  </div>
                  <div className="w-10 text-right text-sm text-on-surface-variant">15%</div>
                </div>
              </div>
            </div>

            {/* Feedback Section */}
            <div>
              <h4 className="text-xs text-secondary uppercase tracking-wider mb-2 font-semibold">Feedback & Comments</h4>
              <div className="bg-surface-container-low rounded-lg p-4 border border-outline-variant">
                {/* Previous Comment */}
                <div className="flex gap-2 mb-4 pb-4 border-b border-outline-variant">
                  <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center text-xs font-bold shrink-0 mt-1">EB</div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-semibold text-on-surface">Dr. E. Brown (Peer Reviewer)</span>
                      <span className="text-[11px] text-on-surface-variant">Yesterday, 14:30</span>
                    </div>
                    <p className="text-sm text-on-surface mt-1">The distribution looks good, but please ensure the 'Hard' questions under Application map directly to the final week's syllabus.</p>
                  </div>
                </div>
                {/* New Comment Input */}
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-bold shrink-0 mt-1">ME</div>
                  <div className="flex-1">
                    <textarea 
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-sm text-on-surface focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none outline-none" 
                      placeholder="Add a comment or request specific changes..." 
                      rows="3"
                    ></textarea>
                    <div className="flex justify-end mt-2">
                      <button onClick={() => alert('Comment posted (demo — no backend API for comments)')} className="px-4 py-1.5 bg-surface text-secondary border border-outline-variant rounded-lg text-sm font-medium hover:bg-surface-container transition-colors shadow-sm">Post Comment</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Action Footer */}
          <div className="p-4 border-t border-outline-variant bg-surface flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
            <div className="text-on-surface-variant text-xs font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">info</span>
              Approving will generate the final paper.
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button onClick={() => alert('Paper rejected (demo — approval API not yet implemented in backend)')} className="flex-1 sm:flex-none px-4 py-2 border border-[#EF4444] text-[#EF4444] bg-surface-container-lowest hover:bg-[#FEF2F2] rounded-lg text-sm font-medium transition-colors text-center">
                Reject
              </button>
              <button onClick={() => alert('Changes requested (demo — approval API not yet implemented in backend)')} className="flex-1 sm:flex-none px-4 py-2 border border-outline-variant text-on-surface bg-surface-container-lowest hover:bg-surface-container rounded-lg text-sm font-medium transition-colors shadow-sm text-center">
                Request Changes
              </button>
              <button onClick={() => alert('Paper approved (demo — approval API not yet implemented in backend)')} className="flex-1 sm:flex-none px-6 py-2 bg-primary text-on-primary hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                Approve Paper
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
