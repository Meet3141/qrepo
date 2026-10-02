import React from 'react';

export default function FacultyAnalytics() {
  return (
    <div className="flex-1 p-margin-mobile md:p-gutter max-w-container-max mx-auto space-y-6 h-full overflow-y-auto">
      {/* Page Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-on-surface">Faculty Analytics Overview</h1>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xs text-secondary uppercase tracking-wider font-semibold">Avg. Class Performance</h3>
            <div className="p-2 bg-surface-container-low rounded-lg text-primary">
              <span className="material-symbols-outlined text-[20px]">trending_up</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-on-surface">76.4%</span>
            <span className="text-xs text-green-600 flex items-center font-medium">
              <span className="material-symbols-outlined text-[14px]">arrow_upward</span> 2.1%
            </span>
          </div>
          <p className="text-xs text-secondary mt-2">vs. last semester</p>
        </div>
        
        <div className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xs text-secondary uppercase tracking-wider font-semibold">Total Assessments</h3>
            <div className="p-2 bg-surface-container-low rounded-lg text-primary">
              <span className="material-symbols-outlined text-[20px]">assignment</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-on-surface">142</span>
            <span className="text-xs text-secondary font-medium">+12 this month</span>
          </div>
        </div>
        
        <div className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xs text-secondary uppercase tracking-wider font-semibold">At-Risk Students</h3>
            <div className="p-2 bg-error-container text-on-error-container rounded-lg">
              <span className="material-symbols-outlined text-[20px]">warning</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-on-surface">24</span>
            <span className="text-xs text-error flex items-center font-medium">
              <span className="material-symbols-outlined text-[14px]">arrow_upward</span> 4
            </span>
          </div>
          <p className="text-xs text-secondary mt-2">Action recommended</p>
        </div>
        
        <div className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xs text-secondary uppercase tracking-wider font-semibold">Questions Generated</h3>
            <div className="p-2 bg-surface-container-low rounded-lg text-primary">
              <span className="material-symbols-outlined text-[20px]">smart_toy</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-on-surface">3.2k</span>
          </div>
          <p className="text-xs text-secondary mt-2">Using AI Assistant</p>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Student Performance Trends (Line Chart Mockup) */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm lg:col-span-2 flex flex-col overflow-hidden min-h-[300px]">
          <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-bright">
            <h3 className="text-lg font-semibold text-on-surface">Student Performance Trends</h3>
            <select className="bg-surface-container-lowest border border-outline-variant text-secondary text-sm rounded-lg focus:ring-primary focus:border-primary block p-2 outline-none">
              <option>CS101 - Intro to Programming</option>
              <option>CS202 - Data Structures</option>
            </select>
          </div>
          <div className="p-4 flex-1 flex items-center justify-center text-secondary">
             [Line Chart Placeholder]
          </div>
        </div>

        {/* Bloom Level Distribution (Doughnut Chart Mockup) */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm flex flex-col min-h-[300px]">
          <div className="p-4 border-b border-outline-variant bg-surface-bright">
            <h3 className="text-lg font-semibold text-on-surface">Bloom's Taxonomy</h3>
            <p className="text-sm text-secondary">Generated Papers Distribution</p>
          </div>
          <div className="p-4 flex-1 flex flex-col items-center justify-center gap-4">
            <div className="relative w-32 h-32 rounded-full border-[16px] border-surface-container-low flex items-center justify-center" 
                 style={{
                   background: 'conic-gradient(#2563eb 0deg 120deg, #003ea8 120deg 210deg, #b4c5ff 210deg 280deg, #e7e7f3 280deg 360deg)',
                   backgroundClip: 'border-box'
                 }}>
               <div className="absolute inset-0 m-[-16px] rounded-full bg-surface-container-lowest" style={{ clipPath: 'circle(55%)' }}></div>
            </div>
            
            <div className="w-full space-y-2 mt-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-primary"></div><span className="text-xs text-secondary">Analyzing</span></div>
                <span className="font-semibold text-xs">33%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-on-primary-fixed-variant"></div><span className="text-xs text-secondary">Applying</span></div>
                <span className="font-semibold text-xs">25%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-primary-fixed-dim"></div><span className="text-xs text-secondary">Understanding</span></div>
                <span className="font-semibold text-xs">19%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-surface-container-high"></div><span className="text-xs text-secondary">Remembering/Other</span></div>
                <span className="font-semibold text-xs">23%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Weak Topics Heatmap & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weak Topics Heatmap */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm flex flex-col">
          <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-bright">
            <div>
              <h3 className="text-lg font-semibold text-on-surface">Topic Performance Heatmap</h3>
              <p className="text-sm text-secondary">Darker shades indicate lower average scores</p>
            </div>
            <button onClick={() => alert('Download heatmap (demo — no export API)')} className="text-primary hover:bg-surface-container-low p-2 rounded-lg transition-colors flex items-center">
              <span className="material-symbols-outlined text-[20px]">download</span>
            </button>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="p-3 text-xs text-secondary border-b border-outline-variant w-1/3">Topic</th>
                  <th className="p-3 text-xs text-secondary border-b border-outline-variant text-center">Quiz 1</th>
                  <th className="p-3 text-xs text-secondary border-b border-outline-variant text-center">Midterm</th>
                  <th className="p-3 text-xs text-secondary border-b border-outline-variant text-center">Assgn 3</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 text-sm border-b border-outline-variant">Pointers & Memory</td>
                  <td className="p-1 border-b border-outline-variant"><div className="bg-primary/90 text-white text-center py-2 rounded text-xs">45%</div></td>
                  <td className="p-1 border-b border-outline-variant"><div className="bg-primary/80 text-white text-center py-2 rounded text-xs">52%</div></td>
                  <td className="p-1 border-b border-outline-variant"><div className="bg-primary/70 text-white text-center py-2 rounded text-xs">58%</div></td>
                </tr>
                <tr>
                  <td className="p-3 text-sm border-b border-outline-variant">Recursion</td>
                  <td className="p-1 border-b border-outline-variant"><div className="bg-primary/40 text-on-surface text-center py-2 rounded text-xs">72%</div></td>
                  <td className="p-1 border-b border-outline-variant"><div className="bg-primary/60 text-white text-center py-2 rounded text-xs">61%</div></td>
                  <td className="p-1 border-b border-outline-variant"><div className="bg-primary/30 text-on-surface text-center py-2 rounded text-xs">78%</div></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Generated Insights */}
        <div className="bg-surface-container-lowest rounded-xl border border-primary-fixed shadow-sm flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-fixed/20 rounded-full blur-3xl -z-10 pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
          <div className="p-4 border-b border-outline-variant flex gap-2 items-center bg-surface-bright/50 backdrop-blur-sm">
            <span className="material-symbols-outlined text-primary">auto_awesome</span>
            <h3 className="text-lg font-semibold text-on-surface">AI Actionable Insights</h3>
          </div>
          <div className="p-4 flex-1 flex flex-col gap-4">
            <div className="bg-surface-container-low rounded-lg p-3 border border-outline-variant/50 flex gap-3 items-start">
              <span className="material-symbols-outlined text-error mt-1 text-[18px]">warning</span>
              <div>
                <h4 className="text-sm font-semibold text-on-surface">Critical Weakness Identified</h4>
                <p className="text-xs text-secondary mt-1">Class average for <strong>"Pointers & Memory"</strong> has dropped below 50% across the last 3 assessments. Consider adding supplementary practice materials.</p>
              </div>
            </div>
            
            <div className="bg-surface-container-low rounded-lg p-3 border border-outline-variant/50 flex gap-3 items-start">
              <span className="material-symbols-outlined text-primary mt-1 text-[18px]">lightbulb</span>
              <div>
                <h4 className="text-sm font-semibold text-on-surface">Paper Generation Suggestion</h4>
                <p className="text-xs text-secondary mt-1">Recent papers are heavily skewed towards <em>Analyzing</em> (33%). Recommended to increase <em>Applying</em> questions in the upcoming Final Exam for better balanced Bloom distribution.</p>
                <button onClick={() => alert('Generate Balanced Draft (demo — Paper Generation API not yet implemented)')} className="mt-2 text-primary text-xs font-bold hover:underline">Generate Balanced Draft →</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
