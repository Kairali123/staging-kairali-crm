export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-pink-600"></div>
        <p className="mt-4 text-lg font-semibold text-gray-700">Loading Facebook PPC Reports...</p>
      </div>
    </div>
  )
}
