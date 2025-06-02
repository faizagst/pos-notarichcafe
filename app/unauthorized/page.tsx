export default function UnauthorizedPage() {
    return (
      <div className="flex h-screen items-center justify-center flex-col text-center bg-white">
        <h1 className="text-4xl font-bold text-red-600 mb-4">403 - Unauthorized</h1>
        <p className="text-lg text-gray-700">You don't have permission to access this page.</p>
      </div>
    );
  }
  