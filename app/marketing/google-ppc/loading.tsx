export default function GooglePPCLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="animate-pulse space-y-6">
        <div className="h-32 bg-gray-300 rounded-lg"></div>
        <div className="grid grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-300 rounded-lg"></div>
          ))}
        </div>
        <div className="h-96 bg-gray-300 rounded-lg"></div>
      </div>
    </div>
  )
}
