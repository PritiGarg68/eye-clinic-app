export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-lg p-8">
        <h1 className="text-3xl font-bold text-slate-900 text-center">
          Eye Clinic OPD System
        </h1>

        <p className="mt-3 text-center text-slate-600">
          Internal clinic management app
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <button className="rounded-xl border border-slate-200 bg-slate-100 p-6 text-xl font-semibold hover:bg-slate-200">
            Reception
          </button>

          <button className="rounded-xl border border-slate-200 bg-slate-100 p-6 text-xl font-semibold hover:bg-slate-200">
            Optometrist
          </button>

          <button className="rounded-xl border border-slate-200 bg-slate-900 p-6 text-xl font-semibold text-white hover:bg-slate-800">
            Doctor / Admin
          </button>
        </div>
      </div>
    </main>
  );
}