import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Login</h1>
      <form className="flex flex-col gap-3 w-80">
        <input
          type="email"
          placeholder="Email"
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
          Login
        </button>
      </form>
      <p className="mt-4">
        Don't have an account?{" "}
        <Link href="/register" className="text-blue-600">
          Register
        </Link>
      </p>
    </div>
  );
}
