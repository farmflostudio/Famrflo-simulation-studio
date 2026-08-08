import PublicHeader from "../components/PublicHeader";
import PublicFooter from "../components/PublicFooter";

const CONTACT_EMAIL = "hello@farmflo.app";

export default function Contact() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <PublicHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h1 className="text-3xl font-semibold text-slate-900">Contact</h1>
          <p className="mt-6 text-sm leading-relaxed text-slate-600">
            Questions, feedback, or found a bug? Send us an email and we'll get back to you.
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-6 inline-block rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            {CONTACT_EMAIL}
          </a>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
