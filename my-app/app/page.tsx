import Link from "next/link";

export default function Page() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <p className="mb-6">
        Welcome to your dashboard. Please login or register to continue.
      </p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="bg-black text-white px-4 py-2 rounded"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="bg-gray-200 text-black px-4 py-2 rounded"
        >
          Register
        </Link>
      </div>
    </div>
  );
}
