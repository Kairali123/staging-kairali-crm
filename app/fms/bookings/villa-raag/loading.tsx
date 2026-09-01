export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header Skeleton */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 border-b border-blue-400 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-white/20 rounded-2xl animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-10 bg-white/20 rounded-lg w-3/4 animate-pulse" />
              <div className="h-5 bg-white/20 rounded-lg w-1/2 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Filters Card Skeleton */}
        <div className="bg-white/90 backdrop-blur-sm border border-blue-300 rounded-lg shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-100 via-white to-indigo-100 border-b border-blue-200 p-4">
            <div className="h-6 bg-blue-200 rounded-lg w-1/3 animate-pulse" />
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-1/2 animate-pulse" />
                  <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* KPI Section Skeleton */}
        <div className="bg-white/90 backdrop-blur-sm border border-slate-300 rounded-lg shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-slate-100 via-white to-blue-100 border-b border-slate-200 p-4">
            <div className="h-6 bg-slate-200 rounded-lg w-1/3 animate-pulse" />
          </div>
          <div className="p-6 space-y-6">
            <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-5">
              <div className="h-5 bg-blue-200 rounded w-1/4 mb-4 animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="bg-white border border-blue-200 rounded-lg h-32 animate-pulse" />
                ))}
              </div>
            </div>
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-5">
              <div className="h-5 bg-emerald-200 rounded w-1/4 mb-4 animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white border border-emerald-200 rounded-lg h-32 animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg shadow-xl h-40 animate-pulse" />
          ))}
        </div>

        {/* Table Skeleton */}
        <div className="bg-white/90 backdrop-blur-sm border border-blue-300 rounded-lg shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-100 to-indigo-100 border-b border-blue-300 p-4">
            <div className="h-6 bg-blue-200 rounded-lg w-1/3 animate-pulse" />
          </div>
          <div className="p-6 space-y-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="border border-blue-100 rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
