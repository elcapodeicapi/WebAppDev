import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Register</h1>
      <form className="flex flex-col gap-3 w-80">
        <input
          type="email"
          placeholder="Younes sLIM"
          className="border rounded px-3 py-2"
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="border rounded px-3 py-2"
          required
        />
        <button type="submit" className="bg-black text-white py-2 rounded">
          Register
        </button>
      </form>
      <p className="mt-4">
        Already have an account? <Link href="/login" className="text-blue-600">Login</Link>
      </p>
    </div>
  );
}
