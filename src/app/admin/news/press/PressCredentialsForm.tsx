"use client";

import { useState } from "react";
import type { PressSource, PressCredentials } from "@/lib/content/press";

type Props = {
  sources: PressSource[];
  initialCredentials: PressCredentials;
};

export function PressCredentialsForm({ sources, initialCredentials }: Props) {
  const [creds, setCreds] = useState<PressCredentials>(() => ({ ...initialCredentials }));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<"saved" | "error" | null>(null);

  const update = (id: string, field: "login" | "password", value: string) => {
    setCreds((prev) => ({
      ...prev,
      [id]: {
        login: field === "login" ? value : prev[id]?.login ?? "",
        password: field === "password" ? value : prev[id]?.password ?? ""
      }
    }));
    setMessage(null);
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/press-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds)
      });
      if (!res.ok) throw new Error("Save failed");
      setMessage("saved");
    } catch {
      setMessage("error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-semibold text-neutral-900">Login i hasło przy każdym producencie</h2>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {saving ? "Zapisywanie…" : "Zapisz"}
        </button>
      </div>
      {message === "saved" && (
        <p className="text-sm text-green-700">Zapisano. Plik press-credentials.json zaktualizowany.</p>
      )}
      {message === "error" && (
        <p className="text-sm text-red-700">Błąd zapisu. Sprawdź, czy plik press-credentials.json istnieje i ma uprawnienia.</p>
      )}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              <th className="px-4 py-3 text-left font-semibold text-neutral-900">Producent</th>
              <th className="px-4 py-3 text-left font-semibold text-neutral-900">Serwis prasowy</th>
              <th className="px-4 py-3 text-left font-semibold text-neutral-900">Login</th>
              <th className="px-4 py-3 text-left font-semibold text-neutral-900">Hasło</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-3 font-medium text-neutral-900">{s.name}</td>
                <td className="px-4 py-3">
                  <a
                    href={s.pressUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {s.pressUrl.replace(/^https?:\/\//, "").slice(0, 40)}…
                  </a>
                  {s.loginRequired && (
                    <span className="ml-2 text-xs text-amber-600">(wymaga logowania)</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    placeholder="login"
                    value={creds[s.id]?.login ?? ""}
                    onChange={(e) => update(s.id, "login", e.target.value)}
                    className="w-full max-w-[180px] rounded border border-neutral-300 px-2 py-1.5 text-neutral-900"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="password"
                    placeholder="hasło"
                    value={creds[s.id]?.password ?? ""}
                    onChange={(e) => update(s.id, "password", e.target.value)}
                    className="w-full max-w-[180px] rounded border border-neutral-300 px-2 py-1.5 text-neutral-900"
                    autoComplete="off"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
