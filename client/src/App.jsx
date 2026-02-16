import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      
      {/* Header */}
      <header className="bg-white shadow-sm pt-6 pb-10 px-6">
        <div className="max-w-4xl mx-auto">
          
          {/* Logo / Brand Name Section */}
          <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <span className="text-2xl font-bold text-slate-800 tracking-tight">
              SafeMotion
            </span>
          </div>

          {/* Greeting Section */}
          <div>
            <h1 className="text-4xl font-bold text-blue-900 mb-2">
              Good Morning, Alex
            </h1>
            <p className="text-xl text-slate-500">
              Monday, February 17 • Let's get moving safely
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-10">
        
        {/* 1. Daily Activity Card */}
        <section className="bg-blue-600 rounded-3xl p-8 text-white shadow-xl shadow-blue-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-3">
              <span className="bg-blue-500 text-blue-50 px-4 py-1.5 rounded-full text-sm font-bold tracking-wide uppercase">
                Recommended for Today
              </span>
              <h2 className="text-3xl font-bold py-1.5">
                Posture & Balance Improvement
              </h2>
              <p className="text-blue-100 text-lg max-w-xl leading-relaxed">
                Gentle movements to strengthen the lower back and prevent falls. 
                Suitable for practice near a chair or a wall.
              </p>
            </div>
            
            <button className="bg-white text-blue-700 hover:bg-blue-50 text-xl font-bold py-4 px-10 rounded-2xl shadow-lg transition-all w-full md:w-auto text-center whitespace-nowrap cursor-pointer">
              Start Session (12 min)
            </button>
          </div>
        </section>

        {/* 2. Program Library */}
        <section>
          <h3 className="text-2xl font-bold text-slate-700 mb-6">
            What would you like to focus on?
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1 */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group">
              <h4 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-blue-600">
                Joints & Flexibility
              </h4>
              <p className="text-slate-500 text-lg leading-relaxed">
                Relieving stiffness in shoulders, knees, and neck. Perfect for starting the day.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group">
              <h4 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-blue-600">
                Chair Exercises
              </h4>
              <p className="text-slate-500 text-lg leading-relaxed">
                Strengthen muscles and improve circulation while seated. Safe, stable, and effective.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group">
              <h4 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-blue-600">
                Safe Walking at Home
              </h4>
              <p className="text-slate-500 text-lg leading-relaxed">
                Practice proper stepping, rhythm, and stability in your familiar home environment.
              </p>
            </div>

            {/* Card 4 */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group">
              <h4 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-blue-600">
                Breathing & Relaxation
              </h4>
              <p className="text-slate-500 text-lg leading-relaxed">
                Guided breathing techniques to lower blood pressure and calm the mind.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Daily Health Tip */}
        <section className="bg-emerald-50 rounded-2xl p-8 border border-emerald-200">
          <h5 className="text-emerald-900 font-bold text-xl mb-3">
            Health Tip: Hydration
          </h5>
          <p className="text-emerald-800 text-lg leading-relaxed">
            As we age, the sense of thirst decreases, but the body still needs fluids. 
            Remember to drink a glass of water before and after every exercise session.
          </p>
        </section>

      </main>
    </div>
  );
}